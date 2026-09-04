import { db } from '@/lib/firebase';
import { doc, getDoc, runTransaction, type Transaction, deleteField } from 'firebase/firestore';
import { rentalItemsService } from '@/lib/firestore';
import { resolveRentalItem } from '@/lib/services/rental-item-resolution.service';
import { approvalService } from './approval.service';
import { hasEntryApprovalsPermission } from '@/lib/utils';
import type { User } from '@/lib/types';
import type {
  EntryApprovalRequest,
  ApprovalActor,
  ApprovalRecoveryInvestigation,
  MarkApprovedAfterRecoveryInput,
  InvestigateProcessingApprovalInput,
  ProcessingApprovalInvestigation,
  MarkFailedAfterProcessingRecoveryInput,
  MarkApprovedAfterProcessingRecoveryInput,
} from '@/lib/types/approval';
import type { InwardVoucher as FormInwardVoucher } from '@/components/inventory/bulk-inward-entry-form';
import type { OutwardVoucher as FormOutwardVoucher } from '@/components/outward/bulk-outward-entry-form';
import type { InwardVoucher as StockReportInwardVoucher, OutwardVoucher as StockReportOutwardVoucher } from '@/lib/types/stock-report';
import type { RentalItem } from '@/lib/types';

const INWARD_COLLECTION = 'inwardVouchers';
const OUTWARD_COLLECTION = 'outwardVouchers';
const APPROVAL_REQUESTS_COLLECTION = 'entryApprovalRequests';

// Processing timeout: requests stuck in PROCESSING longer than this are considered potentially stuck
const PROCESSING_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

type InvestigationResult = {
  currentState: 'ORIGINAL' | 'REQUESTED' | 'PARTIAL' | 'UNKNOWN';
  rentalItemsState?: 'ORIGINAL' | 'REQUESTED' | 'PARTIAL' | 'UNKNOWN';
  findings: string[];
  safeActions: Array<'MARK_APPROVED' | 'MANUAL_REVIEW' | 'NO_ACTION'>;
};

type OutwardInvestigationResult = InvestigationResult & {
  stockState: 'ORIGINAL' | 'REQUESTED' | 'PARTIAL' | 'UNKNOWN';
};

/**
 * Approval Recovery Service
 * 
 * Handles investigation of failed approval requests and safe recovery operations.
 * This service ensures data integrity before allowing any recovery actions.
 */
class ApprovalRecoveryService {
  /**
   * Investigate a failed approval request to determine current state and safe recovery options
   * 
   * @param requestId - The approval request ID
   * @param user - The user object for authorization check
   * @returns Investigation result
   */
  async investigateFailedApproval(
    requestId: string,
    user: User
  ): Promise<{ success: boolean; investigation?: ApprovalRecoveryInvestigation; error?: string }> {
    // Service-level authorization check
    if (!hasEntryApprovalsPermission(user)) {
      return {
        success: false,
        error: 'User does not have permission to investigate failed approvals',
      };
    }

    // Load approval request
    const request = await approvalService.getApprovalRequestById(requestId);
    if (!request) {
      return {
        success: false,
        error: 'Approval request not found',
      };
    }

    // Validate FAILED status
    if (request.status !== 'FAILED') {
      return {
        success: false,
        error: `Can only investigate FAILED requests. Current status: ${request.status}`,
      };
    }

    const findings: string[] = [];
    let currentState: 'ORIGINAL' | 'REQUESTED' | 'PARTIAL' | 'UNKNOWN' = 'UNKNOWN';
    let stockState: 'ORIGINAL' | 'REQUESTED' | 'PARTIAL' | 'UNKNOWN' | undefined = undefined;
    let rentalItemsState: 'ORIGINAL' | 'REQUESTED' | 'PARTIAL' | 'UNKNOWN' | undefined = undefined;
    const safeActions: Array<'MARK_APPROVED' | 'MANUAL_REVIEW' | 'NO_ACTION'> = ['MANUAL_REVIEW'];

    // Load current actual voucher
    let currentVoucher: FormInwardVoucher | FormOutwardVoucher | null = null;
    const voucherExists = await this.loadCurrentVoucher(request);
    
    if (!voucherExists) {
      findings.push('Current voucher does not exist in Firestore');
      currentState = 'UNKNOWN';
      safeActions.length = 0;
      safeActions.push('NO_ACTION');
      
      return {
        success: true,
        investigation: {
          requestId,
          entryType: request.entryType,
          currentState,
          voucherExists: false,
          stockState: request.entryType === 'OUTWARD' ? stockState : undefined,
          failureInfo: request.failureInfo,
          findings,
          safeActions,
        },
      };
    }

    currentVoucher = await this.getVoucherFromFirestore(request);

    if (!currentVoucher) {
      findings.push('Failed to load current voucher from Firestore');
      currentState = 'UNKNOWN';
      safeActions.length = 0;
      safeActions.push('NO_ACTION');
      
      return {
        success: true,
        investigation: {
          requestId,
          entryType: request.entryType,
          currentState,
          voucherExists: true,
          stockState: request.entryType === 'OUTWARD' ? stockState : undefined,
          failureInfo: request.failureInfo,
          findings,
          safeActions,
        },
      };
    }

    // Compare current state with original and requested
    if (request.entryType === 'INWARD') {
      const inwardInvestigation = await this.investigateInwardStateWithRentalItems(
        request as EntryApprovalRequest & { originalData: StockReportInwardVoucher; requestedData: StockReportInwardVoucher },
        currentVoucher as FormInwardVoucher
      );
      currentState = inwardInvestigation.currentState;
      rentalItemsState = inwardInvestigation.rentalItemsState;
      findings.push(...inwardInvestigation.findings);
      safeActions.length = 0;
      safeActions.push(...inwardInvestigation.safeActions);
    } else {
      const outwardInvestigation = await this.investigateOutwardState(
        request as EntryApprovalRequest & { originalData: StockReportOutwardVoucher; requestedData: StockReportOutwardVoucher },
        currentVoucher as FormOutwardVoucher
      );
      currentState = outwardInvestigation.currentState;
      stockState = outwardInvestigation.stockState;
      findings.push(...outwardInvestigation.findings);
      safeActions.length = 0;
      safeActions.push(...outwardInvestigation.safeActions);
    }

    return {
      success: true,
      investigation: {
        requestId,
        entryType: request.entryType,
        currentState,
        voucherExists: true,
        stockState,
        rentalItemsState,
        failureInfo: request.failureInfo,
        findings,
        safeActions,
      },
    };
  }

  /**
   * Investigate a processing approval request to determine current state and safe recovery options
   * This is for requests stuck in PROCESSING state beyond the timeout
   * 
   * @param input - Investigation input
   * @param user - The user object for authorization check
   * @returns Investigation result
   */
  async investigateProcessingApproval(
    input: InvestigateProcessingApprovalInput,
    user: User
  ): Promise<{ success: boolean; investigation?: ProcessingApprovalInvestigation; error?: string }> {
    // Service-level authorization check
    if (!hasEntryApprovalsPermission(user)) {
      return {
        success: false,
        error: 'User does not have permission to investigate processing approvals',
      };
    }

    const { requestId } = input;

    // Load approval request
    const request = await approvalService.getApprovalRequestById(requestId);
    if (!request) {
      return {
        success: false,
        error: 'Approval request not found',
      };
    }

    // Validate PROCESSING status
    if (request.status !== 'PROCESSING') {
      return {
        success: false,
        error: `Can only investigate PROCESSING requests. Current status: ${request.status}`,
      };
    }

    // Check if processing has exceeded timeout
    if (!request.processingAt) {
      return {
        success: false,
        error: 'Processing timestamp not found',
      };
    }

    const processingAgeMs = Date.now() - new Date(request.processingAt).getTime();
    if (processingAgeMs < PROCESSING_TIMEOUT_MS) {
      return {
        success: false,
        error: `Request is still within processing timeout (${processingAgeMs}ms < ${PROCESSING_TIMEOUT_MS}ms). Wait for timeout before investigating.`,
      };
    }

    const findings: string[] = [];
    let executionState: 'NOT_STARTED' | 'COMPLETED' | 'PARTIAL' | 'UNKNOWN' = 'UNKNOWN';
    let currentState: 'ORIGINAL' | 'REQUESTED' | 'PARTIAL' | 'UNKNOWN' = 'UNKNOWN';
    let stockState: 'ORIGINAL' | 'REQUESTED' | 'PARTIAL' | 'UNKNOWN' | undefined = undefined;
    let rentalItemsState: 'ORIGINAL' | 'REQUESTED' | 'PARTIAL' | 'UNKNOWN' | undefined = undefined;
    const safeActions: Array<'MARK_FAILED' | 'MARK_APPROVED' | 'MANUAL_REVIEW'> = ['MANUAL_REVIEW'];

    findings.push(`Processing age: ${processingAgeMs}ms (timeout: ${PROCESSING_TIMEOUT_MS}ms)`);

    // Load current actual voucher
    let currentVoucher: FormInwardVoucher | FormOutwardVoucher | null = null;
    const voucherExists = await this.loadCurrentVoucher(request);
    
    if (!voucherExists) {
      findings.push('Current voucher does not exist in Firestore');
      currentState = 'UNKNOWN';
      executionState = 'NOT_STARTED';
      safeActions.length = 0;
      safeActions.push('MARK_FAILED');
      
      return {
        success: true,
        investigation: {
          requestId,
          entryType: request.entryType,
          processingAgeMs,
          executionState,
          currentState,
          stockState: request.entryType === 'OUTWARD' ? stockState : undefined,
          rentalItemsState,
          findings,
          safeActions,
        },
      };
    }

    currentVoucher = await this.getVoucherFromFirestore(request);

    if (!currentVoucher) {
      findings.push('Failed to load current voucher from Firestore');
      currentState = 'UNKNOWN';
      executionState = 'UNKNOWN';
      safeActions.length = 0;
      safeActions.push('MANUAL_REVIEW');
      
      return {
        success: true,
        investigation: {
          requestId,
          entryType: request.entryType,
          processingAgeMs,
          executionState,
          currentState,
          stockState: request.entryType === 'OUTWARD' ? stockState : undefined,
          rentalItemsState,
          findings,
          safeActions,
        },
      };
    }

    // Compare current state with original and requested
    if (request.entryType === 'INWARD') {
      const inwardInvestigation = await this.investigateInwardStateWithRentalItems(
        request as EntryApprovalRequest & { originalData: StockReportInwardVoucher; requestedData: StockReportInwardVoucher },
        currentVoucher as FormInwardVoucher
      );
      currentState = inwardInvestigation.currentState;
      rentalItemsState = inwardInvestigation.rentalItemsState;
      findings.push(...inwardInvestigation.findings);
    } else {
      const outwardInvestigation = await this.investigateOutwardState(
        request as EntryApprovalRequest & { originalData: StockReportOutwardVoucher; requestedData: StockReportOutwardVoucher },
        currentVoucher as FormOutwardVoucher
      );
      currentState = outwardInvestigation.currentState;
      stockState = outwardInvestigation.stockState;
      findings.push(...outwardInvestigation.findings);
    }

    // Determine execution state based on current state
    if (currentState === 'ORIGINAL') {
      executionState = 'NOT_STARTED';
      findings.push('Business execution did not start - voucher is still in original state');
      safeActions.length = 0;
      safeActions.push('MARK_FAILED');
    } else if (currentState === 'REQUESTED') {
      // For inward, check rental items state too
      if (request.entryType === 'INWARD') {
        if (rentalItemsState === 'REQUESTED') {
          executionState = 'COMPLETED';
          findings.push('Business execution appears to have completed successfully');
          safeActions.length = 0;
          safeActions.push('MARK_APPROVED');
        } else {
          executionState = 'PARTIAL';
          findings.push('Business execution is partial - voucher updated but rental items not fully updated');
          safeActions.length = 0;
          safeActions.push('MANUAL_REVIEW');
        }
      } else {
        // For outward, stock state is always UNKNOWN (conservative)
        executionState = 'PARTIAL';
        findings.push('Business execution state is partial or unknown - stock state cannot be reliably verified');
        safeActions.length = 0;
        safeActions.push('MANUAL_REVIEW');
      }
    } else {
      executionState = 'PARTIAL';
      findings.push('Business execution state is partial or unknown');
      safeActions.length = 0;
      safeActions.push('MANUAL_REVIEW');
    }

    return {
      success: true,
      investigation: {
        requestId,
        entryType: request.entryType,
        processingAgeMs,
        executionState,
        currentState,
        stockState,
        rentalItemsState,
        findings,
        safeActions,
      },
    };
  }

  /**
   * Mark a processing request as FAILED after verification
   * This is used when execution definitely did not start
   * 
   * SAFETY GUARANTEES:
   * - Service-level authorization check
   * - Firestore transaction for atomicity and concurrency protection
   * - Fresh investigation with current Firestore data (NOT UI state)
   * - Verification that MARK_FAILED is in safeActions
   * - Atomic status + recovery metadata update
   * 
   * @param input - Recovery input
   * @param user - The user object for authorization check
   * @returns Result
   */
  async markFailedAfterProcessingRecovery(
    input: MarkFailedAfterProcessingRecoveryInput,
    user: User
  ): Promise<{ success: boolean; error?: string }> {
    // Service-level authorization check
    if (!hasEntryApprovalsPermission(user)) {
      return {
        success: false,
        error: 'User does not have permission to recover processing approvals',
      };
    }

    const { requestId, actor, recoveryReason } = input;

    // Validate recovery reason
    if (!recoveryReason || recoveryReason.trim() === '') {
      return {
        success: false,
        error: 'Recovery reason is required',
      };
    }

    const now = new Date().toISOString();

    try {
      // Firestore transaction for atomic recovery
      await runTransaction(db, async (transaction) => {
        // 1. Read approval request inside transaction
        const requestRef = doc(db, APPROVAL_REQUESTS_COLLECTION, requestId);
        const requestSnap = await transaction.get(requestRef);
        
        if (!requestSnap.exists()) {
          throw new Error('Approval request not found');
        }

        const request = requestSnap.data() as EntryApprovalRequest;
        
        // 2. Verify PROCESSING status (prevents concurrent recovery)
        if (request.status !== 'PROCESSING') {
          throw new Error(`Request is not PROCESSING. Current status: ${request.status}`);
        }

        // 3. CRITICAL: Check timeout INSIDE transaction to prevent interfering with legitimate execution
        if (!request.processingAt) {
          throw new Error('Processing timestamp not found');
        }

        const processingAgeMs = Date.now() - new Date(request.processingAt).getTime();
        if (processingAgeMs < PROCESSING_TIMEOUT_MS) {
          throw new Error(
            `Request is still within processing timeout (${processingAgeMs}ms < ${PROCESSING_TIMEOUT_MS}ms). ` +
            `Execution may still be active. Wait for timeout before investigating.`
          );
        }

        // 4. Load current voucher for fresh investigation
        const currentVoucher = await this.loadVoucherInTransaction(transaction, request);
        
        // 5. Re-run investigation with fresh data (NOT UI state)
        const investigation = await this.runFreshProcessingInvestigation(request, currentVoucher);
        
        // 6. Verify MARK_FAILED is in safeActions
        if (!investigation.safeActions.includes('MARK_FAILED')) {
          throw new Error(
            `Recovery not safe. Execution State: ${investigation.executionState}` +
            `, Current State: ${investigation.currentState}` +
            `. Findings: ${investigation.findings.join('; ')}`
          );
        }

        // 7. Atomically update status and recovery metadata
        transaction.update(requestRef, {
          status: 'FAILED',
          failedAt: now,
          failureReason: recoveryReason,
          failureInfo: {
            failedAt: now,
            stage: request.executionStage || 'UNKNOWN',
            message: 'Request was stuck in PROCESSING and recovered as FAILED after investigation',
            partialExecutionPossible: investigation.executionState !== 'NOT_STARTED',
            executionStartedAt: request.processingAt,
          },
          processingRecoveryInvestigation: {
            investigatedAt: now,
            processingAgeMs: investigation.processingAgeMs,
            executionState: investigation.executionState,
            currentState: investigation.currentState,
            stockState: investigation.stockState,
            rentalItemsState: investigation.rentalItemsState,
            findings: investigation.findings,
            safeActions: investigation.safeActions,
          },
        });

        // Clear the lock only if execution did not start (no business execution)
        if (investigation.executionState === 'NOT_STARTED') {
          const voucherCollection = request.entryType === 'INWARD' ? INWARD_COLLECTION : OUTWARD_COLLECTION;
          const voucherRef = doc(db, voucherCollection, request.entryId);
          const voucherSnap = await transaction.get(voucherRef);
          
          if (voucherSnap.exists()) {
            const voucherData = voucherSnap.data();
            // Only clear the lock if it belongs to this request
            if (voucherData.activeApprovalRequestId === requestId) {
              transaction.update(voucherRef, {
                activeApprovalRequestId: deleteField(),
              });
            }
          }
        }
      });

      return { success: true };
    } catch (error) {
      console.error('[APPROVAL-RECOVERY] Failed to mark failed after processing recovery:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to mark failed after processing recovery',
      };
    }
  }

  /**
   * Mark a processing request as APPROVED after verification
   * This is used when business execution appears to have completed successfully
   * 
   * SAFETY GUARANTEES:
   * - Service-level authorization check
   * - Firestore transaction for atomicity and concurrency protection
   * - Fresh investigation with current Firestore data (NOT UI state)
   * - Verification that MARK_APPROVED is in safeActions
   * - Atomic status + recovery metadata update
   * 
   * @param input - Recovery input
   * @param user - The user object for authorization check
   * @returns Result
   */
  async markApprovedAfterProcessingRecovery(
    input: MarkApprovedAfterProcessingRecoveryInput,
    user: User
  ): Promise<{ success: boolean; error?: string }> {
    // Service-level authorization check
    if (!hasEntryApprovalsPermission(user)) {
      return {
        success: false,
        error: 'User does not have permission to recover processing approvals',
      };
    }

    const { requestId, actor, recoveryReason } = input;

    // Validate recovery reason
    if (!recoveryReason || recoveryReason.trim() === '') {
      return {
        success: false,
        error: 'Recovery reason is required',
      };
    }

    const now = new Date().toISOString();

    try {
      // Firestore transaction for atomic recovery
      await runTransaction(db, async (transaction) => {
        // 1. Read approval request inside transaction
        const requestRef = doc(db, APPROVAL_REQUESTS_COLLECTION, requestId);
        const requestSnap = await transaction.get(requestRef);
        
        if (!requestSnap.exists()) {
          throw new Error('Approval request not found');
        }

        const request = requestSnap.data() as EntryApprovalRequest;
        
        // 2. Verify PROCESSING status (prevents concurrent recovery)
        if (request.status !== 'PROCESSING') {
          throw new Error(`Request is not PROCESSING. Current status: ${request.status}`);
        }

        // 3. CRITICAL: Check timeout INSIDE transaction to prevent interfering with legitimate execution
        if (!request.processingAt) {
          throw new Error('Processing timestamp not found');
        }

        const processingAgeMs = Date.now() - new Date(request.processingAt).getTime();
        if (processingAgeMs < PROCESSING_TIMEOUT_MS) {
          throw new Error(
            `Request is still within processing timeout (${processingAgeMs}ms < ${PROCESSING_TIMEOUT_MS}ms). ` +
            `Execution may still be active. Wait for timeout before investigating.`
          );
        }

        // 4. Load current voucher for fresh investigation
        const currentVoucher = await this.loadVoucherInTransaction(transaction, request);
        if (!currentVoucher) {
          throw new Error('Current voucher not found - cannot safely recover');
        }

        // 5. Re-run investigation with fresh data (NOT UI state)
        const investigation = await this.runFreshProcessingInvestigation(request, currentVoucher);
        
        // 6. Verify MARK_APPROVED is in safeActions
        if (!investigation.safeActions.includes('MARK_APPROVED')) {
          throw new Error(
            `Recovery not safe. Execution State: ${investigation.executionState}` +
            `, Current State: ${investigation.currentState}` +
            (investigation.rentalItemsState ? `, Rental Items: ${investigation.rentalItemsState}` : '') +
            (investigation.stockState ? `, Stock: ${investigation.stockState}` : '') +
            `. Findings: ${investigation.findings.join('; ')}`
          );
        }

        // 6. Atomically update status and recovery metadata
        transaction.update(requestRef, {
          status: 'APPROVED',
          approvedBy: actor,
          approvedAt: now,
          approvalReason: recoveryReason,
          processingRecoveryInvestigation: {
            investigatedAt: now,
            processingAgeMs: investigation.processingAgeMs,
            executionState: investigation.executionState,
            currentState: investigation.currentState,
            stockState: investigation.stockState,
            rentalItemsState: investigation.rentalItemsState,
            findings: investigation.findings,
            safeActions: investigation.safeActions,
          },
        });

        // Clear the lock from the voucher document
        const voucherCollection = request.entryType === 'INWARD' ? INWARD_COLLECTION : OUTWARD_COLLECTION;
        const voucherRef = doc(db, voucherCollection, request.entryId);
        const voucherSnap = await transaction.get(voucherRef);
        
        if (voucherSnap.exists()) {
          const voucherData = voucherSnap.data();
          // Only clear the lock if it belongs to this request
          if (voucherData.activeApprovalRequestId === requestId) {
            transaction.update(voucherRef, {
              activeApprovalRequestId: deleteField(),
            });
          }
        }
      });

      return { success: true };
    } catch (error) {
      console.error('[APPROVAL-RECOVERY] Failed to mark approved after processing recovery:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to mark approved after processing recovery',
      };
    }
  }

  /**
   * Run fresh processing investigation with current data
   * This is called inside the recovery transaction to verify safety before status change
   */
  private async runFreshProcessingInvestigation(
    request: EntryApprovalRequest,
    currentVoucher: FormInwardVoucher | FormOutwardVoucher | null
  ): Promise<ProcessingApprovalInvestigation> {
    const processingAgeMs = request.processingAt ? Date.now() - new Date(request.processingAt).getTime() : 0;
    const findings: string[] = [];
    let executionState: 'NOT_STARTED' | 'COMPLETED' | 'PARTIAL' | 'UNKNOWN' = 'UNKNOWN';
    let currentState: 'ORIGINAL' | 'REQUESTED' | 'PARTIAL' | 'UNKNOWN' = 'UNKNOWN';
    let stockState: 'ORIGINAL' | 'REQUESTED' | 'PARTIAL' | 'UNKNOWN' | undefined = undefined;
    let rentalItemsState: 'ORIGINAL' | 'REQUESTED' | 'PARTIAL' | 'UNKNOWN' | undefined = undefined;
    const safeActions: Array<'MARK_FAILED' | 'MARK_APPROVED' | 'MANUAL_REVIEW'> = ['MANUAL_REVIEW'];

    findings.push(`Processing age: ${processingAgeMs}ms`);

    // CRITICAL: Use executionStage to determine actual execution progress
    if (request.executionStage) {
      findings.push(`Execution stage: ${request.executionStage}`);
      findings.push(`Execution stage updated at: ${request.executionStageUpdatedAt || 'unknown'}`);
      
      // If execution stage is beyond CLAIMED, execution definitely started
      if (request.executionStage === 'CLAIMED') {
        findings.push('Execution was claimed but may not have started');
        executionState = 'NOT_STARTED';
      } else if (request.executionStage === 'EXECUTION_STARTED') {
        findings.push('Execution started but stage unknown');
        executionState = 'PARTIAL';
      } else if (request.executionStage === 'VOUCHER_UPDATED') {
        findings.push('Voucher was updated but rental items may not be');
        executionState = 'PARTIAL';
      } else if (request.executionStage === 'RENTAL_ITEMS_UPDATED') {
        findings.push('Rental items were updated (inward execution likely completed)');
        executionState = 'PARTIAL'; // Still need to verify voucher state
      } else if (request.executionStage === 'STOCK_UPDATED') {
        findings.push('Stock was updated (outward execution likely completed)');
        executionState = 'PARTIAL'; // Still need to verify voucher state
      } else if (request.executionStage === 'BUSINESS_EXECUTION_COMPLETED') {
        findings.push('Business execution completed');
        executionState = 'PARTIAL'; // Still need to verify final state
      } else {
        findings.push('Unknown execution stage');
        executionState = 'UNKNOWN';
      }
    } else {
      findings.push('No execution stage marker - cannot determine execution progress');
      executionState = 'UNKNOWN';
    }

    if (!currentVoucher) {
      findings.push('Current voucher not found');
      currentState = 'UNKNOWN';
      safeActions.length = 0;
      safeActions.push('MARK_FAILED');
      
      return {
        requestId: request.id,
        entryType: request.entryType,
        processingAgeMs,
        executionState,
        currentState,
        stockState,
        rentalItemsState,
        findings,
        safeActions,
      };
    }

    // Compare current state with original and requested
    if (request.entryType === 'INWARD') {
      const inwardInvestigation = await this.investigateInwardStateWithRentalItems(
        request as EntryApprovalRequest & { originalData: StockReportInwardVoucher; requestedData: StockReportInwardVoucher },
        currentVoucher as FormInwardVoucher
      );
      currentState = inwardInvestigation.currentState;
      rentalItemsState = inwardInvestigation.rentalItemsState;
      findings.push(...inwardInvestigation.findings);
    } else {
      const outwardInvestigation = await this.investigateOutwardState(
        request as EntryApprovalRequest & { originalData: StockReportOutwardVoucher; requestedData: StockReportOutwardVoucher },
        currentVoucher as FormOutwardVoucher
      );
      currentState = outwardInvestigation.currentState;
      stockState = outwardInvestigation.stockState;
      findings.push(...outwardInvestigation.findings);
    }

    // Determine execution state based on current state AND executionStage
    // executionStage takes precedence for determining if execution started
    if (request.executionStage && request.executionStage !== 'CLAIMED') {
      // Execution definitely started based on stage
      if (currentState === 'REQUESTED') {
        if (request.entryType === 'INWARD') {
          if (rentalItemsState === 'REQUESTED') {
            executionState = 'COMPLETED';
            safeActions.length = 0;
            safeActions.push('MARK_APPROVED');
          } else {
            executionState = 'PARTIAL';
            safeActions.length = 0;
            safeActions.push('MANUAL_REVIEW');
          }
        } else {
          // Outward: stock updated but voucher state verification is conservative
          executionState = 'PARTIAL';
          safeActions.length = 0;
          safeActions.push('MANUAL_REVIEW');
        }
      } else {
        executionState = 'PARTIAL';
        safeActions.length = 0;
        safeActions.push('MANUAL_REVIEW');
      }
    } else if (currentState === 'ORIGINAL') {
      executionState = 'NOT_STARTED';
      safeActions.length = 0;
      safeActions.push('MARK_FAILED');
    } else if (currentState === 'REQUESTED') {
      if (request.entryType === 'INWARD') {
        if (rentalItemsState === 'REQUESTED') {
          executionState = 'COMPLETED';
          safeActions.length = 0;
          safeActions.push('MARK_APPROVED');
        } else {
          executionState = 'PARTIAL';
          safeActions.length = 0;
          safeActions.push('MANUAL_REVIEW');
        }
      } else {
        executionState = 'PARTIAL';
        safeActions.length = 0;
        safeActions.push('MANUAL_REVIEW');
      }
    } else {
      executionState = 'PARTIAL';
      safeActions.length = 0;
      safeActions.push('MANUAL_REVIEW');
    }

    return {
      requestId: request.id,
      entryType: request.entryType,
      processingAgeMs,
      executionState,
      currentState,
      stockState,
      rentalItemsState,
      findings,
      safeActions,
    };
  }

  /**
   * Mark a failed request as APPROVED after verification
   * This does NOT re-execute business logic - it only updates the approval status
   * 
   * SAFETY GUARANTEES:
   * - Service-level authorization check
   * - Firestore transaction for atomicity and concurrency protection
   * - Fresh investigation with current Firestore data (NOT UI state)
   * - Verification that MARK_APPROVED is in safeActions
   * - Atomic status + recovery metadata update
   * 
   * @param input - Recovery input
   * @param user - The user object for authorization check
   * @returns Result
   */
  async markApprovedAfterRecovery(
    input: MarkApprovedAfterRecoveryInput,
    user: User
  ): Promise<{ success: boolean; error?: string }> {
    // Service-level authorization check
    if (!hasEntryApprovalsPermission(user)) {
      return {
        success: false,
        error: 'User does not have permission to recover failed approvals',
      };
    }

    const { requestId, actor, recoveryReason } = input;

    // Validate recovery reason
    if (!recoveryReason || recoveryReason.trim() === '') {
      return {
        success: false,
        error: 'Recovery reason is required',
      };
    }

    const now = new Date().toISOString();

    try {
      // Firestore transaction for atomic recovery
      await runTransaction(db, async (transaction) => {
        // 1. Read approval request inside transaction
        const requestRef = doc(db, APPROVAL_REQUESTS_COLLECTION, requestId);
        const requestSnap = await transaction.get(requestRef);
        
        if (!requestSnap.exists()) {
          throw new Error('Approval request not found');
        }

        const request = requestSnap.data() as EntryApprovalRequest;
        
        // 2. Verify FAILED status (prevents concurrent recovery)
        if (request.status !== 'FAILED') {
          throw new Error(`Request is not FAILED. Current status: ${request.status}`);
        }

        // 3. Load current voucher for fresh investigation
        const currentVoucher = await this.loadVoucherInTransaction(transaction, request);
        if (!currentVoucher) {
          throw new Error('Current voucher not found - cannot safely recover');
        }

        // 4. Re-run investigation with fresh data (NOT UI state)
        const investigation = await this.runFreshInvestigation(request, currentVoucher);
        
        // 5. Verify MARK_APPROVED is in safeActions
        if (!investigation.safeActions.includes('MARK_APPROVED')) {
          const stockState = 'stockState' in investigation ? investigation.stockState : undefined;
          throw new Error(
            `Recovery not safe. State: ${investigation.currentState}` +
            (investigation.rentalItemsState ? `, Rental Items: ${investigation.rentalItemsState}` : '') +
            (stockState ? `, Stock: ${stockState}` : '') +
            `. Findings: ${investigation.findings.join('; ')}`
          );
        }

        // 6. Atomically update status and recovery metadata
        transaction.update(requestRef, {
          status: 'APPROVED',
          approvedBy: actor,
          approvedAt: now,
          approvalReason: recoveryReason,
          recoveredBy: actor,
          recoveredAt: now,
          recoveryReason,
          recoveryInvestigation: {
            investigatedAt: now,
            currentState: investigation.currentState,
            stockState: 'stockState' in investigation ? investigation.stockState : undefined,
            rentalItemsState: investigation.rentalItemsState,
            findings: investigation.findings,
            safeActions: investigation.safeActions,
          },
        });

        // Clear the lock from the voucher document
        const voucherCollection = request.entryType === 'INWARD' ? INWARD_COLLECTION : OUTWARD_COLLECTION;
        const voucherRef = doc(db, voucherCollection, request.entryId);
        const voucherSnap = await transaction.get(voucherRef);
        
        if (voucherSnap.exists()) {
          const voucherData = voucherSnap.data();
          // Only clear the lock if it belongs to this request
          if (voucherData.activeApprovalRequestId === requestId) {
            transaction.update(voucherRef, {
              activeApprovalRequestId: deleteField(),
            });
          }
        }
      });

      return { success: true };
    } catch (error) {
      console.error('[APPROVAL-RECOVERY] Failed to mark approved after recovery:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to mark approved after recovery',
      };
    }
  }

  /**
   * Load current voucher from Firestore
   */
  private async loadCurrentVoucher(request: EntryApprovalRequest): Promise<boolean> {
    try {
      const collection = request.entryType === 'INWARD' ? INWARD_COLLECTION : OUTWARD_COLLECTION;
      const snap = await getDoc(doc(db, collection, request.entryId));
      return snap.exists();
    } catch {
      return false;
    }
  }

  /**
   * Load voucher inside a Firestore transaction
   * This is used for fresh investigation during recovery
   */
  private async loadVoucherInTransaction(
    transaction: Transaction,
    request: EntryApprovalRequest
  ): Promise<FormInwardVoucher | FormOutwardVoucher | null> {
    try {
      const collection = request.entryType === 'INWARD' ? INWARD_COLLECTION : OUTWARD_COLLECTION;
      const voucherRef = doc(db, collection, request.entryId);
      const voucherSnap = await transaction.get(voucherRef);
      
      if (!voucherSnap.exists()) return null;
      
      if (request.entryType === 'INWARD') {
        return { id: voucherSnap.id, ...voucherSnap.data() } as FormInwardVoucher;
      } else {
        return { id: voucherSnap.id, ...voucherSnap.data() } as FormOutwardVoucher;
      }
    } catch {
      return null;
    }
  }

  /**
   * Repair a stale or orphaned approval lock on a voucher
   * This function safely clears locks that point to non-existent, terminal, or safely recoverable requests
   * 
   * @param voucherId - The voucher document ID
   * @param entryType - INWARD or OUTWARD
   * @param user - The user object for authorization check
   * @returns Repair result with action taken and reason
   */
  async repairApprovalLock(
    voucherId: string,
    entryType: 'INWARD' | 'OUTWARD',
    user: User
  ): Promise<{ repaired: boolean; action: 'LOCK_CLEARED' | 'LOCK_VALID' | 'MANUAL_REVIEW_REQUIRED'; reason: string }> {
    // Service-level authorization check
    if (!hasEntryApprovalsPermission(user)) {
      return {
        repaired: false,
        action: 'MANUAL_REVIEW_REQUIRED',
        reason: 'User does not have permission to repair approval locks',
      };
    }

    const collection = entryType === 'INWARD' ? INWARD_COLLECTION : OUTWARD_COLLECTION;

    try {
      await runTransaction(db, async (transaction) => {
        const voucherRef = doc(db, collection, voucherId);
        const voucherSnap = await transaction.get(voucherRef);
        
        if (!voucherSnap.exists()) {
          throw new Error('Voucher not found');
        }

        const voucherData = voucherSnap.data();
        const lockId = voucherData.activeApprovalRequestId;

        // No lock to repair
        if (!lockId) {
          throw new Error('No active approval lock found on voucher');
        }

        // Check if the locked request exists
        const requestRef = doc(db, APPROVAL_REQUESTS_COLLECTION, lockId);
        const requestSnap = await transaction.get(requestRef);
        
        if (!requestSnap.exists()) {
          // Request was deleted - lock is stale, clear it
          transaction.update(voucherRef, {
            activeApprovalRequestId: deleteField(),
          });
          throw new Error('LOCK_CLEARED: Request does not exist, lock was stale');
        }

        const request = requestSnap.data() as EntryApprovalRequest;

        // Verify the lock actually belongs to this voucher
        if (request.entryId !== voucherId) {
          throw new Error('LOCK_VALID: Lock belongs to a different voucher');
        }

        // Check request status
        if (request.status === 'APPROVED' || request.status === 'REJECTED') {
          // Terminal status - lock should have been cleared, clear it now
          transaction.update(voucherRef, {
            activeApprovalRequestId: deleteField(),
          });
          throw new Error(`LOCK_CLEARED: Request is ${request.status}, lock should have been cleared`);
        }

        if (request.status === 'FAILED') {
          // Check if partial execution occurred
          if (request.failureInfo?.partialExecutionPossible === false) {
            // No partial execution - safe to clear lock
            transaction.update(voucherRef, {
              activeApprovalRequestId: deleteField(),
            });
            throw new Error('LOCK_CLEARED: Request FAILED with no partial execution');
          } else {
            // Partial execution possible - lock must remain for manual review
            throw new Error('MANUAL_REVIEW_REQUIRED: Request FAILED with possible partial execution');
          }
        }

        if (request.status === 'PROCESSING') {
          // Still processing - lock must remain
          throw new Error('LOCK_VALID: Request is still PROCESSING');
        }

        if (request.status === 'PENDING') {
          // Still pending - lock must remain
          throw new Error('LOCK_VALID: Request is still PENDING');
        }

        throw new Error('MANUAL_REVIEW_REQUIRED: Unknown request status');
      });

      return {
        repaired: true,
        action: 'LOCK_CLEARED',
        reason: 'Lock successfully repaired',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.startsWith('LOCK_CLEARED')) {
        return {
          repaired: true,
          action: 'LOCK_CLEARED',
          reason: errorMessage.replace('LOCK_CLEARED: ', ''),
        };
      } else if (errorMessage.startsWith('LOCK_VALID')) {
        return {
          repaired: false,
          action: 'LOCK_VALID',
          reason: errorMessage.replace('LOCK_VALID: ', ''),
        };
      } else if (errorMessage.startsWith('MANUAL_REVIEW_REQUIRED')) {
        return {
          repaired: false,
          action: 'MANUAL_REVIEW_REQUIRED',
          reason: errorMessage.replace('MANUAL_REVIEW_REQUIRED: ', ''),
        };
      } else {
        return {
          repaired: false,
          action: 'MANUAL_REVIEW_REQUIRED',
          reason: `Failed to repair lock: ${errorMessage}`,
        };
      }
    }
  }

  /**
   * Get voucher from Firestore
   */
  private async getVoucherFromFirestore(request: EntryApprovalRequest): Promise<FormInwardVoucher | FormOutwardVoucher | null> {
    try {
      const collection = request.entryType === 'INWARD' ? INWARD_COLLECTION : OUTWARD_COLLECTION;
      const snap = await getDoc(doc(db, collection, request.entryId));
      if (!snap.exists()) return null;
      
      if (request.entryType === 'INWARD') {
        return { id: snap.id, ...snap.data() } as FormInwardVoucher;
      } else {
        return { id: snap.id, ...snap.data() } as FormOutwardVoucher;
      }
    } catch {
      return null;
    }
  }

  /**
   * Run fresh investigation with current data
   * This is called inside the recovery transaction to verify safety before status change
   */
  private async runFreshInvestigation(
    request: EntryApprovalRequest,
    currentVoucher: FormInwardVoucher | FormOutwardVoucher
  ): Promise<InvestigationResult | OutwardInvestigationResult> {
    if (request.entryType === 'INWARD') {
      return this.investigateInwardStateWithRentalItems(
        request as EntryApprovalRequest & { originalData: StockReportInwardVoucher; requestedData: StockReportInwardVoucher },
        currentVoucher as FormInwardVoucher
      );
    } else {
      return this.investigateOutwardState(
        request as EntryApprovalRequest & { originalData: StockReportOutwardVoucher; requestedData: StockReportOutwardVoucher },
        currentVoucher as FormOutwardVoucher
      );
    }
  }

  /**
   * Investigate inward voucher state (UI-only, without rental items)
   */
  private investigateInwardState(
    request: EntryApprovalRequest & { originalData: StockReportInwardVoucher; requestedData: StockReportInwardVoucher },
    currentVoucher: FormInwardVoucher
  ): { currentState: 'ORIGINAL' | 'REQUESTED' | 'PARTIAL' | 'UNKNOWN'; findings: string[]; safeActions: Array<'MARK_APPROVED' | 'MANUAL_REVIEW' | 'NO_ACTION'> } {
    const findings: string[] = [];
    const safeActions: Array<'MARK_APPROVED' | 'MANUAL_REVIEW' | 'NO_ACTION'> = ['MANUAL_REVIEW'];
    let currentState: 'ORIGINAL' | 'REQUESTED' | 'PARTIAL' | 'UNKNOWN' = 'UNKNOWN';

    // Compare key fields
    const original = request.originalData;
    const requested = request.requestedData;
    const current = currentVoucher;

    // Check if current matches requested
    const matchesRequested = 
      current.inwardNo === requested.inwardNo &&
      current.clientId === requested.clientId &&
      current.clientName === requested.clientName &&
      current.date === requested.date &&
      this.compareInwardItems(current.items, requested.items);

    // Check if current matches original
    const matchesOriginal = 
      current.inwardNo === original.inwardNo &&
      current.clientId === original.clientId &&
      current.clientName === original.clientName &&
      current.date === original.date &&
      this.compareInwardItems(current.items, original.items);

    if (matchesRequested) {
      currentState = 'REQUESTED';
      findings.push('Current voucher matches requested state');
      findings.push('Business execution appears to have completed successfully');
      findings.push('Safe to mark as APPROVED without re-executing');
      safeActions.length = 0;
      safeActions.push('MARK_APPROVED');
    } else if (matchesOriginal) {
      currentState = 'ORIGINAL';
      findings.push('Current voucher matches original state');
      findings.push('Business execution did not modify the voucher');
      findings.push('Failure occurred before voucher update');
      safeActions.length = 0;
      safeActions.push('MANUAL_REVIEW');
    } else {
      currentState = 'PARTIAL';
      findings.push('Current voucher state is partial or unknown');
      findings.push('Cannot reliably determine execution state');
      findings.push('Manual review required');
      safeActions.length = 0;
      safeActions.push('MANUAL_REVIEW');
    }

    return { currentState, findings, safeActions };
  }

  /**
   * Investigate inward voucher AND rental item state (for recovery verification)
   * This is the critical method that ensures both voucher and rental items are consistent
   * 
   * @param transaction - Optional Firestore transaction (currently unused for rental items due to Firestore limitation)
   * NOTE: Firestore transactions don't support collection queries, only document reads.
   * Rental items are read outside the transaction, but the approval request and voucher are read transactionally.
   */
  private async investigateInwardStateWithRentalItems(
    request: EntryApprovalRequest & { originalData: StockReportInwardVoucher; requestedData: StockReportInwardVoucher },
    currentVoucher: FormInwardVoucher,
    _transaction?: Transaction
  ): Promise<InvestigationResult> {
    const findings: string[] = [];
    const safeActions: Array<'MARK_APPROVED' | 'MANUAL_REVIEW' | 'NO_ACTION'> = ['MANUAL_REVIEW'];
    let currentState: 'ORIGINAL' | 'REQUESTED' | 'PARTIAL' | 'UNKNOWN' = 'UNKNOWN';
    let rentalItemsState: 'ORIGINAL' | 'REQUESTED' | 'PARTIAL' | 'UNKNOWN' = 'UNKNOWN';

    // First, check voucher state
    const original = request.originalData;
    const requested = request.requestedData;
    const current = currentVoucher;

    const matchesRequested = 
      current.inwardNo === requested.inwardNo &&
      current.clientId === requested.clientId &&
      current.clientName === requested.clientName &&
      current.date === requested.date &&
      this.compareInwardItems(current.items, requested.items);

    const matchesOriginal = 
      current.inwardNo === original.inwardNo &&
      current.clientId === original.clientId &&
      current.clientName === original.clientName &&
      current.date === original.date &&
      this.compareInwardItems(current.items, original.items);

    if (matchesRequested) {
      currentState = 'REQUESTED';
      findings.push('Current voucher matches requested state');
    } else if (matchesOriginal) {
      currentState = 'ORIGINAL';
      findings.push('Current voucher matches original state');
    } else {
      currentState = 'PARTIAL';
      findings.push('Current voucher state is partial or unknown');
    }

    // CRITICAL: Also verify rental items state
    // Firestore transactions don't support collection queries, only document reads
    // We read rental items outside the transaction but re-validate the decision inside the transaction
    const inwardNoUpper = currentVoucher.inwardNo.toUpperCase();
    const allRentalItems = await rentalItemsService.getAll();
    const voucherRentalItems = allRentalItems.filter(
      (i: RentalItem) => i.inwardNumber.toUpperCase() === inwardNoUpper
    );
    const originalRentalItems = allRentalItems.filter(
      (i: RentalItem) => i.inwardNumber.toUpperCase() === original.inwardNo.toUpperCase()
    );

    // Compare rental items with requested state
    const rentalItemsMatchRequested = this.compareRentalItemsWithVoucher(
      voucherRentalItems,
      requested.items,
      currentVoucher.inwardNo
    );

    // Compare rental items with original state (if original exists)
    const rentalItemsMatchOriginal = this.compareRentalItemsWithVoucher(
      originalRentalItems,
      original.items,
      original.inwardNo
    );

    if (rentalItemsMatchRequested && currentState === 'REQUESTED') {
      rentalItemsState = 'REQUESTED';
      findings.push('Rental items match requested state');
    } else if (rentalItemsMatchOriginal && currentState === 'ORIGINAL') {
      rentalItemsState = 'ORIGINAL';
      findings.push('Rental items match original state');
    } else if (rentalItemsMatchRequested && currentState !== 'REQUESTED') {
      rentalItemsState = 'PARTIAL';
      findings.push('Rental items appear requested but voucher does not - partial state');
    } else if (!rentalItemsMatchRequested && currentState === 'REQUESTED') {
      rentalItemsState = 'PARTIAL';
      findings.push('Voucher appears requested but rental items do not - partial state');
    } else {
      rentalItemsState = 'UNKNOWN';
      findings.push('Cannot reliably determine rental items state');
    }

    // Only allow MARK_APPROVED if BOTH voucher AND rental items match REQUESTED
    if (currentState === 'REQUESTED' && rentalItemsState === 'REQUESTED') {
      findings.push('Business execution appears to have completed successfully (voucher + rental items)');
      findings.push('Safe to mark as APPROVED without re-executing');
      safeActions.length = 0;
      safeActions.push('MARK_APPROVED');
    } else {
      findings.push('State is partial or ambiguous - manual review required');
      safeActions.length = 0;
      safeActions.push('MANUAL_REVIEW');
    }

    return { currentState, rentalItemsState, findings, safeActions };
  }

  /**
   * Compare rental items with voucher items to determine state
   * Uses the same matching logic as inward-update.service.ts
   */
  private compareRentalItemsWithVoucher(
    rentalItems: RentalItem[],
    voucherItems: StockReportInwardVoucher['items'],
    inwardNo: string
  ): boolean {
    const inwardNoUpper = inwardNo.toUpperCase();
    
    // Filter rental items for this voucher
    const voucherRentalItems = rentalItems.filter(
      (i) => i.inwardNumber.toUpperCase() === inwardNoUpper
    );

    // Must have same number of items
    if (voucherRentalItems.length !== voucherItems.length) {
      return false;
    }

    // Check each voucher item has a matching rental item
    for (const voucherItem of voucherItems) {
      // Use exact rental item ID if available
      let matchingRentalItem: RentalItem | undefined;

      if (voucherItem.rentalItemId) {
        matchingRentalItem = voucherRentalItems.find(item => item.id === voucherItem.rentalItemId);
      } else {
        // Legacy fallback: use business field matching with ambiguity check
        const resolution = resolveRentalItem(
          undefined,
          voucherRentalItems,
          {
            itemName: voucherItem.itemName,
            brand: voucherItem.brand,
            batch: voucherItem.batch,
            chamberId: voucherItem.chamberId,
          }
        );

        if (resolution.status === 'exact' || resolution.status === 'legacy-resolved') {
          matchingRentalItem = voucherRentalItems.find(item => item.id === resolution.rentalItemId);
        } else {
          // Ambiguous or unresolved - cannot safely verify
          console.warn(`Cannot verify voucher item due to ${resolution.status}: ${resolution.message}`);
          return false;
        }
      }

      if (!matchingRentalItem) {
        return false;
      }

      // Verify quantities match
      const qty = typeof voucherItem.bags === 'number' ? voucherItem.bags : 0;
      if (matchingRentalItem.inwardQuantity !== qty) {
        return false;
      }

      // Verify weights match
      if (matchingRentalItem.inwardWeight !== voucherItem.totalWeight) {
        return false;
      }
    }

    return true;
  }

  /**
   * Investigate outward voucher and stock state
   */
  private async investigateOutwardState(
    request: EntryApprovalRequest & { originalData: StockReportOutwardVoucher; requestedData: StockReportOutwardVoucher },
    currentVoucher: FormOutwardVoucher
  ): Promise<OutwardInvestigationResult> {
    const findings: string[] = [];
    const safeActions: Array<'MARK_APPROVED' | 'MANUAL_REVIEW' | 'NO_ACTION'> = ['MANUAL_REVIEW'];
    let currentState: 'ORIGINAL' | 'REQUESTED' | 'PARTIAL' | 'UNKNOWN' = 'UNKNOWN';
    let stockState: 'ORIGINAL' | 'REQUESTED' | 'PARTIAL' | 'UNKNOWN' = 'UNKNOWN';

    // Compare key fields
    const original = request.originalData;
    const requested = request.requestedData;
    const current = currentVoucher;

    // Check if current matches requested
    const matchesRequested = 
      current.outwardNo === requested.outwardNo &&
      current.clientId === requested.clientId &&
      current.clientName === requested.clientName &&
      current.date === requested.date &&
      this.compareOutwardItems(current.items, requested.items);

    // Check if current matches original
    const matchesOriginal = 
      current.outwardNo === original.outwardNo &&
      current.clientId === original.clientId &&
      current.clientName === original.clientName &&
      current.date === original.date &&
      this.compareOutwardItems(current.items, original.items);

    if (matchesRequested) {
      currentState = 'REQUESTED';
      findings.push('Current voucher matches requested state');
    } else if (matchesOriginal) {
      currentState = 'ORIGINAL';
      findings.push('Current voucher matches original state');
    } else {
      currentState = 'PARTIAL';
      findings.push('Current voucher state is partial or unknown');
    }

    // Investigate stock state
    const stockInvestigation = await this.investigateOutwardStockState(request, currentVoucher);
    stockState = stockInvestigation.stockState;
    findings.push(...stockInvestigation.findings);

    // Determine safe actions based on combined state
    if (currentState === 'REQUESTED' && stockState === 'REQUESTED') {
      findings.push('Business execution appears to have completed successfully');
      findings.push('Safe to mark as APPROVED without re-executing');
      safeActions.length = 0;
      safeActions.push('MARK_APPROVED');
    } else if (currentState === 'ORIGINAL' && stockState === 'ORIGINAL') {
      findings.push('Business execution did not modify voucher or stock');
      findings.push('Failure occurred before any business changes');
      safeActions.length = 0;
      safeActions.push('MANUAL_REVIEW');
    } else {
      findings.push('State is partial or ambiguous');
      findings.push('Manual review required before any recovery action');
      safeActions.length = 0;
      safeActions.push('MANUAL_REVIEW');
    }

    return { currentState, stockState, findings, safeActions };
  }

  /**
   * Investigate outward stock state by checking rental items
   * 
   * INTENTIONALLY CONSERVATIVE:
   * Outward stock state cannot be reliably reconstructed because:
   * - Stock depends on ALL outward operations, not just this one
   * - Multiple outward vouchers may have affected the same rental items
   * - Without a complete audit trail of all outward operations, we cannot prove
   *   whether the current stock matches what this specific request would have produced
   * 
   * Therefore, stockState is always UNKNOWN for outward recovery.
   * This means automatic MARK_APPROVED is never allowed for outward requests.
   * Outward recovery always requires manual review.
   */
  private async investigateOutwardStockState(
    request: EntryApprovalRequest & { originalData: StockReportOutwardVoucher; requestedData: StockReportOutwardVoucher },
    currentVoucher: FormOutwardVoucher
  ): Promise<{ stockState: 'ORIGINAL' | 'REQUESTED' | 'PARTIAL' | 'UNKNOWN'; findings: string[] }> {
    const findings: string[] = [];
    let stockState: 'ORIGINAL' | 'REQUESTED' | 'PARTIAL' | 'UNKNOWN' = 'UNKNOWN';

    // Load relevant rental items
    const allRentalItems = await rentalItemsService.getAll();
    const relevantItemIds = new Set([
      ...request.originalData.items.map(i => i.sourceRentalItemId),
      ...request.requestedData.items.map(i => i.sourceRentalItemId),
    ].filter(Boolean) as string[]);

    const relevantItems = allRentalItems.filter(item => relevantItemIds.has(item.id));

    if (relevantItems.length === 0) {
      findings.push('No relevant rental items found for stock verification');
      stockState = 'UNKNOWN';
      return { stockState, findings };
    }

    // INTENTIONALLY CONSERVATIVE: Stock state cannot be reliably verified
    findings.push('Stock state verification is complex and requires manual review');
    findings.push('Cannot automatically verify if stock matches requested state');
    findings.push('Stock depends on all outward operations, not just this request');
    findings.push('Outward recovery always requires manual review');
    stockState = 'UNKNOWN';

    return { stockState, findings };
  }

  /**
   * Compare inward items for equality
   */
  private compareInwardItems(currentItems: FormInwardVoucher['items'], targetItems: StockReportInwardVoucher['items']): boolean {
    if (currentItems.length !== targetItems.length) return false;

    const targetMap = new Map(targetItems.map(item => [item.id, item]));
    
    for (const current of currentItems) {
      const target = targetMap.get(current.id);
      if (!target) return false;
      
      if (
        current.itemName !== target.itemName ||
        current.brand !== target.brand ||
        current.batch !== target.batch ||
        current.chamberId !== target.chamberId ||
        current.roomId !== target.roomId ||
        current.blockId !== target.blockId ||
        current.bags !== target.bags ||
        current.unit !== target.unit ||
        current.bagWeight !== target.bagWeight ||
        current.totalWeight !== target.totalWeight
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Compare outward items for equality
   */
  private compareOutwardItems(currentItems: FormOutwardVoucher['items'], targetItems: StockReportOutwardVoucher['items']): boolean {
    if (currentItems.length !== targetItems.length) return false;

    const targetMap = new Map(targetItems.map(item => [item.id, item]));
    
    for (const current of currentItems) {
      const target = targetMap.get(current.id);
      if (!target) return false;
      
      if (
        current.itemName !== target.itemName ||
        current.brand !== target.brand ||
        current.batch !== target.batch ||
        current.chamberId !== target.chamberId ||
        current.roomId !== target.roomId ||
        current.blockId !== target.blockId ||
        current.qty !== target.qty ||
        current.bags !== target.bags ||
        current.bagWeight !== target.bagWeight ||
        current.totalWeight !== target.totalWeight ||
        current.inwardNumber !== target.inwardNumber ||
        current.expDate !== target.expDate ||
        current.sourceRentalItemId !== target.sourceRentalItemId
      ) {
        return false;
      }
    }

    return true;
  }
}

// Export singleton instance
export const approvalRecoveryService = new ApprovalRecoveryService();

import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, runTransaction, updateDoc, deleteField } from 'firebase/firestore';
import { rentalItemsService, vendorsService } from '@/lib/firestore';
import { approvalService } from './approval.service';
import { executeInwardUpdate } from './inward-update.service';
import { executeOutwardUpdate } from './outward-update.service';
import { hasEntryApprovalsPermission } from '@/lib/utils';
import type { User } from '@/lib/types';
import type { EntryApprovalRequest, ApprovalActor } from '@/lib/types/approval';
import type { InwardVoucher as FormInwardVoucher } from '@/components/inventory/bulk-inward-entry-form';
import type { OutwardVoucher as FormOutwardVoucher } from '@/components/outward/bulk-outward-entry-form';
import type { InwardVoucher as StockReportInwardVoucher, OutwardVoucher as StockReportOutwardVoucher } from '@/lib/types/stock-report';

const INWARD_COLLECTION = 'inwardVouchers';
const OUTWARD_COLLECTION = 'outwardVouchers';
const APPROVAL_REQUESTS_COLLECTION = 'entryApprovalRequests';

/**
 * Approval execution result
 */
export type ApprovalExecutionResult =
  | {
      success: true;
      request: EntryApprovalRequest;
    }
  | {
      success: false;
      error: string;
    };

/**
 * Merges stock-report voucher changes into a form-type voucher
 * Preserves all extra fields from the current actual voucher
 * Matches items by ID to prevent metadata corruption
 */
function mergeInwardVoucherChanges(
  currentVoucher: FormInwardVoucher,
  requestedData: StockReportInwardVoucher
): FormInwardVoucher {
  // Create a map of current items by ID for safe lookup
  const currentItemsMap = new Map(currentVoucher.items.map(item => [item.id, item]));
  
  return {
    ...currentVoucher,
    id: currentVoucher.id,
    inwardNo: requestedData.inwardNo,
    clientId: requestedData.clientId,
    clientName: requestedData.clientName,
    date: requestedData.date,
    items: requestedData.items.map((item) => {
      const currentItem = currentItemsMap.get(item.id);
      return {
        id: item.id,
        itemName: item.itemName,
        brand: item.brand,
        batch: item.batch,
        chamberId: item.chamberId,
        roomId: item.roomId,
        blockId: item.blockId,
        bags: item.bags,
        unit: item.unit,
        bagWeight: item.bagWeight,
        totalWeight: item.totalWeight,
        // Preserve mfgDate and expDate from current (not in stock-report type)
        mfgDate: currentItem?.mfgDate || '',
        expDate: currentItem?.expDate || '',
      };
    }),
    // Preserve audit fields from requested
    createdById: requestedData.createdById,
    createdByName: requestedData.createdByName,
    createdAt: requestedData.createdAt,
    updatedById: requestedData.updatedById,
    updatedByName: requestedData.updatedByName,
    updatedAt: requestedData.updatedAt,
    updateReason: requestedData.updateReason,
  };
}

/**
 * Merges stock-report outward voucher changes into a form-type voucher
 * Preserves all extra fields from the current actual voucher
 * Matches items by ID to prevent metadata corruption
 */
function mergeOutwardVoucherChanges(
  currentVoucher: FormOutwardVoucher,
  requestedData: StockReportOutwardVoucher
): FormOutwardVoucher {
  // Create a map of current items by ID for safe lookup
  const currentItemsMap = new Map(currentVoucher.items.map(item => [item.id, item]));
  
  return {
    ...currentVoucher,
    id: currentVoucher.id,
    outwardNo: requestedData.outwardNo,
    clientId: requestedData.clientId,
    clientName: requestedData.clientName,
    date: requestedData.date,
    items: requestedData.items.map((item) => {
      const currentItem = currentItemsMap.get(item.id);
      return {
        id: item.id,
        itemName: item.itemName,
        brand: item.brand,
        batch: item.batch,
        chamberId: item.chamberId,
        roomId: item.roomId,
        blockId: item.blockId,
        qty: item.qty,
        bags: item.bags,
        bagWeight: item.bagWeight,
        totalWeight: item.totalWeight,
        inwardNumber: item.inwardNumber,
        expDate: item.expDate,
        sourceRentalItemId: item.sourceRentalItemId,
      };
    }),
    // Preserve audit fields from requested
    createdById: requestedData.createdById,
    createdByName: requestedData.createdByName,
    createdAt: requestedData.createdAt,
    updatedById: requestedData.updatedById,
    updatedByName: requestedData.updatedByName,
    updatedAt: requestedData.updatedAt,
    updateReason: requestedData.updateReason,
  };
}

/**
 * Approval Execution Service
 * 
 * Handles the actual execution of approved entry changes.
 * This service ensures business execution completes successfully before marking requests as APPROVED.
 */
class ApprovalExecutionService {
  /**
   * Execute an approval request
   * 
   * Order of operations:
   * 1. Validate service-level authorization
   * 2. Load approval request
   * 3. Validate PENDING status
   * 4. Atomically claim: PENDING → PROCESSING (Firestore transaction)
   * 5. Load current actual entry from Firestore
   * 6. Validate stale state (if stale: PROCESSING → FAILED)
   * 7. Execute requested business update
   * 8. Only after business execution succeeds: PROCESSING → APPROVED
   * 9. If business execution fails: PROCESSING → FAILED
   * 
   * @param requestId - The approval request ID
   * @param approver - The approver actor information
   * @param user - The user object for authorization check
   * @param approvalReason - Optional reason for approval
   * @returns Execution result
   */
  async executeApproval(
    requestId: string,
    approver: ApprovalActor,
    user: User,
    approvalReason?: string
  ): Promise<ApprovalExecutionResult> {
    // 1. Service-level authorization check
    if (!hasEntryApprovalsPermission(user)) {
      return {
        success: false,
        error: 'User does not have permission to execute approval requests',
      };
    }

    // 2. Load approval request
    const request = await approvalService.getApprovalRequestById(requestId);
    if (!request) {
      return {
        success: false,
        error: 'Approval request not found',
      };
    }

    // 3. Validate PENDING status
    if (request.status !== 'PENDING') {
      return {
        success: false,
        error: `Cannot approve a request that is already ${request.status.toLowerCase()}`,
      };
    }

    // 4. Atomically claim: PENDING → PROCESSING (prevents concurrent execution)
    try {
      await runTransaction(db, async (transaction) => {
        const requestRef = doc(db, APPROVAL_REQUESTS_COLLECTION, requestId);
        const requestSnap = await transaction.get(requestRef);
        
        if (!requestSnap.exists()) {
          throw new Error('Approval request not found during transaction');
        }

        const requestInTx = requestSnap.data() as EntryApprovalRequest;
        
        // Double-check PENDING status inside transaction
        if (requestInTx.status !== 'PENDING') {
          throw new Error(`Request is already ${requestInTx.status.toLowerCase()}`);
        }

        // Mark request PROCESSING inside transaction (claims the request)
        const now = new Date().toISOString();
        transaction.update(requestRef, {
          status: 'PROCESSING',
          processingBy: approver,
          processingAt: now,
          executionStage: 'CLAIMED',
          executionStageUpdatedAt: now,
        });
      });
    } catch (error) {
      console.error('[APPROVAL-EXECUTION] Failed to claim request:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to claim approval request. It may be processing or already approved by another user.',
      };
    }

    // 5. Load current actual entry from Firestore
    let currentVoucher: FormInwardVoucher | FormOutwardVoucher | null = null;
    const executionStartedAt = new Date().toISOString();
    
    try {
      if (request.entryType === 'INWARD') {
        const snap = await getDoc(doc(db, INWARD_COLLECTION, request.entryId));
        if (!snap.exists()) {
          throw new Error('Original inward voucher not found');
        }
        currentVoucher = { id: snap.id, ...snap.data() } as FormInwardVoucher;
      } else {
        const snap = await getDoc(doc(db, OUTWARD_COLLECTION, request.entryId));
        if (!snap.exists()) {
          throw new Error('Original outward voucher not found');
        }
        currentVoucher = { id: snap.id, ...snap.data() } as FormOutwardVoucher;
      }
    } catch (error) {
      console.error('[APPROVAL-EXECUTION] Failed to load voucher:', error);
      // Transition to FAILED with stage tracking
      await this.transitionToFailed(requestId, approver, 'VOUCHER_LOAD', error instanceof Error ? error.message : 'Failed to load original voucher', executionStartedAt);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load original voucher',
      };
    }

    // 6. Validate stale state (if stale: PROCESSING → FAILED)
    // First try version-based validation if both versions are available
    if (typeof request.originalVersion === 'number' && typeof currentVoucher.version === 'number') {
      if (currentVoucher.version !== request.originalVersion) {
        // Check if version change was caused by this same approval request (idempotency)
        if (currentVoucher.voucherWriteApprovalRequestId === requestId) {
          console.log('[APPROVAL-EXECUTION] Version change was caused by this approval request, allowing retry');
          // Version change is from same request, allow retry
        } else {
          // Version change is from external edit, block execution
          const error = `This approval request is stale because the voucher has been modified (version mismatch: request version ${request.originalVersion}, current version ${currentVoucher.version}). Please review the current state and create a new request if needed.`;
          console.error('[APPROVAL-EXECUTION]', error);
          // Transition to FAILED with stage tracking
          await this.transitionToFailed(requestId, approver, 'STALE_CHECK', error, executionStartedAt);
          return {
            success: false,
            error,
          };
        }
      }
    } else {
      // Fall back to timestamp-based validation for historical data
      if (!request.originalEntryUpdatedAt || !currentVoucher.updatedAt) {
        const error = 'Cannot validate stale state: missing timestamp information. Please contact support.';
        console.error('[APPROVAL-EXECUTION]', error);
        // Transition to FAILED with stage tracking
        await this.transitionToFailed(requestId, approver, 'STALE_CHECK', error, executionStartedAt);
        return {
          success: false,
          error,
        };
      }

      const originalUpdatedAt = new Date(request.originalEntryUpdatedAt).getTime();
      const currentUpdatedAt = new Date(currentVoucher.updatedAt).getTime();
      
      if (currentUpdatedAt > originalUpdatedAt) {
        const error = 'This approval request is stale because the original entry has changed since the request was created. Please review the current state and create a new request if needed.';
        console.error('[APPROVAL-EXECUTION]', error);
        // Transition to FAILED with stage tracking (not PENDING, to prevent unsafe re-execution)
        await this.transitionToFailed(requestId, approver, 'STALE_CHECK', error, executionStartedAt);
        return {
          success: false,
          error,
        };
      }
    }

    // 7. Execute business update
    try {
      if (request.entryType === 'INWARD') {
        await this.executeInwardApproval(request, currentVoucher as FormInwardVoucher, requestId, approver, executionStartedAt);
      } else {
        await this.executeOutwardApproval(request, currentVoucher as FormOutwardVoucher, requestId, approver, executionStartedAt);
      }
    } catch (error) {
      console.error('[APPROVAL-EXECUTION] Business execution failed:', error);
      const failureReason = error instanceof Error ? error.message : 'Business execution failed';
      // Transition to FAILED with UNKNOWN stage (execution failed at unknown point)
      await this.transitionToFailed(requestId, approver, 'UNKNOWN', failureReason, executionStartedAt);
      return {
        success: false,
        error: failureReason,
      };
    }

    // 8. Only after successful business execution: PROCESSING → APPROVED
    // Use transaction to atomically update status and clear the lock
    try {
      await runTransaction(db, async (transaction) => {
        // Read approval request
        const requestRef = doc(db, APPROVAL_REQUESTS_COLLECTION, requestId);
        const requestSnap = await transaction.get(requestRef);
        
        if (!requestSnap.exists()) {
          throw new Error('Approval request not found during transaction');
        }

        const requestInTx = requestSnap.data() as EntryApprovalRequest;
        
        // Verify request is still PROCESSING (not already terminal)
        if (requestInTx.status !== 'PROCESSING') {
          throw new Error(`Request is already ${requestInTx.status.toLowerCase()}. Cannot mark as APPROVED.`);
        }

        // Determine voucher collection
        const voucherCollection = requestInTx.entryType === 'INWARD' ? INWARD_COLLECTION : OUTWARD_COLLECTION;
        const voucherRef = doc(db, voucherCollection, requestInTx.entryId);
        const voucherSnap = await transaction.get(voucherRef);
        
        if (!voucherSnap.exists()) {
          throw new Error('Voucher not found during transaction');
        }

        const voucherData = voucherSnap.data();
        
        // Only clear the lock if it belongs to this request
        if (voucherData.activeApprovalRequestId === requestId) {
          transaction.update(voucherRef, {
            activeApprovalRequestId: deleteField(),
          });
        }

        // Update approval request status
        const now = new Date().toISOString();
        transaction.update(requestRef, {
          status: 'APPROVED',
          approvedBy: approver,
          approvedAt: now,
          approvalReason: approvalReason || '',
        });
      });
    } catch (error) {
      console.error('[APPROVAL-EXECUTION] CRITICAL: Business execution succeeded but status/lock update failed');
      // Transition to FAILED since we can't mark APPROVED
      await this.transitionToFailed(requestId, approver, 'APPROVAL_STATUS_UPDATE', 'Business execution succeeded but failed to mark APPROVED. Please contact support.', executionStartedAt);
      return {
        success: false,
        error: 'Changes were applied but failed to update approval status. Please contact support.',
      };
    }

    // Reload request to return updated state
    const updatedRequest = await approvalService.getApprovalRequestById(requestId);
    return {
      success: true,
      request: updatedRequest!,
    };
  }

  /**
   * Execute INWARD approval
   */
  private async executeInwardApproval(
    request: EntryApprovalRequest,
    currentVoucher: FormInwardVoucher,
    requestId: string,
    approver: ApprovalActor,
    executionStartedAt: string
  ): Promise<void> {
    // Update execution stage to EXECUTION_STARTED
    await updateDoc(doc(db, APPROVAL_REQUESTS_COLLECTION, requestId), {
      executionStage: 'EXECUTION_STARTED',
      executionStageUpdatedAt: new Date().toISOString(),
    });

    // Merge requested changes into current voucher (preserves extra fields)
    const requestedVoucher = mergeInwardVoucherChanges(
      currentVoucher,
      request.requestedData as StockReportInwardVoucher
    );

    // Save the updated voucher to Firestore with version increment and idempotency marker
    try {
      const { id, ...rest } = requestedVoucher;
      const currentVersion = typeof currentVoucher.version === 'number' ? currentVoucher.version : 0;
      const nextVersion = currentVersion + 1;
      
      await runTransaction(db, async (transaction) => {
        const voucherRef = doc(db, INWARD_COLLECTION, id);
        const voucherSnap = await transaction.get(voucherRef);
        
        if (!voucherSnap.exists()) {
          throw new Error('Voucher not found during transaction');
        }

        // Check if this approval request already wrote the voucher (idempotency)
        const voucherData = voucherSnap.data();
        if (voucherData.voucherWriteApprovalRequestId === requestId) {
          console.log('[APPROVAL-EXECUTION] Voucher already written by this approval request, skipping write');
          return; // Skip write, version already incremented
        }

        // Write voucher with version increment and idempotency marker atomically
        transaction.update(voucherRef, {
          ...rest,
          version: nextVersion,
          voucherWriteApprovalRequestId: requestId,
        });
      });
      
      // Update execution stage to VOUCHER_UPDATED
      await updateDoc(doc(db, APPROVAL_REQUESTS_COLLECTION, requestId), {
        executionStage: 'VOUCHER_UPDATED',
        executionStageUpdatedAt: new Date().toISOString(),
      });
    } catch (error) {
      await this.transitionToFailed(requestId, approver, 'INWARD_VOUCHER_SAVE', error instanceof Error ? error.message : 'Failed to save inward voucher', executionStartedAt);
      throw error;
    }

    // Execute rental item updates using the reusable service
    try {
      const allRentalItems = await rentalItemsService.getAll();
      const vendors = await vendorsService.getAll();
      await executeInwardUpdate(requestedVoucher, allRentalItems, vendors);
      // Update execution stage to RENTAL_ITEMS_UPDATED
      await updateDoc(doc(db, APPROVAL_REQUESTS_COLLECTION, requestId), {
        executionStage: 'RENTAL_ITEMS_UPDATED',
        executionStageUpdatedAt: new Date().toISOString(),
      });
    } catch (error) {
      await this.transitionToFailed(requestId, approver, 'INWARD_RENTAL_ITEM_UPDATE', error instanceof Error ? error.message : 'Failed to update rental items', executionStartedAt);
      throw error;
    }
  }

  /**
   * Execute OUTWARD approval
   */
  private async executeOutwardApproval(
    request: EntryApprovalRequest,
    currentVoucher: FormOutwardVoucher,
    requestId: string,
    approver: ApprovalActor,
    executionStartedAt: string
  ): Promise<void> {
    // Update execution stage to EXECUTION_STARTED
    await updateDoc(doc(db, APPROVAL_REQUESTS_COLLECTION, requestId), {
      executionStage: 'EXECUTION_STARTED',
      executionStageUpdatedAt: new Date().toISOString(),
    });

    // Merge requested changes into current voucher (preserves extra fields)
    const requestedVoucher = mergeOutwardVoucherChanges(
      currentVoucher,
      request.requestedData as StockReportOutwardVoucher
    );

    // Execute outward update using the reusable service
    // This uses a single atomic transaction: read all rental items, validate, write voucher, update stock
    try {
      const currentVersion = typeof currentVoucher.version === 'number' ? currentVoucher.version : 0;
      await executeOutwardUpdate(requestedVoucher, currentVoucher, currentVersion, true, requestId);
      // Update execution stage to STOCK_UPDATED
      await updateDoc(doc(db, APPROVAL_REQUESTS_COLLECTION, requestId), {
        executionStage: 'STOCK_UPDATED',
        executionStageUpdatedAt: new Date().toISOString(),
      });
    } catch (error) {
      // We can't determine exact stage without modifying executeOutwardUpdate
      // Use UNKNOWN stage for outward execution failures
      await this.transitionToFailed(requestId, approver, 'UNKNOWN', error instanceof Error ? error.message : 'Failed to execute outward update', executionStartedAt);
      throw error;
    }
  }

  /**
   * Reject an approval request
   * 
   * This only updates the approval request status.
   * No business data is modified.
   * 
   * @param requestId - The approval request ID
   * @param rejector - The rejector actor information
   * @param user - The user object for authorization check
   * @param rejectionReason - Reason for rejection
   * @returns Result of rejection
   */
  async rejectApproval(
    requestId: string,
    rejector: ApprovalActor,
    user: User,
    rejectionReason: string
  ): Promise<{ success: boolean; error?: string }> {
    // Service-level authorization check
    if (!hasEntryApprovalsPermission(user)) {
      return {
        success: false,
        error: 'User does not have permission to reject approval requests',
      };
    }

    const result = await approvalService.updateApprovalStatus({
      requestId,
      status: 'REJECTED',
      actor: rejector,
      reason: rejectionReason,
      user, // Pass user for authorization (internal call, already authorized)
    });
    return result;
  }

  /**
   * Helper method to transition to FAILED with stage tracking
   * Clears the lock if no business execution occurred (partialExecutionPossible === false)
   */
  private async transitionToFailed(
    requestId: string,
    approver: ApprovalActor,
    stage: 'STALE_CHECK' | 'VOUCHER_LOAD' | 'INWARD_VOUCHER_SAVE' | 'INWARD_RENTAL_ITEM_UPDATE' | 'INWARD_RENTAL_ITEM_CREATE' | 'INWARD_RENTAL_ITEM_DELETE' | 'OUTWARD_REVERSE_STOCK' | 'OUTWARD_VOUCHER_SAVE' | 'OUTWARD_APPLY_STOCK' | 'APPROVAL_STATUS_UPDATE' | 'UNKNOWN',
    message: string,
    executionStartedAt: string
  ): Promise<void> {
    const { entryApprovalRequestsService } = await import('@/lib/firestore');
    const partialExecutionPossible = this.isPartialExecutionPossible(stage);
    
    // Direct Firestore update for internal failure transition
    // This bypasses the authorization check since it's an internal system transition
    await entryApprovalRequestsService.update(requestId, {
      status: 'FAILED',
      failedAt: new Date().toISOString(),
      failureReason: message,
    });

    // Add structured failure info
    await entryApprovalRequestsService.update(requestId, {
      failureInfo: {
        failedAt: new Date().toISOString(),
        stage,
        message,
        partialExecutionPossible,
        executionStartedAt,
      },
    });

    // Clear the lock if no business execution occurred
    if (!partialExecutionPossible) {
      try {
        await runTransaction(db, async (transaction) => {
          // Read approval request
          const requestRef = doc(db, APPROVAL_REQUESTS_COLLECTION, requestId);
          const requestSnap = await transaction.get(requestRef);
          
          if (!requestSnap.exists()) {
            throw new Error('Approval request not found during transaction');
          }

          const requestInTx = requestSnap.data() as EntryApprovalRequest;
          
          // Determine voucher collection
          const voucherCollection = requestInTx.entryType === 'INWARD' ? INWARD_COLLECTION : OUTWARD_COLLECTION;
          const voucherRef = doc(db, voucherCollection, requestInTx.entryId);
          const voucherSnap = await transaction.get(voucherRef);
          
          if (!voucherSnap.exists()) {
            throw new Error('Voucher not found during transaction');
          }

          const voucherData = voucherSnap.data();
          
          // Only clear the lock if it belongs to this request
          if (voucherData.activeApprovalRequestId === requestId) {
            transaction.update(voucherRef, {
              activeApprovalRequestId: deleteField(),
            });
          }
        });
      } catch (error) {
        console.error('[APPROVAL-EXECUTION] Failed to clear lock after non-partial failure:', error);
        // Lock clearing failure is not critical - lock will be cleaned up by manual repair if needed
      }
    }
  }

  /**
   * Determine if partial execution is possible based on failure stage
   */
  private isPartialExecutionPossible(stage: 'STALE_CHECK' | 'VOUCHER_LOAD' | 'INWARD_VOUCHER_SAVE' | 'INWARD_RENTAL_ITEM_UPDATE' | 'INWARD_RENTAL_ITEM_CREATE' | 'INWARD_RENTAL_ITEM_DELETE' | 'OUTWARD_REVERSE_STOCK' | 'OUTWARD_VOUCHER_SAVE' | 'OUTWARD_APPLY_STOCK' | 'APPROVAL_STATUS_UPDATE' | 'UNKNOWN'): boolean {
    const partialStages: typeof stage[] = [
      'INWARD_VOUCHER_SAVE',
      'INWARD_RENTAL_ITEM_UPDATE',
      'INWARD_RENTAL_ITEM_CREATE',
      'OUTWARD_REVERSE_STOCK',
      'OUTWARD_VOUCHER_SAVE',
      'OUTWARD_APPLY_STOCK',
    ];
    return partialStages.includes(stage);
  }
}

// Export singleton instance
export const approvalExecutionService = new ApprovalExecutionService();

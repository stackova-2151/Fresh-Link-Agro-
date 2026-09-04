import type { UserRole, User } from '@/lib/types';
import type { InwardVoucher, OutwardVoucher } from './stock-report';

/**
 * Approval request status
 */
export type EntryApprovalStatus = 'PENDING' | 'PROCESSING' | 'APPROVED' | 'REJECTED' | 'FAILED';

/**
 * Entry type being approved
 */
export type EntryApprovalEntryType = 'INWARD' | 'OUTWARD';

/**
 * Actor who performed an action (requester, approver, rejector)
 */
export interface ApprovalActor {
  id: string;
  name: string;
  role: UserRole;
}

/**
 * Entry approval request
 * Stores the complete original and requested voucher data for comparison
 */
export interface EntryApprovalRequest {
  id: string;

  // Entry identification
  entryType: EntryApprovalEntryType;
  entryId: string; // Actual Firestore document ID of the voucher
  entryNumber: string; // INW-001 / OUT-001

  // Complete voucher snapshots for comparison
  originalData: InwardVoucher | OutwardVoucher;
  requestedData: InwardVoucher | OutwardVoucher;

  // Changed field paths for UI display
  changedFields: string[];

  // Request information
  requestReason: string;
  requestedBy: ApprovalActor;
  requestedAt: string; // ISO timestamp

  // Status
  status: EntryApprovalStatus;

  // Approval information (populated when approved)
  approvedBy?: ApprovalActor;
  approvedAt?: string; // ISO timestamp
  approvalReason?: string;

  // Rejection information (populated when rejected)
  rejectedBy?: ApprovalActor;
  rejectedAt?: string; // ISO timestamp
  rejectionReason?: string;

  // Failure information (populated when execution fails)
  failedAt?: string; // ISO timestamp
  failureReason?: string;
  failureInfo?: {
    failedAt: string;
    stage:
      | 'STALE_CHECK'
      | 'VOUCHER_LOAD'
      | 'INWARD_VOUCHER_SAVE'
      | 'INWARD_RENTAL_ITEM_UPDATE'
      | 'INWARD_RENTAL_ITEM_CREATE'
      | 'INWARD_RENTAL_ITEM_DELETE'
      | 'OUTWARD_REVERSE_STOCK'
      | 'OUTWARD_VOUCHER_SAVE'
      | 'OUTWARD_APPLY_STOCK'
      | 'APPROVAL_STATUS_UPDATE'
      | 'UNKNOWN';
    message: string;
    partialExecutionPossible: boolean;
    executionStartedAt?: string;
  };

  // Recovery information (populated when recovered)
  recoveredBy?: ApprovalActor;
  recoveredAt?: string; // ISO timestamp
  recoveryReason?: string;

  // Recovery investigation audit trail (populated when recovery succeeds)
  recoveryInvestigation?: {
    investigatedAt: string; // ISO timestamp
    currentState: 'ORIGINAL' | 'REQUESTED' | 'PARTIAL' | 'UNKNOWN';
    stockState?: 'ORIGINAL' | 'REQUESTED' | 'PARTIAL' | 'UNKNOWN';
    rentalItemsState?: 'ORIGINAL' | 'REQUESTED' | 'PARTIAL' | 'UNKNOWN';
    findings: string[];
    safeActions: Array<'MARK_APPROVED' | 'MANUAL_REVIEW' | 'NO_ACTION'>;
  };

  // Processing recovery investigation audit trail (populated when PROCESSING recovery succeeds)
  processingRecoveryInvestigation?: {
    investigatedAt: string; // ISO timestamp
    processingAgeMs: number;
    executionState: 'NOT_STARTED' | 'COMPLETED' | 'PARTIAL' | 'UNKNOWN';
    currentState: 'ORIGINAL' | 'REQUESTED' | 'PARTIAL' | 'UNKNOWN';
    stockState?: 'ORIGINAL' | 'REQUESTED' | 'PARTIAL' | 'UNKNOWN';
    rentalItemsState?: 'ORIGINAL' | 'REQUESTED' | 'PARTIAL' | 'UNKNOWN';
    findings: string[];
    safeActions: Array<'MARK_FAILED' | 'MARK_APPROVED' | 'MANUAL_REVIEW'>;
  };

  // Processing information (populated when processing)
  processingBy?: ApprovalActor;
  processingAt?: string; // ISO timestamp
  
  // Execution progress markers (populated during execution for accurate recovery)
  executionStage?: 'CLAIMED' | 'VALIDATING' | 'EXECUTION_STARTED' | 'VOUCHER_UPDATED' | 'RENTAL_ITEMS_UPDATED' | 'STOCK_UPDATED' | 'BUSINESS_EXECUTION_COMPLETED';
  executionStageUpdatedAt?: string; // ISO timestamp of last stage update

  // Idempotency marker for voucher write (prevents stale validation from blocking same-request retry)
  voucherWriteApprovalRequestId?: string;

  // Version control for stale request protection
  originalEntryUpdatedAt?: string; // ISO timestamp of original voucher at request time (legacy)
  originalVersion?: number; // Version number of original voucher at request time
}

/**
 * Input for creating an approval request
 */
export interface CreateApprovalRequestInput {
  entryType: EntryApprovalEntryType;
  entryId: string;
  entryNumber: string;
  originalData: InwardVoucher | OutwardVoucher;
  requestedData: InwardVoucher | OutwardVoucher;
  requestReason: string;
  requester: ApprovalActor;
}

/**
 * Result of approval request creation
 */
export interface CreateApprovalRequestResult {
  success: boolean;
  request?: EntryApprovalRequest;
  error?: string;
}

/**
 * Input for updating approval request status
 */
export interface UpdateApprovalStatusInput {
  requestId: string;
  status: EntryApprovalStatus;
  actor: ApprovalActor;
  reason?: string;
  user: User; // REQUIRED for authorization
}

/**
 * Approval recovery investigation result
 */
export type ApprovalRecoveryInvestigation = {
  requestId: string;
  entryType: 'INWARD' | 'OUTWARD';
  currentState: 'ORIGINAL' | 'REQUESTED' | 'PARTIAL' | 'UNKNOWN';
  voucherExists: boolean;
  stockState?: 'ORIGINAL' | 'REQUESTED' | 'PARTIAL' | 'UNKNOWN';
  rentalItemsState?: 'ORIGINAL' | 'REQUESTED' | 'PARTIAL' | 'UNKNOWN';
  failureInfo?: EntryApprovalRequest['failureInfo'];
  findings: string[];
  safeActions: Array<'MARK_APPROVED' | 'MANUAL_REVIEW' | 'NO_ACTION'>;
};

/**
 * Input for marking a failed request as approved after verification
 */
export interface MarkApprovedAfterRecoveryInput {
  requestId: string;
  actor: ApprovalActor;
  recoveryReason: string;
}

/**
 * Input for investigating a processing approval request
 */
export interface InvestigateProcessingApprovalInput {
  requestId: string;
}

/**
 * Result of processing approval investigation
 */
export type ProcessingApprovalInvestigation = {
  requestId: string;
  entryType: 'INWARD' | 'OUTWARD';
  processingAgeMs: number;
  executionState: 'NOT_STARTED' | 'COMPLETED' | 'PARTIAL' | 'UNKNOWN';
  currentState: 'ORIGINAL' | 'REQUESTED' | 'PARTIAL' | 'UNKNOWN';
  stockState?: 'ORIGINAL' | 'REQUESTED' | 'PARTIAL' | 'UNKNOWN';
  rentalItemsState?: 'ORIGINAL' | 'REQUESTED' | 'PARTIAL' | 'UNKNOWN';
  findings: string[];
  safeActions: Array<'MARK_FAILED' | 'MARK_APPROVED' | 'MANUAL_REVIEW'>;
};

/**
 * Input for marking a processing request as failed after investigation
 */
export interface MarkFailedAfterProcessingRecoveryInput {
  requestId: string;
  actor: ApprovalActor;
  recoveryReason: string;
}

/**
 * Input for marking a processing request as approved after investigation
 */
export interface MarkApprovedAfterProcessingRecoveryInput {
  requestId: string;
  actor: ApprovalActor;
  recoveryReason: string;
}

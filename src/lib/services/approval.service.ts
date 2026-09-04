import { db } from '@/lib/firebase';
import { doc, getDoc, runTransaction, collection, deleteField } from 'firebase/firestore';
import { entryApprovalRequestsService } from '@/lib/firestore';
import { calculateChangedFields } from '@/lib/utils/approval-diff';
import { hasEntryApprovalsPermission } from '@/lib/utils';
import type {
  EntryApprovalRequest,
  CreateApprovalRequestInput,
  CreateApprovalRequestResult,
  UpdateApprovalStatusInput,
} from '@/lib/types/approval';

/**
 * Recursively removes undefined values from objects and arrays.
 * Preserves null, strings, numbers, booleans, arrays, nested objects, and Firestore special types.
 * Does NOT mutate the original objects.
 * 
 * @param value - The value to clean
 * @returns A new value with undefined fields removed
 */
function removeUndefinedFields<T>(value: T): T {
  if (value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(removeUndefinedFields) as T;
  }

  if (value === null || typeof value !== 'object') {
    return value;
  }

  // Handle Firestore special types (Timestamp, GeoPoint, DocumentReference, FieldValue)
  // These are objects but should not be recursively processed
  if (
    value instanceof Date ||
    (value as any).toDate || // Firestore Timestamp
    (value as any).latitude !== undefined || // GeoPoint
    (value as any).isEqual // DocumentReference or FieldValue
  ) {
    return value;
  }

  // Regular object - recursively remove undefined fields
  const result: Record<string, unknown> = {};
  for (const [key, fieldValue] of Object.entries(value as Record<string, unknown>)) {
    if (fieldValue !== undefined) {
      result[key] = removeUndefinedFields(fieldValue);
    }
  }
  return result as T;
}

/**
 * Approval Service
 * 
 * Handles approval request creation, retrieval, and status updates.
 * This service does NOT execute actual voucher updates - that is handled in later phases.
 */
class ApprovalService {
  /**
   * Create a new approval request
   *
   * @param input - Approval request creation data
   * @returns Result with success status, created request, or error
   */
  async createApprovalRequest(
    input: CreateApprovalRequestInput
  ): Promise<CreateApprovalRequestResult> {
    const {
      entryType,
      entryId,
      entryNumber,
      originalData,
      requestedData,
      requestReason,
      requester,
    } = input;

    // Validate required fields
    if (!entryType || !entryId || !entryNumber || !originalData || !requestedData || !requestReason || !requester) {
      return {
        success: false,
        error: 'Missing required fields for approval request creation',
      };
    }

    // Calculate changed fields
    const changedFields = calculateChangedFields(originalData, requestedData);

    // If no changes detected, reject
    if (changedFields.length === 0) {
      return {
        success: false,
        error: 'No changes detected between original and requested data',
      };
    }

    // Determine the correct voucher collection
    const voucherCollection = entryType === 'INWARD' ? 'inwardVouchers' : 'outwardVouchers';

    // Generate approval request ID before transaction (immutable document)
    const approvalRequestRef = doc(collection(db, 'entryApprovalRequests'));
    const requestId = approvalRequestRef.id;

    try {
      // Use transaction to atomically check lock and create request
      await runTransaction(db, async (transaction) => {
        // Read the voucher document
        const voucherRef = doc(db, voucherCollection, entryId);
        const voucherSnap = await transaction.get(voucherRef);

        if (!voucherSnap.exists()) {
          throw new Error('Voucher not found');
        }

        const voucherData = voucherSnap.data();

        // Check for existing active approval request lock
        const existingLock = voucherData.activeApprovalRequestId;
        if (existingLock) {
          throw new Error('This voucher already has an active approval request');
        }

        // Capture current version from Firestore voucher
        const currentVersion = typeof voucherData.version === 'number'
          ? voucherData.version
          : 0;

        // Create Firestore-safe copies by removing undefined values
        const firestoreSafeOriginalData = removeUndefinedFields(originalData);
        const firestoreSafeRequestedData = removeUndefinedFields(requestedData);

        // Create approval request
        const now = new Date().toISOString();
        const approvalRequest: Omit<EntryApprovalRequest, 'id'> = {
          entryType,
          entryId,
          entryNumber,
          originalData: firestoreSafeOriginalData,
          requestedData: firestoreSafeRequestedData,
          changedFields,
          requestReason,
          requestedBy: requester,
          requestedAt: now,
          status: 'PENDING',
          originalVersion: currentVersion,
        };

        // Conditionally include originalEntryUpdatedAt only if defined (legacy field)
        if (firestoreSafeOriginalData.updatedAt !== undefined) {
          (approvalRequest as any).originalEntryUpdatedAt = firestoreSafeOriginalData.updatedAt;
        }

        // Create the immutable approval request document
        transaction.set(approvalRequestRef, approvalRequest);

        // Set the lock on the voucher document
        transaction.update(voucherRef, {
          activeApprovalRequestId: requestId,
        });
      });

      // Fetch the created request to return it
      const createdRequest = await entryApprovalRequestsService.getById(requestId);
      if (!createdRequest) {
        return {
          success: false,
          error: 'Failed to retrieve created approval request',
        };
      }

      return {
        success: true,
        request: createdRequest,
      };
    } catch (error) {
      console.error('[APPROVAL-SERVICE] Failed to create approval request:', error);

      // Check if the error is due to existing lock
      if (error instanceof Error && error.message === 'This voucher already has an active approval request') {
        return {
          success: false,
          error: 'This voucher already has an active approval request',
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create approval request',
      };
    }
  }

  /**
   * Get all approval requests
   */
  async getAllApprovalRequests(): Promise<EntryApprovalRequest[]> {
    return entryApprovalRequestsService.getAll();
  }

  /**
   * Get approval request by ID
   */
  async getApprovalRequestById(id: string): Promise<EntryApprovalRequest | null> {
    return entryApprovalRequestsService.getById(id);
  }

  /**
   * Get approval requests by status
   */
  async getApprovalRequestsByStatus(status: EntryApprovalRequest['status']): Promise<EntryApprovalRequest[]> {
    return entryApprovalRequestsService.getByStatus(status);
  }

  /**
   * Get approval requests by entry ID
   */
  async getApprovalRequestsByEntry(entryId: string): Promise<EntryApprovalRequest[]> {
    return entryApprovalRequestsService.getByEntry(entryId);
  }

  /**
   * Update approval request status
   * 
   * This only updates the status and actor information.
   * Actual voucher execution is handled in later phases.
   * 
   * Authorization: Requires entryApprovalsPermission. User parameter is REQUIRED.
   */
  async updateApprovalStatus(input: UpdateApprovalStatusInput): Promise<{ success: boolean; error?: string }> {
    const { requestId, status, actor, reason, user } = input;

    // CRITICAL: User parameter is REQUIRED for authorization
    // Missing user is a programming error, not an optional bypass
    if (!user) {
      return {
        success: false,
        error: 'User parameter is required for authorization',
      };
    }

    // Service-level authorization check
    if (!hasEntryApprovalsPermission(user)) {
      return {
        success: false,
        error: 'User does not have permission to update approval status',
      };
    }

    // Validate required fields
    if (!requestId || !status || !actor) {
      return {
        success: false,
        error: 'Missing required fields for status update',
      };
    }

    // Validate status
    if (status !== 'APPROVED' && status !== 'REJECTED' && status !== 'PROCESSING' && status !== 'FAILED') {
      return {
        success: false,
        error: 'Invalid status. Must be APPROVED, REJECTED, PROCESSING, or FAILED',
      };
    }

    // Validate reason for reject (required), approve (optional)
    if (status === 'REJECTED' && (!reason || reason.trim() === '')) {
      return {
        success: false,
        error: 'Rejection reason is required',
      };
    }

    // Validate reason for failed (required)
    if (status === 'FAILED' && (!reason || reason.trim() === '')) {
      return {
        success: false,
        error: 'Failure reason is required',
      };
    }

    // Get existing request
    const existing = await entryApprovalRequestsService.getById(requestId);
    if (!existing) {
      return {
        success: false,
        error: 'Approval request not found',
      };
    }

    // Validate current status transitions
    // PENDING can go to: PROCESSING, REJECTED
    // PROCESSING can go to: APPROVED, FAILED
    // FAILED is terminal - recovery must go through approvalRecoveryService
    // APPROVED, REJECTED are terminal
    if (existing.status === 'PENDING' && status !== 'PROCESSING' && status !== 'REJECTED') {
      return {
        success: false,
        error: `Cannot transition from PENDING to ${status}. Only PROCESSING or REJECTED allowed.`,
      };
    }
    if (existing.status === 'PROCESSING' && status !== 'APPROVED' && status !== 'FAILED') {
      return {
        success: false,
        error: `Cannot transition from PROCESSING to ${status}. Only APPROVED or FAILED allowed.`,
      };
    }
    if (existing.status === 'FAILED') {
      return {
        success: false,
        error: 'FAILED requests can only be recovered through the dedicated recovery service with investigation verification.',
      };
    }
    if (existing.status === 'APPROVED' || existing.status === 'REJECTED') {
      return {
        success: false,
        error: `Cannot modify a request that is already ${existing.status.toLowerCase()}`,
      };
    }

    // Build update payload
    const now = new Date().toISOString();
    const updateData: Partial<EntryApprovalRequest> = {
      status,
    };

    if (status === 'APPROVED') {
      updateData.approvedBy = actor;
      updateData.approvedAt = now;
      updateData.approvalReason = reason;
    } else if (status === 'REJECTED') {
      updateData.rejectedBy = actor;
      updateData.rejectedAt = now;
      updateData.rejectionReason = reason;
    } else if (status === 'PROCESSING') {
      updateData.processingBy = actor;
      updateData.processingAt = now;
    } else if (status === 'FAILED') {
      updateData.failedAt = now;
      updateData.failureReason = reason;
    }

    try {
      // For REJECTED status, use transaction to atomically clear the lock
      if (status === 'REJECTED') {
        await runTransaction(db, async (transaction) => {
          // Read approval request
          const requestRef = doc(db, 'entryApprovalRequests', requestId);
          const requestSnap = await transaction.get(requestRef);
          
          if (!requestSnap.exists()) {
            throw new Error('Approval request not found during transaction');
          }

          const requestInTx = requestSnap.data() as EntryApprovalRequest;
          
          // Determine voucher collection
          const voucherCollection = requestInTx.entryType === 'INWARD' ? 'inwardVouchers' : 'outwardVouchers';
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
          transaction.update(requestRef, updateData);
        });
      } else {
        // For other statuses, use simple update
        await entryApprovalRequestsService.update(requestId, updateData);
      }
      return { success: true };
    } catch (error) {
      console.error('[APPROVAL-SERVICE] Failed to update approval status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update approval status',
      };
    }
  }
}

// Export singleton instance
export const approvalService = new ApprovalService();

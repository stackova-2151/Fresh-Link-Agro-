import { db } from '@/lib/firebase';
import { doc, setDoc, updateDoc, increment, runTransaction } from 'firebase/firestore';
import { rentalItemsService } from '@/lib/firestore';
import type { OutwardVoucher } from '@/components/outward/bulk-outward-entry-form';

const OUTWARD_COLLECTION = 'outwardVouchers';

/**
 * Deducts stock from rentalItems using a Firestore transaction for atomicity.
 * All stock deductions are applied atomically - if one fails, none are applied.
 * Uses two-phase approach: read all documents first, then write all updates.
 * 
 * @param items - Outward voucher items to deduct stock for
 * @param approvalRequestId - Optional approval request ID for idempotency (prevents double deduction on retry)
 */
async function applyStockDeduction(
  items: OutwardVoucher['items'],
  approvalRequestId?: string
): Promise<void> {
  await runTransaction(db, async (transaction) => {
    // PHASE 1: READ ALL DOCUMENTS
    const records: Array<{
      row: OutwardVoucher['items'][0];
      ref: any;
      snap: any;
      bags: number;
      wt: number;
    }> = [];

    for (const row of items) {
      if (!row.sourceRentalItemId) continue;
      const bags = typeof row.bags === 'number' ? row.bags : 0;
      const wt = row.totalWeight || 0;
      if (bags <= 0) continue;

      const rentalItemRef = doc(db, 'rentalItems', row.sourceRentalItemId);
      const rentalItemSnap = await transaction.get(rentalItemRef);
      
      if (!rentalItemSnap.exists()) {
        throw new Error(`Rental item ${row.sourceRentalItemId} not found`);
      }

      records.push({ row, ref: rentalItemRef, snap: rentalItemSnap, bags, wt });
    }

    // PHASE 2: VALIDATE ALL DATA
    for (const record of records) {
      const rentalItem = record.snap.data();
      
      // Idempotency check: if this approval request already applied stock, skip deduction
      if (approvalRequestId && rentalItem.stockAppliedApprovalRequestId === approvalRequestId) {
        console.log(`[STOCK-DEDUCTION] Stock already applied by approval request ${approvalRequestId} for rental item ${record.row.sourceRentalItemId}, skipping deduction`);
        continue;
      }

      // Read current values for validation
      const currentAvailable = rentalItem.quantityAvailable || 0;
      
      // Validate sufficient stock
      if (currentAvailable < record.bags) {
        throw new Error(
          `Insufficient stock for rental item ${record.row.sourceRentalItemId}. ` +
          `Available: ${currentAvailable}, Required: ${record.bags}`
        );
      }
    }

    // PHASE 3: PERFORM ALL WRITES
    for (const record of records) {
      const rentalItem = record.snap.data();
      
      // Skip if already applied (idempotency)
      if (approvalRequestId && rentalItem.stockAppliedApprovalRequestId === approvalRequestId) {
        continue;
      }

      // Apply deduction atomically with idempotency marker
      const updateData: any = {
        outwardQuantity: increment(record.bags),
        quantityAvailable: increment(-record.bags),
        outwardWeight: increment(record.wt),
        balanceWeight: increment(-record.wt),
      };
      
      // Set idempotency marker atomically with stock deduction
      if (approvalRequestId) {
        updateData.stockAppliedApprovalRequestId = approvalRequestId;
      }
      
      transaction.update(record.ref, updateData);
    }
  });
}

/**
 * Reverses a previous stock deduction (for edit mode).
 * Uses a Firestore transaction for atomicity - all reversals are applied atomically.
 * Uses two-phase approach: read all documents first, then write all updates.
 */
async function reverseStockDeduction(
  items: OutwardVoucher['items']
): Promise<void> {
  await runTransaction(db, async (transaction) => {
    // PHASE 1: READ ALL DOCUMENTS
    const records: Array<{
      ref: any;
      snap: any;
      bags: number;
      wt: number;
    }> = [];

    for (const row of items) {
      if (!row.sourceRentalItemId) continue;
      const bags = typeof row.bags === 'number' ? row.bags : 0;
      const wt = row.totalWeight || 0;
      if (bags <= 0) continue;

      const rentalItemRef = doc(db, 'rentalItems', row.sourceRentalItemId);
      const rentalItemSnap = await transaction.get(rentalItemRef);
      
      if (!rentalItemSnap.exists()) {
        throw new Error(`Rental item ${row.sourceRentalItemId} not found`);
      }

      records.push({ ref: rentalItemRef, snap: rentalItemSnap, bags, wt });
    }

    // PHASE 2: VALIDATE ALL DATA (no validation needed for reversal, just existence check already done)

    // PHASE 3: PERFORM ALL WRITES
    for (const record of records) {
      // Apply reversal atomically
      transaction.update(record.ref, {
        outwardQuantity: increment(-record.bags),
        quantityAvailable: increment(record.bags),
        outwardWeight: increment(-record.wt),
        balanceWeight: increment(record.wt),
      });
    }
  });
}

/**
 * Saves outward voucher to Firestore.
 * Increments version if current version is provided.
 * Sets idempotency marker if approvalRequestId is provided.
 */
async function saveOutwardVoucherToFirestore(
  voucher: OutwardVoucher,
  currentVersion?: number,
  approvalRequestId?: string
): Promise<void> {
  const { id, ...rest } = voucher;
  
  // Calculate next version
  const effectiveCurrentVersion = typeof currentVersion === 'number' ? currentVersion : 0;
  const nextVersion = effectiveCurrentVersion + 1;
  
  if (approvalRequestId) {
    // Use transaction for atomic version increment and marker setting
    await runTransaction(db, async (transaction) => {
      const voucherRef = doc(db, OUTWARD_COLLECTION, id);
      const voucherSnap = await transaction.get(voucherRef);
      
      if (!voucherSnap.exists()) {
        throw new Error('Voucher not found during transaction');
      }

      // Check if this approval request already wrote the voucher (idempotency)
      const voucherData = voucherSnap.data();
      if (voucherData.voucherWriteApprovalRequestId === approvalRequestId) {
        console.log('[OUTWARD-UPDATE] Voucher already written by this approval request, skipping write');
        return; // Skip write, version already incremented
      }

      // Write voucher with version increment and idempotency marker atomically
      transaction.update(voucherRef, {
        ...rest,
        version: nextVersion,
        voucherWriteApprovalRequestId: approvalRequestId,
      });
    });
  } else {
    // Direct edit mode: simple setDoc
    await setDoc(doc(db, OUTWARD_COLLECTION, id), {
      ...rest,
      version: nextVersion,
    });
  }
}

/**
 * Executes the outward update with atomic transaction to prevent partial saves.
 * 
 * For NEW mode: Single transaction that reads all rental items, validates stock,
 * writes the voucher, and updates all rental items atomically.
 * 
 * For EDIT mode: Single transaction that reads all affected rental items (old + new),
 * calculates net stock changes, validates, writes the voucher, and updates rental items atomically.
 * 
 * @param voucher - The OutwardVoucher to apply (form type with all fields)
 * @param existingVoucher - The existing voucher for edit mode (undefined for new entries)
 * @param currentVersion - The current version of the voucher (for version increment)
 * @param isApprovalExecution - Whether this is an approval execution (prevents stock reversal on retry)
 * @param approvalRequestId - Optional approval request ID for stock idempotency (prevents double deduction)
 * @returns Promise that resolves when all database operations complete
 */
export async function executeOutwardUpdate(
  voucher: OutwardVoucher,
  existingVoucher?: OutwardVoucher,
  currentVersion?: number,
  isApprovalExecution?: boolean,
  approvalRequestId?: string
): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const { id, ...rest } = voucher;
    const effectiveCurrentVersion = typeof currentVersion === 'number' ? currentVersion : 0;
    const nextVersion = effectiveCurrentVersion + 1;

    // PHASE 1: READ ALL REQUIRED DOCUMENTS
    const voucherRef = doc(db, OUTWARD_COLLECTION, id);
    const voucherSnap = await transaction.get(voucherRef);

    // For edit mode, check if this approval request already wrote the voucher (idempotency)
    if (approvalRequestId && voucherSnap.exists()) {
      const voucherData = voucherSnap.data();
      if (voucherData.voucherWriteApprovalRequestId === approvalRequestId) {
        console.log('[OUTWARD-UPDATE] Voucher already written by this approval request, skipping entire operation');
        return; // Skip entire operation - already applied
      }
    }

    // Collect all rental item references to read
    const rentalItemIds = new Set<string>();
    
    // Add new voucher items
    for (const row of voucher.items) {
      if (row.sourceRentalItemId) {
        rentalItemIds.add(row.sourceRentalItemId);
      }
    }

    // Add existing voucher items (for edit mode stock reversal calculation)
    if (existingVoucher && !isApprovalExecution) {
      for (const row of existingVoucher.items) {
        if (row.sourceRentalItemId) {
          rentalItemIds.add(row.sourceRentalItemId);
        }
      }
    }

    // Read all rental items
    const rentalItemRecords = new Map<string, { ref: any; snap: any; data: any }>();
    for (const rentalItemId of rentalItemIds) {
      const ref = doc(db, 'rentalItems', rentalItemId);
      const snap = await transaction.get(ref);
      
      if (!snap.exists()) {
        throw new Error(`Rental item ${rentalItemId} not found`);
      }
      
      rentalItemRecords.set(rentalItemId, { ref, snap, data: snap.data() });
    }

    // PHASE 2: CALCULATE NET STOCK CHANGES AND VALIDATE
    const stockChanges = new Map<string, { bags: number; wt: number }>();

    // For edit mode, add reversal of old stock
    if (existingVoucher && !isApprovalExecution) {
      for (const row of existingVoucher.items) {
        if (!row.sourceRentalItemId) continue;
        const bags = typeof row.bags === 'number' ? row.bags : 0;
        const wt = row.totalWeight || 0;
        if (bags <= 0) continue;

        const current = stockChanges.get(row.sourceRentalItemId) || { bags: 0, wt: 0 };
        stockChanges.set(row.sourceRentalItemId, {
          bags: current.bags + bags, // Add back (reversal)
          wt: current.wt + wt,
        });
      }
    }

    // Add new stock deduction
    for (const row of voucher.items) {
      if (!row.sourceRentalItemId) continue;
      const bags = typeof row.bags === 'number' ? row.bags : 0;
      const wt = row.totalWeight || 0;
      if (bags <= 0) continue;

      const record = rentalItemRecords.get(row.sourceRentalItemId);
      if (!record) {
        throw new Error(`Rental item ${row.sourceRentalItemId} not found`);
      }

      // Idempotency check: if this approval request already applied stock, skip deduction for this item
      if (approvalRequestId && record.data.stockAppliedApprovalRequestId === approvalRequestId) {
        console.log(`[STOCK-DEDUCTION] Stock already applied by approval request ${approvalRequestId} for rental item ${row.sourceRentalItemId}, skipping deduction`);
        continue;
      }

      const current = stockChanges.get(row.sourceRentalItemId) || { bags: 0, wt: 0 };
      stockChanges.set(row.sourceRentalItemId, {
        bags: current.bags - bags, // Deduct
        wt: current.wt - wt,
      });
    }

    // Validate final stock availability
    for (const [rentalItemId, change] of stockChanges) {
      if (change.bags >= 0) continue; // Net addition or no change, no validation needed

      const record = rentalItemRecords.get(rentalItemId);
      if (!record) continue;

      const currentAvailable = record.data.quantityAvailable || 0;
      const finalAvailable = currentAvailable + change.bags; // change.bags is negative for deduction

      if (finalAvailable < 0) {
        throw new Error(
          `Insufficient stock for rental item ${rentalItemId}. ` +
          `Available: ${currentAvailable}, Net change: ${change.bags}, Final would be: ${finalAvailable}`
        );
      }
    }

    // PHASE 3: PERFORM ALL WRITES
    // Write/update outward voucher
    if (approvalRequestId && voucherSnap.exists()) {
      // Update with idempotency marker
      transaction.update(voucherRef, {
        ...rest,
        version: nextVersion,
        voucherWriteApprovalRequestId: approvalRequestId,
      });
    } else {
      // Set new voucher or update without approval marker
      if (voucherSnap.exists()) {
        transaction.update(voucherRef, {
          ...rest,
          version: nextVersion,
        });
      } else {
        transaction.set(voucherRef, {
          ...rest,
          version: nextVersion,
        });
      }
    }

    // Apply all stock changes atomically
    for (const [rentalItemId, change] of stockChanges) {
      if (change.bags === 0 && change.wt === 0) continue;

      const record = rentalItemRecords.get(rentalItemId);
      if (!record) continue;

      const updateData: any = {
        outwardQuantity: increment(-change.bags), // change.bags is negative for deduction, so -change.bags is positive
        quantityAvailable: increment(change.bags),
        outwardWeight: increment(-change.wt),
        balanceWeight: increment(change.wt),
      };

      // Set idempotency marker for new deductions
      if (approvalRequestId && change.bags < 0) {
        updateData.stockAppliedApprovalRequestId = approvalRequestId;
      }

      transaction.update(record.ref, updateData);
    }
  });
}

/**
 * Legacy Data Resolution Script - Backfill rentalItemId
 *
 * This script inspects inward vouchers and backfills rentalItemId for items
 * that are missing this field, using safe ambiguity detection.
 *
 * Usage:
 *   npx tsx scripts/backfill-rental-item-ids.ts --dry-run  # Preview changes
 *   npx tsx scripts/backfill-rental-item-ids.ts            # Execute backfill
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

// Initialize Firebase Admin
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
if (!serviceAccountPath) {
  console.error('ERROR: FIREBASE_SERVICE_ACCOUNT_PATH environment variable not set');
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

interface InwardVoucherItem {
  itemName: string;
  brand: string;
  batch: string;
  chamberId: string;
  bags: number;
  totalWeight: number;
  rentalItemId?: string;
}

interface RentalItem {
  id: string;
  name: string;
  brand: string;
  batchNumber: string;
  chamberId: string;
  inwardNumber: string;
  inwardQuantity: number;
  inwardWeight: number;
}

interface ResolutionResult {
  status: 'exact' | 'legacy-resolved' | 'unresolved' | 'ambiguous';
  rentalItemId?: string;
  message: string;
}

/**
 * Resolve rental item ID with ambiguity detection
 */
function resolveRentalItem(
  voucherItemId: string | undefined,
  rentalItems: RentalItem[],
  businessFields: {
    inwardNumber: string;
    itemName: string;
    brand: string;
    batch: string;
    chamberId: string;
  }
): ResolutionResult {
  // Priority 1: Use existing rentalItemId if provided
  if (voucherItemId) {
    const rentalItem = rentalItems.find(r => r.id === voucherItemId);
    if (rentalItem) {
      return {
        status: 'exact',
        rentalItemId: voucherItemId,
        message: 'Exact match via rentalItemId'
      };
    }
    return {
      status: 'unresolved',
      message: `rentalItemId ${voucherItemId} not found in rental items`
    };
  }

  // Priority 2: Match by business fields (legacy resolution)
  const matches = rentalItems.filter(r =>
    r.inwardNumber.toUpperCase() === businessFields.inwardNumber.toUpperCase() &&
    r.name.trim().toLowerCase() === businessFields.itemName.trim().toLowerCase() &&
    r.brand.trim().toLowerCase() === businessFields.brand.trim().toLowerCase() &&
    r.batchNumber.trim() === businessFields.batch.trim() &&
    r.chamberId === businessFields.chamberId
  );

  if (matches.length === 0) {
    return {
      status: 'unresolved',
      message: 'No rental item found matching business fields'
    };
  }

  if (matches.length > 1) {
    return {
      status: 'ambiguous',
      message: `Multiple rental items (${matches.length}) match business fields - cannot resolve uniquely`
    };
  }

  return {
    status: 'legacy-resolved',
    rentalItemId: matches[0].id,
    message: 'Legacy resolved via business field matching'
  };
}

/**
 * Inspect inward vouchers for missing rentalItemId
 */
async function inspectInwardVouchers() {
  console.log('\n==================================================');
  console.log('PHASE 1 — INSPECT INWARD VOUCHERS');
  console.log('==================================================\n');

  const vouchersRef = db.collection('inwardVouchers');
  const q = vouchersRef.orderBy('date', 'asc');
  const snapshot = await q.get();

  console.log(`Total inward vouchers: ${snapshot.docs.length}`);

  const vouchersNeedingBackfill: Array<{
    voucherId: string;
    inwardNo: string;
    clientId: string;
    itemsNeedingBackfill: Array<{
      index: number;
      itemName: string;
      brand: string;
      batch: string;
      chamberId: string;
    }>;
  }> = [];

  for (const doc of snapshot.docs) {
    const voucher = doc.data();
    const voucherId = doc.id;
    const items = voucher.items as InwardVoucherItem[];

    const itemsNeedingBackfill = items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => !item.rentalItemId)
      .map(({ item, index }) => ({
        index,
        itemName: item.itemName,
        brand: item.brand,
        batch: item.batch,
        chamberId: item.chamberId,
      }));

    if (itemsNeedingBackfill.length > 0) {
      vouchersNeedingBackfill.push({
        voucherId,
        inwardNo: voucher.inwardNo,
        clientId: voucher.clientId,
        itemsNeedingBackfill,
      });
    }
  }

  console.log(`Vouchers needing backfill: ${vouchersNeedingBackfill.length}`);
  console.log(`Total items needing backfill: ${vouchersNeedingBackfill.reduce((sum, v) => sum + v.itemsNeedingBackfill.length, 0)}`);

  return vouchersNeedingBackfill;
}

/**
 * Fetch all rental items for matching
 */
async function fetchAllRentalItems(): Promise<RentalItem[]> {
  console.log('\n==================================================');
  console.log('PHASE 2 — FETCH RENTAL ITEMS');
  console.log('==================================================\n');

  const rentalItemsRef = db.collection('rentalItems');
  const snapshot = await rentalItemsRef.get();

  console.log(`Total rental items: ${snapshot.docs.length}`);

  const rentalItems = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as RentalItem));

  return rentalItems;
}

/**
 * Resolve rental item IDs for all items needing backfill
 */
async function resolveBackfillPlan(
  vouchersNeedingBackfill: Array<{
    voucherId: string;
    inwardNo: string;
    clientId: string;
    itemsNeedingBackfill: Array<{
      index: number;
      itemName: string;
      brand: string;
      batch: string;
      chamberId: string;
    }>;
  }>,
  rentalItems: RentalItem[]
) {
  console.log('\n==================================================');
  console.log('PHASE 3 — RESOLVE RENTAL ITEM IDS');
  console.log('==================================================\n');

  const backfillPlan: Array<{
    voucherId: string;
    inwardNo: string;
    itemIndex: number;
    resolution: ResolutionResult;
  }> = [];

  const summary = {
    exact: 0,
    legacyResolved: 0,
    unresolved: 0,
    ambiguous: 0,
  };

  for (const voucher of vouchersNeedingBackfill) {
    const voucherRef = db.doc(`inwardVouchers/${voucher.voucherId}`);
    const voucherSnap = await voucherRef.get();

    if (!voucherSnap.exists) {
      console.warn(`Voucher ${voucher.inwardNo} no longer exists, skipping`);
      continue;
    }

    const voucherData = voucherSnap.data();
    if (!voucherData) continue;
    const items = voucherData.items as InwardVoucherItem[];

    for (const itemNeedingBackfill of voucher.itemsNeedingBackfill) {
      const item = items[itemNeedingBackfill.index];

      const resolution = resolveRentalItem(
        item.rentalItemId,
        rentalItems,
        {
          inwardNumber: voucher.inwardNo,
          itemName: itemNeedingBackfill.itemName,
          brand: itemNeedingBackfill.brand,
          batch: itemNeedingBackfill.batch,
          chamberId: itemNeedingBackfill.chamberId,
        }
      );

      if (resolution.status === 'exact') summary.exact++;
      else if (resolution.status === 'legacy-resolved') summary.legacyResolved++;
      else if (resolution.status === 'unresolved') summary.unresolved++;
      else if (resolution.status === 'ambiguous') summary.ambiguous++;

      if (resolution.status === 'exact' || resolution.status === 'legacy-resolved') {
        backfillPlan.push({
          voucherId: voucher.voucherId,
          inwardNo: voucher.inwardNo,
          itemIndex: itemNeedingBackfill.index,
          resolution,
        });
      } else {
        console.warn(`⚠️  ${voucher.inwardNo} item ${itemNeedingBackfill.index}: ${resolution.status} - ${resolution.message}`);
      }
    }
  }

  console.log('\nResolution Summary:');
  console.log(`  Exact matches: ${summary.exact}`);
  console.log(`  Legacy resolved: ${summary.legacyResolved}`);
  console.log(`  Unresolved: ${summary.unresolved}`);
  console.log(`  Ambiguous: ${summary.ambiguous}`);
  console.log(`\nItems to backfill: ${backfillPlan.length}`);

  return backfillPlan;
}

/**
 * Execute backfill
 */
async function executeBackfill(backfillPlan: Array<{
  voucherId: string;
  inwardNo: string;
  itemIndex: number;
  resolution: ResolutionResult;
}>) {
  console.log('\n==================================================');
  console.log('PHASE 4 — EXECUTE BACKFILL');
  console.log('==================================================\n');

  const batch = db.batch();
  let updateCount = 0;

  for (const plan of backfillPlan) {
    const voucherRef = db.doc(`inwardVouchers/${plan.voucherId}`);
    const voucherSnap = await voucherRef.get();

    if (!voucherSnap.exists) {
      console.warn(`Voucher ${plan.inwardNo} no longer exists, skipping`);
      continue;
    }

    const voucherData = voucherSnap.data();
    if (!voucherData) continue;
    const items = [...(voucherData.items as InwardVoucherItem[])];

    // Update the specific item
    if (items[plan.itemIndex] && !items[plan.itemIndex].rentalItemId) {
      items[plan.itemIndex].rentalItemId = plan.resolution.rentalItemId;
      batch.update(voucherRef, { items });
      updateCount++;

      if (updateCount % 100 === 0) {
        console.log(`Batched ${updateCount} updates...`);
      }
    }
  }

  if (updateCount > 0) {
    console.log(`Committing batch with ${updateCount} updates...`);
    await batch.commit();
    console.log(`✅ Backfill complete: ${updateCount} items updated`);
  } else {
    console.log('No items to update');
  }
}

async function main() {
  console.log('\n==================================================');
  console.log('LEGACY DATA RESOLUTION - BACKFILL rentalItemId');
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes will be made)' : 'EXECUTE'}`);
  console.log('==================================================');

  try {
    // Phase 1: Inspect inward vouchers
    const vouchersNeedingBackfill = await inspectInwardVouchers();

    if (vouchersNeedingBackfill.length === 0) {
      console.log('\n✅ No backfill needed - all inward voucher items have rentalItemId');
      return;
    }

    // Phase 2: Fetch rental items
    const rentalItems = await fetchAllRentalItems();

    // Phase 3: Resolve rental item IDs
    const backfillPlan = await resolveBackfillPlan(vouchersNeedingBackfill, rentalItems);

    if (backfillPlan.length === 0) {
      console.log('\n⚠️  No items can be safely backfilled (all are unresolved or ambiguous)');
      return;
    }

    // Phase 4: Execute backfill (unless dry run)
    if (!isDryRun) {
      await executeBackfill(backfillPlan);
    } else {
      console.log('\n==================================================');
      console.log('DRY RUN SUMMARY');
      console.log('==================================================');
      console.log(`Would backfill ${backfillPlan.length} items`);
      console.log('Run without --dry-run to execute changes');
    }

    console.log('\n==================================================');

  } catch (error) {
    console.error('\n❌ ERROR during backfill:', error);
    process.exit(1);
  }
}

main();

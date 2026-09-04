/**
 * Rental Item Reference Repair Script
 *
 * This script repairs broken references between inward voucher items and rental items.
 * It attempts to find matching RentalItems using business fields and updates the voucher
 * items with the correct rentalItemId.
 *
 * Usage:
 *   npx tsx scripts/repair-rental-item-references.ts --dry-run  # Preview changes
 *   npx tsx scripts/repair-rental-item-references.ts            # Apply changes
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

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
  id: string;
  itemName: string;
  brand: string;
  batch: string;
  chamberId: string;
  rentalItemId?: string;
}

interface InwardVoucher {
  id: string;
  inwardNo: string;
  clientId: string;
  clientName: string;
  date: string;
  items: InwardVoucherItem[];
}

interface RentalItem {
  id: string;
  inwardNumber: string;
  clientId: string;
  name: string;
  brand: string;
  batchNumber: string;
  chamberId: string;
}

interface RepairAction {
  type: 'UPDATE_VOUCHER' | 'CREATE_RENTAL_ITEM' | 'AMBIGUOUS' | 'NO_MATCH';
  inwardNo: string;
  itemName: string;
  currentRentalItemId?: string;
  proposedRentalItemId?: string;
  reason: string;
}

const dryRun = process.argv.includes('--dry-run');

async function findMatchingRentalItem(
  inwardNo: string,
  clientId: string,
  itemName: string,
  brand: string,
  batch: string,
  chamberId: string
): Promise<RentalItem[]> {
  const rentalItemsSnap = await db.collection('rentalItems')
    .where('inwardNumber', '==', inwardNo)
    .where('clientId', '==', clientId)
    .get();

  const allMatches = rentalItemsSnap.docs.map((doc: any) => ({
    id: doc.id,
    ...doc.data()
  } as RentalItem));

  // Filter by business fields
  const exactMatches = allMatches.filter(item => {
    if (item.name.toLowerCase() !== itemName.toLowerCase()) return false;
    if (item.brand.toLowerCase() !== brand.toLowerCase()) return false;
    if (item.batchNumber !== batch) return false;
    if (item.chamberId !== chamberId) return false;
    return true;
  });

  return exactMatches;
}

async function repairReferences() {
  console.log('\n==================================================');
  console.log('RENTAL ITEM REFERENCE REPAIR');
  console.log(dryRun ? 'DRY RUN MODE - NO CHANGES WILL BE APPLIED' : 'LIVE MODE - CHANGES WILL BE APPLIED');
  console.log('==================================================\n');

  // Fetch all inward vouchers
  console.log('Fetching inward vouchers...');
  const inwardVouchersSnap = await db.collection('inwardVouchers').get();
  const inwardVouchers = inwardVouchersSnap.docs.map((doc: any) => ({
    id: doc.id,
    ...doc.data()
  } as InwardVoucher));
  console.log(`Found ${inwardVouchers.length} inward vouchers\n`);

  // Fetch all rental items
  console.log('Fetching rental items...');
  const rentalItemsSnap = await db.collection('rentalItems').get();
  const rentalItemIds = new Set(rentalItemsSnap.docs.map((doc: any) => doc.id));
  console.log(`Found ${rentalItemIds.size} rental items\n`);

  // Identify broken references
  const repairActions: RepairAction[] = [];

  for (const voucher of inwardVouchers) {
    for (const item of voucher.items) {
      if (!item.rentalItemId) {
        continue; // Skip items without rentalItemId (legacy data)
      }

      if (!rentalItemIds.has(item.rentalItemId)) {
        // Broken reference found
        console.log(`\nBroken reference found:`);
        console.log(`  Inward: ${voucher.inwardNo}`);
        console.log(`  Item: ${item.itemName}`);
        console.log(`  Rental Item ID: ${item.rentalItemId}`);

        // Try to find matching RentalItem
        const matches = await findMatchingRentalItem(
          voucher.inwardNo,
          voucher.clientId,
          item.itemName,
          item.brand,
          item.batch,
          item.chamberId
        );

        if (matches.length === 1) {
          // Exactly one match - safe to repair
          repairActions.push({
            type: 'UPDATE_VOUCHER',
            inwardNo: voucher.inwardNo,
            itemName: item.itemName,
            currentRentalItemId: item.rentalItemId,
            proposedRentalItemId: matches[0].id,
            reason: `Found exactly one matching RentalItem: ${matches[0].id}`
          });
          console.log(`  Action: UPDATE voucher item rentalItemId to ${matches[0].id}`);
        } else if (matches.length === 0) {
          // No match - need to create new RentalItem
          repairActions.push({
            type: 'CREATE_RENTAL_ITEM',
            inwardNo: voucher.inwardNo,
            itemName: item.itemName,
            currentRentalItemId: item.rentalItemId,
            reason: 'No matching RentalItem found - would create new one'
          });
          console.log(`  Action: CREATE new RentalItem (no match found)`);
        } else {
          // Multiple matches - ambiguous
          repairActions.push({
            type: 'AMBIGUOUS',
            inwardNo: voucher.inwardNo,
            itemName: item.itemName,
            currentRentalItemId: item.rentalItemId,
            reason: `Ambiguous: ${matches.length} matching RentalItems found - manual review required`
          });
          console.log(`  Action: MANUAL REVIEW (${matches.length} matches found)`);
          matches.forEach(m => console.log(`    - ${m.id}`));
        }
      }
    }
  }

  // Print summary
  console.log('\n==================================================');
  console.log('REPAIR SUMMARY');
  console.log('==================================================\n');
  console.log(`Total broken references: ${repairActions.length}`);
  console.log(`UPDATE_VOUCHER: ${repairActions.filter(a => a.type === 'UPDATE_VOUCHER').length}`);
  console.log(`CREATE_RENTAL_ITEM: ${repairActions.filter(a => a.type === 'CREATE_RENTAL_ITEM').length}`);
  console.log(`AMBIGUOUS: ${repairActions.filter(a => a.type === 'AMBIGUOUS').length}`);
  console.log(`NO_MATCH: ${repairActions.filter(a => a.type === 'NO_MATCH').length}\n`);

  if (dryRun) {
    console.log('DRY RUN COMPLETE. No changes were applied.');
    console.log('Run without --dry-run to apply the changes.\n');
    return;
  }

  // Apply repairs
  console.log('Applying repairs...\n');

  for (const action of repairActions) {
    if (action.type === 'UPDATE_VOUCHER' && action.proposedRentalItemId) {
      console.log(`Updating voucher ${action.inwardNo} item rentalItemId to ${action.proposedRentalItemId}`);
      
      // Find the voucher
      const voucherSnap = await db.collection('inwardVouchers')
        .where('inwardNo', '==', action.inwardNo)
        .get();
      
      if (voucherSnap.empty) {
        console.log(`  ERROR: Voucher ${action.inwardNo} not found`);
        continue;
      }

      const voucherDoc = voucherSnap.docs[0];
      const voucher = voucherDoc.data();
      
      // Find and update the specific item
      const updatedItems = voucher.items.map((item: any) => {
        if (item.itemName === action.itemName && item.rentalItemId === action.currentRentalItemId) {
          return { ...item, rentalItemId: action.proposedRentalItemId };
        }
        return item;
      });

      await db.collection('inwardVouchers').doc(voucherDoc.id).update({
        items: updatedItems
      });
      
      console.log(`  ✓ Updated\n`);
    } else if (action.type === 'CREATE_RENTAL_ITEM') {
      console.log(`Skipping CREATE_RENTAL_ITEM for ${action.inwardNo} - manual intervention required`);
      console.log(`  Reason: ${action.reason}\n`);
    } else if (action.type === 'AMBIGUOUS') {
      console.log(`Skipping AMBIGUOUS case for ${action.inwardNo} - manual intervention required`);
      console.log(`  Reason: ${action.reason}\n`);
    }
  }

  console.log('==================================================');
  console.log('REPAIR COMPLETE');
  console.log('==================================================\n');
}

repairReferences().catch(console.error);

/**
 * Forensic Data Trace for INW-027 and INW-023
 *
 * This script inspects the exact Firestore data for these specific inward vouchers
 * to determine why they are missing from stock reports.
 *
 * Usage:
 *   npx tsx scripts/inspect-inward-027-023.ts
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
  roomId?: string;
  blockId?: string;
  bags: number | '';
  unit: string;
  bagWeight: number | '';
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
  outwardQuantity: number;
  quantityAvailable: number;
  inwardWeight: number;
  outwardWeight: number;
  balanceWeight: number;
}

interface Chamber {
  id: string;
  name: string;
}

async function inspectInwardVoucher(inwardNo: string) {
  console.log('\n==================================================');
  console.log(`INSPECTING INWARD VOUCHER: ${inwardNo}`);
  console.log('==================================================\n');

  // Find voucher by inwardNo
  const vouchersRef = db.collection('inwardVouchers');
  const q = vouchersRef.where('inwardNo', '==', inwardNo);
  const snapshot = await q.get();

  if (snapshot.empty) {
    console.log(`❌ Voucher ${inwardNo} does NOT exist in Firestore`);
    return null;
  }

  if (snapshot.docs.length > 1) {
    console.log(`⚠️  WARNING: Multiple vouchers found with inwardNo ${inwardNo}`);
    snapshot.docs.forEach((doc: any, idx: number) => {
      console.log(`   Document ${idx + 1}: ${doc.id}`);
    });
  }

  const voucherDoc = snapshot.docs[0];
  const voucher = voucherDoc.data();
  const voucherId = voucherDoc.id;

  console.log(`✅ Voucher ${inwardNo} EXISTS`);
  console.log(`   Document ID: ${voucherId}`);
  console.log(`   Client: ${voucher.clientName}`);
  console.log(`   Client ID: ${voucher.clientId}`);
  console.log(`   Date: ${voucher.date}`);
  console.log(`   Version: ${voucher.version}`);
  console.log(`   Created At: ${voucher.createdAt}`);
  console.log(`   Updated At: ${voucher.updatedAt || 'N/A'}`);
  console.log(`   Update Reason: ${voucher.updateReason || 'N/A'}`);

  console.log(`\n   Items (${voucher.items.length}):`);
  voucher.items.forEach((item: InwardVoucherItem, idx: number) => {
    console.log(`\n   --- Item ${idx + 1} ---`);
    console.log(`   Item ID: ${item.id}`);
    console.log(`   Item Name: ${item.itemName}`);
    console.log(`   Brand: ${item.brand || 'N/A'}`);
    console.log(`   Batch: ${item.batch || 'N/A'}`);
    console.log(`   Chamber ID: ${item.chamberId}`);
    console.log(`   Room ID: ${item.roomId || 'N/A'}`);
    console.log(`   Block ID: ${item.blockId || 'N/A'}`);
    console.log(`   Bags: ${item.bags}`);
    console.log(`   Unit: ${item.unit}`);
    console.log(`   Bag Weight: ${item.bagWeight}`);
    console.log(`   Total Weight: ${item.totalWeight}`);
    console.log(`   Rental Item ID: ${item.rentalItemId || 'NOT SET'}`);
    console.log(`   Rental Item ID Type: ${item.rentalItemId ? typeof item.rentalItemId : 'undefined'}`);
  });

  return { id: voucherId, data: voucher };
}

async function inspectChambers() {
  console.log('\n==================================================');
  console.log('FETCHING CHAMBERS FOR NAME RESOLUTION');
  console.log('==================================================\n');

  const chambersRef = db.collection('chambers');
  const snapshot = await chambersRef.get();

  const chamberMap = new Map<string, string>();
  snapshot.docs.forEach((doc: any) => {
    const data = doc.data();
    chamberMap.set(doc.id, data.name);
  });

  console.log(`Loaded ${chamberMap.size} chambers`);
  return chamberMap;
}

async function inspectRentalItemsForVoucher(inwardNo: string, voucherItems: InwardVoucherItem[]) {
  console.log('\n==================================================');
  console.log(`INSPECTING RENTAL ITEMS FOR ${inwardNo}`);
  console.log('==================================================\n');

  const results: Array<{
    itemIndex: number;
    itemId: string;
    itemName: string;
    voucherRentalItemId: string | undefined;
    rentalItemExists: boolean;
    rentalItemData: RentalItem | null;
    matchStatus: string;
  }> = [];

  for (let idx = 0; idx < voucherItems.length; idx++) {
    const item = voucherItems[idx];
    console.log(`\n--- Item ${idx + 1}: ${item.itemName} ---`);
    console.log(`   Voucher Rental Item ID: ${item.rentalItemId || 'NOT SET'}`);

    if (!item.rentalItemId) {
      console.log(`   ❌ No rentalItemId in voucher item`);
      results.push({
        itemIndex: idx,
        itemId: item.id,
        itemName: item.itemName,
        voucherRentalItemId: undefined,
        rentalItemExists: false,
        rentalItemData: null,
        matchStatus: 'NO_RENTAL_ITEM_ID_IN_VOUCHER'
      });
      continue;
    }

    // Check if RentalItem document exists
    const rentalItemRef = db.doc(`rentalItems/${item.rentalItemId}`);
    const rentalItemSnap = await rentalItemRef.get();

    if (!rentalItemSnap.exists) {
      console.log(`   ❌ RentalItem document does NOT exist for ID: ${item.rentalItemId}`);
      results.push({
        itemIndex: idx,
        itemId: item.id,
        itemName: item.itemName,
        voucherRentalItemId: item.rentalItemId,
        rentalItemExists: false,
        rentalItemData: null,
        matchStatus: 'RENTAL_ITEM_DOCUMENT_NOT_FOUND'
      });
      continue;
    }

    const rentalItem = rentalItemSnap.data() as RentalItem;
    console.log(`   ✅ RentalItem document EXISTS`);
    console.log(`   Rental Item ID: ${rentalItem.id}`);
    console.log(`   Inward Number: ${rentalItem.inwardNumber}`);
    console.log(`   Item Name: ${rentalItem.name}`);
    console.log(`   Brand: ${rentalItem.brand}`);
    console.log(`   Batch Number: ${rentalItem.batchNumber}`);
    console.log(`   Chamber ID: ${rentalItem.chamberId}`);
    console.log(`   Inward Quantity: ${rentalItem.inwardQuantity}`);
    console.log(`   Outward Quantity: ${rentalItem.outwardQuantity}`);
    console.log(`   Quantity Available: ${rentalItem.quantityAvailable}`);
    console.log(`   Inward Weight: ${rentalItem.inwardWeight}`);
    console.log(`   Outward Weight: ${rentalItem.outwardWeight}`);
    console.log(`   Balance Weight: ${rentalItem.balanceWeight}`);

    // Compare fields
    const matchStatus = [];
    if (rentalItem.inwardNumber !== inwardNo) {
      matchStatus.push(`INWARD_NUMBER_MISMATCH: voucher=${inwardNo}, rental=${rentalItem.inwardNumber}`);
    }
    if (rentalItem.name.toLowerCase() !== item.itemName.toLowerCase()) {
      matchStatus.push(`ITEM_NAME_MISMATCH: voucher=${item.itemName}, rental=${rentalItem.name}`);
    }
    if (rentalItem.brand.toLowerCase() !== item.brand.toLowerCase()) {
      matchStatus.push(`BRAND_MISMATCH: voucher=${item.brand}, rental=${rentalItem.brand}`);
    }
    if (rentalItem.batchNumber !== item.batch) {
      matchStatus.push(`BATCH_MISMATCH: voucher=${item.batch}, rental=${rentalItem.batchNumber}`);
    }
    if (rentalItem.chamberId !== item.chamberId) {
      matchStatus.push(`CHAMBER_ID_MISMATCH: voucher=${item.chamberId}, rental=${rentalItem.chamberId}`);
    }

    if (matchStatus.length === 0) {
      console.log(`   ✅ All fields match perfectly`);
    } else {
      console.log(`   ⚠️  Field mismatches detected:`);
      matchStatus.forEach(m => console.log(`      - ${m}`));
    }

    results.push({
      itemIndex: idx,
      itemId: item.id,
      itemName: item.itemName,
      voucherRentalItemId: item.rentalItemId,
      rentalItemExists: true,
      rentalItemData: rentalItem,
      matchStatus: matchStatus.length === 0 ? 'PERFECT_MATCH' : matchStatus.join('; ')
    });
  }

  return results;
}

async function simulateResolution(inwardNo: string, voucherItems: InwardVoucherItem[], rentalItems: RentalItem[]) {
  console.log('\n==================================================');
  console.log(`SIMULATING RESOLUTION FOR ${inwardNo}`);
  console.log('==================================================\n');

  // Import the resolution function logic inline for simulation
  const resolutionResults = [];

  for (let idx = 0; idx < voucherItems.length; idx++) {
    const item = voucherItems[idx];
    console.log(`\n--- Item ${idx + 1}: ${item.itemName} ---`);

    // Priority 1: Exact ID resolution
    if (item.rentalItemId) {
      const exactMatch = rentalItems.find(r => r.id === item.rentalItemId);
      if (exactMatch) {
        console.log(`   ✅ EXACT MATCH: rentalItemId=${item.rentalItemId}`);
        resolutionResults.push({
          itemIndex: idx,
          itemName: item.itemName,
          status: 'exact',
          rentalItemId: item.rentalItemId,
          message: 'Exact match found',
          wouldBeIncludedInReport: true
        });
        continue;
      }
      
      console.log(`   ❌ ID exists but rental item not found: ${item.rentalItemId}`);
      resolutionResults.push({
        itemIndex: idx,
        itemName: item.itemName,
        status: 'unresolved',
        rentalItemId: item.rentalItemId,
        message: `Rental item with ID "${item.rentalItemId}" not found in available rental items`,
        wouldBeIncludedInReport: false
      });
      continue;
    }

    // Priority 2: Legacy resolution using business fields
    console.log(`   ⚠️  No rentalItemId, attempting legacy resolution...`);
    
    const matches = rentalItems.filter(r => {
      if (r.inwardNumber !== inwardNo) return false;
      if (r.name.toLowerCase() !== item.itemName.toLowerCase()) return false;
      if (r.brand.toLowerCase() !== item.brand.toLowerCase()) return false;
      if (r.batchNumber !== item.batch) return false;
      if (r.chamberId !== item.chamberId) return false;
      return true;
    });

    console.log(`   Legacy resolution found ${matches.length} matches`);

    if (matches.length === 0) {
      console.log(`   ❌ UNRESOLVED: No rental item found matching business fields`);
      resolutionResults.push({
        itemIndex: idx,
        itemName: item.itemName,
        status: 'unresolved',
        rentalItemId: undefined,
        message: 'No rental item found matching business fields',
        wouldBeIncludedInReport: false
      });
    } else if (matches.length === 1) {
      console.log(`   ✅ LEGACY-RESOLVED: Exactly one match found`);
      resolutionResults.push({
        itemIndex: idx,
        itemName: item.itemName,
        status: 'legacy-resolved',
        rentalItemId: matches[0].id,
        message: 'Legacy resolution: exactly one match found',
        wouldBeIncludedInReport: true
      });
    } else {
      console.log(`   ❌ AMBIGUOUS: ${matches.length} rental items match business fields`);
      resolutionResults.push({
        itemIndex: idx,
        itemName: item.itemName,
        status: 'ambiguous',
        rentalItemId: undefined,
        message: `Ambiguous match: ${matches.length} rental items match business fields. Cannot safely resolve.`,
        wouldBeIncludedInReport: false
      });
    }
  }

  return resolutionResults;
}

async function main() {
  console.log('\n==================================================');
  console.log('FORENSIC DATA TRACE FOR INW-027 AND INW-023');
  console.log('==================================================\n');

  const chamberMap = await inspectChambers();

  // Inspect INW-027
  console.log('\n\n');
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║                    INW-027 FORENSIC TRACE                    ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  
  const inw027 = await inspectInwardVoucher('INW-027');
  
  if (inw027) {
    const inw027RentalInspection = await inspectRentalItemsForVoucher('INW-027', inw027.data.items);
    
    // Fetch all rental items for this client for resolution simulation
    const allRentalItems = await db.collection('rentalItems')
      .where('clientId', '==', inw027.data.clientId)
      .get();
    
    const rentalItemsArray = allRentalItems.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    } as RentalItem));
    
    console.log(`\nLoaded ${rentalItemsArray.length} rental items for client ${inw027.data.clientName}`);
    
    const inw027Resolution = await simulateResolution('INW-027', inw027.data.items, rentalItemsArray);
    
    console.log('\n==================================================');
    console.log('INW-027 FINAL TABLE');
    console.log('==================================================\n');
    console.log('| Item | Voucher rentalItemId | RentalItem Exists | Resolution Status | Report Included | Skip Reason |');
    console.log('|------|---------------------|-------------------|-------------------|-----------------|-------------|');
    
    inw027Resolution.forEach(r => {
      const rentalExists = inw027RentalInspection[r.itemIndex]?.rentalItemExists ? 'YES' : 'NO';
      console.log(`| ${r.itemName} | ${r.rentalItemId || 'N/A'} | ${rentalExists} | ${r.status} | ${r.wouldBeIncludedInReport ? 'YES' : 'NO'} | ${r.wouldBeIncludedInReport ? '-' : r.message} |`);
    });
  }

  // Inspect INW-023
  console.log('\n\n');
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║                    INW-023 FORENSIC TRACE                    ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  
  const inw023 = await inspectInwardVoucher('INW-023');
  
  if (inw023) {
    const inw023RentalInspection = await inspectRentalItemsForVoucher('INW-023', inw023.data.items);
    
    // Fetch all rental items for this client for resolution simulation
    const allRentalItems = await db.collection('rentalItems')
      .where('clientId', '==', inw023.data.clientId)
      .get();
    
    const rentalItemsArray = allRentalItems.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    } as RentalItem));
    
    console.log(`\nLoaded ${rentalItemsArray.length} rental items for client ${inw023.data.clientName}`);
    
    const inw023Resolution = await simulateResolution('INW-023', inw023.data.items, rentalItemsArray);
    
    console.log('\n==================================================');
    console.log('INW-023 FINAL TABLE');
    console.log('==================================================\n');
    console.log('| Item | Voucher rentalItemId | RentalItem Exists | Resolution Status | Report Included | Skip Reason |');
    console.log('|------|---------------------|-------------------|-------------------|-----------------|-------------|');
    
    inw023Resolution.forEach(r => {
      const rentalExists = inw023RentalInspection[r.itemIndex]?.rentalItemExists ? 'YES' : 'NO';
      console.log(`| ${r.itemName} | ${r.rentalItemId || 'N/A'} | ${rentalExists} | ${r.status} | ${r.wouldBeIncludedInReport ? 'YES' : 'NO'} | ${r.wouldBeIncludedInReport ? '-' : r.message} |`);
    });

    // Detailed comparison table
    console.log('\n==================================================');
    console.log('INW-023 DETAILED COMPARISON: Voucher vs RentalItem');
    console.log('==================================================\n');
    console.log('| Field | Voucher Item | RentalItem Document | Match? |');
    console.log('|-------|--------------|---------------------|--------|');
    
    inw023RentalInspection.forEach((inspection, idx) => {
      const item = inw023.data.items[idx];
      const rental = inspection.rentalItemData;
      
      console.log(`| rentalItemId | ${item.rentalItemId || 'N/A'} | ${rental?.id || 'N/A'} | ${item.rentalItemId === rental?.id ? '✅' : '❌'} |`);
      console.log(`| itemName | ${item.itemName} | ${rental?.name || 'N/A'} | ${item.itemName?.toLowerCase() === rental?.name?.toLowerCase() ? '✅' : '❌'} |`);
      console.log(`| brand | ${item.brand} | ${rental?.brand || 'N/A'} | ${item.brand?.toLowerCase() === rental?.brand?.toLowerCase() ? '✅' : '❌'} |`);
      console.log(`| batch | ${item.batch} | ${rental?.batchNumber || 'N/A'} | ${item.batch === rental?.batchNumber ? '✅' : '❌'} |`);
      console.log(`| chamberId | ${item.chamberId} | ${rental?.chamberId || 'N/A'} | ${item.chamberId === rental?.chamberId ? '✅' : '❌'} |`);
      console.log(`| inwardNumber | INW-023 | ${rental?.inwardNumber || 'N/A'} | ${rental?.inwardNumber === 'INW-023' ? '✅' : '❌'} |`);
      console.log('|-------|--------------|---------------------|--------|');
    });
  }

  console.log('\n==================================================');
  console.log('FORENSIC TRACE COMPLETE');
  console.log('==================================================\n');
}

main().catch(console.error);

/**
 * Rental Item Integrity Check Script
 *
 * This script performs a comprehensive forensic inspection of rental item references
 * across inward vouchers, outward vouchers, and rental items collection.
 *
 * It identifies:
 * - Broken references (voucher items with rentalItemId that don't exist in rentalItems)
 * - Duplicate or suspicious references
 * - RentalItems not referenced by any inward voucher
 * - Outward voucher items with broken sourceRentalItemId references
 * - Specific forensic reports for INW-027 and INW-023
 *
 * Usage:
 *   npx tsx scripts/check-rental-item-integrity.ts
 */

import 'dotenv/config';
import { getScriptFirestore } from './lib/firebase-admin-script';

const db = getScriptFirestore();

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

interface BrokenReference {
  inwardNo: string;
  clientId: string;
  clientName: string;
  itemName: string;
  brand: string;
  batch: string;
  chamberId: string;
  rentalItemId?: string;
  reason: string;
  classification: 'EXACT_LINKED' | 'MISSING_RENTAL_ITEM_ID' | 'BROKEN_REFERENCE' | 'LEGACY_UNIQUELY_RESOLVABLE' | 'LEGACY_UNLINKED' | 'AMBIGUOUS_MATCH' | 'NO_MATCH' | 'ORPHANED_CONFIRMED';
  possibleMatches?: any[];
}

interface OutwardVoucherItem {
  id: string;
  itemName: string;
  sourceRentalItemId?: string;
  qty?: number;
  totalWeight?: number;
  bagWeight?: number;
  inwardNumber?: string;
  brand?: string;
  batch?: string;
  chamberId?: string;
}

interface OutwardVoucher {
  id: string;
  outwardNo: string;
  clientId: string;
  clientName: string;
  date: string;
  items: OutwardVoucherItem[];
}

interface RentalItem {
  id: string;
  inwardNumber: string;
  clientId: string;
  name: string;
  brand: string;
  batchNumber: string;
  chamberId: string;
  inwardQuantity?: number;
  inwardWeight?: number;
  quantityAvailable?: number;
  balanceWeight?: number;
  unit?: string;
  expiryDate?: any;
  storageDate?: any;
}

async function checkIntegrity() {
  console.log('\n==================================================');
  console.log('RENTAL ITEM INTEGRITY REPORT');
  console.log('==================================================\n');

  // Fetch all collections
  console.log('Fetching inward vouchers...');
  const inwardVouchersSnap = await db.collection('inwardVouchers').get();
  const inwardVouchers = inwardVouchersSnap.docs.map((doc: any) => ({
    id: doc.id,
    ...doc.data()
  } as InwardVoucher));
  console.log(`Found ${inwardVouchers.length} inward vouchers\n`);

  console.log('Fetching rental items...');
  const rentalItemsSnap = await db.collection('rentalItems').get();
  const rentalItems = rentalItemsSnap.docs.map((doc: any) => ({
    id: doc.id,
    ...doc.data()
  } as RentalItem));
  const rentalItemIds = new Set(rentalItems.map((r) => r.id));
  console.log(`Found ${rentalItems.length} rental items\n`);

  console.log('Fetching outward vouchers...');
  const outwardVouchersSnap = await db.collection('outwardVouchers').get();
  const outwardVouchers = outwardVouchersSnap.docs.map((doc: any) => ({
    id: doc.id,
    ...doc.data()
  } as OutwardVoucher));
  console.log(`Found ${outwardVouchers.length} outward vouchers\n`);

  // Statistics
  let totalVoucherItems = 0;
  let itemsWithRentalItemId = 0;
  let itemsWithoutRentalItemId = 0;
  let correctlyLinked = 0;
  let brokenReferences: BrokenReference[] = [];
  let legacyUnlinkedItems: any[] = [];
  const referencedRentalItemIds = new Set<string>();

  // Check inward voucher items
  for (const voucher of inwardVouchers) {
    for (let itemIndex = 0; itemIndex < voucher.items.length; itemIndex++) {
      const item = voucher.items[itemIndex];
      totalVoucherItems++;

      if (!item.rentalItemId) {
        // Legacy item without rentalItemId - not a broken reference
        itemsWithoutRentalItemId++;
        legacyUnlinkedItems.push({
          inwardNo: voucher.inwardNo,
          clientId: voucher.clientId,
          clientName: voucher.clientName,
          itemName: item.itemName,
          brand: item.brand,
          batch: item.batch,
          chamberId: item.chamberId,
          classification: 'LEGACY_UNLINKED'
        });
        continue;
      }

      itemsWithRentalItemId++;
      referencedRentalItemIds.add(item.rentalItemId);

      const exactMatch = rentalItems.find((r) => r.id === item.rentalItemId);
      
      if (exactMatch) {
        correctlyLinked++;
        // Don't add to brokenReferences for correctly linked items
      } else {
        // Search for possible business field matches
        const possibleMatches = rentalItems.filter((r) => 
          r.inwardNumber === voucher.inwardNo &&
          r.clientId === voucher.clientId &&
          r.name.toLowerCase() === item.itemName.toLowerCase() &&
          r.brand.toLowerCase() === item.brand.toLowerCase() &&
          r.batchNumber === item.batch
        );

        let classification: BrokenReference['classification'];
        let reason: string;

        if (possibleMatches.length === 0) {
          classification = 'NO_MATCH';
          reason = 'RentalItem document does not exist and no business field match found';
        } else if (possibleMatches.length === 1) {
          classification = 'LEGACY_UNIQUELY_RESOLVABLE';
          reason = `RentalItem document missing but exactly one business field match found: ${possibleMatches[0].id}`;
        } else {
          classification = 'AMBIGUOUS_MATCH';
          reason = `RentalItem document missing and ${possibleMatches.length} business field matches found (ambiguous)`;
        }

        brokenReferences.push({
          inwardNo: voucher.inwardNo,
          clientId: voucher.clientId,
          clientName: voucher.clientName,
          itemName: item.itemName,
          brand: item.brand,
          batch: item.batch,
          chamberId: item.chamberId,
          rentalItemId: item.rentalItemId,
          reason,
          classification,
          possibleMatches
        });
      }
    }
  }

  // Find orphaned rental items (not referenced by any inward voucher)
  // First check if they can be linked to legacy inward vouchers using business fields
  const potentiallyOrphanedRentalItems = rentalItems.filter((r) => !referencedRentalItemIds.has(r.id));
  const orphanedRentalItems: any[] = [];

  for (const rentalItem of potentiallyOrphanedRentalItems) {
    // Search for legacy inward voucher items that might match this rental item
    const possibleLegacyMatches = legacyUnlinkedItems.filter((item) =>
      item.inwardNo === rentalItem.inwardNumber &&
      item.clientId === rentalItem.clientId &&
      item.itemName.toLowerCase() === rentalItem.name.toLowerCase() &&
      item.brand.toLowerCase() === rentalItem.brand.toLowerCase() &&
      item.batch === rentalItem.batchNumber &&
      item.chamberId === rentalItem.chamberId
    );

    if (possibleLegacyMatches.length === 0) {
      // No legacy match found - truly orphaned
      orphanedRentalItems.push({
        ...rentalItem,
        classification: 'ORPHANED_CONFIRMED',
        reason: 'RentalItem not referenced by any inward voucher and no legacy business field match found'
      });
    } else {
      // Could be linked to legacy voucher - not truly orphaned
      // Don't add to orphanedRentalItems list
    }
  }

  // Check outward voucher items
  let totalOutwardItems = 0;
  let outwardItemsWithSourceId = 0;
  let brokenOutwardReferences: any[] = [];

  for (const voucher of outwardVouchers) {
    for (const item of voucher.items) {
      totalOutwardItems++;

      if (!item.sourceRentalItemId) {
        continue;
      }

      outwardItemsWithSourceId++;

      const exactMatch = rentalItems.find((r) => r.id === item.sourceRentalItemId);
      
      if (!exactMatch) {
        brokenOutwardReferences.push({
          outwardNo: voucher.outwardNo,
          clientId: voucher.clientId,
          clientName: voucher.clientName,
          itemName: item.itemName,
          sourceRentalItemId: item.sourceRentalItemId,
          reason: 'RentalItem document does not exist in rentalItems collection'
        });
      }
    }
  }

  // Print summary
  console.log('==================================================');
  console.log('INTEGRITY CHECK SUMMARY');
  console.log('==================================================\n');
  console.log(`TOTAL INWARD VOUCHERS: ${inwardVouchers.length}`);
  console.log(`TOTAL INWARD VOUCHER ITEMS: ${totalVoucherItems}`);
  console.log(`ITEMS WITH RENTALITEMID: ${itemsWithRentalItemId}`);
  console.log(`ITEMS WITHOUT RENTALITEMID (LEGACY): ${itemsWithoutRentalItemId}`);
  console.log(`CORRECTLY LINKED: ${correctlyLinked}`);
  console.log(`BROKEN REFERENCES: ${brokenReferences.length}`);
  console.log(`LEGACY UNLINKED ITEMS: ${legacyUnlinkedItems.length}`);
  console.log(`ORPHANED CONFIRMED RENTAL ITEMS: ${orphanedRentalItems.length}`);
  console.log(`TOTAL OUTWARD VOUCHERS: ${outwardVouchers.length}`);
  console.log(`TOTAL OUTWARD ITEMS: ${totalOutwardItems}`);
  console.log(`OUTWARD ITEMS WITH SOURCE RENTAL ITEM ID: ${outwardItemsWithSourceId}`);
  console.log(`BROKEN OUTWARD REFERENCES: ${brokenOutwardReferences.length}\n`);

  // Print broken references
  if (brokenReferences.length > 0) {
    console.log('==================================================');
    console.log('BROKEN REFERENCES DETAILS');
    console.log('==================================================\n');
    
    brokenReferences.forEach((ref, idx) => {
      console.log(`${idx + 1}. Inward: ${ref.inwardNo}`);
      console.log(`   Client: ${ref.clientName} (${ref.clientId})`);
      console.log(`   Item: ${ref.itemName}`);
      console.log(`   Brand: ${ref.brand}`);
      console.log(`   Batch: ${ref.batch}`);
      console.log(`   Chamber ID: ${ref.chamberId}`);
      console.log(`   Rental Item ID: ${ref.rentalItemId}`);
      console.log(`   Classification: ${ref.classification}`);
      console.log(`   Reason: ${ref.reason}`);
      
      if (ref.possibleMatches && ref.possibleMatches.length > 0) {
        console.log(`   Possible matches:`);
        ref.possibleMatches.forEach((m: any, i: number) => {
          console.log(`     ${i + 1}. ID: ${m.id}, Chamber: ${m.chamberId}`);
        });
      }
      console.log('');
    });
  }

  // Print orphaned rental items
  if (orphanedRentalItems.length > 0) {
    console.log('==================================================');
    console.log('ORPHANED RENTAL ITEMS (not referenced by any inward voucher)');
    console.log('==================================================\n');
    
    orphanedRentalItems.forEach((item, idx) => {
      console.log(`${idx + 1}. ID: ${item.id}`);
      console.log(`   Inward Number: ${item.inwardNumber}`);
      console.log(`   Client ID: ${item.clientId}`);
      console.log(`   Name: ${item.name}`);
      console.log(`   Brand: ${item.brand}`);
      console.log(`   Batch: ${item.batchNumber}`);
      console.log(`   Chamber ID: ${item.chamberId}`);
      console.log('');
    });
  }

  // Print broken outward references
  if (brokenOutwardReferences.length > 0) {
    console.log('==================================================');
    console.log('BROKEN OUTWARD REFERENCES');
    console.log('==================================================\n');
    
    brokenOutwardReferences.forEach((ref, idx) => {
      console.log(`${idx + 1}. Outward: ${ref.outwardNo}`);
      console.log(`   Client: ${ref.clientName} (${ref.clientId})`);
      console.log(`   Item: ${ref.itemName}`);
      console.log(`   Source Rental Item ID: ${ref.sourceRentalItemId}`);
      console.log(`   Reason: ${ref.reason}`);
      
      // Deep forensic analysis for OUT-013
      if (ref.outwardNo === 'OUT-013') {
        console.log(`   --- DEEP FORENSIC ANALYSIS FOR OUT-013 ---`);
        
        // Find the outward voucher
        const out013 = outwardVouchers.find((v) => v.outwardNo === 'OUT-013');
        if (out013) {
          console.log(`   Outward Document ID: ${out013.id}`);
          console.log(`   Date: ${out013.date}`);
          console.log(`   Total Items: ${out013.items.length}\n`);
          
          // Find the specific outward item
          const outwardItem = out013.items.find((item) => item.sourceRentalItemId === ref.sourceRentalItemId);
          if (outwardItem) {
            console.log(`   Outward Item Details:`);
            console.log(`     itemName: ${outwardItem.itemName}`);
            console.log(`     qty: ${outwardItem.qty}`);
            console.log(`     totalWeight: ${outwardItem.totalWeight}`);
            console.log(`     bagWeight: ${outwardItem.bagWeight}`);
            console.log(`     inwardNumber: ${outwardItem.inwardNumber}`);
            
            // Search for possible RentalItem matches using all fields
            const possibleRentalMatches = rentalItems.map((rentalItem) => {
              let matchingFields: string[] = [];
              let differingFields: string[] = [];
              let score = 0;
              
              if (rentalItem.name.toLowerCase() === outwardItem.itemName.toLowerCase()) {
                matchingFields.push('name');
                score += 25;
              } else differingFields.push(`name: ${rentalItem.name} vs ${outwardItem.itemName}`);
              
              if (rentalItem.clientId === out013.clientId) {
                matchingFields.push('clientId');
                score += 25;
              } else differingFields.push(`clientId: ${rentalItem.clientId} vs ${out013.clientId}`);
              
              if (rentalItem.inwardNumber === outwardItem.inwardNumber) {
                matchingFields.push('inwardNumber');
                score += 25;
              } else differingFields.push(`inwardNumber: ${rentalItem.inwardNumber} vs ${outwardItem.inwardNumber}`);
              
              if (rentalItem.quantityAvailable !== undefined && Math.abs(rentalItem.quantityAvailable - (outwardItem.qty || 0)) < 0.01) {
                matchingFields.push('quantity');
                score += 15;
              } else differingFields.push(`quantity: ${rentalItem.quantityAvailable ?? 'N/A'} vs ${outwardItem.qty ?? 'N/A'}`);
              
              if (rentalItem.balanceWeight !== undefined && Math.abs(rentalItem.balanceWeight - (outwardItem.totalWeight || 0)) < 0.01) {
                matchingFields.push('weight');
                score += 10;
              } else differingFields.push(`weight: ${rentalItem.balanceWeight ?? 'N/A'} vs ${outwardItem.totalWeight ?? 'N/A'}`);
              
              return {
                rentalItemId: rentalItem.id,
                matchingFields,
                differingFields,
                score,
                confidence: score >= 80 ? 'HIGH' : score >= 50 ? 'MEDIUM' : 'LOW'
              };
            }).sort((a, b) => b.score - a.score);
            
            console.log(`\n   Possible RentalItem Matches: ${possibleRentalMatches.length}`);
            possibleRentalMatches.slice(0, 5).forEach((match, mIdx) => {
              console.log(`     ${mIdx + 1}. ${match.rentalItemId} (Confidence: ${match.confidence}, Score: ${match.score})`);
              if (match.matchingFields.length > 0) {
                console.log(`        Matching: ${match.matchingFields.join(', ')}`);
              }
              if (match.differingFields.length > 0) {
                console.log(`        Differing: ${match.differingFields.slice(0, 3).join(', ')}...`);
              }
            });
            
            const bestMatch = possibleRentalMatches[0];
            if (bestMatch.confidence === 'HIGH' && possibleRentalMatches.filter(m => m.confidence === 'HIGH').length === 1) {
              console.log(`   → Recommendation: SAFE_AUTO_REPAIR to ${bestMatch.rentalItemId}`);
            } else if (possibleRentalMatches.filter(m => m.confidence === 'HIGH').length > 1) {
              console.log(`   → Recommendation: MANUAL_REVIEW_REQUIRED (multiple high-confidence matches)`);
            } else {
              console.log(`   → Recommendation: MANUAL_REVIEW_REQUIRED (no high-confidence match)`);
            }
          }
        }
      }
      console.log('');
    });
  }

  // INW-027 Forensic Report
  console.log('==================================================');
  console.log('INW-027 FORENSIC REPORT');
  console.log('==================================================\n');
  
  const inw027 = inwardVouchers.find((v) => v.inwardNo === 'INW-027');
  if (inw027) {
    console.log(`Voucher Document ID: ${inw027.id}`);
    console.log(`Client: ${inw027.clientName} (${inw027.clientId})`);
    console.log(`Date: ${inw027.date}`);
    console.log(`Total Items: ${inw027.items.length}\n`);
    
    // Get all RentalItems for INW-027
    const inw027RentalItems = rentalItems.filter((r) => r.inwardNumber === 'INW-027');
    
    // Print complete voucher item fields
    console.log('--- VOUCHER ITEMS (COMPLETE FIELD SET) ---');
    inw027.items.forEach((item, idx) => {
      console.log(`\nVoucher Item ${idx + 1}:`);
      console.log(`  itemName: ${item.itemName}`);
      console.log(`  brand: ${item.brand}`);
      console.log(`  batch: ${item.batch}`);
      console.log(`  chamberId: ${item.chamberId}`);
      console.log(`  rentalItemId: ${item.rentalItemId || 'MISSING'}`);
      console.log(`  bags: ${item.bags}`);
      console.log(`  totalWeight: ${item.totalWeight}`);
      console.log(`  bagWeight: ${item.bagWeight}`);
      console.log(`  unit: ${item.unit}`);
      console.log(`  expDate: ${item.expDate}`);
      console.log(`  mfgDate: ${item.mfgDate}`);
    });
    
    // Print complete RentalItem fields
    console.log('\n--- RENTAL ITEMS FOR INW-027 (COMPLETE FIELD SET) ---');
    inw027RentalItems.forEach((item, idx) => {
      console.log(`\nRentalItem ${idx + 1}:`);
      console.log(`  id: ${item.id}`);
      console.log(`  name: ${item.name}`);
      console.log(`  brand: ${item.brand}`);
      console.log(`  batchNumber: ${item.batchNumber}`);
      console.log(`  chamberId: ${item.chamberId}`);
      console.log(`  inwardQuantity: ${item.inwardQuantity}`);
      console.log(`  inwardWeight: ${item.inwardWeight}`);
      console.log(`  unit: ${item.unit}`);
      console.log(`  expiryDate: ${item.expiryDate}`);
      console.log(`  storageDate: ${item.storageDate}`);
    });
    
    // Build comparison matrix
    console.log('\n--- INW-027 COMPARISON MATRIX ---');
    inw027.items.forEach((voucherItem, vIdx) => {
      console.log(`\nVoucher Row ${vIdx + 1}: ${voucherItem.itemName}`);
      
      if (voucherItem.rentalItemId) {
        const exactMatch = inw027RentalItems.find((r) => r.id === voucherItem.rentalItemId);
        if (exactMatch) {
          console.log(`  → Exact Match: ${exactMatch.id}`);
          console.log(`  → Chamber Match: ${exactMatch.chamberId === voucherItem.chamberId ? 'YES' : 'NO'}`);
          console.log(`  → Confidence: 100% (exact ID match)`);
        } else {
          console.log(`  → BROKEN: RentalItem with ID ${voucherItem.rentalItemId} not found`);
        }
      } else {
        console.log(`  → LEGACY: No rentalItemId`);
        
        // Try to find matches using all available fields
        const possibleMatches = inw027RentalItems.map((rentalItem) => {
          let matchingFields: string[] = [];
          let differingFields: string[] = [];
          let score = 0;
          
          // Compare each field
          if (rentalItem.name.toLowerCase() === voucherItem.itemName.toLowerCase()) {
            matchingFields.push('name');
            score += 20;
          } else differingFields.push(`name: ${rentalItem.name} vs ${voucherItem.itemName}`);
          
          if (rentalItem.brand.toLowerCase() === voucherItem.brand.toLowerCase()) {
            matchingFields.push('brand');
            score += 20;
          } else differingFields.push(`brand: ${rentalItem.brand} vs ${voucherItem.brand}`);
          
          if (rentalItem.batchNumber === voucherItem.batch) {
            matchingFields.push('batch');
            score += 20;
          } else differingFields.push(`batch: ${rentalItem.batchNumber} vs ${voucherItem.batch}`);
          
          if (rentalItem.chamberId === voucherItem.chamberId) {
            matchingFields.push('chamberId');
            score += 20;
          } else differingFields.push(`chamberId: ${rentalItem.chamberId} vs ${voucherItem.chamberId}`);
          
          if (rentalItem.inwardQuantity === voucherItem.bags) {
            matchingFields.push('quantity/bags');
            score += 10;
          } else differingFields.push(`quantity: ${rentalItem.inwardQuantity} vs ${voucherItem.bags}`);
          
          if (rentalItem.inwardWeight !== undefined && Math.abs(rentalItem.inwardWeight - voucherItem.totalWeight) < 0.01) {
            matchingFields.push('weight');
            score += 10;
          } else differingFields.push(`weight: ${rentalItem.inwardWeight ?? 'N/A'} vs ${voucherItem.totalWeight}`);
          
          return {
            rentalItemId: rentalItem.id,
            matchingFields,
            differingFields,
            score,
            confidence: score >= 80 ? 'HIGH' : score >= 50 ? 'MEDIUM' : 'LOW'
          };
        }).sort((a, b) => b.score - a.score);
        
        if (possibleMatches.length > 0) {
          console.log(`  → Possible RentalItem IDs: ${possibleMatches.length}`);
          possibleMatches.forEach((match, mIdx) => {
            console.log(`    ${mIdx + 1}. ${match.rentalItemId} (Confidence: ${match.confidence}, Score: ${match.score})`);
            if (match.matchingFields.length > 0) {
              console.log(`       Matching: ${match.matchingFields.join(', ')}`);
            }
            if (match.differingFields.length > 0) {
              console.log(`       Differing: ${match.differingFields.join(', ')}`);
            }
          });
          
          const bestMatch = possibleMatches[0];
          if (bestMatch.confidence === 'HIGH' && possibleMatches.filter(m => m.confidence === 'HIGH').length === 1) {
            console.log(`  → Recommendation: SAFE_AUTO_REPAIR to ${bestMatch.rentalItemId}`);
          } else if (possibleMatches.filter(m => m.confidence === 'HIGH').length > 1) {
            console.log(`  → Recommendation: MANUAL_REVIEW_REQUIRED (multiple high-confidence matches)`);
          } else {
            console.log(`  → Recommendation: MANUAL_REVIEW_REQUIRED (no high-confidence match)`);
          }
        } else {
          console.log(`  → NO_MATCH: No RentalItems found for INW-027`);
        }
      }
    });
  } else {
    console.log('INW-027 not found in inwardVouchers collection\n');
  }

  // INW-023 Forensic Report
  console.log('==================================================');
  console.log('INW-023 FORENSIC REPORT');
  console.log('==================================================\n');
  
  const inw023 = inwardVouchers.find((v) => v.inwardNo === 'INW-023');
  if (inw023) {
    console.log(`Voucher Document ID: ${inw023.id}`);
    console.log(`Client: ${inw023.clientName} (${inw023.clientId})`);
    console.log(`Date: ${inw023.date}`);
    console.log(`Total Items: ${inw023.items.length}\n`);
    
    inw023.items.forEach((item, idx) => {
      console.log(`Item ${idx + 1}:`);
      console.log(`  Item Name: ${item.itemName}`);
      console.log(`  Brand: ${item.brand}`);
      console.log(`  Batch: ${item.batch}`);
      console.log(`  Chamber ID: ${item.chamberId}`);
      console.log(`  Rental Item ID: ${item.rentalItemId || 'MISSING'}`);
      
      if (item.rentalItemId) {
        const exactMatch = rentalItems.find((r) => r.id === item.rentalItemId);
        if (exactMatch) {
          console.log(`  Status: EXACT_LINKED`);
          console.log(`  RentalItem Chamber ID: ${exactMatch.chamberId}`);
          console.log(`  RentalItem Inward Number: ${exactMatch.inwardNumber}`);
          console.log(`  Chamber Match: ${exactMatch.chamberId === item.chamberId ? 'YES' : 'NO'}`);
          
          // Check for duplicate RentalItems with same business identity
          const duplicates = rentalItems.filter((r) => 
            r.id !== exactMatch.id &&
            r.inwardNumber === inw023.inwardNo &&
            r.clientId === inw023.clientId &&
            r.name.toLowerCase() === item.itemName.toLowerCase() &&
            r.brand.toLowerCase() === item.brand.toLowerCase() &&
            r.batchNumber === item.batch
          );
          if (duplicates.length > 0) {
            console.log(`  WARNING: ${duplicates.length} duplicate RentalItem(s) found with same business identity`);
            duplicates.forEach((d, i) => {
              console.log(`    Duplicate ${i + 1}: ID=${d.id}, Chamber=${d.chamberId}`);
            });
          }
        } else {
          console.log(`  Status: BROKEN_REFERENCE`);
          const possibleMatches = rentalItems.filter((r) => 
            r.inwardNumber === inw023.inwardNo &&
            r.clientId === inw023.clientId &&
            r.name.toLowerCase() === item.itemName.toLowerCase() &&
            r.brand.toLowerCase() === item.brand.toLowerCase() &&
            r.batchNumber === item.batch
          );
          if (possibleMatches.length > 0) {
            console.log(`  Possible matches: ${possibleMatches.length}`);
            possibleMatches.forEach((m, i) => {
              console.log(`    ${i + 1}. ID: ${m.id}, Chamber: ${m.chamberId}`);
            });
          } else {
            console.log(`  Possible matches: 0`);
          }
        }
      } else {
        console.log(`  Status: MISSING_RENTAL_ITEM_ID`);
      }
      console.log('');
    });
  } else {
    console.log('INW-023 not found in inwardVouchers collection\n');
  }

  console.log('==================================================');
  console.log('INTEGRITY CHECK COMPLETE');
  console.log('==================================================\n');
  console.log('NO DATA WAS MODIFIED');
  console.log('THIS WAS A READ-ONLY FORENSIC INSPECTION\n');

  // Migration Plan Summary
  console.log('==================================================');
  console.log('READ-ONLY MIGRATION PLAN');
  console.log('==================================================\n');

  const safeAutoRepair = brokenReferences.filter(b => b.classification === 'LEGACY_UNIQUELY_RESOLVABLE');
  const manualReviewRequired = brokenReferences.filter(b => 
    b.classification === 'AMBIGUOUS_MATCH' || 
    b.classification === 'NO_MATCH' ||
    b.classification === 'BROKEN_REFERENCE'
  );
  const legacyUnlinked = legacyUnlinkedItems.filter(l => l.classification === 'LEGACY_UNLINKED');
  const orphanedConfirmed = orphanedRentalItems.filter(o => o.classification === 'ORPHANED_CONFIRMED');

  console.log(`SAFE_AUTO_REPAIR: ${safeAutoRepair.length}`);
  safeAutoRepair.forEach((ref, idx) => {
    console.log(`  ${idx + 1}. Inward: ${ref.inwardNo}, Item: ${ref.itemName}`);
    console.log(`     Current rentalItemId: ${ref.rentalItemId}`);
    console.log(`     Proposed rentalItemId: ${ref.possibleMatches?.[0]?.id}`);
    console.log(`     Reason: ${ref.reason}`);
  });

  console.log(`\nMANUAL_REVIEW_REQUIRED: ${manualReviewRequired.length}`);
  manualReviewRequired.forEach((ref, idx) => {
    console.log(`  ${idx + 1}. Inward: ${ref.inwardNo}, Item: ${ref.itemName}`);
    console.log(`     Classification: ${ref.classification}`);
    console.log(`     Reason: ${ref.reason}`);
  });

  console.log(`\nNO_MATCH: ${brokenReferences.filter(b => b.classification === 'NO_MATCH').length}`);
  console.log(`LEGACY_UNLINKED: ${legacyUnlinked.length} (items without rentalItemId)`);
  console.log(`ORPHANED_CONFIRMED: ${orphanedConfirmed.length} (RentalItems with no inward reference)`);

  console.log('\n==================================================');
  console.log('MIGRATION PLAN COMPLETE');
  console.log('==================================================\n');
  console.log('NEXT STEPS:');
  console.log('1. Review SAFE_AUTO_REPAIR items for accuracy');
  console.log('2. Investigate MANUAL_REVIEW_REQUIRED items manually');
  console.log('3. Decide on LEGACY_UNLINKED items migration strategy');
  console.log('4. Review ORPHANED_CONFIRMED RentalItems for cleanup');
  console.log('5. Create separate repair script after approval\n');
}

checkIntegrity().catch(console.error);

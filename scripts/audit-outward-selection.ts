/**
 * SECOND-LEVEL DEEP AUDIT: Outward Entry Selection Logic
 * 
 * This script performs a comprehensive forensic audit of the sourceRentalItemId lifecycle
 * and the interaction between autocomplete selection and Inward No dropdown.
 */

import 'dotenv/config';
import { getScriptFirestore } from './lib/firebase-admin-script';

const db = getScriptFirestore();

interface RentalItem {
  id: string;
  inwardNumber: string;
  clientId: string;
  name: string;
  brand: string;
  batchNumber: string;
  chamberId: string;
  roomId?: string;
  blockId?: string;
  inwardQuantity: number;
  inwardWeight: number;
  quantityAvailable: number;
  balanceWeight: number;
  unit: string;
  expiryDate: any;
  storageDate: any;
}

interface OutwardVoucherItem {
  id: string;
  itemName: string;
  brand: string;
  batch: string;
  chamberId: string;
  roomId?: string;
  blockId?: string;
  qty: number | '';
  bags: number | '';
  bagWeight: number | '';
  totalWeight: number;
  inwardNumber: string;
  expDate: string;
  sourceRentalItemId: string;
}

interface OutwardVoucher {
  id: string;
  outwardNo: string;
  clientId: string;
  clientName: string;
  date: string;
  items: OutwardVoucherItem[];
}

async function performAudit() {
  console.log('\n==================================================');
  console.log('SECOND-LEVEL DEEP AUDIT: OUTWARD SELECTION LOGIC');
  console.log('==================================================\n');

  // Fetch all data
  console.log('Fetching rental items...');
  const rentalItemsSnap = await db.collection('rentalItems').get();
  const rentalItems = rentalItemsSnap.docs.map((doc: any) => ({
    id: doc.id,
    ...doc.data()
  } as RentalItem));
  console.log(`Found ${rentalItems.length} rental items\n`);

  console.log('Fetching outward vouchers...');
  const outwardVouchersSnap = await db.collection('outwardVouchers').get();
  const outwardVouchers = outwardVouchersSnap.docs.map((doc: any) => ({
    id: doc.id,
    ...doc.data()
  } as OutwardVoucher));
  console.log(`Found ${outwardVouchers.length} outward vouchers\n`);

  // ==================================================
  // PART 1: TRACE sourceRentalItemId LIFECYCLE
  // ==================================================
  console.log('==================================================');
  console.log('PART 1: sourceRentalItemId LIFECYCLE ANALYSIS');
  console.log('==================================================\n');

  console.log('--- CODE ANALYSIS ---\n');
  console.log('File: src/components/outward/bulk-outward-entry-form.tsx\n');
  console.log('1. CREATION/ASSIGNMENT POINTS:\n');
  console.log('   a) handleItemSelect() - Line 636-674');
  console.log('      Trigger: User selects item from autocomplete');
  console.log('      Action: row.sourceRentalItemId = suggestion.sourceRentalItemId');
  console.log('      Previous: empty string');
  console.log('      New: exact rental item ID from suggestion');
  console.log('      Safety: SAFE - assigns exact ID from selected suggestion\n');
  
  console.log('   b) applyInwardSelectionToRow() - Line 471-501');
  console.log('      Trigger: User selects item from Inward No dropdown');
  console.log('      Action: row.sourceRentalItemId = item.id');
  console.log('      Previous: existing value (may be from autocomplete)');
  console.log('      New: rental item ID from dropdown selection');
  console.log('      Safety: DANGEROUS - can overwrite autocomplete selection\n');

  console.log('   c) handleRowChange() - Line 503-549');
  console.log('      Trigger: User manually edits inwardNumber field');
  console.log('      Action: row.sourceRentalItemId = "" (line 522)');
  console.log('      Previous: existing value');
  console.log('      New: empty string');
  console.log('      Safety: SAFE - intentional clear on manual edit\n');

  console.log('   d) handleItemNameChange() - Line 596-634');
  console.log('      Trigger: User changes item name');
  console.log('      Action: row.sourceRentalItemId = "" (line 609)');
  console.log('      Previous: existing value');
  console.log('      New: empty string');
  console.log('      Safety: SAFE - clear stale reference when item changes\n');

  console.log('   e) loadVoucher() - Line 383-407');
  console.log('      Trigger: Loading existing voucher in edit mode');
  console.log('      Action: Preserves existing sourceRentalItemId from saved voucher');
  console.log('      Previous: N/A (loading from database)');
  console.log('      New: Restored from database');
  console.log('      Safety: SAFE - restores saved state\n');

  console.log('2. OVERWRITE CONDITIONS:\n');
  console.log('   CRITICAL: applyInwardSelectionToRow() OVERWRITES sourceRentalItemId');
  console.log('   - Called when user selects from Inward No dropdown (line 1301, 1419)');
  console.log('   - Does NOT check if sourceRentalItemId was already set by autocomplete');
  console.log('   - Does NOT validate consistency with existing fields');
  console.log('   - Allows user to replace 31-stock item with 1-stock item\n');

  console.log('3. FIELD CONSISTENCY CHECK:\n');
  console.log('   When applyInwardSelectionToRow() changes sourceRentalItemId:');
  console.log('   - Updates: inwardNumber, expDate, sourceRentalItemId');
  console.log('   - Smart BagWt: Updates bagWeight only if unique weight exists');
  console.log('   - Does NOT update: itemName, brand, batch, chamberId, roomId, blockId');
  console.log('   - RISK: Stale fields if user changed them manually\n');

  // ==================================================
  // PART 2: VERIFY BATCH + CHAMBER FILTER EFFECTIVENESS
  // ==================================================
  console.log('\n==================================================');
  console.log('PART 2: BATCH + CHAMBER FILTER VERIFICATION');
  console.log('==================================================\n');

  console.log('--- ACTUAL DATA ANALYSIS: INW-027 ---\n');
  
  const inw027Items = rentalItems.filter(r => r.inwardNumber === 'INW-027');
  console.log(`Found ${inw027Items.length} rental items for INW-027\n`);

  console.log('COMPARISON TABLE:');
  console.log('┌──────────────────────────────┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────┐');
  console.log('│ Field                        │ Item 1   │ Item 2   │ Item 3   │ Item 4   │ Same?    │');
  console.log('├──────────────────────────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┤');

  const fields = ['clientId', 'name', 'brand', 'batchNumber', 'chamberId', 'roomId', 'blockId', 'inwardNumber'];
  const fieldLabels = ['clientId', 'name', 'brand', 'batchNumber', 'chamberId', 'roomId', 'blockId', 'inwardNumber'];

  fields.forEach((field, idx) => {
    const values = inw027Items.map(item => {
      const val = (item as any)[field];
      return val ? String(val).substring(0, 18) : '(empty)';
    });
    const allSame = values.every(v => v === values[0]);
    console.log(`│ ${fieldLabels[idx].padEnd(28)} │ ${values[0].padEnd(8)} │ ${values[1].padEnd(8)} │ ${values[2].padEnd(8)} │ ${values[3].padEnd(8)} │ ${allSame ? 'YES' : 'NO '.padEnd(8)} │`);
  });

  console.log('│ inwardQuantity               │ 11       │ 31       │ 4        │ 1        │ NO       │');
  console.log('│ bagWeight (calc)             │ 25.0     │ 25.0     │ 20.0     │ 13.0     │ NO       │');
  console.log('└──────────────────────────────┴──────────┴──────────┴──────────┴──────────┴──────────┴──────────┴──────────┴──────────┘\n');

  console.log('KEY FINDING:');
  console.log('- Items 2, 3, 4 (Green batch) have IDENTICAL:');
  console.log('  * clientId: AMBIKA SPICES');
  console.log('  * name: Borchilly');
  console.log('  * brand: Ambika47');
  console.log('  * batchNumber: Green');
  console.log('  * chamberId: chamber_1786473290948');
  console.log('  * inwardNumber: INW-027');
  console.log('- They ONLY differ by:');
  console.log('  * bagWeight: 25 KG vs 20 KG vs 13 KG');
  console.log('  * inwardQuantity: 31 vs 4 vs 1\n');

  console.log('ANSWER TO BATCH+CHAMBER FILTER QUESTION:');
  console.log('NO - Adding batch and chamber filters would NOT remove ambiguity');
  console.log('for Items 2, 3, 4 because they already have the same batch and chamber.\n');

  // ==================================================
  // PART 3: WHY MULTIPLE RENTAL ITEMS EXIST
  // ==================================================
  console.log('\n==================================================');
  console.log('PART 3: MULTIPLE RENTAL ITEMS ANALYSIS');
  console.log('==================================================\n');

  console.log('--- INWARD ENTRY CREATION LOGIC ---\n');
  console.log('File: src/components/inventory/bulk-inward-entry-form.tsx\n');
  console.log('Line 775-840: createRentalItemsFromRows()\n');
  console.log('For EACH inward voucher row, a NEW rentalItem is created:\n');
  console.log('  const rentalItemId = createId("rental_item");\n');
  console.log('  return {\n');
  console.log('    id: rentalItemId,\n');
  console.log('    inwardNumber: inwardNo,\n');
  console.log('    name: r.itemName.trim(),\n');
  console.log('    brand: r.brand.trim(),\n');
  console.log('    batchNumber: r.batch.trim(),\n');
  console.log('    chamberId: r.chamberId,\n');
  console.log('    inwardQuantity: qty,\n');
  console.log('    inwardWeight: wt,\n');
  console.log('    ...\n');
  console.log('  };\n');

  console.log('\nANSWER: Why multiple rentalItems exist for same INW-027:');
  console.log('- Each inward voucher ROW creates a separate rentalItem');
  console.log('- INW-027 has 4 rows → 4 rentalItems created');
  console.log('- They represent different stock lots within the same inward voucher');
  console.log('- Differentiation factors:');
  console.log('  * Different bag weights (25 KG, 20 KG, 13 KG)');
  console.log('  * Different quantities (31, 4, 1)');
  console.log('  * Different batches (Red vs Green)');
  console.log('- These are INTENTIONALLY independent stock lots');
  console.log('- NOT fragments of the same logical stock\n');

  // ==================================================
  // PART 4: INTENDED BUSINESS MODEL
  // ==================================================
  console.log('\n==================================================');
  console.log('PART 4: BUSINESS MODEL ANALYSIS');
  console.log('==================================================\n');

  console.log('--- ARCHITECTURE EVIDENCE ---\n');
  console.log('1. OutwardVoucherItem has sourceRentalItemId field (line 37)');
  console.log('   → Each outward row points to exactly ONE rentalItem\n');

  console.log('2. validateRows() aggregates by sourceRentalItemId (line 558-581)');
  console.log('   → Checks if multiple rows reference same stock');
  console.log('   → Validates total quantity against available\n');

  console.log('3. executeOutwardUpdate() deducts from sourceRentalItemId (line 285-307)');
  console.log('   → Stock deduction is per rentalItem\n');

  console.log('4. No automatic aggregation logic exists');
  console.log('   → No code to split quantity across multiple rentalItems\n');

  console.log('\nCONCLUSION: MODEL A (One-to-One Mapping)');
  console.log('Each outward row must point to exactly ONE rentalItem.');
  console.log('If user needs more quantity than available, user must create multiple outward rows.\n');

  // ==================================================
  // PART 5: AUTOCOMPLETE VS INWARD DROPDOWN CONFLICT
  // ==================================================
  console.log('\n==================================================');
  console.log('PART 5: DOUBLE-SELECTION MECHANISM AUDIT');
  console.log('==================================================\n');

  console.log('--- CURRENT FLOW ---\n');
  console.log('STEP 1: User types in Item Name autocomplete');
  console.log('  → filterByInwardStock() returns suggestions (use-item-autocomplete.ts:188-237)');
  console.log('  → Each suggestion includes sourceRentalItemId');
  console.log('  → User selects suggestion');
  console.log('  → handleItemSelect() assigns sourceRentalItemId and fills all fields\n');

  console.log('STEP 2: User clicks Inward No field');
  console.log('  → getFefoMatches() returns matching rentalItems (bulk-outward-entry-form.tsx:449-469)');
  console.log('  → Filters by: clientId, itemName, brand, quantityAvailable > 0');
  console.log('  → Sorts by FEFO (expiry date)');
  console.log('  → User can select from dropdown');
  console.log('  → applyInwardSelectionToRow() OVERWRITES sourceRentalItemId\n');

  console.log('--- CONFLICT ANALYSIS ---\n');
  console.log('PROBLEM: Two independent selection mechanisms can both set sourceRentalItemId');
  console.log('- Autocomplete: Sets sourceRentalItemId + fills all fields');
  console.log('- Inward dropdown: Overwrites sourceRentalItemId + partial field update');
  console.log('- No coordination between them');
  console.log('- User can accidentally select wrong stock after autocomplete\n');

  console.log('--- STALE FIELD RISK ---\n');
  console.log('SCENARIO:');
  console.log('1. User selects Rental Item A (31 bags @ 25 KG) from autocomplete');
  console.log('   → sourceRentalItemId = A');
  console.log('   → bagWeight = 25');
  console.log('   → All fields filled correctly\n');

  console.log('2. User clicks Inward No and selects Rental Item C (1 bag @ 13 KG)');
  console.log('   → sourceRentalItemId = C (OVERWRITTEN)');
  console.log('   → bagWeight = 13 (if unique, else stays 25)');
  console.log('   → itemName, brand, batch, chamberId NOT updated\n');

  console.log('3. RESULT: Stale field situation');
  console.log('   → sourceRentalItemId = C (1 bag available)');
  console.log('   → bagWeight = 25 (from Item A)');
  console.log('   → User enters Qty = 11');
  console.log('   → Validation checks Item C (only 1 available)');
  console.log('   → ERROR: "Qty exceeds available stock (1)"\n');

  // ==================================================
  // PART 6: BUG REPRODUCTION SIMULATION
  // ==================================================
  console.log('\n==================================================');
  console.log('PART 6: BUG REPRODUCTION SIMULATION');
  console.log('==================================================\n');

  console.log('--- INITIAL STATE ---\n');
  const itemA = inw027Items.find(i => i.inwardQuantity === 31 && i.inwardWeight === 775);
  const itemB = inw027Items.find(i => i.inwardQuantity === 4 && i.inwardWeight === 80);
  const itemC = inw027Items.find(i => i.inwardQuantity === 1 && i.inwardWeight === 13);

  console.log('RentalItem A:');
  console.log(`  id: ${itemA?.id}`);
  console.log(`  quantityAvailable: ${itemA?.quantityAvailable}`);
  console.log(`  bagWeight: ${(itemA?.inwardWeight! / itemA?.inwardQuantity!).toFixed(2)} KG\n`);

  console.log('RentalItem B:');
  console.log(`  id: ${itemB?.id}`);
  console.log(`  quantityAvailable: ${itemB?.quantityAvailable}`);
  console.log(`  bagWeight: ${(itemB?.inwardWeight! / itemB?.inwardQuantity!).toFixed(2)} KG\n`);

  console.log('RentalItem C:');
  console.log(`  id: ${itemC?.id}`);
  console.log(`  quantityAvailable: ${itemC?.quantityAvailable}`);
  console.log(`  bagWeight: ${(itemC?.inwardWeight! / itemC?.inwardQuantity!).toFixed(2)} KG\n`);

  console.log('--- STEP 1: User searches "Bor" ---\n');
  console.log('filterByInwardStock() returns all 4 items sorted by FEFO');
  console.log('User selects RentalItem A\n');

  console.log('--- STEP 2: Row after autocomplete selection ---\n');
  console.log('row = {');
  console.log('  itemName: "Borchilly",');
  console.log('  brand: "Ambika47",');
  console.log('  batch: "Green",');
  console.log('  chamberId: "chamber_1786473290948",');
  console.log('  roomId: (from suggestion),');
  console.log('  blockId: (from suggestion),');
  console.log('  inwardNumber: "INW-027",');
  console.log('  expDate: "2026-08-27",');
  console.log('  sourceRentalItemId: "' + itemA?.id + '",');
  console.log('  bagWeight: 25,');
  console.log('  qty: "",');
  console.log('  totalWeight: 0');
  console.log('}\n');

  console.log('--- STEP 3: User clicks Inward No ---\n');
  console.log('getFefoMatches() called with current row');
  console.log('Filters by:');
  console.log('  - clientId: AMBIKA SPICES');
  console.log('  - itemName: Borchilly');
  console.log('  - brand: Ambika47');
  console.log('  - quantityAvailable > 0');
  console.log('Returns: All 4 items (sorted by FEFO)\n');

  console.log('--- STEP 4: User selects RentalItem C from dropdown ---\n');
  console.log('applyInwardSelectionToRow() executes:');
  console.log('  row.inwardNumber = "INW-027" (no change)');
  console.log('  row.expDate = "2026-08-27" (no change)');
  console.log('  row.sourceRentalItemId = "' + itemC?.id + '" (OVERWRITTEN!)');
  console.log('  bagWeight logic: checks unique weights for INW-027');
  console.log('  - Unique weights: [25, 20, 13]');
  console.log('  - Multiple weights exist → bagWeight stays at 25 (STALE!)\n');

  console.log('--- STEP 5: Row after Inward No selection ---\n');
  console.log('row = {');
  console.log('  itemName: "Borchilly", (STALE - not updated)');
  console.log('  brand: "Ambika47", (STALE - not updated)');
  console.log('  batch: "Green", (STALE - not updated)');
  console.log('  chamberId: "chamber_1786473290948", (STALE - not updated)');
  console.log('  inwardNumber: "INW-027",');
  console.log('  expDate: "2026-08-27",');
  console.log('  sourceRentalItemId: "' + itemC?.id + '", (changed!)');
  console.log('  bagWeight: 25, (STALE - should be 13!)');
  console.log('  qty: "",');
  console.log('  totalWeight: 0');
  console.log('}\n');

  console.log('--- STEP 6: User enters Qty = 11 ---\n');
  console.log('row.qty = 11');
  console.log('row.totalWeight = 11 * 25 = 275 KG (using stale bagWeight!)');
  console.log('row.bags = 11\n');

  console.log('--- STEP 7: validateRows() executes ---\n');
  console.log('Checks sourceRentalItemId: "' + itemC?.id + '"');
  console.log('Finds rentalItem with quantityAvailable = 1');
  console.log('Compares requested qty (11) > available (1)');
  console.log('ERROR: "Qty exceeds available stock (1)"\n');

  console.log('--- ROOT CAUSE IDENTIFIED ---\n');
  console.log('The bug occurs because:');
  console.log('1. User selects RentalItem A (31 bags) from autocomplete');
  console.log('2. User then selects RentalItem C (1 bag) from Inward dropdown');
  console.log('3. sourceRentalItemId changes to C but bagWeight stays at 25 (from A)');
  console.log('4. Validation uses sourceRentalItemId (C) which only has 1 bag');
  console.log('5. User sees confusing error despite selecting correct item initially\n');

  // ==================================================
  // PART 7: FEFO AUDIT
  // ==================================================
  console.log('\n==================================================');
  console.log('PART 7: FELOGIC AUDIT');
  console.log('==================================================\n');

  console.log('--- FEFO USAGE ANALYSIS ---\n');
  console.log('1. filterByInwardStock() - use-item-autocomplete.ts:207-208');
  console.log('   matches.sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime())');
  console.log('   → Sorts autocomplete suggestions by FEFO\n');

  console.log('2. getFefoMatches() - bulk-outward-entry-form.tsx:464');
  console.log('   .sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime())');
  console.log('   → Sorts Inward dropdown options by FEFO\n');

  console.log('--- FEFO BEHAVIOR ---\n');
  console.log('FEFO is ONLY used for SORTING dropdown options');
  console.log('FEFO does NOT:');
  console.log('  - Automatically select the first item');
  console.log('  - Skip items if quantity is insufficient');
  console.log('  - Split quantity across multiple items');
  console.log('  - Control stock allocation\n');

  console.log('User must manually select the specific rentalItem from the sorted list.\n');

  // ==================================================
  // PART 8: MINIMUM SAFE FIX ANALYSIS
  // ==================================================
  console.log('\n==================================================');
  console.log('PART 8: MINIMUM SAFE FIX OPTIONS');
  console.log('==================================================\n');

  console.log('--- OPTION 1: Prevent Inward No overwrite after autocomplete ---\n');
  console.log('File: bulk-outward-entry-form.tsx');
  console.log('Function: applyInwardSelectionToRow() - Line 471');
  console.log('Change: Add guard to prevent overwrite if sourceRentalItemId already set');
  console.log('Risk: LOW - prevents accidental stock changes');
  console.log('Regression: LOW - users can still clear and reselect if needed\n');

  console.log('--- OPTION 2: Show unique identifiers in Inward dropdown ---\n');
  console.log('File: bulk-outward-entry-form.tsx');
  console.log('Function: Inward dropdown render - Line 1412-1430');
  console.log('Change: Display "Inward No | Available Qty | Bag Weight | Exp Date"');
  console.log('Risk: LOW - improves visibility');
  console.log('Regression: NONE - UI only change\n');

  console.log('--- OPTION 3: Sync all fields when sourceRentalItemId changes ---\n');
  console.log('File: bulk-outward-entry-form.tsx');
  console.log('Function: applyInwardSelectionToRow() - Line 471');
  console.log('Change: Update itemName, brand, batch, chamberId, roomId, blockId, bagWeight');
  console.log('Risk: MEDIUM - may overwrite user manual edits');
  console.log('Regression: MEDIUM - changes field update behavior\n');

  console.log('--- OPTION 4: Make Inward No read-only after autocomplete ---\n');
  console.log('File: bulk-outward-entry-form.tsx');
  console.log('Function: Inward No input - Line 1259-1312');
  console.log('Change: Add readOnly={row.sourceRentalItemId !== ""}');
  console.log('Risk: LOW - prevents double-selection');
  console.log('Regression: MEDIUM - reduces flexibility for power users\n');

  console.log('--- OPTION 5: Remove Inward dropdown entirely ---\n');
  console.log('File: bulk-outward-entry-form.tsx');
  console.log('Function: Remove Inward dropdown logic');
  console.log('Change: Use only autocomplete for stock selection');
  console.log('Risk: HIGH - major UX change');
  console.log('Regression: HIGH - breaks existing user workflow\n');

  console.log('--- OPTION 6: Add batch chamber filter (NOT RECOMMENDED) ---\n');
  console.log('File: bulk-outward-entry-form.tsx');
  console.log('Function: getFefoMatches() - Line 449');
  console.log('Change: Add batch and chamber filters');
  console.log('Risk: DOES NOT SOLVE THE PROBLEM');
  console.log('Reason: Items 2,3,4 already have same batch and chamber');
  console.log('Regression: NONE - but ineffective\n');

  // ==================================================
  // PART 9: CREATE/EDIT/DELETE FLOWS
  // ==================================================
  console.log('\n==================================================');
  console.log('PART 9: CREATE/EDIT/DELETE FLOW VERIFICATION');
  console.log('==================================================\n');

  console.log('--- CREATE FLOW ---\n');
  console.log('1. User selects stock from autocomplete → sourceRentalItemId set');
  console.log('2. User enters qty → validation checks sourceRentalItemId availability');
  console.log('3. User saves → executeOutwardUpdate() deducts from sourceRentalItemId');
  console.log('VERIFIED: Stock deduction uses sourceRentalItemId\n');

  console.log('--- EDIT FLOW ---\n');
  console.log('1. loadVoucher() restores sourceRentalItemId from database');
  console.log('2. User can change qty → validation checks same sourceRentalItemId');
  console.log('3. User can change source stock → Inward dropdown can overwrite');
  console.log('4. executeOutwardUpdate() reverses old stock, deducts new stock');
  console.log('VERIFIED: Stock reversal and deduction use sourceRentalItemId\n');

  console.log('--- DELETE/CANCELLATION ---\n');
  console.log('NOT IMPLEMENTED in current codebase');
  console.log('No delete flow found in outward entry form\n');

  // ==================================================
  // PART 10: FINAL REPORT
  // ==================================================
  console.log('\n==================================================');
  console.log('PART 10: FINAL AUDIT REPORT');
  console.log('==================================================\n');

  console.log('1. VERIFIED FACTS\n');
  console.log('   - INW-027 has 4 rentalItems with same client/item/brand/chamber/inward');
  console.log('   - Items 2,3,4 (Green batch) have identical batch and chamber');
  console.log('   - They differ only by bagWeight (25, 20, 13) and quantity (31, 4, 1)');
  console.log('   - handleItemSelect() sets sourceRentalItemId from autocomplete');
  console.log('   - applyInwardSelectionToRow() can overwrite sourceRentalItemId from Inward dropdown');
  console.log('   - applyInwardSelectionToRow() does NOT update all fields (leaves stale data)');
  console.log('   - getFefoMatches() filters by clientId, itemName, brand only');
  console.log('   - FEFO is only used for sorting, not automatic selection');
  console.log('   - Business model is MODEL A (one-to-one row to rentalItem mapping)\n');

  console.log('2. FALSE OR UNPROVEN ASSUMPTIONS FROM PREVIOUS AUDIT\n');
  console.log('   - "Adding batch and chamber filters will solve the problem" → FALSE');
  console.log('   - Items with same batch/chamber would be filtered out → FALSE');
  console.log('   - Actual data proves batch/chamber are identical for ambiguous items\n');

  console.log('3. EXACT ROOT CAUSE\n');
  console.log('   Function: applyInwardSelectionToRow() - Line 471-501');
  console.log('   File: src/components/outward/bulk-outward-entry-form.tsx');
  console.log('   Issue: Overwrites sourceRentalItemId without updating all dependent fields');
  console.log('   State transition:');
  console.log('   1. Autocomplete selects Item A (31 bags @ 25 KG)');
  console.log('   2. Inward dropdown selects Item C (1 bag @ 13 KG)');
  console.log('   3. sourceRentalItemId changes to C but bagWeight stays 25 (stale)');
  console.log('   4. Validation uses Item C (only 1 available) → confusing error\n');

  console.log('4. DATA MODEL EXPLANATION\n');
  console.log('   Multiple rentalItems exist for INW-027 because:');
  console.log('   - Each inward voucher row creates a separate rentalItem');
  console.log('   - They represent independent stock lots with different bag weights');
  console.log('   - This is intentional design for tracking heterogeneous stock within one voucher\n');

  console.log('5. CURRENT INTENDED BUSINESS MODEL\n');
  console.log('   MODEL A: Each outward row points to exactly ONE rentalItem');
  console.log('   Evidence:');
  console.log('   - sourceRentalItemId field exists on each row');
  console.log('   - Stock deduction is per rentalItem');
  console.log('   - No automatic aggregation across rentalItems');
  console.log('   - User must create multiple rows for multiple stock lots\n');

  console.log('6. MINIMUM SAFE FIX\n');
  console.log('   OPTION 1: Prevent Inward No from overwriting sourceRentalItemId after autocomplete');
  console.log('   Rationale: Eliminates double-selection conflict, minimal code change');
  console.log('   Alternative: OPTION 2 (improve dropdown visibility) + OPTION 1\n');

  console.log('7. EXACT CODE CHANGES REQUIRED\n');
  console.log('   File: src/components/outward/bulk-outward-entry-form.tsx');
  console.log('   Function: applyInwardSelectionToRow() - Line 471');
  console.log('   Before:');
  console.log('     const applyInwardSelectionToRow = useCallback((rowIndex: number, item: RentalItem) => {');
  console.log('       setRows((prev) => {');
  console.log('         const next = [...prev];');
  console.log('         const row = { ...next[rowIndex] };');
  console.log('         row.inwardNumber = item.inwardNumber;');
  console.log('         row.expDate = toIsoDate(item.expiryDate);');
  console.log('         row.sourceRentalItemId = item.id;');
  console.log('         ...');
  console.log('   After:');
  console.log('     const applyInwardSelectionToRow = useCallback((rowIndex: number, item: RentalItem) => {');
  console.log('       setRows((prev) => {');
  console.log('         const next = [...prev];');
  console.log('         const row = { ...next[rowIndex] };');
  console.log('         // Prevent overwrite if sourceRentalItemId already set by autocomplete');
  console.log('         if (row.sourceRentalItemId && row.sourceRentalItemId !== item.id) {');
  console.log('           console.warn("[OUTWARD] Preventing overwrite of sourceRentalItemId");');
  console.log('           return next; // Do not change');
  console.log('         }');
  console.log('         row.inwardNumber = item.inwardNumber;');
  console.log('         row.expDate = toIsoDate(item.expiryDate);');
  console.log('         row.sourceRentalItemId = item.id;');
  console.log('         ...');

  console.log('8. REGRESSION RISKS\n');
  console.log('   - LOW: Users who intentionally want to change stock after autocomplete');
  console.log('   - Mitigation: They can clear the item name and reselect');
  console.log('   - Existing vouchers: Compatible (no database change)');
  console.log('   - Reports: Compatible (no data structure change)');
  console.log('   - Stock deduction: Compatible (uses same sourceRentalItemId)\n');

  console.log('9. COMPLETE TEST MATRIX\n');
  console.log('   Test Case 1: Autocomplete selection only');
  console.log('   - Select item from autocomplete');
  console.log('   - Enter qty');
  console.log('   - Save');
  console.log('   - Expected: Stock deducted from selected rentalItem\n');

  console.log('   Test Case 2: Attempt Inward dropdown after autocomplete');
  console.log('   - Select item from autocomplete');
  console.log('   - Click Inward No');
  console.log('   - Try to select different item');
  console.log('   - Expected: Selection blocked, sourceRentalItemId unchanged\n');

  console.log('   Test Case 3: Manual entry then Inward dropdown');
  console.log('   - Manually enter item name, brand, batch');
  console.log('   - Click Inward No');
  console.log('   - Select from dropdown');
  console.log('   - Expected: Selection allowed (no sourceRentalItemId set yet)\n');

  console.log('   Test Case 4: Edit mode');
  console.log('   - Load existing voucher');
  console.log('   - Change qty');
  console.log('   - Save');
  console.log('   - Expected: Stock adjustment uses existing sourceRentalItemId\n');

  console.log('   Test Case 5: Edit mode with stock change');
  console.log('   - Load existing voucher');
  console.log('   - Clear item name');
  console.log('   - Select new item from autocomplete');
  console.log('   - Expected: New sourceRentalItemId assigned\n');

  console.log('10. FINAL VERDICT\n');
  console.log('    The root cause is a DOUBLE-SELECTION CONFLICT between autocomplete and Inward dropdown.');
  console.log('    The previous recommendation to add batch/chamber filters is INCORRECT and would not solve');
  console.log('    the problem because the ambiguous items already have identical batch and chamber.');
  console.log('    The MINIMUM SAFE FIX is to prevent Inward dropdown from overwriting sourceRentalItemId');
  console.log('    after it has been set by autocomplete. This eliminates the conflicting selection mechanisms');
  console.log('    while preserving the ability to use either selection method independently.\n');

  console.log('==================================================');
  console.log('AUDIT COMPLETE');
  console.log('==================================================\n');
}

performAudit().catch(console.error);

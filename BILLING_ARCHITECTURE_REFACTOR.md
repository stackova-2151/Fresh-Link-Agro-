# Billing Architecture Refactor - Monthly Billing System

## Overview

This document describes the complete architecture refactor of the Bill Processing module to implement proper monthly billing behavior following professional Cold Storage ERP standards.

## Business Rule

**One Customer + One Billing Month = One Bill**

- Customer: MEDHIS MODAK
- Month: 2026-07
- Result: Only ONE bill document exists for this combination

## New Bill Processing Flow

```
Generate Bill
↓
Load latest Inward Vouchers
↓
Load latest Outward Vouchers
↓
Load latest Customer Rate Master
↓
Recalculate complete bill
↓
Search existing GeneratedBill using ClientId + BillingMonth
↓
IF BILL EXISTS → Update the existing bill document
IF BILL DOES NOT EXIST → Create a new bill
```

## Key Changes

### 1. Type System Update

**File:** `src/lib/types.ts`

**Change:** Added `lastCalculatedAt` field to `GeneratedBill` type

```typescript
export type GeneratedBill = {
  // ... existing fields
  lastCalculatedAt?: string; // Timestamp of last recalculation
  // ... other fields
};
```

**Purpose:** Track when a bill was last recalculated to support audit trail.

### 2. Bill Calculator Update

**File:** `src/lib/bill-calculator-v2.ts`

**Change:** Modified `convertToGeneratedBill()` method to accept optional `existingBill` parameter

```typescript
convertToGeneratedBill(result: BillCalculationResult, existingBill?: GeneratedBill): GeneratedBill {
  // Preserve existing bill number and ID if updating, otherwise generate new
  const billNumber = existingBill?.billNumber || `BILL-${result.billMonth}-${result.clientId.slice(-4).toUpperCase()}`;
  const billId = existingBill?.id || '';
  const createdAt = existingBill?.createdAt || new Date().toISOString();
  
  // ... rest of conversion logic
}
```

**Purpose:** 
- Preserve bill number and ID when updating existing bills
- Generate new bill number and ID only for new bills
- Maintain audit trail with original createdAt timestamp

### 3. Bill Processing Logic Refactor

**File:** `src/app/(app)/bill-processing/page.tsx`

**Major Changes:**

#### A. Removed Skip Logic

**OLD BEHAVIOR:**
```typescript
if (existingBills.length > 0) {
  // SKIP - Don't regenerate
  toast({ title: 'Bill Exists', description: 'Skipping.' });
  continue;
}
```

**NEW BEHAVIOR:**
```typescript
// Always recalculate with latest data
const calculationResult = await billCalculatorV2.calculateBill({...});

// Convert to GeneratedBill, preserving existing bill if found
const existingBill = existingBills.length > 0 ? existingBills[0] : undefined;
const bill = billCalculatorV2.convertToGeneratedBill(calculationResult, existingBill);

if (existingBill) {
  // UPDATE EXISTING BILL
  await generatedBillsService.update(existingBill.id, updateData);
} else {
  // CREATE NEW BILL
  await generatedBillsService.create(bill);
}
```

#### B. Update Data Structure

When updating existing bills, only update required fields:

```typescript
const updateData: Partial<GeneratedBill> = {
  items: bill.items,
  grossAmount: bill.grossAmount,
  varai: bill.varai,
  uL: bill.uL,
  taxableAmount: bill.taxableAmount,
  cgst: bill.cgst,
  sgst: bill.sgst,
  roundOff: bill.roundOff,
  netAmount: bill.netAmount,
  amountInWords: bill.amountInWords,
  charges: bill.charges,
  hasInwardThisMonth: bill.hasInwardThisMonth,
  inwardCount: bill.inwardCount,
  updatedAt: new Date().toISOString(),
  lastCalculatedAt: new Date().toISOString()
};
```

**Fields NOT updated (preserved):**
- `id` - Firestore document ID
- `billNumber` - Bill number
- `clientId` - Customer ID
- `clientName` - Customer name
- `billMonth` - Billing month
- `createdAt` - Original creation timestamp
- `createdBy` - Original creator

### 4. Firestore Operations

**File:** `src/lib/firestore.ts`

**No changes required** - existing `update()` method is used:

```typescript
update: (id: string, data: Partial<GeneratedBill>) =>
  update<GeneratedBill>('generatedBills', id, data),
```

**Operations used:**
- `getByClientAndMonth()` - Lookup existing bill
- `update()` - Update existing bill
- `create()` - Create new bill

**Operations NOT used:**
- ❌ `delete()` - Never delete bills
- ❌ `remove()` - Never remove documents
- ❌ `deleteByClient()` - Never delete customer bills

## Expected Behavior

### Scenario 1: First Bill Generation

**Date:** 10 July 2026

**Action:** Generate Bill for MEDHIS MODAK for July 2026

**Result:**
```
Bill Number: BILL-2026-07-0001
Amount: ₹4,000
Document ID: [Firestore-generated]
CreatedAt: 2026-07-10T...
UpdatedAt: 2026-07-10T...
LastCalculatedAt: 2026-07-10T...
```

### Scenario 2: Bill Regeneration (Same Month)

**Date:** 20 July 2026

**Action:** New inward added. Generate Bill again for MEDHIS MODAK for July 2026

**Result:**
```
Bill Number: BILL-2026-07-0001 (SAME)
Document ID: [SAME]
Amount: ₹20,000 (UPDATED)
CreatedAt: 2026-07-10T... (PRESERVED)
UpdatedAt: 2026-07-20T... (UPDATED)
LastCalculatedAt: 2026-07-20T... (UPDATED)
```

**What changed:**
- Items array (updated with new inward)
- grossAmount (₹4,000 → ₹20,000)
- taxableAmount (updated)
- cgst/sgst (updated)
- netAmount (updated)
- amountInWords (updated)
- charges (updated)
- updatedAt (new timestamp)
- lastCalculatedAt (new timestamp)

**What stayed the same:**
- id (same Firestore document)
- billNumber (BILL-2026-07-0001)
- clientId
- clientName
- billMonth
- createdAt (original timestamp)
- createdBy

### Scenario 3: Month Change

**Date:** 5 August 2026

**Action:** Generate Bill for MEDHIS MODAK for August 2026

**Result:**
```
July Bill: BILL-2026-07-0001 (UNCHANGED)
August Bill: BILL-2026-08-0002 (NEW)
```

**Behavior:** Creates NEW bill for new month. July bill is never touched.

## Lookup Rule

**GeneratedBill lookup always uses:**
- `clientId` + `billMonth`

**Never uses:**
- ❌ Bill Number only
- ❌ Document ID only

**Firestore Query:**
```typescript
getByClientAndMonth(clientId: string, billMonth: string) {
  return getWhere('generatedBills', 'clientId', '==', clientId)
    .then(bills => bills.filter(b => b.billMonth === billMonth));
}
```

## Debug Logging

Added comprehensive logging to trace the complete flow:

### Log Prefixes

- **[BILL-START]** - Bill generation entry and completion
- **[BILL]** - Update/create operations
- **[BILL-SAVE]** - GeneratedBill object creation
- **[FIRESTORE-SAVE]** - Firestore operations
- **[ERROR]** - Error logging

### Update Operation Logs

```
[BILL] Existing Bill Found
[BILL] Updating Existing Bill
[BILL] Document ID: [existingBill.id]
[BILL] Bill Number: [existingBill.billNumber]
[BILL] Old Gross Amount: [existingBill.grossAmount]
[BILL] New Gross Amount: [bill.grossAmount]
[BILL] Old Net Amount: [existingBill.netAmount]
[BILL] New Net Amount: [bill.netAmount]
[FIRESTORE-SAVE] Updating existing bill in Firestore...
[FIRESTORE-SAVE] Update Completed Successfully
[BILL] UpdatedAt: [timestamp]
```

### Create Operation Logs

```
[BILL] Creating New Monthly Bill
[BILL] Bill Number: [bill.billNumber]
[BILL] Customer: [client.name]
[BILL] Billing Month: [billMonth]
[FIRESTORE-SAVE] Saving new bill to Firestore...
[FIRESTORE-SAVE] Firestore Document ID: [savedBill.id]
[FIRESTORE-SAVE] Save Completed Successfully
```

## Print Module

**File:** `src/app/(app)/printing/sale-bill/print/page.tsx`

**No changes required** - Print module already loads latest bill by ID.

**Behavior:**
- Always prints the latest updated version of the bill
- No duplicate bills appear (one per customer per month)
- Uses Firestore document ID to load bill

## Preserved Business Rules

✅ Billing calculation formula unchanged: `(Closing Weight / RatePer) × Rate`
✅ Print format unchanged
✅ GST calculation unchanged
✅ Charge calculation unchanged
✅ Customer rate lookup unchanged
✅ Stock balance calculation unchanged

## What Was NOT Changed

❌ No delete operations
❌ No document recreation
❌ No skip logic
❌ No duplicate bill generation
❌ No bill number changes for same month
❌ No changes to billing formula
❌ No changes to print format

## Benefits

1. **Professional ERP Behavior** - Matches industry-standard monthly billing systems
2. **Data Integrity** - Single source of truth per customer per month
3. **Audit Trail** - Complete history with createdAt, updatedAt, lastCalculatedAt
4. **No Duplicates** - Prevents multiple bills for same customer/month
5. **Flexible Regeneration** - Can regenerate bills as new data comes in
6. **Month Isolation** - Different months are completely isolated
7. **Bill Number Stability** - Bill numbers never change for the same month

## Testing Checklist

- [ ] Generate first bill for customer/month
- [ ] Add new inward voucher
- [ ] Regenerate bill for same customer/month
- [ ] Verify bill number remains same
- [ ] Verify document ID remains same
- [ ] Verify amount updates correctly
- [ ] Verify createdAt preserved
- [ ] Verify updatedAt updated
- [ ] Verify lastCalculatedAt updated
- [ ] Generate bill for new month
- [ ] Verify new bill number generated
- [ ] Verify previous month bill unchanged
- [ ] Print bill and verify latest data
- [ ] Verify no duplicate bills in list
- [ ] Verify Firestore has only one document per customer/month

## Migration Notes

**Existing Data:** No migration required. Existing bills will be updated on next regeneration.

**Backward Compatibility:** Fully backward compatible. Old bills can be updated using new logic.

**Rollback:** Can be rolled back by reverting to skip logic if needed.

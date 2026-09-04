import type { InwardVoucher, OutwardVoucher, InwardVoucherItem, OutwardVoucherItem } from '@/lib/types/stock-report';

/**
 * Audit fields that should be excluded from change detection
 * These are system-managed and not user-editable
 */
const AUDIT_FIELDS = [
  'id',
  'createdById',
  'createdByName',
  'createdAt',
  'updatedById',
  'updatedByName',
  'updatedAt',
  'updateReason',
];

/**
 * Calculate changed fields between original and requested voucher data
 * Returns array of field paths that changed
 */
export function calculateChangedFields(
  originalData: InwardVoucher | OutwardVoucher,
  requestedData: InwardVoucher | OutwardVoucher
): string[] {
  const changedFields: string[] = [];

  // Compare voucher-level fields (skip 'items' — item-level changes are recorded individually below)
  const voucherFields = getVoucherFields(originalData);
  for (const field of voucherFields) {
    if (AUDIT_FIELDS.includes(field)) continue;
    if (field === 'items') continue; // item changes are captured at the property level below

    const originalValue = (originalData as any)[field];
    const requestedValue = (requestedData as any)[field];

    if (!deepEqual(originalValue, requestedValue)) {
      changedFields.push(field);
    }
  }

  // Compare items arrays
  const originalItems = originalData.items;
  const requestedItems = requestedData.items;

  // Track items by index for comparison
  const maxItems = Math.max(originalItems.length, requestedItems.length);

  for (let i = 0; i < maxItems; i++) {
    const originalItem = originalItems[i];
    const requestedItem = requestedItems[i];

    if (!originalItem && requestedItem) {
      // Item added
      changedFields.push(`items[${i}] added`);
      // Also add all fields of the new item
      const itemFields = getItemFields(requestedItem);
      for (const field of itemFields) {
        changedFields.push(`items[${i}].${field}`);
      }
    } else if (originalItem && !requestedItem) {
      // Item removed
      changedFields.push(`items[${i}] removed`);
    } else if (originalItem && requestedItem) {
      // Item exists in both, compare fields
      const itemFields = getItemFields(originalItem);
      for (const field of itemFields) {
        if (field === 'id') continue; // Skip item ID
        
        const originalValue = (originalItem as any)[field];
        const requestedValue = (requestedItem as any)[field];

        if (!deepEqual(originalValue, requestedValue)) {
          changedFields.push(`items[${i}].${field}`);
        }
      }
    }
  }

  return changedFields;
}

/**
 * Get voucher-level field names based on entry type
 */
function getVoucherFields(voucher: InwardVoucher | OutwardVoucher): string[] {
  if ('inwardNo' in voucher) {
    // InwardVoucher
    return ['inwardNo', 'clientId', 'clientName', 'date', 'items'];
  } else {
    // OutwardVoucher
    return ['outwardNo', 'clientId', 'clientName', 'date', 'items'];
  }
}

/**
 * Get item-level field names based on item type
 */
function getItemFields(item: InwardVoucherItem | OutwardVoucherItem): string[] {
  if ('bags' in item && 'qty' in item) {
    // OutwardVoucherItem has both bags and qty
    return [
      'itemName',
      'brand',
      'batch',
      'chamberId',
      'roomId',
      'blockId',
      'qty',
      'bags',
      'bagWeight',
      'totalWeight',
      'inwardNumber',
      'expDate',
      'sourceRentalItemId',
    ];
  } else {
    // InwardVoucherItem
    return [
      'itemName',
      'brand',
      'batch',
      'chamberId',
      'roomId',
      'blockId',
      'bags',
      'unit',
      'bagWeight',
      'totalWeight',
    ];
  }
}

/**
 * Deep equality check for comparing values
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  
  if (a === null || b === null) return a === b;
  if (a === undefined || b === undefined) return a === b;
  
  if (typeof a !== typeof b) return false;
  
  if (typeof a !== 'object') return false;
  
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  
  if (Array.isArray(a) || Array.isArray(b)) return false;
  
  const aKeys = Object.keys(a as Record<string, unknown>);
  const bKeys = Object.keys(b as Record<string, unknown>);
  
  if (aKeys.length !== bKeys.length) return false;
  
  for (const key of aKeys) {
    if (!deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) {
      return false;
    }
  }
  
  return true;
}

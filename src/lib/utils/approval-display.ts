import type { InwardVoucher, OutwardVoucher } from '@/lib/types/stock-report';

// ─── Field label maps ──────────────────────────────────────────────────────────

const VOUCHER_FIELD_LABELS: Record<string, string> = {
  clientId: 'Client',
  clientName: 'Client Name',
  date: 'Date',
  inwardNo: 'Inward No',
  outwardNo: 'Outward No',
  // Inward-specific header fields (stored on form voucher, not stock-report type)
  driverName: 'Driver Name',
  mobile: 'Mobile No',
  vehicleNo: 'Vehicle No',
  gatePassNo: 'Gate Pass No',
  notes: 'Notes',
};

const ITEM_FIELD_LABELS: Record<string, string> = {
  itemName: 'Item Name',
  brand: 'Brand',
  batch: 'Batch',
  chamberId: 'Chamber',
  roomId: 'Room',
  blockId: 'Block',
  bags: 'Quantity / Bags',
  qty: 'Quantity',
  unit: 'Unit',
  bagWeight: 'Bag Weight',
  totalWeight: 'Total Weight',
  inwardNumber: 'Inward No (Source)',
  expDate: 'Expiry Date',
  mfgDate: 'Mfg Date',
  sourceRentalItemId: 'Stock Source',
};

// ─── Types ─────────────────────────────────────────────────────────────────────

export type FieldChange = {
  field: string;
  label: string;
  oldValue: string;
  newValue: string;
};

export type ItemChange = {
  itemIndex: number;
  itemName: string;
  changeType: 'modified' | 'added' | 'removed';
  fields: FieldChange[];
};

export type VoucherChange = {
  field: string;
  label: string;
  oldValue: string;
  newValue: string;
};

export type StructuredDiff = {
  voucherChanges: VoucherChange[];
  itemChanges: ItemChange[];
};

// ─── Value formatting ──────────────────────────────────────────────────────────

function formatValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';

  // Weight fields — append KG
  if (field === 'totalWeight' || field === 'bagWeight') {
    const n = Number(value);
    return Number.isFinite(n) ? `${n.toFixed(2)} KG` : String(value);
  }

  // Numeric fields
  if (field === 'bags' || field === 'qty') {
    const n = Number(value);
    return Number.isFinite(n) ? String(n) : String(value);
  }

  // Date fields — try to make them readable
  if (field === 'date' || field === 'expDate' || field === 'mfgDate') {
    const s = String(value);
    // ISO date yyyy-mm-dd
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      const d = new Date(s);
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      }
    }
    return s;
  }

  // IDs — just show as-is (they're meaningful enough in context)
  return String(value);
}

function fieldLabel(field: string): string {
  return ITEM_FIELD_LABELS[field] ?? VOUCHER_FIELD_LABELS[field] ?? field;
}

// ─── Main diff builder ─────────────────────────────────────────────────────────

/**
 * Builds a structured, human-readable diff from an approval request.
 *
 * Works with both new requests (changedFields has child paths like "items[0].bags")
 * and old requests that may only have "items" as a parent path — falls back to
 * comparing the full items array in that case.
 *
 * Never exposes raw technical paths to the caller.
 */
export function buildStructuredDiff(
  originalData: InwardVoucher | OutwardVoucher,
  requestedData: InwardVoucher | OutwardVoucher,
  changedFields: string[]
): StructuredDiff {
  const voucherChanges: VoucherChange[] = [];
  const itemChanges: ItemChange[] = [];

  // ── 1. Voucher-level changes (non-item fields) ──────────────────────────────
  const voucherLevelFields = changedFields.filter(
    (f) => !f.startsWith('items')
  );

  for (const field of voucherLevelFields) {
    const oldVal = (originalData as any)[field];
    const newVal = (requestedData as any)[field];
    voucherChanges.push({
      field,
      label: fieldLabel(field),
      oldValue: formatValue(field, oldVal),
      newValue: formatValue(field, newVal),
    });
  }

  // ── 2. Item-level changes ───────────────────────────────────────────────────

  // Collect all item indices mentioned in changedFields
  const itemIndexSet = new Set<number>();
  const hasLegacyItemsParent = changedFields.includes('items');

  // Parse "items[N].field" paths
  for (const f of changedFields) {
    const match = /^items\[(\d+)\]/.exec(f);
    if (match) itemIndexSet.add(Number(match[1]));
  }

  // Backward compat: if only "items" was stored (old requests), compare all indices
  if (hasLegacyItemsParent && itemIndexSet.size === 0) {
    const maxLen = Math.max(
      originalData.items.length,
      requestedData.items.length
    );
    for (let i = 0; i < maxLen; i++) itemIndexSet.add(i);
  }

  const maxItems = Math.max(originalData.items.length, requestedData.items.length);

  for (const i of Array.from(itemIndexSet).sort((a, b) => a - b)) {
    if (i >= maxItems) continue;

    const origItem = originalData.items[i] as any | undefined;
    const reqItem = requestedData.items[i] as any | undefined;

    if (!origItem && reqItem) {
      // Item added
      const fields = buildAddedItemFields(reqItem);
      itemChanges.push({
        itemIndex: i,
        itemName: reqItem.itemName || `Item ${i + 1}`,
        changeType: 'added',
        fields,
      });
      continue;
    }

    if (origItem && !reqItem) {
      // Item removed
      const fields = buildRemovedItemFields(origItem);
      itemChanges.push({
        itemIndex: i,
        itemName: origItem.itemName || `Item ${i + 1}`,
        changeType: 'removed',
        fields,
      });
      continue;
    }

    if (origItem && reqItem) {
      // Item modified — collect only the changed properties
      const changedItemFields = getChangedItemFields(i, changedFields, origItem, reqItem, hasLegacyItemsParent);

      if (changedItemFields.length > 0) {
        itemChanges.push({
          itemIndex: i,
          itemName: origItem.itemName || reqItem.itemName || `Item ${i + 1}`,
          changeType: 'modified',
          fields: changedItemFields,
        });
      }
    }
  }

  return { voucherChanges, itemChanges };
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getChangedItemFields(
  itemIndex: number,
  changedFields: string[],
  origItem: Record<string, unknown>,
  reqItem: Record<string, unknown>,
  legacyMode: boolean
): FieldChange[] {
  const result: FieldChange[] = [];

  if (legacyMode) {
    // Old request: compare all item fields directly
    const allFields = new Set([...Object.keys(origItem), ...Object.keys(reqItem)]);
    for (const field of allFields) {
      if (field === 'id') continue;
      const oldVal = origItem[field];
      const newVal = reqItem[field];
      if (String(oldVal) !== String(newVal)) {
        result.push({
          field,
          label: fieldLabel(field),
          oldValue: formatValue(field, oldVal),
          newValue: formatValue(field, newVal),
        });
      }
    }
  } else {
    // New request: use the explicit changedFields paths
    const prefix = `items[${itemIndex}].`;
    const itemFieldPaths = changedFields.filter(
      (f) => f.startsWith(prefix)
    );
    for (const path of itemFieldPaths) {
      const field = path.slice(prefix.length);
      if (field === 'id') continue;
      result.push({
        field,
        label: fieldLabel(field),
        oldValue: formatValue(field, origItem[field]),
        newValue: formatValue(field, reqItem[field]),
      });
    }
  }

  return result;
}

function buildAddedItemFields(item: Record<string, unknown>): FieldChange[] {
  const SHOW_FIELDS = ['itemName', 'brand', 'batch', 'bags', 'qty', 'bagWeight', 'totalWeight'];
  return SHOW_FIELDS
    .filter((f) => item[f] !== undefined && item[f] !== '' && item[f] !== 0)
    .map((f) => ({
      field: f,
      label: fieldLabel(f),
      oldValue: '—',
      newValue: formatValue(f, item[f]),
    }));
}

function buildRemovedItemFields(item: Record<string, unknown>): FieldChange[] {
  const SHOW_FIELDS = ['itemName', 'brand', 'batch', 'bags', 'qty', 'bagWeight', 'totalWeight'];
  return SHOW_FIELDS
    .filter((f) => item[f] !== undefined && item[f] !== '' && item[f] !== 0)
    .map((f) => ({
      field: f,
      label: fieldLabel(f),
      oldValue: formatValue(f, item[f]),
      newValue: '—',
    }));
}

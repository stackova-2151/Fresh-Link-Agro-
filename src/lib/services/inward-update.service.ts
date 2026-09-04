import { rentalItemsService } from '@/lib/firestore';
import { resolveRentalItem } from '@/lib/services/rental-item-resolution.service';
import type { RentalItem } from '@/lib/types';
import type { InwardVoucher } from '@/components/inventory/bulk-inward-entry-form';
import { parseStrictDate } from '@/lib/date-utils';

/**
 * Generates a unique rental item ID using random generation.
 * This ensures no collisions even for identical business field values.
 * 
 * @returns Unique ID in format: rental_item_{random}_{timestamp}
 */
function createUniqueRentalItemId(): string {
  return `rental_item_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

/**
 * Executes the exact same logic as the current direct Inward EDIT flow.
 * This is reusable for both direct authorized edits and future approval execution.
 *
 * @param voucher - The InwardVoucher to apply (form type with all fields)
 * @param existingRentalItems - All existing rental items to search for matches
 * @param vendors - Vendor list for fallback vendorId
 * @returns Promise that resolves when all database operations complete
 */
export async function executeInwardUpdate(
  voucher: InwardVoucher,
  existingRentalItems: RentalItem[],
  vendors: Array<{ id: string }>
): Promise<void> {
  // PHASE 1: Validate all dates before any Firestore writes
  // Dates are stored in DD-MM-YYYY format in row state
  for (const row of voucher.items) {
    // Validate expDate if provided (DD-MM-YYYY format)
    if (row.expDate && row.expDate.trim()) {
      const expResult = parseStrictDate(row.expDate);
      if (!expResult.success) {
        throw new Error(
          `Invalid expiry date for item "${row.itemName}": ${expResult.error}. Use DD-MM-YYYY format.`
        );
      }
    }

    // Validate mfgDate if provided (DD-MM-YYYY format)
    if (row.mfgDate && row.mfgDate.trim()) {
      const mfgResult = parseStrictDate(row.mfgDate);
      if (!mfgResult.success) {
        throw new Error(
          `Invalid manufacturing date for item "${row.itemName}": ${mfgResult.error}. Use DD-MM-YYYY format.`
        );
      }
    }

    // Validate voucher date (YYYY-MM-DD format from date input)
    if (voucher.date && voucher.date.trim()) {
      const voucherDateResult = parseStrictDate(voucher.date);
      if (!voucherDateResult.success) {
        throw new Error(
          `Invalid voucher date: ${voucherDateResult.error}. Use YYYY-MM-DD format.`
        );
      }
    }
  }

  const inwardNoUpper = voucher.inwardNo.toUpperCase();
  const voucherRentalItems = existingRentalItems.filter(
    (i) => i.inwardNumber.toUpperCase() === inwardNoUpper
  );

  const findMatchingRentalItem = (row: typeof voucher.items[0]) => {
    // Priority 1: Use rentalItemId if available (unique identity)
    // CRITICAL: Search ALL rentalItems, not just voucherRentalItems
    // This ensures we find the RentalItem even if it's not in the current voucher's list
    if (row.rentalItemId) {
      console.log('[EDIT INWARD] Matching by rentalItemId:', {
        inwardNo: voucher.inwardNo,
        itemName: row.itemName,
        rentalItemId: row.rentalItemId,
      });
      const exactMatch = existingRentalItems.find((item) => item.id === row.rentalItemId);
      if (exactMatch) {
        console.log('[EDIT INWARD] Exact match found:', {
          rentalItemId: exactMatch.id,
          chamberId: exactMatch.chamberId,
        });
        return exactMatch;
      }
      // rentalItemId exists but RentalItem not found - this is a data integrity error
      // DO NOT create a new RentalItem with a different ID
      console.error('[EDIT INWARD] Data integrity error: rentalItemId not found in existingRentalItems', {
        inwardNo: voucher.inwardNo,
        itemName: row.itemName,
        rentalItemId: row.rentalItemId,
        totalExistingRentalItems: existingRentalItems.length,
      });
      throw new Error(
        `Data integrity error: Inward voucher item references rentalItemId "${row.rentalItemId}" ` +
        `but no RentalItem document exists with that ID. ` +
        `Inward: ${voucher.inwardNo}, Item: ${row.itemName}. ` +
        `This indicates a broken reference that must be repaired manually.`
      );
    }
    // Priority 2: Fallback to business field matching with ambiguity check for legacy data
    // Only used for items without rentalItemId (truly legacy data)
    console.log('[EDIT INWARD] No rentalItemId, using legacy resolution:', {
      inwardNo: voucher.inwardNo,
      itemName: row.itemName,
    });
    const resolution = resolveRentalItem(
      undefined,
      voucherRentalItems,
      {
        inwardNumber: voucher.inwardNo,
        itemName: row.itemName,
        brand: row.brand,
        batch: row.batch,
        chamberId: row.chamberId,
      }
    );

    if (resolution.status === 'exact' || resolution.status === 'legacy-resolved') {
      console.log('[EDIT INWARD] Legacy resolution successful:', {
        status: resolution.status,
        rentalItemId: resolution.rentalItemId,
      });
      return voucherRentalItems.find(item => item.id === resolution.rentalItemId);
    }

    // Ambiguous or unresolved - cannot safely match
    console.warn(`Cannot match rental item due to ${resolution.status}: ${resolution.message}`);
    return undefined;
  };

  const usedRentalItemIds = new Set<string>();

  for (const row of voucher.items) {
    const matchingItem = findMatchingRentalItem(row);

    if (matchingItem) {
      const qty = typeof row.bags === 'number' ? row.bags : 0;
      const wt = row.totalWeight;
      
      // Use strict date parsing for expDate
      let exp: Date;
      if (row.expDate && row.expDate.trim()) {
        const expResult = parseStrictDate(row.expDate);
        if (!expResult.success || !expResult.date) {
          throw new Error(
            `Invalid expiry date for item "${row.itemName}": ${expResult.error}`
          );
        }
        exp = expResult.date;
      } else {
        exp = new Date(voucher.date);
      }
      
      const storage = new Date(voucher.date);

      await rentalItemsService.update(matchingItem.id, {
        name: row.itemName.trim(),
        brand: row.brand.trim(),
        batchNumber: row.batch.trim(),
        chamberId: row.chamberId,
        roomId: row.roomId,
        blockId: row.blockId,
        inwardQuantity: qty,
        quantityAvailable: qty,
        unit: row.unit.trim().toUpperCase() || 'KG',
        inwardWeight: wt,
        balanceWeight: wt,
        expiryDate: exp,
        storageDate: storage,
        clientId: voucher.clientId,
        driverName: voucher.driverName,
        vehicleNumber: voucher.vehicleNo,
      });

      usedRentalItemIds.add(matchingItem.id);
    } else {
      const qty = typeof row.bags === 'number' ? row.bags : 0;
      const wt = row.totalWeight;
      
      // Use strict date parsing for expDate
      let exp: Date;
      if (row.expDate && row.expDate.trim()) {
        const expResult = parseStrictDate(row.expDate);
        if (!expResult.success || !expResult.date) {
          throw new Error(
            `Invalid expiry date for item "${row.itemName}": ${expResult.error}`
          );
        }
        exp = expResult.date;
      } else {
        exp = new Date(voucher.date);
      }
      
      const storage = new Date(voucher.date);
      const vendorId = vendors[0]?.id ?? 'vendor_01';

      // Use random unique ID for all operations to prevent collisions
      const itemId = createUniqueRentalItemId();

      const newItem: RentalItem = {
        id: itemId,
        inwardNumber: voucher.inwardNo,
        name: row.itemName.trim(),
        brand: row.brand.trim(),
        batchNumber: row.batch.trim(),
        category: 'General',
        description: '',
        rentalRate: 0,
        rentalCycles: ['daily'],
        inwardQuantity: qty,
        outwardQuantity: 0,
        quantityAvailable: qty,
        unit: row.unit.trim().toUpperCase() || 'KG',
        inwardWeight: wt,
        outwardWeight: 0,
        balanceWeight: wt,
        expiryDate: exp,
        storageDate: storage,
        temperatureRange: '',
        vendorId,
        clientId: voucher.clientId,
        chamberId: row.chamberId,
        roomId: row.roomId,
        blockId: row.blockId,
        block: '',
        zone: '',
        driverName: voucher.driverName,
        vehicleNumber: voucher.vehicleNo,
        images: [],
        condition: 'Good',
      };

      await rentalItemsService.createWithId(newItem);
      usedRentalItemIds.add(newItem.id);
    }
  }

  // Delete rental items that are no longer in the voucher
  for (const existingItem of voucherRentalItems) {
    if (!usedRentalItemIds.has(existingItem.id)) {
      await rentalItemsService.delete(existingItem.id);
    }
  }
}

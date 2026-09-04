/**
 * Stock Calculation Service
 *
 * Calculates opening stock, issues, and closing stock for each inward voucher.
 * This service ensures each inward voucher becomes one row in the bill.
 */

import type {
  InwardVoucher,
  OutwardVoucher,
  InwardVoucherItem,
  OutwardVoucherItem
} from '@/lib/types/stock-report';
import type { InwardStockBalance } from '@/lib/types/billing';
import { resolveRentalItem } from '@/lib/services/rental-item-resolution.service';
import type { RentalItem } from '@/lib/types';

/**
 * Stock Calculation Service
 */
class StockCalculationService {
  /**
   * Calculate stock balances for each inward voucher
   *
   * @param inwardVouchers - All inward vouchers for the customer
   * @param outwardVouchers - All outward vouchers for the customer
   * @param monthEndDate - Filter date for transactions
   * @param rentalItems - All rental items for exact identity matching
   * @returns Array of stock balances per inward voucher
   */
  calculateInwardStockBalances(
    inwardVouchers: InwardVoucher[],
    outwardVouchers: OutwardVoucher[],
    monthEndDate: string,
    rentalItems: RentalItem[] = []
  ): InwardStockBalance[] {
    const balances: InwardStockBalance[] = [];

    // Group outward items by inward number for efficient lookup
    const outwardMap = this.groupOutwardByInward(outwardVouchers);

    // Process each inward voucher
    for (const inward of inwardVouchers) {
      // Process each item in the inward voucher
      for (const inwardItem of inward.items) {
        const balance = this.calculateSingleInwardBalance(
          inward,
          inwardItem,
          outwardMap.get(inward.inwardNo) || [],
          rentalItems
        );

        balances.push(balance);
      }
    }

    return balances;
  }

  /**
   * Calculate stock balance for a single inward item
   */
  private calculateSingleInwardBalance(
    inward: InwardVoucher,
    inwardItem: InwardVoucherItem,
    outwardItems: OutwardVoucherItem[],
    rentalItems: RentalItem[]
  ): InwardStockBalance {
    // Opening stock from inward
    const openingQty = typeof inwardItem.bags === 'number' ? inwardItem.bags : 0;
    const openingWeight = inwardItem.totalWeight;

    // Calculate issues from outward items
    const issuesResult = this.calculateIssues(inwardItem, outwardItems, rentalItems, inward.inwardNo);

    // Calculate closing stock
    const closingQty = openingQty - issuesResult.issuesQty;
    const closingWeight = openingWeight - issuesResult.issuesWeight;

    return {
      inwardNo: inward.inwardNo,
      inwardDate: inward.date,
      itemDescription: inwardItem.itemName,
      brand: inwardItem.brand,
      batch: inwardItem.batch,
      chamberId: inwardItem.chamberId,
      openingQty,
      openingWeight,
      issuesQty: issuesResult.issuesQty,
      issuesWeight: issuesResult.issuesWeight,
      outwardDates: issuesResult.outwardDates,
      closingQty,
      closingWeight,
      hasOutward: issuesResult.issuesQty > 0 || issuesResult.issuesWeight > 0
    };
  }

  /**
   * Calculate issues (outward quantities) for an inward item
   */
  private calculateIssues(
    inwardItem: InwardVoucherItem,
    outwardItems: OutwardVoucherItem[],
    rentalItems: RentalItem[],
    inwardNo: string
  ): {
    issuesQty: number;
    issuesWeight: number;
    outwardDates: string[];
  } {
    let totalIssuesQty = 0;
    let totalIssuesWeight = 0;
    const outwardDates: string[] = [];

    // Resolve rental item ID for this inward item
    const resolution = resolveRentalItem(
      inwardItem.rentalItemId,
      rentalItems,
      {
        inwardNumber: inwardNo,
        itemName: inwardItem.itemName,
        brand: inwardItem.brand,
        batch: inwardItem.batch,
        chamberId: inwardItem.chamberId,
      }
    );

    // Skip if ambiguous or unresolved
    if (resolution.status === 'ambiguous' || resolution.status === 'unresolved') {
      console.warn(`Skipping inward item issues calculation due to ${resolution.status}: ${resolution.message}`);
      return {
        issuesQty: 0,
        issuesWeight: 0,
        outwardDates: []
      };
    }

    // Match outward items by exact rental item ID
    for (const outwardItem of outwardItems) {
      if (resolution.rentalItemId && outwardItem.sourceRentalItemId === resolution.rentalItemId) {
        const qty = typeof outwardItem.qty === 'number' ? outwardItem.qty : 0;
        totalIssuesQty += qty;
        totalIssuesWeight += outwardItem.totalWeight;

        // Track outward dates (would need parent voucher date)
        // For now, we'll add placeholder
        outwardDates.push('');
      }
    }

    return {
      issuesQty: totalIssuesQty,
      issuesWeight: totalIssuesWeight,
      outwardDates
    };
  }

  /**
   * Group outward items by inward number
   */
  private groupOutwardByInward(
    outwardVouchers: OutwardVoucher[]
  ): Map<string, OutwardVoucherItem[]> {
    const map = new Map<string, OutwardVoucherItem[]>();

    for (const voucher of outwardVouchers) {
      for (const item of voucher.items) {
        const inwardNumber = item.inwardNumber;
        if (!inwardNumber) continue;

        if (!map.has(inwardNumber)) {
          map.set(inwardNumber, []);
        }

        map.get(inwardNumber)!.push(item);
      }
    }

    return map;
  }

  /**
   * Check if customer has any inward transactions in a specific month
   */
  hasInwardInMonth(
    inwardVouchers: InwardVoucher[],
    billMonth: string
  ): boolean {
    const [year, month] = billMonth.split('-').map(Number);
    
    return inwardVouchers.some(voucher => {
      const voucherDate = new Date(voucher.date);
      return (
        voucherDate.getFullYear() === year &&
        voucherDate.getMonth() + 1 === month
      );
    });
  }

  /**
   * Count inward vouchers in a specific month
   */
  countInwardInMonth(
    inwardVouchers: InwardVoucher[],
    billMonth: string
  ): number {
    const [year, month] = billMonth.split('-').map(Number);
    
    return inwardVouchers.filter(voucher => {
      const voucherDate = new Date(voucher.date);
      return (
        voucherDate.getFullYear() === year &&
        voucherDate.getMonth() + 1 === month
      );
    }).length;
  }

  /**
   * Calculate total closing weight across all balances
   */
  calculateTotalClosingWeight(balances: InwardStockBalance[]): number {
    return balances.reduce((sum, balance) => sum + balance.closingWeight, 0);
  }

  /**
   * Calculate total issues weight across all balances
   */
  calculateTotalIssuesWeight(balances: InwardStockBalance[]): number {
    return balances.reduce((sum, balance) => sum + balance.issuesWeight, 0);
  }

  /**
   * Filter balances to only those with closing stock
   */
  filterWithClosingStock(balances: InwardStockBalance[]): InwardStockBalance[] {
    return balances.filter(b => b.closingWeight > 0 || b.closingQty > 0);
  }

  /**
   * Validate stock balances for negative values
   */
  validateBalances(balances: InwardStockBalance[]): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    for (const balance of balances) {
      if (balance.closingQty < 0) {
        errors.push(
          `Inward ${balance.inwardNo}: Negative closing qty (${balance.closingQty})`
        );
      }
      if (balance.closingWeight < 0) {
        errors.push(
          `Inward ${balance.inwardNo}: Negative closing weight (${balance.closingWeight})`
        );
      }
      if (balance.issuesQty > balance.openingQty) {
        errors.push(
          `Inward ${balance.inwardNo}: Issues qty (${balance.issuesQty}) exceeds opening qty (${balance.openingQty})`
        );
      }
      if (balance.issuesWeight > balance.openingWeight) {
        errors.push(
          `Inward ${balance.inwardNo}: Issues weight (${balance.issuesWeight}) exceeds opening weight (${balance.openingWeight})`
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export const stockCalculationService = new StockCalculationService();

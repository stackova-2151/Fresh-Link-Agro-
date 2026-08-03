/**
 * Amount Calculation Service
 * 
 * Calculates billing amounts using the correct formula:
 * Amount = (Closing Weight / RatePer) × Rate
 * 
 * This ensures exact match with manual bill calculations.
 */

import type { InwardStockBalance } from '@/lib/types/billing';
import type { BillingRate, BillingValidationError } from '@/lib/types/billing';

/**
 * Amount Calculation Service
 */
class AmountCalculationService {
  /**
   * Calculate amount for a single inward stock balance
   * 
   * Formula: (Closing Weight / RatePer) × Rate
   * 
   * Example:
   * Closing Weight: 1950
   * Rate: 1500
   * Rate Per: 1000
   * Calculation: (1950 / 1000) × 1500 = 1.95 × 1500 = 2925
   * 
   * @param balance - Stock balance for inward
   * @param rate - Customer rate configuration
   * @returns Calculated amount
   */
  calculateAmount(
    balance: InwardStockBalance,
    rate: BillingRate
  ): {
    amount: number;
    calculation: {
      closingWeight: number;
      ratePer: number;
      rate: number;
      units: number;
      formula: string;
    };
    error?: BillingValidationError;
  } {
    console.log('[BILL-CALC]');
    console.log('[BILL-CALC] Item:', balance.itemDescription);
    console.log('[BILL-CALC] Weight:', balance.closingWeight);
    console.log('[BILL-CALC] Rate:', rate.rate);
    console.log('[BILL-CALC] RatePer:', rate.ratePer);
    console.log('[BILL-CALC] Formula:');
    
    // Validate ratePer
    const ratePerNum = parseFloat(rate.ratePer || '0');
    if (isNaN(ratePerNum) || ratePerNum === 0) {
      console.log('[BILL-CALC] Formula: INVALID - RatePer is zero or invalid');
      console.log('[BILL-CALC] Result: 0');
      return {
        amount: 0,
        calculation: {
          closingWeight: balance.closingWeight,
          ratePer: 0,
          rate: rate.rate,
          units: 0,
          formula: 'Invalid RatePer'
        },
        error: {
          field: 'ratePer',
          message: `RatePer is zero or invalid for item ${balance.itemDescription}`,
          severity: 'error',
          itemId: balance.inwardNo
        }
      };
    }

    // Calculate units (Closing Weight / Rate Per)
    const units = balance.closingWeight / ratePerNum;

    // Calculate amount (Units × Rate)
    const amount = units * rate.rate;

    console.log(`[BILL-CALC] Formula: (${balance.closingWeight} / ${ratePerNum}) × ${rate.rate}`);
    console.log(`[BILL-CALC] Formula: ${units.toFixed(4)} × ${rate.rate}`);
    console.log('[BILL-CALC] Result:', amount);

    // Validate result
    if (isNaN(amount)) {
      console.log('[BILL-CALC] Formula: NaN result');
      console.log('[BILL-CALC] Result: 0');
      return {
        amount: 0,
        calculation: {
          closingWeight: balance.closingWeight,
          ratePer: ratePerNum,
          rate: rate.rate,
          units: 0,
          formula: 'NaN result'
        },
        error: {
          field: 'amount',
          message: `Calculated amount is NaN for item ${balance.itemDescription}`,
          severity: 'error',
          itemId: balance.inwardNo
        }
      };
    }

    return {
      amount,
      calculation: {
        closingWeight: balance.closingWeight,
        ratePer: ratePerNum,
        rate: rate.rate,
        units,
        formula: `(${balance.closingWeight} / ${ratePerNum}) × ${rate.rate} = ${units.toFixed(4)} × ${rate.rate} = ${amount.toFixed(2)}`
      }
    };
  }

  /**
   * Calculate amounts for multiple stock balances
   * 
   * @param balances - Array of stock balances
   * @param ratesMap - Map of item description to rate
   * @returns Array of calculated amounts with validation
   */
  calculateAmounts(
    balances: InwardStockBalance[],
    ratesMap: Map<string, BillingRate>
  ): {
    results: Array<{
      balance: InwardStockBalance;
      amount: number;
      calculation: string;
      error?: BillingValidationError;
    }>;
    errors: BillingValidationError[];
    totalAmount: number;
  } {
    console.log('[BILL-CALC] calculateAmounts called with', balances.length, 'balances');
    const results: Array<{
      balance: InwardStockBalance;
      amount: number;
      calculation: string;
      error?: BillingValidationError;
    }> = [];
    const errors: BillingValidationError[] = [];
    let totalAmount = 0;

    for (const balance of balances) {
      console.log('[BILL-RATE]');
      console.log('[BILL-RATE] Searching Rate');
      console.log('[BILL-RATE] Voucher Item:', balance.itemDescription);
      console.log('[BILL-RATE] Available Rates:');
      Array.from(ratesMap.keys()).forEach((key, idx) => {
        console.log(`[BILL-RATE]   ${idx + 1}. ${key}`);
      });
      
      const rate = ratesMap.get(balance.itemDescription);

      if (!rate) {
        console.log('[BILL-RATE] Matched: NO');
        console.log('[BILL-RATE] Reason: Item not found in rates map');
        const error: BillingValidationError = {
          field: 'rate',
          message: `Customer rate not found for item: ${balance.itemDescription}`,
          severity: 'error',
          itemId: balance.inwardNo
        };
        errors.push(error);
        results.push({
          balance,
          amount: 0,
          calculation: 'Rate not found',
          error
        });
        continue;
      }

      console.log('[BILL-RATE] Matched: YES');
      console.log('[BILL-RATE] Rate:', rate.rate);
      console.log('[BILL-RATE] RatePer:', rate.ratePer);

      const result = this.calculateAmount(balance, rate);

      if (result.error) {
        errors.push(result.error);
      }

      totalAmount += result.amount;

      results.push({
        balance,
        amount: result.amount,
        calculation: result.calculation.formula,
        error: result.error
      });
    }

    console.log('[BILL-TOTAL] Total Amount calculated:', totalAmount);
    return {
      results,
      errors,
      totalAmount
    };
  }

  /**
   * Calculate loading charges (if applicable)
   * 
   * Formula: (Issues Weight / Loading Rate Per) × Loading
   * 
   * @param balance - Stock balance
   * @param loadingRate - Loading rate configuration
   * @returns Loading charge amount
   */
  calculateLoadingCharge(
    balance: InwardStockBalance,
    loadingRate: {
      loading: number;
      loadingRatePer: string;
    }
  ): {
    amount: number;
    calculation: string;
  } {
    console.log('[BILL-CALC] Loading Charge Calculation');
    console.log('[BILL-CALC] Loading Charge:', loadingRate.loading);
    console.log('[BILL-CALC] Loading Rate Per:', loadingRate.loadingRatePer);
    console.log('[BILL-CALC] Issues Weight:', balance.issuesWeight);
    
    const loadingRatePerNum = parseFloat(loadingRate.loadingRatePer || '0');
    const loadingNum = parseFloat(String(loadingRate.loading || '0'));

    // If loadingRatePer is invalid, return 0
    if (isNaN(loadingRatePerNum) || loadingRatePerNum === 0) {
      console.log('[BILL-CALC] Calculation: Invalid Loading Rate Per - charge set to 0');
      return {
        amount: 0,
        calculation: 'Invalid Loading Rate Per - charge set to 0'
      };
    }

    const units = balance.issuesWeight / loadingRatePerNum;
    const amount = units * loadingNum;

    console.log(`[BILL-CALC] Calculation: (${balance.issuesWeight} / ${loadingRatePerNum}) × ${loadingNum}`);
    console.log(`[BILL-CALC] Calculation: ${units.toFixed(4)} × ${loadingNum}`);
    console.log('[BILL-CALC] Loading Amount:', amount);

    if (isNaN(amount)) {
      console.log('[BILL-CALC] Calculation: NaN result - charge set to 0');
      return {
        amount: 0,
        calculation: 'NaN result - charge set to 0'
      };
    }

    return {
      amount,
      calculation: `(${balance.issuesWeight} / ${loadingRatePerNum}) × ${loadingNum} = ${units.toFixed(4)} × ${loadingNum} = ${amount.toFixed(2)}`
    };
  }

  /**
   * Format amount to 2 decimal places
   */
  formatAmount(amount: number): string {
    return amount.toFixed(2);
  }

  /**
   * Round amount to 2 decimal places
   */
  roundAmount(amount: number): number {
    return Math.round(amount * 100) / 100;
  }

  /**
   * Validate rate configuration
   */
  validateRate(rate: BillingRate): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!rate.ratePer || rate.ratePer === '0') {
      errors.push('RatePer cannot be zero or empty');
    }

    const ratePerNum = parseFloat(rate.ratePer || '0');
    if (isNaN(ratePerNum)) {
      errors.push('RatePer must be a valid number');
    }

    if (rate.rate < 0) {
      errors.push('Rate cannot be negative');
    }

    if (rate.gstRate < 0 || rate.gstRate > 100) {
      errors.push('GST Rate must be between 0 and 100');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export const amountCalculationService = new AmountCalculationService();

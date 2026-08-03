/**
 * GST Calculation Service
 * 
 * Calculates CGST, SGST, and total GST for billing.
 * Supports configurable GST rates and different GST slabs.
 */

import type { GSTCalculation } from '@/lib/types/billing';

/**
 * GST Calculation Service
 */
class GSTCalculationService {
  /**
   * Calculate GST for a given taxable amount
   * 
   * Formula:
   * CGST = (Taxable Amount × CGST Rate) / 100
   * SGST = (Taxable Amount × SGST Rate) / 100
   * 
   * For equal split (common in India):
   * CGST Rate = SGST Rate = GST Rate / 2
   * 
   * @param taxableAmount - Amount before GST
   * @param gstRate - Total GST percentage (e.g., 18 for 18% GST)
   * @param splitType - How to split GST (default: equal CGST/SGST)
   * @returns GST calculation result
   */
  calculateGST(
    taxableAmount: number,
    gstRate: number,
    splitType: 'equal' | 'cgst_only' | 'sgst_only' = 'equal'
  ): GSTCalculation {
    if (gstRate === 0) {
      return {
        taxableAmount,
        cgstRate: 0,
        sgstRate: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        totalGST: 0
      };
    }

    let cgstRate: number;
    let sgstRate: number;

    switch (splitType) {
      case 'equal':
        // Split GST equally between CGST and SGST
        cgstRate = gstRate / 2;
        sgstRate = gstRate / 2;
        break;
      case 'cgst_only':
        // All GST goes to CGST
        cgstRate = gstRate;
        sgstRate = 0;
        break;
      case 'sgst_only':
        // All GST goes to SGST
        cgstRate = 0;
        sgstRate = gstRate;
        break;
      default:
        cgstRate = gstRate / 2;
        sgstRate = gstRate / 2;
    }

    const cgstAmount = (taxableAmount * cgstRate) / 100;
    const sgstAmount = (taxableAmount * sgstRate) / 100;
    const totalGST = cgstAmount + sgstAmount;

    return {
      taxableAmount,
      cgstRate,
      sgstRate,
      cgstAmount: this.roundToDecimals(cgstAmount, 2),
      sgstAmount: this.roundToDecimals(sgstAmount, 2),
      totalGST: this.roundToDecimals(totalGST, 2)
    };
  }

  /**
   * Calculate GST with different rates for CGST and SGST
   * 
   * @param taxableAmount - Amount before GST
   * @param cgstRate - CGST percentage
   * @param sgstRate - SGST percentage
   * @returns GST calculation result
   */
  calculateGSTWithDifferentRates(
    taxableAmount: number,
    cgstRate: number,
    sgstRate: number
  ): GSTCalculation {
    const cgstAmount = (taxableAmount * cgstRate) / 100;
    const sgstAmount = (taxableAmount * sgstRate) / 100;
    const totalGST = cgstAmount + sgstAmount;

    return {
      taxableAmount,
      cgstRate,
      sgstRate,
      cgstAmount: this.roundToDecimals(cgstAmount, 2),
      sgstAmount: this.roundToDecimals(sgstAmount, 2),
      totalGST: this.roundToDecimals(totalGST, 2)
    };
  }

  /**
   * Calculate reverse GST (from inclusive amount)
   * 
   * Formula:
   * Taxable Amount = Amount / (1 + GST Rate / 100)
   * GST Amount = Amount - Taxable Amount
   * 
   * @param inclusiveAmount - Amount including GST
   * @param gstRate - GST percentage
   * @returns GST calculation result
   */
  calculateReverseGST(
    inclusiveAmount: number,
    gstRate: number
  ): GSTCalculation {
    const taxableAmount = inclusiveAmount / (1 + gstRate / 100);
    const gstAmount = inclusiveAmount - taxableAmount;

    const cgstRate = gstRate / 2;
    const sgstRate = gstRate / 2;

    const cgstAmount = gstAmount / 2;
    const sgstAmount = gstAmount / 2;

    return {
      taxableAmount: this.roundToDecimals(taxableAmount, 2),
      cgstRate,
      sgstRate,
      cgstAmount: this.roundToDecimals(cgstAmount, 2),
      sgstAmount: this.roundToDecimals(sgstAmount, 2),
      totalGST: this.roundToDecimals(gstAmount, 2)
    };
  }

  /**
   * Calculate round-off amount
   * 
   * Formula:
   * Round Off = Rounded Total - Actual Total
   * 
   * @param amount - Amount to round
   * @param decimals - Number of decimal places (default: 2)
   * @returns Round-off amount
   */
  calculateRoundOff(amount: number, decimals: number = 2): number {
    const rounded = Math.round(amount * Math.pow(10, decimals)) / Math.pow(10, decimals);
    return this.roundToDecimals(rounded - amount, decimals);
  }

  /**
   * Calculate net amount with rounding
   * 
   * @param taxableAmount - Amount before GST
   * @param gst - GST calculation result
   * @param additionalCharges - Additional charges to add
   * @param enableRoundOff - Whether to apply round-off
   * @returns Final net amount
   */
  calculateNetAmount(
    taxableAmount: number,
    gst: GSTCalculation,
    additionalCharges: number = 0,
    enableRoundOff: boolean = true
  ): {
    netAmount: number;
    roundOff: number;
    breakdown: {
      taxableAmount: number;
      additionalCharges: number;
      cgst: number;
      sgst: number;
      subTotal: number;
      roundOff: number;
    };
  } {
    const subTotal = taxableAmount + additionalCharges + gst.cgstAmount + gst.sgstAmount;
    
    let roundOff = 0;
    let netAmount = subTotal;

    if (enableRoundOff) {
      roundOff = this.calculateRoundOff(subTotal, 2);
      netAmount = Math.round(subTotal);
    }

    return {
      netAmount: this.roundToDecimals(netAmount, 2),
      roundOff: this.roundToDecimals(roundOff, 2),
      breakdown: {
        taxableAmount: this.roundToDecimals(taxableAmount, 2),
        additionalCharges: this.roundToDecimals(additionalCharges, 2),
        cgst: this.roundToDecimals(gst.cgstAmount, 2),
        sgst: this.roundToDecimals(gst.sgstAmount, 2),
        subTotal: this.roundToDecimals(subTotal, 2),
        roundOff: this.roundToDecimals(roundOff, 2)
      }
    };
  }

  /**
   * Get common GST rates in India
   */
  getCommonGSTRates(): number[] {
    return [0, 5, 12, 18, 28];
  }

  /**
   * Validate GST rate
   */
  validateGSTRate(gstRate: number): {
    isValid: boolean;
    error?: string;
  } {
    if (isNaN(gstRate)) {
      return { isValid: false, error: 'GST rate must be a number' };
    }

    if (gstRate < 0) {
      return { isValid: false, error: 'GST rate cannot be negative' };
    }

    if (gstRate > 100) {
      return { isValid: false, error: 'GST rate cannot exceed 100%' };
    }

    const commonRates = this.getCommonGSTRates();
    if (!commonRates.includes(gstRate) && gstRate !== 0) {
      // Warning but not error - allow custom rates
      return { 
        isValid: true, 
        error: `GST rate ${gstRate}% is not a common GST rate (common: ${commonRates.join(', ')})` 
      };
    }

    return { isValid: true };
  }

  /**
   * Round to specified decimal places
   */
  private roundToDecimals(value: number, decimals: number): number {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  }
}

// Export singleton instance
export const gstCalculationService = new GSTCalculationService();

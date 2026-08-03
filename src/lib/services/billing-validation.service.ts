/**
 * Billing Validation Service
 * 
 * Validates billing data before calculation to prevent errors.
 * Provides detailed error messages for missing rates, invalid configurations, etc.
 */

import type { CustomerRate } from '@/lib/types';
import type { InwardStockBalance, BillingValidationError } from '@/lib/types/billing';

/**
 * Billing Validation Service
 */
class BillingValidationService {
  /**
   * Validate customer has rates for all items
   */
  validateCustomerRates(
    customerRates: CustomerRate[],
    itemDescriptions: string[]
  ): {
    isValid: boolean;
    errors: BillingValidationError[];
    warnings: BillingValidationError[];
  } {
    const errors: BillingValidationError[] = [];
    const warnings: BillingValidationError[] = [];

    const rateMap = new Map(customerRates.map(r => [r.itemDescription, r]));

    for (const itemDescription of itemDescriptions) {
      const rate = rateMap.get(itemDescription);

      if (!rate) {
        errors.push({
          field: 'rate',
          message: `Customer rate not found for item: ${itemDescription}`,
          severity: 'error',
          itemId: itemDescription
        });
        continue;
      }

      // Validate rate configuration
      const rateValidation = this.validateRateConfiguration(rate, itemDescription);
      errors.push(...rateValidation.errors);
      warnings.push(...rateValidation.warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate individual rate configuration
   */
  validateRateConfiguration(
    rate: CustomerRate,
    itemId?: string
  ): {
    errors: BillingValidationError[];
    warnings: BillingValidationError[];
  } {
    const errors: BillingValidationError[] = [];
    const warnings: BillingValidationError[] = [];

    // Validate RatePer
    if (!rate.ratePer || rate.ratePer === '0') {
      errors.push({
        field: 'ratePer',
        message: `RatePer is zero or empty for item: ${rate.itemDescription}`,
        severity: 'error',
        itemId
      });
    } else {
      const ratePerNum = parseFloat(rate.ratePer);
      if (isNaN(ratePerNum)) {
        errors.push({
          field: 'ratePer',
          message: `RatePer is invalid (not a number) for item: ${rate.itemDescription}`,
          severity: 'error',
          itemId
        });
      }
    }

    // Validate Rate
    if (rate.rate < 0) {
      errors.push({
        field: 'rate',
        message: `Rate cannot be negative for item: ${rate.itemDescription}`,
        severity: 'error',
        itemId
      });
    }

    if (rate.rate === 0) {
      warnings.push({
        field: 'rate',
        message: `Rate is zero for item: ${rate.itemDescription} - this will result in zero charges`,
        severity: 'warning',
        itemId
      });
    }

    // Validate GST Rate
    if (rate.gstRate < 0 || rate.gstRate > 100) {
      errors.push({
        field: 'gstRate',
        message: `GST rate must be between 0 and 100 for item: ${rate.itemDescription}`,
        severity: 'error',
        itemId
      });
    }

    // Validate HSN Code
    if (!rate.hsnCode || rate.hsnCode.trim() === '') {
      warnings.push({
        field: 'hsnCode',
        message: `HSN code is missing for item: ${rate.itemDescription}`,
        severity: 'warning',
        itemId
      });
    }

    return { errors, warnings };
  }

  /**
   * Validate stock balances
   */
  validateStockBalances(balances: InwardStockBalance[]): {
    isValid: boolean;
    errors: BillingValidationError[];
    warnings: BillingValidationError[];
  } {
    const errors: BillingValidationError[] = [];
    const warnings: BillingValidationError[] = [];

    for (const balance of balances) {
      // Check for negative closing
      if (balance.closingQty < 0) {
        errors.push({
          field: 'closingQty',
          message: `Negative closing quantity (${balance.closingQty}) for inward: ${balance.inwardNo}`,
          severity: 'error',
          itemId: balance.inwardNo
        });
      }

      if (balance.closingWeight < 0) {
        errors.push({
          field: 'closingWeight',
          message: `Negative closing weight (${balance.closingWeight}) for inward: ${balance.inwardNo}`,
          severity: 'error',
          itemId: balance.inwardNo
        });
      }

      // Check if issues exceed opening
      if (balance.issuesQty > balance.openingQty) {
        errors.push({
          field: 'issuesQty',
          message: `Issues quantity (${balance.issuesQty}) exceeds opening quantity (${balance.openingQty}) for inward: ${balance.inwardNo}`,
          severity: 'error',
          itemId: balance.inwardNo
        });
      }

      if (balance.issuesWeight > balance.openingWeight) {
        errors.push({
          field: 'issuesWeight',
          message: `Issues weight (${balance.issuesWeight}) exceeds opening weight (${balance.openingWeight}) for inward: ${balance.inwardNo}`,
          severity: 'error',
          itemId: balance.inwardNo
        });
      }

      // Warning for zero closing stock
      if (balance.closingWeight === 0 && balance.openingWeight > 0) {
        warnings.push({
          field: 'closingWeight',
          message: `Zero closing weight for inward: ${balance.inwardNo} - all stock has been issued`,
          severity: 'warning',
          itemId: balance.inwardNo
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate billing parameters
   */
  validateBillingParams(params: {
    clientId?: string;
    clientName?: string;
    monthEndDate?: string;
    gstDate?: string;
    billMonth?: string;
  }): {
    isValid: boolean;
    errors: BillingValidationError[];
  } {
    const errors: BillingValidationError[] = [];

    if (!params.clientId) {
      errors.push({
        field: 'clientId',
        message: 'Client ID is required',
        severity: 'error'
      });
    }

    if (!params.clientName) {
      errors.push({
        field: 'clientName',
        message: 'Client name is required',
        severity: 'error'
      });
    }

    if (!params.monthEndDate) {
      errors.push({
        field: 'monthEndDate',
        message: 'Month end date is required',
        severity: 'error'
      });
    }

    if (!params.gstDate) {
      errors.push({
        field: 'gstDate',
        message: 'GST date is required',
        severity: 'error'
      });
    }

    if (!params.billMonth) {
      errors.push({
        field: 'billMonth',
        message: 'Bill month is required',
        severity: 'error'
      });
    } else {
      // Validate bill month format (YYYY-MM)
      const monthFormat = /^\d{4}-\d{2}$/;
      if (!monthFormat.test(params.billMonth)) {
        errors.push({
          field: 'billMonth',
          message: 'Bill month must be in format YYYY-MM',
          severity: 'error'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Format validation errors for user display
   */
  formatValidationErrors(errors: BillingValidationError[]): string {
    if (errors.length === 0) return '';

    const errorMessages = errors.map(error => {
      const prefix = error.severity === 'error' ? '❌' : '⚠️';
      const itemId = error.itemId ? ` [${error.itemId}]` : '';
      return `${prefix} ${error.field}: ${error.message}${itemId}`;
    });

    return errorMessages.join('\n');
  }

  /**
   * Check if validation should prevent billing
   */
  shouldPreventBilling(errors: BillingValidationError[]): boolean {
    return errors.some(error => error.severity === 'error');
  }
}

// Export singleton instance
export const billingValidationService = new BillingValidationService();

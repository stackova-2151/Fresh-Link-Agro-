/**
 * Billing Engine Types
 * 
 * Modular type definitions for the billing system to support
 * future extensibility and configurable charges.
 */

/**
 * Stock balance for a specific inward voucher
 */
export interface InwardStockBalance {
  inwardNo: string;
  inwardDate: string;
  itemDescription: string;
  brand: string;
  batch: string;
  chamberId: string;
  openingQty: number;
  openingWeight: number;
  issuesQty: number;
  issuesWeight: number;
  outwardDates: string[]; // All outward dates for this inward
  closingQty: number;
  closingWeight: number;
  hasOutward: boolean;
}

/**
 * Rate configuration for billing calculation
 */
export interface BillingRate {
  itemDescription: string;
  rate: number;
  ratePer: string;
  gstRate: number;
  hsnCode: string;
}

/**
 * Charge type for additional charges
 */
export type ChargeType = 
  | 'monthly_inward'
  | 'varai'
  | 'loading'
  | 'unloading'
  | 'handling'
  | 'storage'
  | 'other';

/**
 * Additional charge configuration
 */
export interface ChargeConfig {
  type: ChargeType;
  name: string;
  amount: number;
  isPercentage: boolean;
  appliesTo: 'all' | 'with_inward' | 'with_outward' | 'condition';
  condition?: (context: BillingContext) => boolean;
  priority: number; // For ordering charges
}

/**
 * Billing calculation context
 */
export interface BillingContext {
  clientId: string;
  clientName: string;
  billMonth: string;
  monthEndDate: string;
  hasInwardThisMonth: boolean;
  inwardCount: number;
  totalClosingWeight: number;
  totalIssuesWeight: number;
  grossAmount: number;
}

/**
 * Calculated charge result
 */
export interface CalculatedCharge {
  type: ChargeType;
  name: string;
  amount: number;
  description: string;
}

/**
 * GST calculation result
 */
export interface GSTCalculation {
  taxableAmount: number;
  cgstRate: number;
  sgstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  totalGST: number;
}

/**
 * Bill item for printing
 */
export interface BillItem {
  inwardNo: string;
  inwardDate: string;
  itemDescription: string;
  openingQty: number;
  openingWeight: number;
  rate: number;
  issuesQty: number;
  issuesWeight: number;
  outDetailDate: string | null;
  closingQty: number;
  closingWeight: number;
  amount: number;
  hsnCode: string;
  gstRate: number;
}

/**
 * Complete bill calculation result
 */
export interface BillCalculationResult {
  clientId: string;
  clientName: string;
  clientGstNumber?: string;
  clientAddress?: string;
  billMonth: string;
  monthEndDate: string;
  gstDate: string;
  billDate: string;
  items: BillItem[];
  grossAmount: number;
  charges: CalculatedCharge[];
  taxableAmount: number;
  gst: GSTCalculation;
  roundOff: number;
  netAmount: number;
  amountInWords: string;
  createdBy: string;
}

/**
 * Billing configuration for the system
 */
export interface BillingConfiguration {
  monthlyInwardCharge: number;
  charges: ChargeConfig[];
  gstEnabled: boolean;
  defaultCGSTRate: number;
  defaultSGSTRate: number;
  roundOffEnabled: boolean;
}

/**
 * Validation error for billing
 */
export interface BillingValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
  itemId?: string;
}

/**
 * Billing calculation options
 */
export interface BillingCalculationOptions {
  skipValidation?: boolean;
  includeZeroStock?: boolean;
  calculateLoading?: boolean;
  customCharges?: ChargeConfig[];
}

/**
 * Parameters for bill calculation
 */
export interface BillCalculationParams {
  clientId: string;
  clientName: string;
  clientGstNumber?: string;
  clientAddress?: string;
  monthEndDate: string;
  gstDate: string;
  billDate: string;
  billMonth: string;
  createdBy: string;
}

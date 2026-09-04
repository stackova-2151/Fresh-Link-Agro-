/**
 * Bill Calculator V2 - Modular Billing Engine
 * 
 * Production-ready billing system with modular architecture.
 * Uses dedicated services for each calculation aspect.
 * 
 * Features:
 * - Per inward voucher billing (each inward = one row)
 * - Correct amount formula: (Closing Weight / RatePer) × Rate
 * - Configurable charges system
 * - GST calculation with proper rounding
 * - Comprehensive validation
 * - Future-ready for extensibility
 */

import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { customerRatesService } from '@/lib/firestore';
import type { CustomerRate, GeneratedBill } from '@/lib/types';
import type { InwardVoucher } from '@/components/inventory/bulk-inward-entry-form';
import type { OutwardVoucher } from '@/components/outward/bulk-outward-entry-form';
import type {
  BillCalculationParams,
  BillCalculationResult,
  BillItem,
  InwardStockBalance,
  BillingRate,
  BillingContext,
  BillingValidationError
} from '@/lib/types/billing';

import { stockCalculationService } from '@/lib/services/stock-calculation.service';
import { amountCalculationService } from '@/lib/services/amount-calculation.service';
import { gstCalculationService } from '@/lib/services/gst-calculation.service';
import { billingConfigService } from '@/lib/services/billing-config.service';
import { billingValidationService } from '@/lib/services/billing-validation.service';

/**
 * Bill Calculator V2
 */
export class BillCalculatorV2 {
  private lastBillingContext: BillingContext | null = null;

  /**
   * Calculate bill for a customer
   */
  async calculateBill(params: BillCalculationParams): Promise<BillCalculationResult> {
    console.log('========================================================');
    console.log('[BILL-START] BILL CALCULATOR V2 START');
    console.log('========================================================');
    console.log('[BILL-START] Customer:', params.clientName);
    console.log('[BILL-START] ClientId:', params.clientId);
    console.log('[BILL-START] Month:', params.billMonth);
    console.log('[BILL-START] MonthEnd:', new Date(params.monthEndDate).toLocaleDateString('en-IN'));
    console.log('[BILL-START] GSTDate:', new Date(params.gstDate).toLocaleDateString('en-IN'));

    try {
      // Step 0: Validate billing parameters
      const paramValidation = billingValidationService.validateBillingParams(params);
      if (!paramValidation.isValid) {
        console.error('Billing parameter validation failed:', paramValidation.errors);
        throw new Error(`Invalid billing parameters: ${billingValidationService.formatValidationErrors(paramValidation.errors)}`);
      }

      // Step 1: Fetch customer rates
      console.log('[BILL-RATE] Fetching customer rates for client:', params.clientId);
      const customerRates = await this.fetchCustomerRates(params.clientId);
      console.log('[BILL-RATE] Customer rates fetched:', customerRates.length);
      
      // Step 1.5: Validate customer rates exist
      if (customerRates.length === 0) {
        console.error('[ERROR] No customer rates found for client:', params.clientName);
        throw new Error(`No customer rates found for client: ${params.clientName}. Please configure rates in Customer Rate Master.`);
      }

      console.log('[BILL-RATE] Available rates:');
      customerRates.forEach((rate, idx) => {
        console.log(`[BILL-RATE]   ${idx + 1}. ${rate.itemDescription} - Rate: ${rate.rate}, RatePer: ${rate.ratePer}`);
      });

      const ratesMap = this.buildRatesMap(customerRates);

      // Step 2: Fetch inward and outward vouchers
      console.log('[BILL-DATA] Fetching inward vouchers...');
      const inwardVouchers = await this.fetchInwardVouchers(params.clientId, params.monthEndDate);
      console.log('[BILL-DATA] Inward vouchers fetched:', inwardVouchers.length);
      
      console.log('[BILL-DATA] Fetching outward vouchers...');
      const outwardVouchers = await this.fetchOutwardVouchers(params.clientId, params.monthEndDate);
      console.log('[BILL-DATA] Outward vouchers fetched:', outwardVouchers.length);

      console.log('[BILL-DATA] Inward Vouchers Details:');
      inwardVouchers.forEach((voucher, idx) => {
        console.log(`[BILL-DATA] Voucher ${idx + 1}:`);
        console.log(`[BILL-DATA]   Voucher No: ${voucher.inwardNo || voucher.id}`);
        console.log(`[BILL-DATA]   Date: ${new Date(voucher.date).toLocaleDateString('en-IN')}`);
        console.log(`[BILL-DATA]   Items: ${voucher.items?.length || 0}`);
        voucher.items?.forEach((item, itemIdx) => {
          console.log(`[BILL-DATA]     Item ${itemIdx + 1}: ${item.itemName}`);
          console.log(`[BILL-DATA]       Weight: ${item.totalWeight}`);
          console.log(`[BILL-DATA]       Qty: ${item.bags}`);
          console.log(`[BILL-DATA]       Batch: ${item.batch}`);
          console.log(`[BILL-DATA]       Chamber: ${item.chamberId}`);
        });
      });

      // Step 3: Calculate stock balances (per inward voucher)
      console.log('[BILL-CALC] Calculating stock balances...');
      const stockBalances = stockCalculationService.calculateInwardStockBalances(
        inwardVouchers,
        outwardVouchers,
        params.monthEndDate
      );

      console.log('[BILL-CALC] Stock balances calculated:', stockBalances.length);
      console.log('[BILL-CALC] Stock Balance Details:');
      stockBalances.forEach((balance, idx) => {
        console.log(`[BILL-CALC] Balance ${idx + 1}:`);
        console.log(`[BILL-CALC]   Inward No: ${balance.inwardNo}`);
        console.log(`[BILL-CALC]   Item: ${balance.itemDescription}`);
        console.log(`[BILL-CALC]   Opening Qty: ${balance.openingQty}`);
        console.log(`[BILL-CALC]   Opening Weight: ${balance.openingWeight}`);
        console.log(`[BILL-CALC]   Issues Qty: ${balance.issuesQty}`);
        console.log(`[BILL-CALC]   Issues Weight: ${balance.issuesWeight}`);
        console.log(`[BILL-CALC]   Closing Qty: ${balance.closingQty}`);
        console.log(`[BILL-CALC]   Closing Weight: ${balance.closingWeight}`);
      });

      // Step 4: Validate stock balances
      const stockValidation = stockCalculationService.validateBalances(stockBalances);
      if (!stockValidation.isValid) {
        console.error('Stock validation failed:', stockValidation.errors);
        throw new Error(`Stock validation failed: ${stockValidation.errors.join(', ')}`);
      }
      
      // Step 4.5: Validate customer rates for all items
      const itemDescriptions = stockBalances.map(b => b.itemDescription);
      console.log('[BILL-RATE] Validating customer rates for items:');
      itemDescriptions.forEach((item, idx) => {
        console.log(`[BILL-RATE]   Item ${idx + 1}: ${item}`);
      });
      const rateValidation = billingValidationService.validateCustomerRates(customerRates, itemDescriptions);
      
      if (rateValidation.errors.length > 0) {
        console.error('[ERROR] Customer rate validation failed:', rateValidation.errors);
        throw new Error(`Customer rate validation failed: ${billingValidationService.formatValidationErrors(rateValidation.errors)}`);
      }
      
      if (rateValidation.warnings.length > 0) {
        console.warn('[BILL-RATE] Customer rate validation warnings:', rateValidation.warnings);
      }

      // Step 5: Check for inward in billing month
      const hasInwardThisMonth = stockCalculationService.hasInwardInMonth(
        inwardVouchers,
        params.billMonth
      );
      const inwardCount = stockCalculationService.countInwardInMonth(
        inwardVouchers,
        params.billMonth
      );

      console.log('[BILL-CALC] Has Inward This Month:', hasInwardThisMonth ? 'YES' : 'NO');
      console.log('[BILL-CALC] Inward Count:', inwardCount);

      // Step 6: Calculate amounts for each stock balance
      console.log('[BILL-CALC] Calculating amounts for each stock balance...');
      const amountResults = amountCalculationService.calculateAmounts(
        stockBalances,
        ratesMap
      );

      console.log('[BILL-CALC] Amount Calculation Errors:', amountResults.errors.length);
      if (amountResults.errors.length > 0) {
        amountResults.errors.forEach(error => {
          console.error('[ERROR] Validation Error:', error.message);
        });
      }

      console.log('[BILL-CALC] Amount Calculation Results:');
      amountResults.results.forEach((result, idx) => {
        console.log(`[BILL-CALC] Item ${idx + 1}: ${result.balance.itemDescription}`);
        console.log(`[BILL-CALC]   Closing Weight: ${result.balance.closingWeight}`);
        console.log(`[BILL-CALC]   Rate: ${ratesMap.get(result.balance.itemDescription)?.rate || 'N/A'}`);
        console.log(`[BILL-CALC]   RatePer: ${ratesMap.get(result.balance.itemDescription)?.ratePer || 'N/A'}`);
        console.log(`[BILL-CALC]   Formula: ${result.calculation}`);
        console.log(`[BILL-CALC]   Amount: ${result.amount}`);
        if (result.error) {
          console.error(`[ERROR] Item ${idx + 1} error:`, result.error.message);
        }
      });

      // Step 7: Build bill items
      const billItems = this.buildBillItems(
        amountResults.results,
        ratesMap
      );

      console.log('[BILL-ITEM] Bill Items built:', billItems.length);
      console.log('[BILL-ITEM] Bill Item Details:');
      billItems.forEach((item, idx) => {
        console.log(`[BILL-ITEM] Item ${idx + 1}:`);
        console.log(`[BILL-ITEM]   Inward No: ${item.inwardNo}`);
        console.log(`[BILL-ITEM]   Item: ${item.itemDescription}`);
        console.log(`[BILL-ITEM]   Amount: ${item.amount}`);
      });
      console.log('[BILL-TOTAL] Gross Amount:', amountResults.totalAmount);

      // Step 8: Calculate totals
      const totalClosingWeight = stockCalculationService.calculateTotalClosingWeight(stockBalances);
      const totalIssuesWeight = stockCalculationService.calculateTotalIssuesWeight(stockBalances);

      // Step 9: Build billing context
      const billingContext: BillingContext = {
        clientId: params.clientId,
        clientName: params.clientName,
        billMonth: params.billMonth,
        monthEndDate: params.monthEndDate,
        hasInwardThisMonth,
        inwardCount,
        totalClosingWeight,
        totalIssuesWeight,
        grossAmount: amountResults.totalAmount
      };

      // Store context for later use
      this.lastBillingContext = billingContext;

      // Step 10: Calculate additional charges
      console.log('[BILL-CALC] Calculating additional charges...');
      const charges = billingConfigService.calculateCharges(billingContext);
      const totalCharges = charges.reduce((sum, charge) => sum + charge.amount, 0);

      console.log('[BILL-CALC] Additional Charges:', charges.length);
      charges.forEach((charge, idx) => {
        console.log(`[BILL-CALC]   Charge ${idx + 1}: ${charge.name} - ₹${charge.amount}`);
      });
      console.log('[BILL-CALC] Total Charges:', totalCharges);

      // Step 11: Calculate taxable amount
      const taxableAmount = amountResults.totalAmount + totalCharges;

      console.log('[BILL-TOTAL] Taxable Amount:', taxableAmount);

      // Step 12: Calculate GST
      const gstRate = this.getGSTRate(billItems);
      const gst = gstCalculationService.calculateGST(taxableAmount, gstRate);

      console.log('[BILL-CALC] GST Rate:', gstRate);
      console.log('[BILL-CALC] CGST:', gst.cgstAmount);
      console.log('[BILL-CALC] SGST:', gst.sgstAmount);

      // Step 13: Calculate net amount with rounding
      const netResult = gstCalculationService.calculateNetAmount(
        taxableAmount,
        gst,
        0, // No additional charges beyond what's already in taxableAmount
        true // Enable round-off
      );

      console.log('[BILL-CALC] Round Off:', netResult.roundOff);
      console.log('[BILL-CALC] Net Amount:', netResult.netAmount);

      // Step 14: Convert amount to words
      const amountInWords = this.numberToWords(Math.round(netResult.netAmount));

      // Step 15: Build result
      const result: BillCalculationResult = {
        clientId: params.clientId,
        clientName: params.clientName,
        clientGstNumber: params.clientGstNumber,
        clientAddress: params.clientAddress,
        billMonth: params.billMonth,
        monthEndDate: params.monthEndDate,
        gstDate: params.gstDate,
        billDate: params.billDate,
        items: billItems,
        grossAmount: amountResults.totalAmount,
        charges,
        taxableAmount,
        gst,
        roundOff: netResult.roundOff,
        netAmount: netResult.netAmount,
        amountInWords,
        createdBy: params.createdBy
      };

      console.log('========================================================');
      console.log('[BILL-TOTAL] BILL CALCULATION COMPLETE');
      console.log('========================================================');
      console.log('[BILL-TOTAL] Gross Amount:', amountResults.totalAmount);
      console.log('[BILL-TOTAL] Varai:', result.charges.find(c => c.type === 'varai')?.amount || 0);
      console.log('[BILL-TOTAL] U/L:', result.charges.find(c => c.type === 'loading')?.amount || 0);
      console.log('[BILL-TOTAL] Taxable Amount:', taxableAmount);
      console.log('[BILL-TOTAL] CGST:', gst.cgstAmount);
      console.log('[BILL-TOTAL] SGST:', gst.sgstAmount);
      console.log('[BILL-TOTAL] Round Off:', netResult.roundOff);
      console.log('[BILL-TOTAL] Net Amount:', netResult.netAmount);
      console.log('========================================================');

      return result;
    } catch (error) {
      console.error('[ERROR] BILL CALCULATION ERROR');
      console.error('[ERROR] Operation: calculateBill');
      console.error('[ERROR] Error Message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('[ERROR] Stack:', error instanceof Error ? error.stack : 'No stack');
      throw error;
    }
  }

  /**
   * Fetch customer rates from Firestore
   */
  private async fetchCustomerRates(clientId: string): Promise<CustomerRate[]> {
    return await customerRatesService.getByClient(clientId);
  }

  /**
   * Build rates map for efficient lookup
   */
  private buildRatesMap(customerRates: CustomerRate[]): Map<string, BillingRate> {
    const map = new Map<string, BillingRate>();
    
    customerRates.forEach(rate => {
      map.set(rate.itemDescription, {
        itemDescription: rate.itemDescription,
        rate: rate.rate,
        ratePer: rate.ratePer,
        gstRate: rate.gstRate,
        hsnCode: rate.hsnCode
      });
    });

    return map;
  }

  /**
   * Fetch inward vouchers for customer up to month end date
   */
  private async fetchInwardVouchers(
    clientId: string,
    monthEndDate: string
  ): Promise<InwardVoucher[]> {
    const inwardQuery = query(
      collection(db, 'inwardVouchers'),
      where('clientId', '==', clientId),
      where('date', '<=', monthEndDate),
      orderBy('date', 'asc')
    );
    const inwardSnap = await getDocs(inwardQuery);
    return inwardSnap.docs.map((d) => ({ id: d.id, ...d.data() } as InwardVoucher));
  }

  /**
   * Fetch outward vouchers for customer up to month end date
   */
  private async fetchOutwardVouchers(
    clientId: string,
    monthEndDate: string
  ): Promise<OutwardVoucher[]> {
    const outwardQuery = query(
      collection(db, 'outwardVouchers'),
      where('clientId', '==', clientId),
      where('date', '<=', monthEndDate),
      orderBy('date', 'asc')
    );
    const outwardSnap = await getDocs(outwardQuery);
    return outwardSnap.docs.map((d) => ({ id: d.id, ...d.data() } as OutwardVoucher));
  }

  /**
   * Build bill items from amount calculation results
   */
  private buildBillItems(
    amountResults: Array<{
      balance: InwardStockBalance;
      amount: number;
      calculation: string;
      error?: BillingValidationError;
    }>,
    ratesMap: Map<string, BillingRate>
  ): BillItem[] {
    const billItems: BillItem[] = [];

    for (const result of amountResults) {
      // Skip items with errors
      if (result.error) {
        console.warn(`Skipping item due to error: ${result.error.message}`);
        continue;
      }

      const rate = ratesMap.get(result.balance.itemDescription);
      if (!rate) {
        console.warn(`Rate not found for item: ${result.balance.itemDescription}`);
        continue;
      }

      // Get outward detail date (first outward date if any)
      const outDetailDate = result.balance.outwardDates.length > 0
        ? result.balance.outwardDates[0]
        : null;

      const billItem: BillItem = {
        inwardNo: result.balance.inwardNo,
        inwardDate: result.balance.inwardDate,
        itemDescription: result.balance.itemDescription,
        openingQty: result.balance.openingQty,
        openingWeight: result.balance.openingWeight,
        rate: rate.rate,
        issuesQty: result.balance.issuesQty,
        issuesWeight: result.balance.issuesWeight,
        outDetailDate,
        closingQty: result.balance.closingQty,
        closingWeight: result.balance.closingWeight,
        amount: result.amount,
        hsnCode: rate.hsnCode,
        gstRate: rate.gstRate
      };

      billItems.push(billItem);
    }

    return billItems;
  }

  /**
   * Get GST rate from bill items
   * Uses first item's GST rate (assuming same GST for all items)
   */
  private getGSTRate(billItems: BillItem[]): number {
    if (billItems.length === 0) return 0;
    return billItems[0].gstRate || 0;
  }

  /**
   * Convert number to words (Indian numbering system)
   */
  private numberToWords(num: number): string {
    if (num === 0) return 'Zero Rupees Only';
    
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    function convertLessThanThousand(n: number): string {
      if (n === 0) return '';
      if (n < 20) return ones[n];
      if (n < 100) {
        const t = Math.floor(n / 10);
        const o = n % 10;
        return tens[t] + (o ? ' ' + ones[o] : '');
      }
      const h = Math.floor(n / 100);
      const r = n % 100;
      return ones[h] + ' Hundred' + (r ? ' and ' + convertLessThanThousand(r) : '');
    }
    
    function convert(n: number): string {
      if (n === 0) return '';
      if (n < 1000) return convertLessThanThousand(n);
      if (n < 100000) {
        const t = Math.floor(n / 1000);
        const r = n % 1000;
        return convertLessThanThousand(t) + ' Thousand' + (r ? ' ' + convertLessThanThousand(r) : '');
      }
      if (n < 10000000) {
        const l = Math.floor(n / 100000);
        const r = n % 100000;
        return convertLessThanThousand(l) + ' Lakh' + (r ? ' ' + convert(r) : '');
      }
      const c = Math.floor(n / 10000000);
      const r = n % 10000000;
      return convertLessThanThousand(c) + ' Crore' + (r ? ' ' + convert(r) : '');
    }
    
    return convert(num) + ' Rupees Only';
  }

  /**
   * Convert BillCalculationResult to GeneratedBill for Firestore
   */
  convertToGeneratedBill(result: BillCalculationResult, existingBill?: GeneratedBill): GeneratedBill {
    console.log('[BILL-SAVE] Converting to GeneratedBill object...');
    
    // Preserve existing bill number and ID if updating, otherwise generate new
    const billNumber = existingBill?.billNumber || `BILL-${result.billMonth}-${result.clientId.slice(-4).toUpperCase()}`;
    const billId = existingBill?.id || '';
    const createdAt = existingBill?.createdAt || new Date().toISOString();
    
    console.log('[BILL-SAVE] Bill Number:', billNumber);
    console.log('[BILL-SAVE] Bill ID:', billId || '(new bill - will be assigned by Firestore)');
    console.log('[BILL-SAVE] Mode:', existingBill ? 'UPDATE' : 'CREATE');

    // Flatten charges for backward compatibility
    const varai = result.charges.find(c => c.type === 'varai')?.amount || 0;
    const uL = result.charges.find(c => c.type === 'loading')?.amount || 0;

    // Use stored billing context or create fallback
    const billingContext = this.lastBillingContext || {
      clientId: result.clientId,
      clientName: result.clientName,
      billMonth: result.billMonth,
      monthEndDate: result.monthEndDate,
      hasInwardThisMonth: result.items.length > 0,
      inwardCount: result.items.length,
      totalClosingWeight: result.items.reduce((sum, item) => sum + item.closingWeight, 0),
      totalIssuesWeight: result.items.reduce((sum, item) => sum + item.issuesWeight, 0),
      grossAmount: result.grossAmount
    };

    const generatedBill = {
      id: billId,
      billNumber,
      clientId: result.clientId,
      clientName: result.clientName,
      clientGstNumber: result.clientGstNumber,
      clientAddress: result.clientAddress,
      billMonth: result.billMonth,
      monthEndDate: result.monthEndDate,
      gstDate: result.gstDate,
      billDate: result.billDate,
      items: result.items,
      grossAmount: result.grossAmount,
      varai,
      uL,
      taxableAmount: result.taxableAmount,
      cgst: result.gst.cgstAmount,
      sgst: result.gst.sgstAmount,
      roundOff: result.roundOff,
      netAmount: result.netAmount,
      amountInWords: result.amountInWords,
      createdAt,
      updatedAt: new Date().toISOString(),
      lastCalculatedAt: new Date().toISOString(),
      createdBy: result.createdBy,
      // New fields for enhanced tracking
      charges: result.charges.map(c => ({
        type: c.type,
        name: c.name,
        amount: c.amount,
        description: c.description
      })),
      hasInwardThisMonth: billingContext.hasInwardThisMonth,
      inwardCount: billingContext.inwardCount
    };

    console.log('[BILL-SAVE] GeneratedBill object created:');
    console.log('[BILL-SAVE]', JSON.stringify(generatedBill, null, 2));
    
    return generatedBill;
  }
}

// Export singleton instance
export const billCalculatorV2 = new BillCalculatorV2();

/**
 * Convenience function for backward compatibility
 * Matches the signature of the original calculateBill function
 */
export async function calculateBill(params: BillCalculationParams): Promise<GeneratedBill> {
  console.log('[BILL-START] calculateBill convenience function called');
  const result = await billCalculatorV2.calculateBill(params);
  const generatedBill = billCalculatorV2.convertToGeneratedBill(result);
  console.log('[BILL-SAVE] Final GeneratedBill ready for save');
  return generatedBill;
}

import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { customerRatesService } from '@/lib/firestore';
import type { CustomerRate, GeneratedBill } from '@/lib/types';
import type { InwardVoucher } from '@/components/inventory/bulk-inward-entry-form';
import type { OutwardVoucher } from '@/components/outward/bulk-outward-entry-form';

interface BillCalculationParams {
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

interface BillItem {
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

export async function calculateBill(params: BillCalculationParams): Promise<GeneratedBill> {
  try {
    const {
      clientId,
      clientName,
      clientGstNumber,
      clientAddress,
      monthEndDate,
      gstDate,
      billDate,
      billMonth,
      createdBy,
    } = params;

    console.log('========================================================');
    console.log('BILL CALCULATOR START');
    console.log('========================================================');
    console.log('Client Id:', clientId);
    console.log('Client Name:', clientName);
    console.log('Month End Date:', monthEndDate);
    console.log('GST Date:', gstDate);
    console.log('Bill Month:', billMonth);

    // Fetch customer rates
    console.log('========================================================');
    console.log('CUSTOMER RATES');
    console.log('========================================================');
    const customerRates = await customerRatesService.getByClient(clientId);
    console.log('Customer Rate Count:', customerRates.length);
    
    customerRates.forEach((rate, idx) => {
      console.log(`\n--- RATE ${idx + 1} ---`);
      console.log('Item Name:', rate.itemDescription);
      console.log('Rent Per:', rate.rentPer);
      console.log('Rate Per:', rate.ratePer);
      console.log('Rate:', rate.rate);
      console.log('Loading Per:', rate.loadingPer);
      console.log('Loading:', rate.loading);
      console.log('Loading Rate Per:', rate.loadingRatePer);
      console.log('HSN:', rate.hsnCode);
      console.log('GST:', rate.gstRate);
    });

    const ratesMap = new Map(customerRates.map((r) => [r.itemDescription, r]));
    console.log('\nAvailable Rate Keys:', Array.from(ratesMap.keys()));

    // Fetch inward vouchers for the customer up to month end date
    console.log('========================================================');
    console.log('INWARD VOUCHERS');
    console.log('========================================================');
    const inwardQuery = query(
      collection(db, 'inwardVouchers'),
      where('clientId', '==', clientId),
      where('date', '<=', monthEndDate),
      orderBy('date', 'asc')
    );
    const inwardSnap = await getDocs(inwardQuery);
    const inwardVouchers = inwardSnap.docs.map((d) => ({ id: d.id, ...d.data() } as InwardVoucher));
    console.log('Number of Inward Vouchers:', inwardVouchers.length);

    inwardVouchers.forEach((voucher, vIdx) => {
      console.log(`\n--- VOUCHER ${vIdx + 1}: ${voucher.inwardNo} ---`);
      console.log('Date:', voucher.date);
      console.log('Client:', voucher.clientName);
      
      voucher.items.forEach((item, iIdx) => {
        console.log(`\n  Item ${iIdx + 1}: ${item.itemName}`);
        console.log('  Qty:', item.bags);
        console.log('  Weight:', item.totalWeight);
        console.log('  Bag Weight:', item.bagWeight);
      });
    });

    // Fetch outward vouchers for the customer up to month end date
    console.log('========================================================');
    console.log('OUTWARD VOUCHERS');
    console.log('========================================================');
    const outwardQuery = query(
      collection(db, 'outwardVouchers'),
      where('clientId', '==', clientId),
      where('date', '<=', monthEndDate),
      orderBy('date', 'asc')
    );
    const outwardSnap = await getDocs(outwardQuery);
    const outwardVouchers = outwardSnap.docs.map((d) => ({ id: d.id, ...d.data() } as OutwardVoucher));
    console.log('Number of Outward Vouchers:', outwardVouchers.length);

    outwardVouchers.forEach((voucher, vIdx) => {
      console.log(`\n--- VOUCHER ${vIdx + 1}: ${voucher.outwardNo} ---`);
      console.log('Date:', voucher.date);
      console.log('Client:', voucher.clientName);
      
      voucher.items.forEach((item, iIdx) => {
        console.log(`\n  Item ${iIdx + 1}: ${item.itemName}`);
        console.log('  Qty:', item.qty);
        console.log('  Weight:', item.totalWeight);
        console.log('  Bag Weight:', item.bagWeight);
      });
    });

    // Calculate opening and closing balances for each item
    console.log('========================================================');
    console.log('ITEM BALANCES CALCULATION');
    console.log('========================================================');
    
    const itemBalances = new Map<string, {
      openingQty: number;
      openingWeight: number;
      issuesQty: number;
      issuesWeight: number;
      closingQty: number;
      closingWeight: number;
    }>();

    // Process inward vouchers (add to opening)
    inwardVouchers.forEach((voucher) => {
      voucher.items.forEach((item) => {
        const key = item.itemName;
        const existing = itemBalances.get(key) || {
          openingQty: 0,
          openingWeight: 0,
          issuesQty: 0,
          issuesWeight: 0,
          closingQty: 0,
          closingWeight: 0,
        };
        existing.openingQty += typeof item.bags === 'number' ? item.bags : 0;
        existing.openingWeight += item.totalWeight;
        itemBalances.set(key, existing);
      });
    });

    // Initialize closing balance to opening balance for all items
    // This ensures items without outward transactions still have closing balance = opening balance
    itemBalances.forEach((balance) => {
      balance.closingQty = balance.openingQty;
      balance.closingWeight = balance.openingWeight;
    });

    // Process outward vouchers (subtract from closing, add to issues)
    outwardVouchers.forEach((voucher) => {
      voucher.items.forEach((item) => {
        const key = item.itemName;
        const existing = itemBalances.get(key) || {
          openingQty: 0,
          openingWeight: 0,
          issuesQty: 0,
          issuesWeight: 0,
          closingQty: 0,
          closingWeight: 0,
        };
        const qty = typeof item.qty === 'number' ? item.qty : 0;
        existing.issuesQty += qty;
        existing.issuesWeight += item.totalWeight;
        existing.closingQty = existing.openingQty - existing.issuesQty;
        existing.closingWeight = existing.openingWeight - existing.issuesWeight;
        itemBalances.set(key, existing);
      });
    });

    // Build bill items
    console.log('========================================================');
    console.log('BILL ITEMS CREATION');
    console.log('========================================================');
    
    const billItems: BillItem[] = [];
    let grossAmount = 0;

    itemBalances.forEach((balance, itemDescription) => {
      console.log('\n----------------------------------------------------');
      console.log('ITEM:', itemDescription);
      console.log('----------------------------------------------------');
      console.log('Opening Qty:', balance.openingQty);
      console.log('Opening Weight:', balance.openingWeight);
      console.log('Issues Qty:', balance.issuesQty);
      console.log('Issues Weight:', balance.issuesWeight);
      console.log('Closing Qty:', balance.closingQty);
      console.log('Closing Weight:', balance.closingWeight);

      // Check if outward was found for this item
      const hasOutward = balance.issuesQty > 0 || balance.issuesWeight > 0;
      console.log('Was Outward Found?', hasOutward ? 'YES' : 'NO');
      
      if (hasOutward) {
        console.log('Reason for Closing Weight: Opening Weight - Issues Weight');
        console.log('Calculation:', balance.openingWeight, '-', balance.issuesWeight, '=', balance.closingWeight);
      } else {
        console.log('Reason for Closing Weight: No outward transactions, Closing Weight = Opening Weight');
        console.log('Calculation:', balance.openingWeight, '=', balance.closingWeight);
      }

      // Check customer rate lookup
      console.log('\nSearching Rate For:', `"${itemDescription}"`);
      const rate = ratesMap.get(itemDescription);
      
      if (!rate) {
        console.log('================ WARNING ================');
        console.log('Customer Rate Lookup FAILED');
        console.log('Requested Item:', `"${itemDescription}"`);
        console.log('Matched Item:', rate ? 'YES' : 'NO');
        console.log('Available Rate Keys:', Array.from(ratesMap.keys()));
        console.log('=========================================');
        return; // Skip items without rate configuration
      }

      console.log('Customer Rate Exists: YES');
      console.log('Matched Rate Object:', rate);

      // STEP 5: Before calculation
      console.log('\n--- BEFORE CALCULATION ---');
      console.log('Rent Per:', rate.rentPer);
      console.log('Rate Per:', rate.ratePer);
      console.log('Rate:', rate.rate);
      console.log('Loading Per:', rate.loadingPer);
      console.log('Loading:', rate.loading);
      console.log('Loading Rate Per:', rate.loadingRatePer);
      console.log('GST:', rate.gstRate);

      // STEP 6: Print intermediate calculations
      console.log('\n--- STORAGE CALCULATION ---');
      console.log('Storage Formula: (Closing Weight / Rate Per) × Rate');
      console.log('Closing Weight:', balance.closingWeight);
      console.log('Rate Per:', rate.ratePer);
      console.log('Rate:', rate.rate);
      
      // Validation for RatePer
      const ratePerNum = parseFloat(rate.ratePer || '0');
      if (isNaN(ratePerNum) || ratePerNum === 0) {
        console.log('================ WARNING ================');
        console.log('Rate Per is zero or invalid for item:', itemDescription);
        console.log('Rate Per value:', rate.ratePer);
        console.log('Skipping storage calculation for this item.');
        console.log('=========================================');
        return; // Skip this item
      }
      
      const storageUnits = balance.closingWeight / ratePerNum;
      console.log('Storage Units (Closing Weight / Rate Per):', storageUnits);
      const amount = storageUnits * rate.rate;
      console.log('Storage Amount:', amount);
      
      // Validate amount is not NaN
      if (isNaN(amount)) {
        console.log('================ WARNING ================');
        console.log('Storage Amount is NaN for item:', itemDescription);
        console.log('Skipping this item.');
        console.log('=========================================');
        return;
      }

      console.log('\n--- LOADING CALCULATION ---');
      console.log('Loading Formula: (Issues Weight / Loading Rate Per) × Loading');
      console.log('Issues Weight:', balance.issuesWeight);
      console.log('Loading Rate Per:', rate.loadingRatePer);
      console.log('Loading:', rate.loading);
      
      // Validation for LoadingRatePer
      const loadingRatePerNum = parseFloat(rate.loadingRatePer || '0');
      const loadingNum = parseFloat(String(rate.loading || '0'));
      
      let loadingAmount = 0;
      if (isNaN(loadingRatePerNum) || loadingRatePerNum === 0) {
        console.log('================ WARNING ================');
        console.log('Loading Rate Per is zero or invalid for item:', itemDescription);
        console.log('Loading Rate Per value:', rate.loadingRatePer);
        console.log('Setting Loading Amount to 0.');
        console.log('=========================================');
        loadingAmount = 0;
      } else {
        const loadingUnits = balance.issuesWeight / loadingRatePerNum;
        console.log('Loading Units (Issues Weight / Loading Rate Per):', loadingUnits);
        loadingAmount = loadingUnits * loadingNum;
        console.log('Loading Amount:', loadingAmount);
        
        // Validate loadingAmount is not NaN
        if (isNaN(loadingAmount)) {
          console.log('================ WARNING ================');
          console.log('Loading Amount is NaN for item:', itemDescription);
          console.log('Setting Loading Amount to 0.');
          console.log('=========================================');
          loadingAmount = 0;
        }
      }

      console.log('\n--- FINAL ITEM AMOUNT ---');
      console.log('Final Storage Amount:', amount);
      console.log('Final Loading Amount:', loadingAmount);
      console.log('Total Item Amount (Storage + Loading):', amount + loadingAmount);
      
      // Use storage amount as the item amount (current implementation)
      const finalItemAmount = amount;
      console.log('Final Amount (used in bill):', finalItemAmount);

      console.log('\n--- GST CALCULATION ---');
      console.log('GST Formula: Storage Amount * (GST Rate / 100)');
      console.log('Storage Amount:', finalItemAmount);
      console.log('GST Rate:', rate.gstRate);
      const gstAmount = (finalItemAmount * rate.gstRate) / 100;
      console.log('GST Amount:', gstAmount);

      // STEP 9: Warning if amount is zero
      if (finalItemAmount === 0) {
        console.log('================ WARNING ================');
        console.log('Item', itemDescription, 'produced ZERO amount.');
        console.log('Reason:');
        console.log('Closing Weight:', balance.closingWeight);
        console.log('Rate:', rate.rate);
        console.log('Rate Per:', rate.ratePer);
        console.log('Rent Per:', rate.rentPer);
        console.log('Matched Customer Rate:', rate);
        console.log('=========================================');
      }

      // STEP 7: While adding Gross Amount
      console.log('\n--- GROSS AMOUNT UPDATE ---');
      console.log('Before grossAmount:', grossAmount);
      console.log('Current Item Amount:', finalItemAmount);
      grossAmount += finalItemAmount;
      console.log('After grossAmount:', grossAmount);

      // Find first inward date for this item
      const firstInward = inwardVouchers.find((v) =>
        v.items.some((i) => i.itemName === itemDescription)
      );

      billItems.push({
        inwardNo: firstInward?.inwardNo || '',
        inwardDate: firstInward?.date || '',
        itemDescription,
        openingQty: balance.openingQty,
        openingWeight: balance.openingWeight,
        rate: rate.rate,
        issuesQty: balance.issuesQty,
        issuesWeight: balance.issuesWeight,
        closingQty: balance.closingQty,
        closingWeight: balance.closingWeight,
        amount: finalItemAmount,
        hsnCode: rate.hsnCode,
        gstRate: rate.gstRate,
        outDetailDate: null,
      });
    });

    // STEP 8: Final totals
    console.log('========================================================');
    console.log('FINAL CALCULATIONS');
    console.log('========================================================');
    console.log('Total Items:', billItems.length);
    console.log('Gross Amount:', grossAmount);

    const varai = 0; // TODO: Calculate based on business logic
    const uL = 0; // TODO: Calculate based on business logic
    const taxableAmount = grossAmount - varai - uL;
    const cgst = (taxableAmount * (billItems[0]?.gstRate || 0)) / 200; // Half of GST rate
    const sgst = cgst; // Equal to CGST
    const roundOff = Math.round(taxableAmount + cgst + sgst) - (taxableAmount + cgst + sgst);
    const netAmount = taxableAmount + cgst + sgst + roundOff;

    console.log('Varai:', varai);
    console.log('U/L:', uL);
    console.log('Taxable Amount:', taxableAmount);
    console.log('CGST:', cgst);
    console.log('SGST:', sgst);
    console.log('Round Off:', roundOff);
    console.log('Net Amount:', netAmount);

    // Generate bill number
    const billNumber = `BILL-${billMonth}-${clientId.slice(-4).toUpperCase()}`;

    // Convert amount to words
    const amountInWords = numberToWords(Math.round(netAmount));

    const result = {
      id: '',
      billNumber,
      clientId,
      clientName,
      clientGstNumber,
      clientAddress,
      billMonth,
      monthEndDate,
      gstDate,
      billDate,
      items: billItems,
      grossAmount,
      varai,
      uL,
      taxableAmount,
      cgst,
      sgst,
      roundOff,
      netAmount,
      amountInWords,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy,
    };

    console.log('========================================================');
    console.log('BILL CALCULATION COMPLETE');
    console.log('========================================================');
    console.log('Result:', result);

    return result;
  } catch (error) {
    console.error('========== BILL CALCULATOR ERROR ==========');
    console.error('Error object:', error);
    console.error('Error message:', error instanceof Error ? error.message : 'No message');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    throw error;
  }
}

// Helper function to convert number to words
function numberToWords(num: number): string {
  if (num === 0) return 'Zero';
  
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

# Bill Processing Engine Implementation

## Overview

A production-ready, modular billing engine for Fresh Link Agro Cold Storage that implements the exact billing formula specified in the requirements.

## Architecture

### Modular Services

The billing engine is split into dedicated services for each calculation aspect:

1. **Stock Calculation Service** (`stock-calculation.service.ts`)
   - Calculates opening stock, issues, and closing stock per inward voucher
   - Each inward voucher becomes one row in the bill
   - Validates stock balances for negative values

2. **Amount Calculation Service** (`amount-calculation.service.ts`)
   - Implements the exact formula: `(Closing Weight / RatePer) × Rate`
   - Validates rate configurations
   - Handles loading charges (if applicable)

3. **GST Calculation Service** (`gst-calculation.service.ts`)
   - Calculates CGST and SGST
   - Supports different GST split types
   - Handles rounding properly

4. **Billing Configuration Service** (`billing-config.service.ts`)
   - Manages configurable charges (monthly inward, varai, loading, etc.)
   - Future-ready for adding new charge types
   - Supports conditional charge application

5. **Billing Validation Service** (`billing-validation.service.ts`)
   - Validates customer rates exist for all items
   - Validates RatePer is not zero
   - Validates stock balances
   - Provides detailed error messages

6. **Bill Calculator V2** (`bill-calculator-v2.ts`)
   - Orchestrates all services
   - Maintains backward compatibility with original interface
   - Provides detailed logging

## Key Features

### Exact Formula Implementation

The billing engine uses the exact formula specified:

```
Amount = (Closing Weight / RatePer) × Rate
```

**Example:**
- Closing Weight: 1950
- Rate: 1500
- Rate Per: 1000
- Calculation: (1950 / 1000) × 1500 = 1.95 × 1500 = 2925.00

### Per Inward Voucher Billing

Each inward voucher becomes one row in the bill, with:
- Opening Qty/Weight
- Issues Qty/Weight
- Closing Qty/Weight
- Calculated Amount

### Monthly Inward Charge

Configurable charge (default ₹300) applied:
- Once per customer per billing month
- Only if customer has inward transactions that month
- Easily configurable through the billing config service

### Configurable Additional Charges

The system supports future extensibility for:
- Varai
- Loading
- Unloading
- Handling
- Storage
- Other custom charges

Each charge can be:
- Fixed amount or percentage-based
- Conditional (applies based on context)
- Priority-ordered

### Comprehensive Validation

- Missing customer rates → Error
- Zero RatePer → Error
- Negative stock balances → Error
- Invalid GST rates → Error
- Missing HSN codes → Warning

### GST Calculation

- CGST = (Taxable Amount × GST Rate / 2) / 100
- SGST = CGST (equal split)
- Proper rounding to 2 decimal places
- Round-off calculation

## File Structure

```
src/lib/
├── types/
│   └── billing.ts                    # New billing types
├── services/
│   ├── stock-calculation.service.ts  # Stock balance calculations
│   ├── amount-calculation.service.ts # Amount calculations
│   ├── gst-calculation.service.ts    # GST calculations
│   ├── billing-config.service.ts     # Charge configuration
│   └── billing-validation.service.ts # Validation logic
├── bill-calculator.ts                # Original (preserved)
└── bill-calculator-v2.ts             # New modular engine
```

## Usage

### Basic Bill Generation

```typescript
import { calculateBill } from '@/lib/bill-calculator-v2';

const bill = await calculateBill({
  clientId: 'client_123',
  clientName: 'JK TRADING COMPANY',
  clientGstNumber: '29ABCDE1234F1Z5',
  clientAddress: 'Market Yard, Bangalore',
  monthEndDate: '2026-06-30T00:00:00.000Z',
  gstDate: '2026-07-05T00:00:00.000Z',
  billDate: '2026-07-01T00:00:00.000Z',
  billMonth: '2026-06',
  createdBy: 'admin'
});
```

### Configuring Monthly Inward Charge

```typescript
import { billingConfigService } from '@/lib/services/billing-config.service';

// Change monthly inward charge
billingConfigService.setMonthlyInwardCharge(500);

// Add custom charge
billingConfigService.setCharge({
  type: 'other',
  name: 'Cold Storage Fee',
  amount: 100,
  isPercentage: false,
  appliesTo: 'all',
  priority: 10
});
```

### Validation Before Billing

```typescript
import { billingValidationService } from '@/lib/services/billing-validation.service';

// Validate customer rates
const validation = billingValidationService.validateCustomerRates(
  customerRates,
  itemDescriptions
);

if (!validation.isValid) {
  console.error('Validation errors:', validation.errors);
  // Handle errors
}
```

## Data Flow

```
User Input (Client, Dates)
↓
Billing Parameter Validation
↓
Fetch Customer Rates
↓
Validate Rates Exist
↓
Fetch Inward/Outward Vouchers
↓
Calculate Stock Balances (per inward)
↓
Validate Stock Balances
↓
Validate Rates for All Items
↓
Calculate Amounts (per inward)
↓
Build Billing Context
↓
Calculate Additional Charges
↓
Calculate GST
↓
Calculate Net Amount with Rounding
↓
Convert to GeneratedBill
↓
Save to Firestore
```

## Backward Compatibility

The new engine maintains full backward compatibility:

- Same function signature as original `calculateBill()`
- Returns `GeneratedBill` type (with additional optional fields)
- Original `bill-calculator.ts` preserved
- Bill processing page updated to use new engine
- Print format updated to show new charge structure

## Decimal Precision

All monetary values follow the specified precision:
- Weight: 2 decimal places
- Amount: 2 decimal places
- GST: 2 decimal places
- Rounding: 2 decimal places

## Future Extensibility

The modular architecture allows easy addition of:

1. **Different Billing Formulas**
   - Add new calculation methods in `amount-calculation.service.ts`
   - Configure via billing config

2. **Per Chamber Charges**
   - Add charge type in `billing-config.service.ts`
   - Include chamber context in billing

3. **Daily Storage Charges**
   - Extend stock calculation to track days
   - Add daily rate calculation

4. **Different GST Slabs**
   - GST service already supports different rates
   - Configure per item or per customer

5. **Per Customer Rules**
   - Add customer-specific config
   - Override default charges

## Testing Recommendations

To test the billing engine:

1. **Test with sample data** using existing inward/outward vouchers
2. **Verify formula** matches manual calculations
3. **Test validation** with missing rates and zero RatePer
4. **Test charges** with and without monthly inward
5. **Test GST** with different rates
6. **Test rounding** edge cases
7. **Verify print format** matches manual bills

## Error Handling

The engine provides detailed error messages:

- **Missing Rates**: "Customer rate not found for item: XYZ"
- **Zero RatePer**: "RatePer is zero or empty for item: XYZ"
- **Negative Stock**: "Negative closing weight for inward: INV123"
- **Invalid Parameters**: "Bill month must be in format YYYY-MM"

All errors prevent bill generation to ensure data integrity.

## Performance Considerations

- Firestore queries are optimized with proper indexes
- Stock calculations use efficient Map lookups
- Validation happens early to fail fast
- Batch operations for Firestore writes

## Configuration

Default configuration can be modified in `billing-config.service.ts`:

```typescript
const DEFAULT_CONFIG: BillingConfiguration = {
  monthlyInwardCharge: 300,
  charges: [...],
  gstEnabled: true,
  roundOffEnabled: true
};
```

## Migration from Original

To migrate from the original bill calculator:

1. The new engine is already integrated in the bill processing page
2. Original `bill-calculator.ts` is preserved for reference
3. No data migration needed - uses same Firestore collections
4. Print format updated to support new charge structure
5. All existing bills remain compatible

## Support

For issues or questions:
1. Check browser console for detailed logging
2. Review validation errors for configuration issues
3. Verify customer rates are properly configured
4. Ensure inward/outward vouchers have correct data

/**
 * Billing Configuration Service
 * 
 * Manages configurable charges and billing settings.
 * This service allows future extensibility for adding new charge types
 * without modifying core billing logic.
 */

import type {
  BillingConfiguration,
  ChargeConfig,
  ChargeType,
  BillingContext,
  CalculatedCharge
} from '@/lib/types/billing';

/**
 * Default billing configuration
 */
const DEFAULT_CONFIG: BillingConfiguration = {
  monthlyInwardCharge: 300, // ₹300 per month if customer has inward
  charges: [
    {
      type: 'monthly_inward',
      name: 'Monthly Inward Charge',
      amount: 300,
      isPercentage: false,
      appliesTo: 'with_inward',
      priority: 1
    },
    {
      type: 'varai',
      name: 'Varai',
      amount: 0,
      isPercentage: false,
      appliesTo: 'all',
      priority: 2
    },
    {
      type: 'loading',
      name: 'Loading',
      amount: 0,
      isPercentage: false,
      appliesTo: 'all',
      priority: 3
    },
    {
      type: 'unloading',
      name: 'Unloading',
      amount: 0,
      isPercentage: false,
      appliesTo: 'all',
      priority: 4
    }
  ],
  gstEnabled: true,
  defaultCGSTRate: 0, // Will be derived from item GST rate
  defaultSGSTRate: 0, // Will be derived from item GST rate
  roundOffEnabled: true
};

/**
 * Billing Configuration Service
 */
class BillingConfigService {
  private config: BillingConfiguration;

  constructor() {
    this.config = { ...DEFAULT_CONFIG };
  }

  /**
   * Get current billing configuration
   */
  getConfig(): BillingConfiguration {
    return { ...this.config };
  }

  /**
   * Update billing configuration
   */
  updateConfig(updates: Partial<BillingConfiguration>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Get charge by type
   */
  getCharge(type: ChargeType): ChargeConfig | undefined {
    return this.config.charges.find(c => c.type === type);
  }

  /**
   * Get all charges
   */
  getAllCharges(): ChargeConfig[] {
    return [...this.config.charges].sort((a, b) => a.priority - b.priority);
  }

  /**
   * Add or update a charge
   */
  setCharge(charge: ChargeConfig): void {
    const existingIndex = this.config.charges.findIndex(c => c.type === charge.type);
    if (existingIndex >= 0) {
      this.config.charges[existingIndex] = charge;
    } else {
      this.config.charges.push(charge);
    }
  }

  /**
   * Remove a charge
   */
  removeCharge(type: ChargeType): void {
    this.config.charges = this.config.charges.filter(c => c.type !== type);
  }

  /**
   * Calculate applicable charges based on context
   */
  calculateCharges(context: BillingContext, customCharges?: ChargeConfig[]): CalculatedCharge[] {
    console.log('[BILL-CALC] Calculating charges...');
    console.log('[BILL-CALC] Has Inward This Month:', context.hasInwardThisMonth ? 'YES' : 'NO');
    console.log('[BILL-CALC] Inward Count:', context.inwardCount);
    
    const chargesToUse = customCharges || this.config.charges;
    const calculatedCharges: CalculatedCharge[] = [];

    // Sort by priority
    const sortedCharges = [...chargesToUse].sort((a, b) => a.priority - b.priority);

    console.log('[BILL-CALC] Available charges:', sortedCharges.length);

    for (const charge of sortedCharges) {
      console.log('[BILL-CALC] Checking charge:', charge.name);
      console.log('[BILL-CALC]   Type:', charge.type);
      console.log('[BILL-CALC]   Applies To:', charge.appliesTo);
      
      // Check if charge applies to this context
      if (!this.chargeApplies(charge, context)) {
        console.log('[BILL-CALC]   Applied: NO');
        continue;
      }

      console.log('[BILL-CALC]   Applied: YES');

      // Calculate charge amount
      let amount = 0;

      if (charge.isPercentage) {
        // Percentage-based charge
        const baseAmount = this.getChargeBaseAmount(charge, context);
        amount = (baseAmount * charge.amount) / 100;
        console.log('[BILL-CALC]   Calculation: Percentage-based');
        console.log('[BILL-CALC]   Base Amount:', baseAmount);
        console.log('[BILL-CALC]   Percentage:', charge.amount);
      } else {
        // Fixed amount charge
        amount = charge.amount;
        console.log('[BILL-CALC]   Calculation: Fixed amount');
        console.log('[BILL-CALC]   Amount:', charge.amount);
      }

      console.log('[BILL-CALC]   Final Amount:', amount);

      calculatedCharges.push({
        type: charge.type,
        name: charge.name,
        amount,
        description: charge.isPercentage ? `${charge.amount}% of base` : ''
      });
    }

    if (calculatedCharges.length > 0) {
      console.log('[BILL-CALC] Monthly Entry Charge:');
      const monthlyCharge = calculatedCharges.find(c => c.type === 'monthly_inward');
      if (monthlyCharge) {
        console.log('[BILL-CALC]   Added Monthly Charge:', monthlyCharge.amount);
      }
    }

    return calculatedCharges;
  }

  /**
   * Check if a charge applies to the given context
   */
  private chargeApplies(charge: ChargeConfig, context: BillingContext): boolean {
    // Check custom condition if provided
    if (charge.condition && !charge.condition(context)) {
      return false;
    }

    // Check appliesTo rule
    switch (charge.appliesTo) {
      case 'all':
        return true;
      case 'with_inward':
        return context.hasInwardThisMonth;
      case 'with_outward':
        // Check if there were any outward transactions
        return context.totalIssuesWeight > 0;
      case 'condition':
        return charge.condition ? charge.condition(context) : false;
      default:
        return true;
    }
  }

  /**
   * Get base amount for percentage-based charges
   */
  private getChargeBaseAmount(charge: ChargeConfig, context: BillingContext): number {
    // For most percentage charges, base is gross amount
    // This can be extended for different charge types
    return context.grossAmount;
  }

  /**
   * Get monthly inward charge amount
   */
  getMonthlyInwardCharge(): number {
    return this.config.monthlyInwardCharge;
  }

  /**
   * Set monthly inward charge amount
   */
  setMonthlyInwardCharge(amount: number): void {
    this.config.monthlyInwardCharge = amount;
    
    // Update the monthly_inward charge config
    const monthlyCharge = this.getCharge('monthly_inward');
    if (monthlyCharge) {
      monthlyCharge.amount = amount;
    }
  }

  /**
   * Reset to default configuration
   */
  resetToDefaults(): void {
    this.config = { ...DEFAULT_CONFIG };
  }
}

// Export singleton instance
export const billingConfigService = new BillingConfigService();

/**
 * KALLAYI CAR SPA & AUTO CARE - FINANCE & ACCOUNTING BUSINESS LOGIC
 * Pure TypeScript functions converting Django Finance models (.save()) and logic.py
 * Zero-dependency, deterministic math matching backend/finance/models.py & logic.py.
 */

import {
  CommissionType,
  KhataTransactionType,
  ChemicalRecipe,
} from '@/types/database';
import { roundToTwoDecimals } from './booking';

// ==============================================================================
// 1. INVOICE PRICING & DERIVATION LOGIC (Invoice.save Parity)
// ==============================================================================

export interface InvoicePricingInput {
  basePrice?: number | string | null;
  finalPrice?: number | string | null;
  amount?: number | string | null;
  discountAmount?: number | string | null;
  discountPercentage?: number | string | null;
  booking?: {
    basePrice?: number | string | null;
    finalPrice?: number | string | null;
    discountAmount?: number | string | null;
    discountPercentage?: number | string | null;
    servicePackage?: { price?: number | string | null } | null;
  } | null;
}

export interface InvoicePricingOutput {
  basePrice: number;
  finalPrice: number;
  amount: number;
  discountAmount: number;
  discountPercentage: number;
}

/**
 * Exact replica of Django Invoice.save() mathematical rules:
 * 
 * 1. Initial resolution:
 *      if final_price > 0 -> amount = final_price
 *      else if amount > 0 and final_price <= 0 -> final_price = amount
 * 2. If booking is linked:
 *      if base_price <= 0 -> base_price = booking.base_price or booking.package.price or amount
 *      if booking.final_price > 0 -> final_price = booking.final_price; amount = final_price
 *      if booking.discount_amount -> discount_amount = booking.discount_amount
 *      if booking.discount_percentage -> discount_percentage = booking.discount_percentage
 * 3. If base_price > 0:
 *      if final_price <= 0 -> final_price = (amount > 0 ? amount : base_price)
 *      diff = base_price - final_price
 *      discount_amount = max(diff, 0)
 *      discount_percentage = round((discount_amount / base_price) * 100, 2)
 *      amount = final_price
 * 4. Else:
 *      discount_amount = 0
 *      discount_percentage = 0
 *      amount = (amount > 0 ? amount : final_price)
 */
export function deriveInvoicePricing(input: InvoicePricingInput): InvoicePricingOutput {
  let bPrice = input.basePrice != null ? roundToTwoDecimals(input.basePrice) : 0.00;
  let fPrice = input.finalPrice != null ? roundToTwoDecimals(input.finalPrice) : 0.00;
  let amt = input.amount != null ? roundToTwoDecimals(input.amount) : 0.00;
  let discAmt = input.discountAmount != null ? roundToTwoDecimals(input.discountAmount) : 0.00;
  let discPct = input.discountPercentage != null ? roundToTwoDecimals(input.discountPercentage) : 0.00;

  if (fPrice > 0.00) {
    amt = fPrice;
  } else if (amt > 0.00 && fPrice <= 0.00) {
    fPrice = amt;
  }

  // Booking linkage fallback
  if (input.booking) {
    const bk = input.booking;
    if (bPrice <= 0.00) {
      if (bk.basePrice != null && Number(bk.basePrice) > 0) {
        bPrice = roundToTwoDecimals(bk.basePrice);
      } else if (bk.servicePackage?.price != null && Number(bk.servicePackage.price) > 0) {
        bPrice = roundToTwoDecimals(bk.servicePackage.price);
      } else {
        bPrice = amt;
      }
    }

    if (bk.finalPrice != null && Number(bk.finalPrice) > 0.00) {
      fPrice = roundToTwoDecimals(bk.finalPrice);
      amt = fPrice;
    }

    if (bk.discountAmount != null && Number(bk.discountAmount) > 0.00) {
      discAmt = roundToTwoDecimals(bk.discountAmount);
    }
    if (bk.discountPercentage != null && Number(bk.discountPercentage) > 0.00) {
      discPct = roundToTwoDecimals(bk.discountPercentage);
    }
  }

  if (bPrice > 0.00) {
    if (fPrice <= 0.00) {
      fPrice = amt > 0.00 ? amt : bPrice;
    }

    const diff = bPrice - fPrice;
    discAmt = Math.max(diff, 0.00);
    discPct = roundToTwoDecimals((discAmt / bPrice) * 100.0);

    bPrice = roundToTwoDecimals(bPrice);
    fPrice = roundToTwoDecimals(fPrice);
    amt = fPrice;
    discAmt = roundToTwoDecimals(discAmt);
    discPct = roundToTwoDecimals(discPct);
  } else {
    bPrice = 0.00;
    fPrice = roundToTwoDecimals(fPrice);
    amt = amt > 0.00 ? amt : fPrice;
    discAmt = 0.00;
    discPct = 0.00;
  }

  return {
    basePrice: bPrice,
    finalPrice: fPrice,
    amount: amt,
    discountAmount: discAmt,
    discountPercentage: discPct,
  };
}

// ==============================================================================
// 2. SPLIT PAYMENT VALIDATION
// ==============================================================================

export interface SplitPaymentValidation {
  isValid: boolean;
  totalSplit: number;
  expectedAmount: number;
  difference: number;
  message?: string;
}

/**
 * Validates that cash + online + khata matches invoice amount within 2-decimal precision.
 */
export function validateSplitPayment(
  expectedAmount: number,
  splitCash?: number | null,
  splitOnline?: number | null,
  splitKhata?: number | null
): SplitPaymentValidation {
  const cash = Math.max(roundToTwoDecimals(splitCash ?? 0), 0);
  const online = Math.max(roundToTwoDecimals(splitOnline ?? 0), 0);
  const khata = Math.max(roundToTwoDecimals(splitKhata ?? 0), 0);

  const totalSplit = roundToTwoDecimals(cash + online + khata);
  const expected = roundToTwoDecimals(expectedAmount);
  const difference = roundToTwoDecimals(Math.abs(totalSplit - expected));

  const isValid = difference < 0.01;

  return {
    isValid,
    totalSplit,
    expectedAmount: expected,
    difference,
    message: isValid
      ? 'Split payments successfully balance.'
      : `Split amounts (₹${totalSplit.toFixed(2)}) do not match total invoice amount (₹${expected.toFixed(2)}). Difference: ₹${difference.toFixed(2)}`,
  };
}

// ==============================================================================
// 3. COMMISSION CALCULATION (finance/logic.py Parity)
// ==============================================================================

export interface StaffProfileCommissionContext {
  commission_type?: CommissionType | string | null;
  commission_rate?: number | string | null; // Percentage e.g. 15.00
  commission_amount?: number | string | null; // Fixed flat amount
  salary_amount?: number | string | null;
}

export interface ServiceCommissionRuleContext {
  flat_amount?: number | string | null;
  percentage?: number | string | null;
}

export interface BookingCommissionContext {
  final_price?: number | string | null;
  price?: number | string | null;
  service_package?: {
    price?: number | string | null;
    commission_rule?: ServiceCommissionRuleContext | null;
  } | null;
  commission_rule?: ServiceCommissionRuleContext | null;
}

/**
 * Calculates dynamic commission for a completed service matching calculate_staff_booking_commission:
 * 
 * 1. Resolves collected price (final_price -> price -> service_package.price).
 * 2. Priority 1: Service Package Commission Rule Override
 *    If flat_amount > 0 or percentage > 0:
 *      commission = flat_amount + (collected_price * (percentage / 100))
 * 3. Priority 2: Staff Profile Commission Config
 *    If commission_type === 'FIXED' -> returns commission_amount (or salary_amount fallback)
 *    If commission_type === 'PERCENTAGE' -> returns collected_price * (commission_rate / 100)
 */
export function calculateStaffBookingCommission(
  staffProfile: StaffProfileCommissionContext | null | undefined,
  bookingContext: BookingCommissionContext | null | undefined
): number {
  if (!bookingContext) return 0.00;

  // Resolve collected final price or package price
  let collectedPrice = 0.00;
  if (bookingContext.final_price != null && Number(bookingContext.final_price) > 0) {
    collectedPrice = roundToTwoDecimals(bookingContext.final_price);
  } else if (bookingContext.price != null && Number(bookingContext.price) > 0) {
    collectedPrice = roundToTwoDecimals(bookingContext.price);
  } else if (bookingContext.service_package?.price != null) {
    collectedPrice = roundToTwoDecimals(bookingContext.service_package.price);
  }

  // 1. Priority 1: Check if the package has a specific commission rule override
  const rule = bookingContext.commission_rule || bookingContext.service_package?.commission_rule;
  if (rule) {
    const flat = Number(rule.flat_amount || 0);
    const pct = Number(rule.percentage || 0);
    if (flat > 0 || pct > 0) {
      const calculatedFlat = roundToTwoDecimals(flat);
      const calculatedPct = roundToTwoDecimals(collectedPrice * (pct / 100.0));
      return roundToTwoDecimals(calculatedFlat + calculatedPct);
    }
  }

  // 2. Priority 2: Staff profile rate
  if (!staffProfile) return 0.00;

  const commType = staffProfile.commission_type || 'PERCENTAGE';
  if (commType === 'FIXED') {
    const fixedVal = Number(staffProfile.commission_amount || staffProfile.salary_amount || 0);
    return roundToTwoDecimals(fixedVal);
  } else {
    const rate = Number(staffProfile.commission_rate || 0);
    return roundToTwoDecimals(collectedPrice * (rate / 100.0));
  }
}

// ==============================================================================
// 4. DAILY PAYROLL AGGREGATION (process_payroll_event Parity)
// ==============================================================================

export interface PayrollAggregationInput {
  currentBaseWage?: number | string | null;
  currentCommissionEarned?: number | string | null;
  currentTipsEarned?: number | string | null;
  commissionToAdd?: number | string | null;
  tipsToAdd?: number | string | null;
  baseWageToAdd?: number | string | null;
}

export interface PayrollAggregationOutput {
  baseWage: number;
  commissionEarned: number;
  tipsEarned: number;
  totalDailyEarnings: number;
}

/**
 * Aggregates earnings for a staff member on a specific date.
 */
export function aggregateDailyPayroll(input: PayrollAggregationInput): PayrollAggregationOutput {
  const base = roundToTwoDecimals(Number(input.currentBaseWage || 0) + Number(input.baseWageToAdd || 0));
  const comm = roundToTwoDecimals(Number(input.currentCommissionEarned || 0) + Number(input.commissionToAdd || 0));
  const tips = roundToTwoDecimals(Number(input.currentTipsEarned || 0) + Number(input.tipsToAdd || 0));
  const total = roundToTwoDecimals(base + comm + tips);

  return {
    baseWage: base,
    commissionEarned: comm,
    tipsEarned: tips,
    totalDailyEarnings: total,
  };
}

// ==============================================================================
// 5. DIGITAL KHATA (CREDIT) DOUBLE-ENTRY SYSTEM
// ==============================================================================

export interface KhataBalanceResult {
  previousBalance: number;
  transactionAmount: number;
  newBalance: number;
  creditLimit: number;
  isCreditLimitExceeded: boolean;
  availableCredit: number;
}

/**
 * Pure calculation for Khata double-entry ledger:
 * - CHARGE: Customer purchases service on credit -> increases outstanding_balance.
 * - SETTLEMENT: Customer pays off debt -> decreases outstanding_balance.
 */
export function calculateKhataBalance(
  currentBalance: number,
  creditLimit: number,
  transactionType: KhataTransactionType,
  amount: number
): KhataBalanceResult {
  const prevBal = roundToTwoDecimals(currentBalance);
  const limit = roundToTwoDecimals(creditLimit);
  const amt = Math.max(roundToTwoDecimals(amount), 0);

  let newBal = prevBal;
  if (transactionType === 'CHARGE') {
    newBal = roundToTwoDecimals(prevBal + amt);
  } else if (transactionType === 'SETTLEMENT') {
    newBal = roundToTwoDecimals(Math.max(prevBal - amt, 0));
  }

  const isExceeded = newBal > limit;
  const availableCredit = roundToTwoDecimals(Math.max(limit - newBal, 0));

  return {
    previousBalance: prevBal,
    transactionAmount: amt,
    newBalance: newBal,
    creditLimit: limit,
    isCreditLimitExceeded: isExceeded,
    availableCredit,
  };
}

// ==============================================================================
// 6. CHEMICAL INVENTORY DEDUCTION (calculate_wash_cost Parity)
// ==============================================================================

export interface InventoryItemState {
  id: number;
  name: string;
  current_volume: number;
  cost_per_unit: number;
  uom: string;
  reorder_level: number;
}

export interface ChemicalUsageDeduction {
  inventoryItemId: number;
  chemicalName: string;
  amountUsed: number;
  previousVolume: number;
  newVolume: number;
  costIncurred: number;
  isBelowReorderLevel: boolean;
}

export interface ChemicalDeductionPlan {
  deductions: ChemicalUsageDeduction[];
  totalChemicalCost: number;
  unmatchedChemicals: string[];
}

/**
 * Calculates chemical deductions for a service recipe against active inventory items.
 */
export function planChemicalDeductions(
  recipe: ChemicalRecipe | null | undefined,
  inventoryItems: InventoryItemState[]
): ChemicalDeductionPlan {
  if (!recipe || Object.keys(recipe).length === 0) {
    return { deductions: [], totalChemicalCost: 0.00, unmatchedChemicals: [] };
  }

  const deductions: ChemicalUsageDeduction[] = [];
  const unmatchedChemicals: string[] = [];
  let totalCost = 0.00;

  for (const [chemicalName, rawAmount] of Object.entries(recipe)) {
    const amountNeeded = roundToTwoDecimals(rawAmount);
    if (amountNeeded <= 0) continue;

    // Case-insensitive match against inventory
    const match = inventoryItems.find(
      (item) => item.name.trim().toLowerCase() === chemicalName.trim().toLowerCase()
    );

    if (!match) {
      unmatchedChemicals.push(chemicalName);
      continue;
    }

    const prevVol = roundToTwoDecimals(match.current_volume);
    const newVol = roundToTwoDecimals(prevVol - amountNeeded);
    const cost = roundToTwoDecimals(amountNeeded * Number(match.cost_per_unit || 0));
    totalCost += cost;

    deductions.push({
      inventoryItemId: match.id,
      chemicalName: match.name,
      amountUsed: amountNeeded,
      previousVolume: prevVol,
      newVolume: newVol,
      costIncurred: cost,
      isBelowReorderLevel: newVol <= Number(match.reorder_level || 0),
    });
  }

  return {
    deductions,
    totalChemicalCost: roundToTwoDecimals(totalCost),
    unmatchedChemicals,
  };
}

// ==============================================================================
// 7. DEFERRED REVENUE AMORTIZATION (amortize_revenue Parity)
// ==============================================================================

export interface RevenueAmortizationResult {
  amountToRecognize: number;
  remainingBalance: number;
  isFullyRecognized: boolean;
}

/**
 * Calculates daily amortized revenue for subscriptions matching amortize_revenue().
 */
export function calculateDailyAmortization(
  remainingBalance: number,
  dailyAmortizationRate: number
): RevenueAmortizationResult {
  const remaining = Math.max(roundToTwoDecimals(remainingBalance), 0.00);
  const rate = Math.max(roundToTwoDecimals(dailyAmortizationRate), 0.00);

  const amountToRecognize = Math.min(rate, remaining);
  const newRemaining = roundToTwoDecimals(remaining - amountToRecognize);

  return {
    amountToRecognize: roundToTwoDecimals(amountToRecognize),
    remainingBalance: newRemaining,
    isFullyRecognized: newRemaining <= 0.00,
  };
}

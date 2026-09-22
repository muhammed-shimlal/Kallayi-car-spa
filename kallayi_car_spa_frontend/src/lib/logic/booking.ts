/**
 * KALLAYI CAR SPA & AUTO CARE - BOOKING BUSINESS LOGIC
 * Pure TypeScript functions converting Django Booking model hooks (.save())
 * Zero-dependency, deterministic math matching backend/bookings/models.py.
 */

import { VehicleType, BookingStatus } from '../../types/database';
import { normalizeVehicleType } from '../vehicleCatalog';

/**
 * Standard 2-decimal mathematical rounding matching Python's Decimal('0.01') precision.
 */
export function roundToTwoDecimals(value: number | string): number {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return 0.00;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export interface BookingPricingInput {
  timeSlot: string | Date;
  durationMinutes?: number;
  packagePrice?: number | string | null;
  basePrice?: number | string | null;
  finalPrice?: number | string | null;
  pointsRedeemed?: number;
}

export interface BookingPricingOutput {
  timeSlot: string; // ISO 8601 string
  endTime: string;  // ISO 8601 string
  basePrice: number;
  finalPrice: number;
  discountAmount: number;
  discountPercentage: number;
}

/**
 * Replicates Booking.save() pricing and duration derivation logic:
 * 
 * 1. end_time = time_slot + timedelta(minutes=duration_minutes)
 * 2. base_price strictly respects vehicle tier packagePrice if supplied, else basePrice.
 * 3. final_price strictly preserves vehicle tier price, adjusting basePrice if tier > flat base.
 * 4. Calculates discount amount and percentage when final_price < base_price.
 */
export function deriveBookingPricing(input: BookingPricingInput): BookingPricingOutput {
  const duration = Math.max(input.durationMinutes ?? 60, 0);
  
  // Date slot calculation
  const slotDate = typeof input.timeSlot === 'string' ? new Date(input.timeSlot) : new Date(input.timeSlot.getTime());
  const endDate = new Date(slotDate.getTime() + duration * 60 * 1000);
  
  const timeSlotIso = slotDate.toISOString();
  const endTimeIso = endDate.toISOString();

  // Parse numbers safely
  const pkgPrice = input.packagePrice != null ? roundToTwoDecimals(input.packagePrice) : 0;
  
  // Base price is the vehicle's specific tier price (if supplied > 0), else input.basePrice
  let bPrice = pkgPrice > 0 
    ? pkgPrice 
    : (input.basePrice != null && Number(input.basePrice) > 0 ? roundToTwoDecimals(input.basePrice) : 0);

  let fPrice = input.finalPrice != null && Number(input.finalPrice) > 0 
    ? roundToTwoDecimals(input.finalPrice) 
    : bPrice;

  let discountAmount = 0.00;
  let discountPercentage = 0.00;

  if (bPrice > 0) {
    if (fPrice < bPrice) {
      discountAmount = roundToTwoDecimals(bPrice - fPrice);
      discountPercentage = roundToTwoDecimals((discountAmount / bPrice) * 100.0);
    } else {
      // If final price exceeds base price (e.g. higher tier override), adjust basePrice to match
      bPrice = fPrice;
      discountAmount = 0.00;
      discountPercentage = 0.00;
    }
  } else {
    bPrice = fPrice;
    discountAmount = 0.00;
    discountPercentage = 0.00;
  }

  return {
    timeSlot: timeSlotIso,
    endTime: endTimeIso,
    basePrice: roundToTwoDecimals(bPrice),
    finalPrice: roundToTwoDecimals(fPrice),
    discountAmount: roundToTwoDecimals(discountAmount),
    discountPercentage: roundToTwoDecimals(discountPercentage),
  };
}

/**
 * Calculates end time for a given slot and duration in minutes.
 */
export function calculateBookingEndTime(timeSlot: string | Date, durationMinutes: number = 60): string {
  const slot = typeof timeSlot === 'string' ? new Date(timeSlot) : new Date(timeSlot.getTime());
  const end = new Date(slot.getTime() + Math.max(durationMinutes, 0) * 60 * 1000);
  return end.toISOString();
}

/**
 * Calculates coupon discount amount and adjusted final price.
 */
export function applyCouponDiscount(
  basePrice: number,
  discountPercentage: number
): { basePrice: number; finalPrice: number; discountAmount: number; discountPercentage: number } {
  const bPrice = Math.max(roundToTwoDecimals(basePrice), 0);
  const pct = Math.min(Math.max(roundToTwoDecimals(discountPercentage), 0), 100);
  
  const discountAmount = roundToTwoDecimals((bPrice * pct) / 100);
  const finalPrice = roundToTwoDecimals(Math.max(bPrice - discountAmount, 0));

  return {
    basePrice: bPrice,
    finalPrice,
    discountAmount,
    discountPercentage: pct,
  };
}

/**
 * Resolves the tiered price for a vehicle type from service package configuration.
 * Strictly checks exact canonical match using normalizeVehicleType (AUTO, BIKE, SUV, etc.).
 * Cascades: exact match -> semantic fallbacks (COMPACT_SUV <-> SUV, VAN <-> MUV) -> base price.
 */
export function resolvePackagePriceForVehicle(
  defaultPackagePrice: number | string,
  tieredPrices?: Array<{ vehicle_type: string; price: number | string }> | null,
  vehicleType?: VehicleType | string | null,
  strict: boolean = false
): number {
  const basePriceNum = Math.max(roundToTwoDecimals(Number(defaultPackagePrice) || 0), 0);
  if (!vehicleType) {
    return basePriceNum;
  }

  const canonicalType = normalizeVehicleType(vehicleType);

  if (!tieredPrices || !Array.isArray(tieredPrices) || tieredPrices.length === 0) {
    return strict ? 0 : basePriceNum;
  }

  // 1. Exact canonical vehicle type match
  const exactMatch = tieredPrices.find(
    (tp) => tp && tp.vehicle_type && normalizeVehicleType(tp.vehicle_type) === canonicalType
  );
  if (exactMatch && exactMatch.price != null && !isNaN(Number(exactMatch.price)) && Number(exactMatch.price) > 0) {
    return roundToTwoDecimals(Number(exactMatch.price));
  }

  // 2. Cascading fallbacks for Indian automotive segments
  const fallbackKeys: string[] = [];
  if (canonicalType === 'COMPACT_SUV') {
    fallbackKeys.push('SUV');
  } else if (canonicalType === 'SUV') {
    fallbackKeys.push('COMPACT_SUV');
  } else if (canonicalType === 'VAN') {
    fallbackKeys.push('MUV');
  } else if (canonicalType === 'MUV') {
    fallbackKeys.push('VAN');
  }

  for (const fallbackKey of fallbackKeys) {
    const fallbackMatch = tieredPrices.find(
      (tp) => tp && tp.vehicle_type && normalizeVehicleType(tp.vehicle_type) === fallbackKey
    );
    if (fallbackMatch && fallbackMatch.price != null && !isNaN(Number(fallbackMatch.price)) && Number(fallbackMatch.price) > 0) {
      return roundToTwoDecimals(Number(fallbackMatch.price));
    }
  }

  return strict ? 0 : basePriceNum;
}

/**
 * Checks if a booking transition is valid in the business state machine.
 */
export function isValidBookingStatusTransition(
  currentStatus: BookingStatus,
  nextStatus: BookingStatus
): boolean {
  if (currentStatus === nextStatus) return true;
  if (currentStatus === 'CANCELLED' || currentStatus === 'COMPLETED') return false;

  const validTransitions: Record<BookingStatus, BookingStatus[]> = {
    PENDING: ['CONFIRMED', 'CANCELLED', 'WAITING'],
    CONFIRMED: ['WAITING', 'IN_BAY_1', 'IN_BAY_2', 'IN_PROGRESS', 'CANCELLED'],
    WAITING: ['IN_BAY_1', 'IN_BAY_2', 'DETAILING', 'IN_PROGRESS', 'CANCELLED'],
    IN_BAY_1: ['DETAILING', 'READY', 'COMPLETED', 'CANCELLED'],
    IN_BAY_2: ['DETAILING', 'READY', 'COMPLETED', 'CANCELLED'],
    DETAILING: ['READY', 'COMPLETED', 'CANCELLED'],
    IN_PROGRESS: ['READY', 'COMPLETED', 'CANCELLED'],
    READY: ['COMPLETED', 'CANCELLED'],
    COMPLETED: [],
    CANCELLED: [],
  };

  return validTransitions[currentStatus]?.includes(nextStatus) ?? false;
}

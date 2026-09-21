/**
 * KALLAYI CAR SPA & AUTO CARE - BOOKING BUSINESS LOGIC
 * Pure TypeScript functions converting Django Booking model hooks (.save())
 * Zero-dependency, deterministic math matching backend/bookings/models.py.
 */

import { VehicleType, BookingStatus } from '@/types/database';

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
 * Replicates Booking.save() pricing and duration derivation logic from Django:
 * 
 * 1. end_time = time_slot + timedelta(minutes=duration_minutes)
 * 2. base_price defaults to package.price if not supplied or <= 0.
 * 3. final_price defaults to base_price if not supplied or <= 0.
 * 4. If base_price > 0:
 *      if final_price > base_price -> final_price = base_price
 *      diff = base_price - final_price
 *      discount_amount = max(diff, 0)
 *      discount_percentage = round((discount_amount / base_price) * 100, 2)
 * 5. If base_price <= 0:
 *      discount_amount = 0
 *      discount_percentage = 0
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
  let bPrice = input.basePrice != null && Number(input.basePrice) > 0 
    ? roundToTwoDecimals(input.basePrice) 
    : pkgPrice;

  let fPrice = input.finalPrice != null ? roundToTwoDecimals(input.finalPrice) : 0;

  // If final price is 0 or unassigned, default to base price
  if (fPrice <= 0 && bPrice > 0) {
    fPrice = bPrice;
  }

  let discountAmount = 0.00;
  let discountPercentage = 0.00;

  if (bPrice > 0) {
    // Final price cannot exceed base price in standard discount model
    if (fPrice > bPrice) {
      fPrice = bPrice;
    }

    const diff = bPrice - fPrice;
    discountAmount = Math.max(diff, 0.00);
    discountPercentage = roundToTwoDecimals((discountAmount / bPrice) * 100.0);
    
    bPrice = roundToTwoDecimals(bPrice);
    fPrice = roundToTwoDecimals(fPrice);
    discountAmount = roundToTwoDecimals(discountAmount);
  } else {
    bPrice = 0.00;
    fPrice = Math.max(fPrice, 0.00);
    discountAmount = 0.00;
    discountPercentage = 0.00;
  }

  return {
    timeSlot: timeSlotIso,
    endTime: endTimeIso,
    basePrice: bPrice,
    finalPrice: fPrice,
    discountAmount,
    discountPercentage,
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
 * Cascades: exact match -> semantic fallbacks (COMPACT_SUV <-> SUV, VAN <-> MUV, CAR -> SEDAN/HATCHBACK) -> base price.
 */
export function resolvePackagePriceForVehicle(
  defaultPackagePrice: number | string,
  tieredPrices?: Array<{ vehicle_type: string; price: number | string }> | null,
  vehicleType?: VehicleType | string | null
): number {
  const basePriceNum = Math.max(roundToTwoDecimals(Number(defaultPackagePrice) || 0), 0);
  if (!vehicleType || !tieredPrices || !Array.isArray(tieredPrices) || tieredPrices.length === 0) {
    return basePriceNum;
  }

  const normalizedType = String(vehicleType).trim().toUpperCase();

  // 1. Exact vehicle type match
  const exactMatch = tieredPrices.find(
    (tp) => tp && tp.vehicle_type && tp.vehicle_type.trim().toUpperCase() === normalizedType
  );
  if (exactMatch && Number(exactMatch.price) > 0) {
    return roundToTwoDecimals(Number(exactMatch.price));
  }

  // 2. Cascading fallbacks for Indian automotive segments
  const fallbackKeys: string[] = [];
  if (normalizedType === 'CAR') {
    fallbackKeys.push('SEDAN', 'HATCHBACK');
  } else if (normalizedType === 'COMPACT_SUV') {
    fallbackKeys.push('SUV');
  } else if (normalizedType === 'SUV') {
    fallbackKeys.push('COMPACT_SUV');
  } else if (normalizedType === 'VAN') {
    fallbackKeys.push('MUV');
  } else if (normalizedType === 'MUV') {
    fallbackKeys.push('VAN');
  }

  for (const fallbackKey of fallbackKeys) {
    const fallbackMatch = tieredPrices.find(
      (tp) => tp && tp.vehicle_type && tp.vehicle_type.trim().toUpperCase() === fallbackKey
    );
    if (fallbackMatch && Number(fallbackMatch.price) > 0) {
      return roundToTwoDecimals(Number(fallbackMatch.price));
    }
  }

  return basePriceNum;
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

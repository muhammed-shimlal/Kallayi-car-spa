/**
 * KALLAYI CAR SPA & AUTO CARE - EXPRESS WALKIN BOOKING ROUTE
 * Next.js 16 Route Handler: POST /api/bookings/express-walkin
 * 
 * Implements:
 * - Strict Zod validation with structured 400 error diagnostics & formatted console logging
 * - Automatic customer & vehicle resolution and graceful auto-creation
 * - Authenticated staff session extraction (attributing technician_id & staff cash collection)
 * - Vehicle-tiered catalog pricing and discount derivation
 * - Pending invoice generation with staff attribution
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseAdmin, getAuthUserFromRequest } from '@/lib/supabaseServer';
import { normalizePhone, getPhoneVariants } from '@/lib/phone';
import { normalizeVehicleType } from '@/lib/vehicleCatalog';
import { BookingStatus } from '@/types/database';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * REQUEST VALIDATION SCHEMA (Zod)
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const expressWalkinSchema = z.object({
  plate_number: z
    .string()
    .min(1, 'Vehicle plate number is required')
    .max(30, 'Plate number cannot exceed 30 characters'),
  customer_phone: z.string().optional().default(''),
  customer_name: z.string().optional().default('Walk-in Customer'),
  package_id: z.coerce
    .number()
    .positive('Service package ID must be a positive number'),
  make: z.string().optional().default('Standard'),
  model: z.string().optional().default('Vehicle'),
  vehicle_type: z.string().optional().default('HATCHBACK'),
  color: z.string().optional().default('White'),
  bay_assignment: z.string().optional().default('Bay 1'),
  notes: z.string().optional().default(''),
  discount_reason: z.string().optional().default(''),
  discount_amount: z.coerce.number().min(0, 'Discount amount cannot be negative').default(0),
  discount_percentage: z.coerce.number().min(0, 'Discount percentage cannot be negative').default(0),
  base_price: z.coerce.number().min(0, 'Base price cannot be negative').optional(),
  final_price: z.coerce.number().min(0, 'Final price cannot be negative').optional(),
  advance_amount: z.coerce.number().min(0, 'Advance amount cannot be negative').default(0),
  customer_id: z.string().nullable().optional(),
  vehicle_id: z.coerce.number().nullable().optional(),
  staff_id: z.string().nullable().optional(),
  technician_id: z.string().nullable().optional(),
  branch_id: z.union([z.string(), z.number()]).nullable().optional(),
  payment_method: z.string().optional().default('CASH'),
  is_paid: z.boolean().optional().default(false),
  time_slot: z.string().optional(),
});

export type ExpressWalkinInput = z.infer<typeof expressWalkinSchema>;

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const rawBody = await request.json().catch(() => ({}));

    // ─────────────────────────────────────────────────────────────────────────
    // 1. INPUT PREPROCESSING & ALIAS HARMONIZATION
    // ─────────────────────────────────────────────────────────────────────────
    const rawPlate =
      rawBody.plate_number ||
      rawBody.license_plate ||
      rawBody.licensePlate ||
      rawBody.plateNumber ||
      rawBody.vehicle_number ||
      rawBody.registration_number ||
      '';
    const cleanPlate = String(rawPlate).trim().toUpperCase();

    const rawPhone =
      rawBody.phone_number ||
      rawBody.customer_phone ||
      rawBody.phone ||
      rawBody.phoneNumber ||
      '';
    const cleanPhone = String(rawPhone).trim();

    const rawCustName =
      rawBody.customer_name ||
      rawBody.customerName ||
      rawBody.name ||
      '';
    const cleanCustName = String(rawCustName).trim() || 'Walk-in Customer';

    const rawPkgId =
      rawBody.package_id ??
      rawBody.service_package_id ??
      rawBody.servicePackageId ??
      rawBody.packageId ??
      rawBody.service_id;

    const toNumOrUndef = (val: any) => {
      if (val === undefined || val === null || val === '') return undefined;
      const n = Number(val);
      return isNaN(n) ? undefined : n;
    };

    const toNumOrDefault = (val: any, fallback = 0) => {
      if (val === undefined || val === null || val === '') return fallback;
      const n = Number(val);
      return isNaN(n) ? fallback : n;
    };

    const rawStaffId =
      rawBody.staff_id ||
      rawBody.staffId ||
      rawBody.technician_id ||
      rawBody.technicianId ||
      null;

    const rawBranchId = rawBody.branch_id || rawBody.branchId || null;
    const rawCustId = rawBody.customer_id || rawBody.customerId || null;
    const rawVehId = rawBody.vehicle_id || rawBody.vehicleId || null;
    const rawBay = rawBody.bay_assignment || rawBody.bayAssignment || 'Bay 1';

    const normalizedPayload = {
      plate_number: cleanPlate,
      customer_phone: cleanPhone,
      customer_name: cleanCustName,
      package_id: rawPkgId !== undefined && rawPkgId !== null && rawPkgId !== '' ? Number(rawPkgId) : undefined,
      make: String(rawBody.make || rawBody.brand || rawBody.vehicle_make || 'Standard').trim() || 'Standard',
      model: String(rawBody.model || rawBody.vehicle_model || 'Vehicle').trim() || 'Vehicle',
      vehicle_type: String(rawBody.vehicle_type || rawBody.vehicleType || rawBody.category || 'HATCHBACK').trim() || 'HATCHBACK',
      color: String(rawBody.color || 'White').trim() || 'White',
      bay_assignment: rawBay === 'AUTO' || rawBay === 'Auto' ? 'Bay 1' : String(rawBay).trim(),
      notes: String(rawBody.notes || rawBody.description || '').trim(),
      discount_reason: String(rawBody.discount_reason || rawBody.discountReason || '').trim(),
      discount_amount: toNumOrDefault(rawBody.discount_amount ?? rawBody.discountAmount, 0),
      discount_percentage: toNumOrDefault(rawBody.discount_percentage ?? rawBody.discountPercentage, 0),
      base_price: toNumOrUndef(rawBody.base_price ?? rawBody.basePrice),
      final_price: toNumOrUndef(rawBody.final_price ?? rawBody.finalPrice ?? rawBody.custom_price ?? rawBody.customPrice),
      advance_amount: toNumOrDefault(rawBody.advance_amount ?? rawBody.advanceAmount, 0),
      customer_id: rawCustId && rawCustId !== 'undefined' && rawCustId !== 'null' ? String(rawCustId).trim() : null,
      vehicle_id: toNumOrUndef(rawVehId) ?? null,
      staff_id: rawStaffId && rawStaffId !== 'undefined' && rawStaffId !== 'null' ? String(rawStaffId).trim() : null,
      technician_id: rawStaffId && rawStaffId !== 'undefined' && rawStaffId !== 'null' ? String(rawStaffId).trim() : null,
      branch_id: rawBranchId && rawBranchId !== 'undefined' && rawBranchId !== 'null' ? String(rawBranchId).trim() : null,
      payment_method: String(rawBody.payment_method || rawBody.paymentMethod || 'CASH').toUpperCase(),
      is_paid: Boolean(rawBody.is_paid ?? rawBody.isPaid ?? false),
      time_slot: rawBody.time_slot || new Date().toISOString(),
    };

    // ─────────────────────────────────────────────────────────────────────────
    // 2. SCHEMA VALIDATION & STRUCTURED ERROR HANDLING
    // ─────────────────────────────────────────────────────────────────────────
    const validationResult = expressWalkinSchema.safeParse(normalizedPayload);

    if (!validationResult.success) {
      const flattenedErrors = validationResult.error.flatten();
      console.error(
        '[Express Walkin Validation Error]:\n' + JSON.stringify(flattenedErrors, null, 2)
      );

      const firstErrorMessage =
        Object.values(flattenedErrors.fieldErrors).flat()[0] ||
        flattenedErrors.formErrors[0] ||
        'Invalid request data';

      return NextResponse.json(
        {
          success: false,
          error: `Validation error: ${firstErrorMessage}`,
          details: flattenedErrors.fieldErrors,
          formErrors: flattenedErrors.formErrors,
          issues: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const validated = validationResult.data;

    // ─────────────────────────────────────────────────────────────────────────
    // 3. AUTHENTICATED STAFF SESSION EXTRACTION
    // ─────────────────────────────────────────────────────────────────────────
    let authenticatedStaffId: string | null = null;
    try {
      const authUser = await getAuthUserFromRequest(request);
      if (authUser?.id) {
        authenticatedStaffId = authUser.id;
      }
    } catch (authErr) {
      console.warn('[Express Walkin Auth Notice]: Could not extract authUser from request', authErr);
    }

    // Fall back to client-provided staff_id if not extracted from headers/cookies
    if (!authenticatedStaffId && validated.staff_id) {
      authenticatedStaffId = validated.staff_id;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. CUSTOMER RECORD RESOLUTION & AUTO-CREATION
    // ─────────────────────────────────────────────────────────────────────────
    let customer_id: string | undefined = undefined;
    let customer_user_id: string | null = null;

    if (validated.customer_id && validated.customer_id.length > 5) {
      const { data: checkCust } = await supabase
        .from('customers')
        .select('id, user_id')
        .eq('id', validated.customer_id)
        .maybeSingle();
      if (checkCust?.id) {
        customer_id = checkCust.id;
        customer_user_id = checkCust.user_id || null;
      }
    }

    if (!customer_id && validated.customer_phone) {
      const canonicalPhone = normalizePhone(validated.customer_phone);
      const { variants } = getPhoneVariants(validated.customer_phone);
      const searchPhones = Array.from(
        new Set([validated.customer_phone, canonicalPhone, ...(variants || [])])
      ).filter(Boolean);

      const { data: existingCust } = await supabase
        .from('customers')
        .select('id, name, phone_number, user_id')
        .in('phone_number', searchPhones)
        .limit(1)
        .maybeSingle();

      if (existingCust?.id) {
        customer_id = existingCust.id;
        customer_user_id = existingCust.user_id || null;
        if (
          validated.customer_name &&
          validated.customer_name !== 'Walk-in Customer' &&
          validated.customer_name !== 'Walk-In Customer' &&
          (!existingCust.name || existingCust.name === 'Guest Customer' || existingCust.name === 'Walk-in Customer')
        ) {
          await supabase
            .from('customers')
            .update({ name: validated.customer_name, updated_at: new Date().toISOString() })
            .eq('id', existingCust.id);
        }
      } else {
        const { data: newCust, error: custErr } = await supabase
          .from('customers')
          .insert({
            user_id: null,
            name: validated.customer_name || 'Walk-in Customer',
            phone_number: canonicalPhone || validated.customer_phone,
            address: '',
            loyalty_points: 0,
            outstanding_balance: 0.0,
            credit_limit: 5000.0,
          })
          .select('id, user_id')
          .maybeSingle();

        if (newCust?.id) {
          customer_id = newCust.id;
          customer_user_id = newCust.user_id || null;
        } else {
          if (custErr) console.warn('[Express Walkin Customer Insert Notice]:', custErr.message);
          // Retry find in case of unique race condition
          const { data: retryCust } = await supabase
            .from('customers')
            .select('id, user_id')
            .in('phone_number', searchPhones)
            .limit(1)
            .maybeSingle();
          if (retryCust?.id) {
            customer_id = retryCust.id;
            customer_user_id = retryCust.user_id || null;
          }
        }
      }
    }

    // Fallback: If still no customer_id, link to official walk-in counter customer
    if (!customer_id) {
      const guestPhone = '+919999999999';
      const { data: defaultCustList } = await supabase
        .from('customers')
        .select('id, user_id')
        .eq('phone_number', guestPhone)
        .limit(1);

      if (defaultCustList && defaultCustList.length > 0) {
        customer_id = defaultCustList[0].id;
        customer_user_id = defaultCustList[0].user_id || null;
      } else {
        const { data: newWalkinCust } = await supabase
          .from('customers')
          .insert({
            user_id: null,
            name: validated.customer_name || 'Walk-in Customer',
            phone_number: guestPhone,
            address: '',
            loyalty_points: 0,
            outstanding_balance: 0.0,
            credit_limit: 5000.0,
          })
          .select('id, user_id')
          .maybeSingle();

        if (newWalkinCust?.id) {
          customer_id = newWalkinCust.id;
          customer_user_id = newWalkinCust.user_id || null;
        } else {
          const { data: anyCust } = await supabase
            .from('customers')
            .select('id, user_id')
            .limit(1)
            .maybeSingle();
          customer_id = anyCust?.id;
          customer_user_id = anyCust?.user_id || null;
        }
      }
    }

    if (!customer_id) {
      return NextResponse.json(
        { success: false, error: 'Failed to resolve or create customer record for booking.' },
        { status: 400 }
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. VEHICLE RECORD RESOLUTION & AUTO-CREATION
    // ─────────────────────────────────────────────────────────────────────────
    const DB_ALLOWED_VEHICLE_TYPES = new Set([
      'HATCHBACK',
      'SEDAN',
      'SUV',
      'COMPACT_SUV',
      'MUV',
      'LUXURY',
      'BIKE',
      'AUTO',
      'VAN',
      'TRUCK',
      'CAR',
    ]);

    let resolvedVehicleType = normalizeVehicleType(validated.vehicle_type || 'HATCHBACK');
    if (!DB_ALLOWED_VEHICLE_TYPES.has(resolvedVehicleType) || resolvedVehicleType === 'ALL') {
      resolvedVehicleType = 'HATCHBACK';
    }

    let vehicleId: number | undefined = undefined;
    let vehicleInsertError: any = null;

    if (validated.vehicle_id && !isNaN(Number(validated.vehicle_id))) {
      const cleanNum = Number(validated.vehicle_id);
      const { data: checkVeh } = await supabase
        .from('customer_vehicles')
        .select('id, user_id')
        .eq('id', cleanNum)
        .maybeSingle();
      if (checkVeh?.id) {
        vehicleId = checkVeh.id;
        if (!checkVeh.user_id && customer_user_id) {
          await supabase
            .from('customer_vehicles')
            .update({ user_id: customer_user_id })
            .eq('id', vehicleId);
        }
      }
    }

    if (!vehicleId && validated.plate_number) {
      const cleanPlate = validated.plate_number.trim().toUpperCase();
      const alphanumericPlate = cleanPlate.replace(/[^A-Z0-9]/g, '');
      const searchPlates = Array.from(
        new Set([cleanPlate, alphanumericPlate])
      ).filter(Boolean);

      const { data: existingVehicles, error: searchErr } = await supabase
        .from('customer_vehicles')
        .select('id, plate_number, registration_number, user_id')
        .in('plate_number', searchPlates);

      if (searchErr) {
        console.warn('[Express Walkin Vehicle Search Notice]:', searchErr.message);
      }

      let foundVeh = existingVehicles && existingVehicles.length > 0 ? existingVehicles[0] : null;

      if (!foundVeh && searchPlates.length > 0) {
        const { data: regVehicles } = await supabase
          .from('customer_vehicles')
          .select('id, plate_number, registration_number, user_id')
          .in('registration_number', searchPlates);
        if (regVehicles && regVehicles.length > 0) {
          foundVeh = regVehicles[0];
        }
      }

      if (foundVeh) {
        vehicleId = foundVeh.id;
        if (!foundVeh.user_id && customer_user_id) {
          await supabase
            .from('customer_vehicles')
            .update({ user_id: customer_user_id })
            .eq('id', vehicleId);
        }
      } else {
        if (alphanumericPlate) {
          const { data: fuzzyVehicles } = await supabase
            .from('customer_vehicles')
            .select('id, user_id')
            .ilike('plate_number', `%${alphanumericPlate}%`)
            .limit(1);
          if (fuzzyVehicles && fuzzyVehicles.length > 0) {
            vehicleId = fuzzyVehicles[0].id;
            if (!fuzzyVehicles[0].user_id && customer_user_id) {
              await supabase
                .from('customer_vehicles')
                .update({ user_id: customer_user_id })
                .eq('id', vehicleId);
            }
          }
        }

        if (!vehicleId) {
          try {
            const { data: newVehicle, error: insertErr } = await supabase
              .from('customer_vehicles')
              .insert({
                plate_number: cleanPlate,
                registration_number: alphanumericPlate || cleanPlate,
                make: validated.make || 'Standard',
                model: validated.model || 'Vehicle',
                vehicle_type: resolvedVehicleType,
                color: validated.color || 'White',
                notes: validated.notes || '',
                user_id: customer_user_id || null,
              })
              .select('id')
              .maybeSingle();

            if (insertErr) {
              console.error('Vehicle resolution error:', insertErr);
              vehicleInsertError = insertErr;

              // Handle race condition or unique constraint (code 23505)
              if (
                insertErr.code === '23505' ||
                insertErr.message?.includes('unique') ||
                insertErr.message?.includes('duplicate')
              ) {
                const { data: retryVehicles } = await supabase
                  .from('customer_vehicles')
                  .select('id, user_id')
                  .or(`plate_number.ilike.%${cleanPlate}%,registration_number.ilike.%${cleanPlate}%`)
                  .limit(1)
                  .maybeSingle();
                if (retryVehicles?.id) {
                  vehicleId = retryVehicles.id;
                  vehicleInsertError = null;
                  if (!retryVehicles.user_id && customer_user_id) {
                    await supabase
                      .from('customer_vehicles')
                      .update({ user_id: customer_user_id })
                      .eq('id', vehicleId);
                  }
                }
              }
            } else if (newVehicle?.id) {
              vehicleId = newVehicle.id;
            }
          } catch (err: any) {
            console.error('Vehicle resolution error:', err);
            vehicleInsertError = err;
          }
        }
      }
    }

    if (!vehicleId) {
      const detailedReason = vehicleInsertError
        ? (vehicleInsertError.message || vehicleInsertError.details || JSON.stringify(vehicleInsertError))
        : 'Could not create or find vehicle record in database';
      console.error(`[Express Walkin Error] Failed to resolve or create vehicle record for plate "${validated.plate_number}":`, vehicleInsertError);
      return NextResponse.json(
        {
          success: false,
          error: `Failed to resolve or create vehicle record for plate: "${validated.plate_number}". ${detailedReason}`.trim(),
          details: vehicleInsertError || null,
        },
        { status: 400 }
      );
    }

    const vehicle_id = Number(vehicleId);

    // ─────────────────────────────────────────────────────────────────────────
    // 6. PRICING RESOLUTION & TIERED MATRIX CHECK
    // ─────────────────────────────────────────────────────────────────────────
    let calculatedBasePrice = validated.base_price ?? 0;
    let pkgDuration = 45;

    if (validated.package_id) {
      const { data: pkg } = await supabase
        .from('service_packages')
        .select('*')
        .eq('id', validated.package_id)
        .single();

      if (pkg) {
        calculatedBasePrice = Number(pkg.price);
        pkgDuration = pkg.duration_minutes ?? 45;

        // Check vehicle-tiered price
        const { data: veh } = await supabase
          .from('customer_vehicles')
          .select('vehicle_type')
          .eq('id', vehicle_id)
          .maybeSingle();

        if (veh?.vehicle_type) {
          const canonicalVType = normalizeVehicleType(veh.vehicle_type);
          const { data: allTiers } = await supabase
            .from('service_package_prices')
            .select('*')
            .eq('package_id', validated.package_id);

          const matchingTier = (allTiers || []).find(
            (t: any) => t.vehicle_type && normalizeVehicleType(t.vehicle_type) === canonicalVType
          );

          if (matchingTier && matchingTier.price != null && !isNaN(Number(matchingTier.price))) {
            calculatedBasePrice = Number(matchingTier.price);
            if (matchingTier.estimated_time_minutes) {
              pkgDuration = Number(matchingTier.estimated_time_minutes);
            }
          }
        }
      }
    }

    let calculatedFinalPrice = calculatedBasePrice;
    if (validated.final_price !== undefined && validated.final_price > 0) {
      calculatedFinalPrice = validated.final_price;
    } else if (validated.discount_amount > 0) {
      calculatedFinalPrice = Math.max(0, calculatedBasePrice - validated.discount_amount);
    }

    const calculatedDiscountAmount = Math.max(0, calculatedBasePrice - calculatedFinalPrice);
    const calculatedDiscountPct =
      calculatedBasePrice > 0
        ? Number(((calculatedDiscountAmount / calculatedBasePrice) * 100).toFixed(2))
        : 0;

    const timeSlot = validated.time_slot || new Date().toISOString();
    const endTime = new Date(Date.now() + pkgDuration * 60 * 1000).toISOString();

    // ─────────────────────────────────────────────────────────────────────────
    // 7. BOOKING RECORD INSERTION
    // ─────────────────────────────────────────────────────────────────────────
    const insertPayload: any = {
      customer_id,
      vehicle_id,
      technician_id: authenticatedStaffId,
      service_package_id: validated.package_id,
      time_slot: timeSlot,
      end_time: endTime,
      status: 'WAITING' as BookingStatus,
      bay_assignment:
        validated.bay_assignment === 'AUTO' || validated.bay_assignment === 'Auto'
          ? 'Bay 1'
          : validated.bay_assignment,
      points_redeemed: 0,
      base_price: calculatedBasePrice,
      final_price: calculatedFinalPrice,
      discount_amount: calculatedDiscountAmount,
      discount_percentage: calculatedDiscountPct,
      discount_reason: validated.discount_reason || null,
      address: 'Counter Walk-in',
      latitude: 0.0,
      longitude: 0.0,
    };

    let { data: newBooking, error: insertError } = await supabase
      .from('bookings')
      .insert(insertPayload)
      .select(`
        *,
        customer:customers(*),
        vehicle:customer_vehicles(*),
        service_package:service_packages(*)
      `)
      .single();

    // Schema fallback if discount_reason column is missing in legacy schema
    if (
      insertError &&
      (insertError.message?.includes('discount_reason') ||
        insertError.code === '42703' ||
        insertError.code === 'PGRST204')
    ) {
      console.warn('[Express Walkin Fallback] Retrying booking insert without discount_reason');
      const safePayload = { ...insertPayload };
      delete safePayload.discount_reason;
      const retryResult = await supabase
        .from('bookings')
        .insert(safePayload)
        .select(`
          *,
          customer:customers(*),
          vehicle:customer_vehicles(*),
          service_package:service_packages(*)
        `)
        .single();
      newBooking = retryResult.data;
      insertError = retryResult.error;
    }

    if (insertError || !newBooking) {
      console.error('[Express Walkin Booking Insert Error]:', insertError);
      return NextResponse.json(
        { success: false, error: insertError?.message || 'Failed to create walk-in booking' },
        { status: 500 }
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 8. CORRESPONDING PENDING INVOICE GENERATION
    // ─────────────────────────────────────────────────────────────────────────
    try {
      const invoicePayload: any = {
        booking_id: newBooking.id,
        amount: calculatedFinalPrice,
        base_price: calculatedBasePrice,
        final_price: calculatedFinalPrice,
        discount_amount: calculatedDiscountAmount,
        discount_percentage: calculatedDiscountPct,
        discount_reason: validated.discount_reason || null,
        payment_method: validated.payment_method || 'CASH',
        collector_type: 'STAFF',
        cash_collected_by_staff: authenticatedStaffId,
        is_paid: validated.is_paid || false,
        split_cash:
          validated.payment_method === 'CASH' && validated.is_paid ? calculatedFinalPrice : 0,
        split_online: 0,
        split_khata: 0,
      };

      const { error: invErr } = await supabase.from('invoices').insert(invoicePayload as any);
      if (invErr) {
        // Fallback retry without cash collection attribution columns if legacy DB
        if (invErr.message?.includes('cash_collected_by_staff') || invErr.code === '42703') {
          delete invoicePayload.cash_collected_by_staff;
          delete invoicePayload.collector_type;
          delete invoicePayload.discount_reason;
          await supabase.from('invoices').insert(invoicePayload as any);
        }
      }
    } catch (invErr) {
      console.warn('[Express Walkin Invoice Warning]:', invErr);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Walk-in booking created successfully.',
        booking_id: newBooking.id,
        booking: newBooking,
        data: newBooking,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error('[Express Walkin Exception]:', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

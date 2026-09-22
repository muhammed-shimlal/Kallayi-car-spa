/**
 * KALLAYI CAR SPA & AUTO CARE - SINGLE BOOKING API ROUTE
 * Next.js 16 Route Handler: GET & PATCH /api/bookings/[id]
 * Handles Live Bay Status Transitions, Chemical Deductions, Payroll Aggregation & WhatsApp Triggers.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getAuthUserFromRequest } from '@/lib/supabaseServer';
import { BookingRow, BookingStatus, ChemicalRecipe } from '@/types/database';
import {
  planChemicalDeductions,
  calculateStaffBookingCommission,
  aggregateDailyPayroll,
} from '@/lib/logic/finance';
import { WhatsAppService } from '@/lib/services/whatsapp';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface RouteContext {
  params: Promise<{ id: string }> | { id: string };
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const authUser = await getAuthUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    const params = await context.params;
    const bookingId = parseInt(params.id, 10);

    if (isNaN(bookingId)) {
      return NextResponse.json({ success: false, error: 'Invalid booking ID' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        *,
        customer:customers(*),
        vehicle:customer_vehicles(*),
        service_package:service_packages(
          *,
          commission_rule:commission_rules(*),
          tiered_prices:service_package_prices(*)
        ),
        invoice:invoices(*)
      `)
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
    }

    // STRICT CUSTOMER DATA ISOLATION
    const userRole = (authUser.user_metadata?.role || '').toUpperCase();
    const isStaffOrAdmin = ['ADMIN', 'MANAGER', 'WASHER', 'TECHNICIAN', 'DRIVER'].includes(userRole);

    if (!isStaffOrAdmin) {
      const isOwner =
        booking.customer?.user_id === authUser.id ||
        (authUser.phone && booking.customer?.phone_number && booking.customer.phone_number.includes(authUser.phone.replace(/\D/g, '')));

      if (!isOwner) {
        return NextResponse.json(
          { success: false, error: 'Forbidden. You do not have permission to view this booking.' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({ success: true, data: booking });
  } catch (err: unknown) {
    console.error('[Booking GET Error]:', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const params = await context.params;
    const bookingId = parseInt(params.id, 10);

    if (isNaN(bookingId)) {
      return NextResponse.json({ success: false, error: 'Invalid booking ID' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const payload = await request.json().catch(() => ({}));

    // 1. Fetch current booking record with joined relations
    const { data: currentBooking, error: fetchErr } = await supabase
      .from('bookings')
      .select(`
        *,
        customer:customers(*),
        vehicle:customer_vehicles(*),
        service_package:service_packages(
          *,
          commission_rule:commission_rules(*)
        )
      `)
      .eq('id', bookingId)
      .single();

    if (fetchErr || !currentBooking) {
      console.error('[Booking Fetch Error]:', fetchErr);
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
    }

    const rawBooking = currentBooking as unknown as {
      id: number;
      status: BookingStatus;
      bay_assignment: string | null;
      technician_id: string | null;
      final_price: number;
      customer?: { phone_number?: string; user_id?: string } | null;
      vehicle?: { plate_number?: string } | null;
      service_package?: {
        name?: string;
        price?: number;
        chemical_recipe?: ChemicalRecipe;
        commission_rule?: { flat_amount?: number; percentage?: number };
      } | null;
    };

    // 2. Robust technician_id Resolution
    let sanitizedTechnicianId: string | null = null;
    let hasTechnicianIdInPayload = false;

    if ('technician_id' in payload) {
      hasTechnicianIdInPayload = true;
      const rawTech = payload.technician_id;
      if (
        rawTech === null ||
        rawTech === undefined ||
        rawTech === '' ||
        rawTech === 'null' ||
        rawTech === 'undefined'
      ) {
        sanitizedTechnicianId = null;
      } else {
        const techStr = String(rawTech).trim();
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(techStr);

        if (isUUID) {
          // Check if this matches a staff profile (by profile ID or user_id)
          const { data: staffProfile } = await supabase
            .from('staff_profiles')
            .select('id, user_id')
            .or(`id.eq.${techStr},user_id.eq.${techStr}`)
            .maybeSingle();

          if (staffProfile?.user_id) {
            sanitizedTechnicianId = staffProfile.user_id;
          } else {
            sanitizedTechnicianId = techStr;
          }
        } else {
          // Not a UUID (e.g. phone number, numeric ID string, or name)
          const { data: staffProfile } = await supabase
            .from('staff_profiles')
            .select('id, user_id')
            .or(`phone_number.eq.${techStr}`)
            .maybeSingle();

          if (staffProfile?.user_id) {
            sanitizedTechnicianId = staffProfile.user_id;
          } else {
            sanitizedTechnicianId = null;
          }
        }
      }
    }

    const newStatus: BookingStatus | undefined = payload.status;
    const isStatusChanged = newStatus && newStatus !== rawBooking.status;

    // 3. Defensive Update Payload Preparation
    const updatePayload: Partial<BookingRow> = {};
    if ('status' in payload && payload.status !== undefined) updatePayload.status = payload.status;
    if ('bay_assignment' in payload) updatePayload.bay_assignment = payload.bay_assignment;
    if (hasTechnicianIdInPayload) updatePayload.technician_id = sanitizedTechnicianId;
    if ('service_package_id' in payload || 'package_id' in payload) {
      const pkgId = parseInt(String(payload.service_package_id || payload.package_id), 10);
      if (!isNaN(pkgId) && pkgId > 0) {
        updatePayload.service_package_id = pkgId;
      }
    }
    if ('base_price' in payload && payload.base_price !== undefined) {
      updatePayload.base_price = Number(payload.base_price) || 0;
    }
    if ('final_price' in payload && payload.final_price !== undefined) {
      updatePayload.final_price = Number(payload.final_price) || 0;
    }
    if ('start_time' in payload) updatePayload.start_time = payload.start_time;
    if ('end_time' in payload) updatePayload.end_time = payload.end_time;
    if ('points_redeemed' in payload) {
      updatePayload.points_redeemed = Number(payload.points_redeemed) || 0;
    }

    // 4. Perform Side Effects with Safe Failover (WhatsApp, Inventory, Commission)
    if (isStatusChanged && newStatus) {
      const customer = rawBooking.customer;
      const vehicle = rawBooking.vehicle;
      const pkg = rawBooking.service_package;

      const customerPhone = customer?.phone_number || '';
      const plateNumber = vehicle?.plate_number || 'Vehicle';
      const packageName = pkg?.name || 'Car Spa Wash';
      const finalPrice = Number(payload.final_price ?? rawBooking.final_price ?? 0);

      // A. WhatsApp Status Dispatch (Safe Failover)
      if (['IN_BAY_1', 'IN_BAY_2', 'DETAILING', 'IN_PROGRESS', 'READY'].includes(newStatus)) {
        const bayName =
          payload.bay_assignment ||
          rawBooking.bay_assignment ||
          (newStatus === 'IN_BAY_2' ? 'Bay 2' : 'Bay 1');

        try {
          await WhatsAppService.notifyStatusChange({
            bookingId,
            customerPhone,
            plateNumber,
            packageName,
            status: newStatus as 'IN_PROGRESS' | 'IN_BAY_1' | 'IN_BAY_2' | 'DETAILING' | 'READY',
            bayName,
            amount: finalPrice,
          });
        } catch (waErr) {
          console.warn('[WhatsApp Notification Failover]:', waErr);
        }
      }

      // B. On COMPLETED: Deduct chemical inventory & calculate technician payroll commission
      if (newStatus === 'COMPLETED' && rawBooking.status !== 'COMPLETED') {
        // --- 1. Chemical Inventory Deduction (Safe Failover) ---
        try {
          const chemicalRecipe = pkg?.chemical_recipe;
          if (chemicalRecipe && Object.keys(chemicalRecipe).length > 0) {
            const { data: allInventory } = await supabase.from('chemical_inventory').select('*');
            if (allInventory && allInventory.length > 0) {
              const deductionPlan = planChemicalDeductions(chemicalRecipe, allInventory);

              for (const item of deductionPlan.deductions) {
                await supabase
                  .from('chemical_inventory')
                  .update({ current_volume: item.newVolume })
                  .eq('id', item.inventoryItemId);

                await supabase.from('chemical_usage_logs').insert({
                  inventory_item_id: item.inventoryItemId,
                  booking_id: bookingId,
                  amount_used: item.amountUsed,
                });
              }
            }
          }
        } catch (chemErr) {
          console.error('[Chemical Deduction Error]:', chemErr);
        }

        // --- 2. Technician Commission & Daily Payroll Aggregation (Safe Failover) ---
        try {
          const techId = hasTechnicianIdInPayload
            ? sanitizedTechnicianId
            : rawBooking.technician_id;

          if (techId) {
            const { data: staffProfile } = await supabase
              .from('staff_profiles')
              .select('*')
              .eq('user_id', techId)
              .maybeSingle();

            if (staffProfile) {
              const commissionAmount = calculateStaffBookingCommission(staffProfile, {
                final_price: finalPrice,
                service_package: pkg,
              });

              if (commissionAmount > 0) {
                const todayDate = new Date().toISOString().split('T')[0];

                const { data: existingPayroll } = await supabase
                  .from('payroll_entries')
                  .select('*')
                  .eq('staff_user_id', techId)
                  .eq('date', todayDate)
                  .maybeSingle();

                const aggregated = aggregateDailyPayroll({
                  currentBaseWage: existingPayroll?.base_wage ?? 0,
                  currentCommissionEarned: existingPayroll?.commission_earned ?? 0,
                  currentTipsEarned: existingPayroll?.tips_earned ?? 0,
                  commissionToAdd: commissionAmount,
                });

                if (existingPayroll) {
                  await supabase
                    .from('payroll_entries')
                    .update({
                      commission_earned: aggregated.commissionEarned,
                    })
                    .eq('id', existingPayroll.id);
                } else {
                  await supabase.from('payroll_entries').insert({
                    staff_user_id: techId,
                    date: todayDate,
                    base_wage: 0.0,
                    commission_earned: aggregated.commissionEarned,
                    tips_earned: 0.0,
                    is_settled: false,
                  });
                }
              }
            }
          }
        } catch (commErr) {
          console.error('[Technician Commission Error]:', commErr);
        }
      }
    }

    // 5. Update the booking in Supabase
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update(updatePayload)
      .eq('id', bookingId)
      .select(`
        *,
        customer:customers(*),
        vehicle:customer_vehicles(*),
        service_package:service_packages(*)
      `)
      .single();

    if (updateError) {
      console.error('[Booking Update Error]:', updateError);
      return NextResponse.json({ success: false, error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Booking updated successfully.',
      data: updatedBooking,
      ...updatedBooking,
    });
  } catch (err: unknown) {
    console.error('[Booking PATCH Unhandled Error]:', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

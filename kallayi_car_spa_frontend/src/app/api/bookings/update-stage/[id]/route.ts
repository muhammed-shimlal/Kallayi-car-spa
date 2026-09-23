/**
 * KALLAYI CAR SPA & AUTO CARE - BOOKING STAGE UPDATE API ROUTE
 * Next.js 16 Route Handler: PATCH /api/bookings/update-stage/[id]
 * Handles queue stage progression (Waiting -> Bay 1/2 -> Ready -> Completed),
 * timestamps (start_time, end_time), and WhatsApp notifications.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';
import { BookingStatus, BookingRow } from '@/types/database';
import { WhatsAppService } from '@/lib/services/whatsapp';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface RouteContext {
  params: Promise<{ id: string }> | { id: string };
}

/**
 * Normalizes incoming frontend stage names to standard BookingStatus enum values.
 */
function normalizeStageStatus(rawStatus: string): { status: BookingStatus; defaultBay?: string } {
  const upper = rawStatus.toUpperCase().trim();

  switch (upper) {
    case 'WAITING':
    case 'IN_QUEUE':
    case 'QUEUE':
    case 'PENDING':
    case 'CONFIRMED':
      return { status: 'WAITING' };

    case 'WASHING':
    case 'WASH':
    case 'IN_BAY_1':
      return { status: 'IN_BAY_1', defaultBay: 'Bay 1' };

    case 'IN_BAY_2':
      return { status: 'IN_BAY_2', defaultBay: 'Bay 2' };

    case 'IN_PROGRESS':
      return { status: 'IN_PROGRESS' };

    case 'DETAILING':
      return { status: 'DETAILING' };

    case 'READY':
    case 'READY_FOR_PICKUP':
      return { status: 'READY' };

    case 'COMPLETED':
    case 'DELIVERED':
    case 'FINISHED':
      return { status: 'COMPLETED' };

    case 'CANCELLED':
      return { status: 'CANCELLED' };

    default:
      return { status: (upper as BookingStatus) || 'WAITING' };
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const rawId = resolvedParams?.id;
    const bookingId = parseInt(String(rawId), 10);

    if (isNaN(bookingId) || bookingId <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing booking ID.' },
        { status: 400 }
      );
    }

    const payload = await request.json().catch(() => ({}));

    // Extract stage/status from various possible payload keys
    const incomingStatus = String(
      payload.new_status ||
      payload.status ||
      payload.stage ||
      payload.target_stage ||
      ''
    );

    if (!incomingStatus) {
      return NextResponse.json(
        { success: false, error: 'new_status or status is required in request body.' },
        { status: 400 }
      );
    }

    const { status: targetStatus, defaultBay } = normalizeStageStatus(incomingStatus);
    const bayAssignment = payload.bay_assignment !== undefined
      ? payload.bay_assignment
      : (payload.bay !== undefined ? payload.bay : defaultBay);

    const supabase = getSupabaseAdmin();

    // 1. Fetch current booking state
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
      .maybeSingle();

    if (fetchErr || !currentBooking) {
      console.error(`[Update Stage] Booking #${bookingId} not found:`, fetchErr);
      return NextResponse.json(
        { success: false, error: `Booking #${bookingId} not found.` },
        { status: 404 }
      );
    }

    // 2. Build update payload with accurate timestamp transitions
    const nowIso = new Date().toISOString();
    const updatePayload: Partial<BookingRow> & Record<string, any> = {
      status: targetStatus,
    };

    if (bayAssignment !== undefined) {
      updatePayload.bay_assignment = bayAssignment;
    }

    // Start time tracking when entering wash bay
    const isEnteringBay = ['IN_BAY_1', 'IN_BAY_2', 'IN_PROGRESS', 'DETAILING'].includes(targetStatus);
    if (isEnteringBay && !currentBooking.start_time) {
      updatePayload.start_time = nowIso;
    }

    // End time tracking when wash is ready or completed
    const isFinishing = ['READY', 'COMPLETED'].includes(targetStatus);
    if (isFinishing) {
      updatePayload.end_time = nowIso;
    }

    // Optional technician assignment update
    const rawTechId = payload.assigned_technician_id || payload.technician_id;
    if (rawTechId) {
      updatePayload.technician_id = String(rawTechId);
    }

    // 3. Persist update in Supabase / PostgreSQL
    const { data: updatedBooking, error: updateErr } = await supabase
      .from('bookings')
      .update(updatePayload as any)
      .eq('id', bookingId)
      .select(`
        *,
        customer:customers(*),
        vehicle:customer_vehicles(*),
        service_package:service_packages(*)
      `)
      .single();

    if (updateErr || !updatedBooking) {
      console.error(`[Update Stage] Failed to update booking #${bookingId}:`, updateErr);
      return NextResponse.json(
        { success: false, error: updateErr?.message || 'Failed to update booking stage.' },
        { status: 500 }
      );
    }

    // 4. Safe Side Effects: WhatsApp Status Dispatch (Fire-and-Forget failover)
    const customerPhone = currentBooking.customer?.phone_number || '';
    const plateNumber = currentBooking.vehicle?.plate_number || 'Vehicle';
    const packageName = currentBooking.service_package?.name || 'Wash Service';

    if (['IN_BAY_1', 'IN_BAY_2', 'DETAILING', 'IN_PROGRESS', 'READY'].includes(targetStatus) && customerPhone) {
      const activeBay = bayAssignment || currentBooking.bay_assignment || 'Bay 1';
      WhatsAppService.notifyStatusChange({
        bookingId,
        customerPhone,
        plateNumber,
        packageName,
        status: targetStatus as 'IN_PROGRESS' | 'IN_BAY_1' | 'IN_BAY_2' | 'DETAILING' | 'READY',
        bayName: activeBay,
        amount: Number(currentBooking.final_price || currentBooking.base_price || 0),
      }).catch((waErr) => {
        console.warn('[WhatsApp Queue Stage Notification Warning]:', waErr?.message || waErr);
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: `Booking #${bookingId} stage updated to ${targetStatus}`,
        booking: updatedBooking,
        data: updatedBooking,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error('[Booking Update Stage Exception]:', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// Support POST alias for maximum client compatibility
export async function POST(request: NextRequest, context: RouteContext) {
  return PATCH(request, context);
}

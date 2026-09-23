/**
 * KALLAYI CAR SPA & AUTO CARE - FINISH TASK API ROUTE
 * Next.js 16 Route Handler: PATCH /api/bookings/task/[id]/finish
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';
import { WhatsAppService } from '@/lib/services/whatsapp';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface RouteContext {
  params: Promise<{ id: string }> | { id: string };
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const supabase = getSupabaseAdmin();
    const resolvedParams = await Promise.resolve(params);
    const bookingId = parseInt(resolvedParams.id, 10);

    if (isNaN(bookingId)) {
      return NextResponse.json({ success: false, error: 'Invalid booking ID' }, { status: 400 });
    }

    const { data: updated, error } = await supabase
      .from('bookings')
      .update({
        status: 'READY',
        end_time: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .select(`
        *,
        customer:customers(*),
        vehicle:customer_vehicles(*)
      `)
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Trigger customer WhatsApp ready for pickup alert asynchronously
    if (updated?.customer?.phone_number) {
      WhatsAppService.notifyStatusChange({
        bookingId: updated.id,
        customerPhone: updated.customer.phone_number,
        customerName: updated.customer.name || 'Valued Customer',
        plateNumber: updated.vehicle?.plate_number || 'Vehicle',
        status: 'READY',
        bayName: updated.bay_assignment || 'Bay 1',
        amount: Number(updated.final_price || updated.base_price || 0),
      }).catch((waErr: any) => {
        console.warn('[WhatsApp Task Finished Notification Warning]:', waErr?.message || waErr);
      });
    }

    return NextResponse.json({
      success: true,
      message: `Task #${bookingId} marked as ready`,
      data: updated,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

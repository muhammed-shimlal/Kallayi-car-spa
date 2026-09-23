/**
 * KALLAYI CAR SPA & AUTO CARE - START TASK API ROUTE
 * Next.js 16 Route Handler: PATCH /api/bookings/task/[id]/start
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getAuthUserFromRequest } from '@/lib/supabaseServer';

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

    const authUser = await getAuthUserFromRequest(request);

    const updatePayload: any = {
      status: 'IN_PROGRESS',
      start_time: new Date().toISOString(),
    };

    if (authUser?.id) {
      updatePayload.technician_id = authUser.id;
    }

    const { data: updated, error } = await supabase
      .from('bookings')
      .update(updatePayload)
      .eq('id', bookingId)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Task #${bookingId} started`,
      data: updated,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

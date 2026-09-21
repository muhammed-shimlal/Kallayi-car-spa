/**
 * KALLAYI CAR SPA & AUTO CARE - STAFF TOGGLE ACTIVE STATUS API
 * Next.js 16 Route Handler: POST /api/staff/directory/[id]/toggle_status
 * Toggles the is_active status of a staff member.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const cleanId = String(id || '').trim();

    if (!cleanId) {
      return NextResponse.json(
        { success: false, error: 'Staff ID is required.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // 1. Fetch current profile by UUID id or user_id
    const isNumeric = /^\d+$/.test(cleanId);
    let query = supabase.from('staff_profiles').select('*');

    if (isNumeric) {
      query = query.eq('id', cleanId);
    } else {
      query = query.or(`id.eq.${cleanId},user_id.eq.${cleanId}`);
    }

    const { data: profile, error: fetchErr } = await query.maybeSingle();

    if (fetchErr || !profile) {
      return NextResponse.json(
        { success: false, error: 'Staff profile not found.' },
        { status: 404 }
      );
    }

    const nextStatus = !profile.is_active;

    // 2. Update status
    const { data: updated, error: updateErr } = await supabase
      .from('staff_profiles')
      .update({ is_active: nextStatus })
      .eq('id', profile.id)
      .select('*')
      .single();

    if (updateErr || !updated) {
      return NextResponse.json(
        { success: false, error: `Failed to update status: ${updateErr?.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Staff member ${nextStatus ? 'activated' : 'deactivated'} successfully.`,
      is_active: nextStatus,
      data: updated,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[Staff Toggle Status Error]:', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

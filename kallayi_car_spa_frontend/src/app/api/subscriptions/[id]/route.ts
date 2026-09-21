/**
 * KALLAYI CAR SPA & AUTO CARE - INDIVIDUAL SUBSCRIPTION PLAN API
 * Next.js 16 Route Handler: GET, PATCH, DELETE /api/subscriptions/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getAuthUserFromRequest } from '@/lib/supabaseServer';
import { SubscriptionPlanRow } from '@/types/database';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const planId = parseInt(id, 10);
    const supabase = getSupabaseAdmin();

    if (isNaN(planId)) {
      return NextResponse.json({ success: false, error: 'Invalid plan ID.' }, { status: 400 });
    }

    const { data: plan, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (error || !plan) {
      return NextResponse.json({ success: false, error: 'Subscription plan not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: plan });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await context.params;
    const planId = parseInt(id, 10);
    const supabase = getSupabaseAdmin();

    if (isNaN(planId)) {
      return NextResponse.json({ success: false, error: 'Invalid plan ID.' }, { status: 400 });
    }

    // Verify Admin role
    const { data: staff } = await supabase
      .from('staff_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!staff || !['ADMIN', 'MANAGER'].includes(staff.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden: Admin access required.' }, { status: 403 });
    }

    const body = await request.json();
    const { name, price, interval_days, description } = body;

    const updates: Partial<SubscriptionPlanRow> = {};
    if (name !== undefined) updates.name = String(name).trim();
    if (price !== undefined) updates.price = Number(price);
    if (interval_days !== undefined) updates.interval_days = Number(interval_days);
    if (description !== undefined) updates.description = String(description).trim();

    const { data: updated, error: updateErr } = await supabase
      .from('subscription_plans')
      .update(updates)
      .eq('id', planId)
      .select('*')
      .single();

    if (updateErr) {
      return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await context.params;
    const planId = parseInt(id, 10);
    const supabase = getSupabaseAdmin();

    if (isNaN(planId)) {
      return NextResponse.json({ success: false, error: 'Invalid plan ID.' }, { status: 400 });
    }

    const { data: staff } = await supabase
      .from('staff_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!staff || !['ADMIN', 'MANAGER'].includes(staff.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden: Admin access required.' }, { status: 403 });
    }

    const { error: deleteErr } = await supabase
      .from('subscription_plans')
      .delete()
      .eq('id', planId);

    if (deleteErr) {
      return NextResponse.json({ success: false, error: deleteErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Subscription plan deleted.' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * KALLAYI CAR SPA & AUTO CARE - SUBSCRIPTION PLANS API
 * Next.js 16 Route Handler: GET, POST /api/subscriptions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getAuthUserFromRequest } from '@/lib/supabaseServer';

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data: plans, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('price', { ascending: true });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: plans || [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    // Verify Admin / Manager Role
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

    if (!name || price == null || isNaN(Number(price))) {
      return NextResponse.json(
        { success: false, error: 'Name and valid price are required.' },
        { status: 400 }
      );
    }

    const planRow = {
      name: String(name).trim(),
      price: Number(price),
      interval_days: Number(interval_days) || 30,
      description: description ? String(description).trim() : '',
    };

    const { data: created, error: insertErr } = await supabase
      .from('subscription_plans')
      .insert([planRow])
      .select('*')
      .single();

    if (insertErr) {
      return NextResponse.json({ success: false, error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

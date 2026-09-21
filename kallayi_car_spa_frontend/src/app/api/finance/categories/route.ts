/**
 * KALLAYI CAR SPA & AUTO CARE - REVENUE & EXPENSE CATEGORIES API
 * Next.js 16 Route Handler: GET, POST /api/finance/categories
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getAuthUserFromRequest } from '@/lib/supabaseServer';

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const [revRes, expRes] = await Promise.all([
      supabase.from('revenue_categories').select('*').order('id', { ascending: true }),
      supabase.from('expense_categories').select('*').order('id', { ascending: true }),
    ]);

    return NextResponse.json({
      success: true,
      revenue_categories: revRes.data || [],
      expense_categories: expRes.data || [],
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
    const { data: staff } = await supabase
      .from('staff_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!staff || !['ADMIN', 'MANAGER'].includes(staff.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden: Admin access required.' }, { status: 403 });
    }

    const body = await request.json();
    const { type, name, description } = body;

    if (!type || !name || !['revenue', 'expense'].includes(String(type).toLowerCase())) {
      return NextResponse.json(
        { success: false, error: 'Category type (revenue or expense) and name are required.' },
        { status: 400 }
      );
    }

    const tableName = String(type).toLowerCase() === 'revenue' ? 'revenue_categories' : 'expense_categories';

    const { data: created, error: insertErr } = await supabase
      .from(tableName as any)
      .insert([{
        name: String(name).trim(),
        description: description ? String(description).trim() : '',
      }])
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

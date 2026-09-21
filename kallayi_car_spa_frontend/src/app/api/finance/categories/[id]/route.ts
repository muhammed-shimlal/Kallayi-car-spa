/**
 * KALLAYI CAR SPA & AUTO CARE - INDIVIDUAL CATEGORY API
 * Next.js 16 Route Handler: PATCH, DELETE /api/finance/categories/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getAuthUserFromRequest } from '@/lib/supabaseServer';

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
    const catId = parseInt(id, 10);
    const supabase = getSupabaseAdmin();

    if (isNaN(catId)) {
      return NextResponse.json({ success: false, error: 'Invalid category ID.' }, { status: 400 });
    }

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

    const tableName = String(type).toLowerCase() === 'revenue' ? 'revenue_categories' : 'expense_categories';
    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = String(name).trim();
    if (description !== undefined) updates.description = String(description).trim();

    const { data: updated, error: updateErr } = await supabase
      .from(tableName as any)
      .update(updates as any)
      .eq('id', catId)
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
    const catId = parseInt(id, 10);
    const supabase = getSupabaseAdmin();

    if (isNaN(catId)) {
      return NextResponse.json({ success: false, error: 'Invalid category ID.' }, { status: 400 });
    }

    const { data: staff } = await supabase
      .from('staff_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!staff || !['ADMIN', 'MANAGER'].includes(staff.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden: Admin access required.' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const typeParam = searchParams.get('type') || 'expense';
    const tableName = typeParam.toLowerCase() === 'revenue' ? 'revenue_categories' : 'expense_categories';

    const { error: deleteErr } = await supabase
      .from(tableName)
      .delete()
      .eq('id', catId);

    if (deleteErr) {
      return NextResponse.json({ success: false, error: deleteErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Category deleted.' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

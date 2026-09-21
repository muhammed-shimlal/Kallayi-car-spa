/**
 * KALLAYI CAR SPA & AUTO CARE - EXPENSE CATEGORIES API ROUTE
 * Next.js 16 Route Handler: GET /api/finance/expense-categories & POST /api/finance/expense-categories
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data: categories, error } = await supabase
      .from('expense_categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: categories || [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();
    const { name, description = '' } = body;

    if (!name || String(name).trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Category name is required.' },
        { status: 400 }
      );
    }

    const { data: newCat, error } = await supabase
      .from('expense_categories')
      .insert({
        name: String(name).trim(),
        description: String(description).trim(),
      })
      .select('*')
      .single();

    if (error || !newCat) {
      return NextResponse.json(
        { success: false, error: error?.message || 'Failed to create category.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Category created successfully.',
      data: newCat,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

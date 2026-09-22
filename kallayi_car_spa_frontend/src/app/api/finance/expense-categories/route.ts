/**
 * KALLAYI CAR SPA & AUTO CARE - EXPENSE CATEGORIES API ROUTE
 * Next.js 16 Route Handler: GET /api/finance/expense-categories & POST /api/finance/expense-categories
 * Seeds and serves standard car wash expense categories, with custom category creation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const DEFAULT_CAR_WASH_CATEGORIES = [
  {
    name: '🧴 Wash Chemicals',
    description: 'Shampoo, Foam, Wax, Polish, Degreaser, Tire Shine',
    code: 'WASH_CHEMICALS',
  },
  {
    name: '👥 Salaries & Commission',
    description: 'Staff Wages, Daily Helper, Staff Advance',
    code: 'SALARIES_COMMISSION',
  },
  {
    name: '⚡ Electricity & Water',
    description: 'Electricity Bill, Water Tankers, KSEB',
    code: 'ELECTRICITY_WATER',
  },
  {
    name: '🏢 Rent & Maintenance',
    description: 'Shop Rent, Lease, Property Upkeep',
    code: 'RENT_MAINTENANCE',
  },
  {
    name: '🔧 Machinery & Tools',
    description: 'Pressure Washer Parts, Vacuum Repairs, Compressor Oil, Pipe/Nozzle replacement',
    code: 'MACHINERY_TOOLS',
  },
  {
    name: '🧽 Consumables',
    description: 'Microfiber Cloths, Brushes, Gloves, Spray Bottles',
    code: 'CONSUMABLES',
  },
  {
    name: '☕ Tea & Refreshments',
    description: 'Staff Tea/Snacks, Customer Refreshments',
    code: 'TEA_REFRESHMENTS',
  },
  {
    name: '📢 Marketing & Promo',
    description: 'Board, Banners, Social Media Ads',
    code: 'MARKETING_PROMO',
  },
  {
    name: '➕ Other',
    description: 'Manual custom category',
    code: 'OTHER',
  },
];

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    // 1. Fetch categories from Supabase
    const { data: existingCategories, error } = await supabase
      .from('expense_categories')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.warn('[Expense Categories DB Error]:', error.message);
    }

    // 2. If table is empty or missing defaults, auto-seed
    if (!existingCategories || existingCategories.length === 0) {
      try {
        const seedPayload = DEFAULT_CAR_WASH_CATEGORIES.map((cat) => ({
          name: cat.name,
          description: cat.description,
        }));

        const { data: inserted, error: seedErr } = await supabase
          .from('expense_categories')
          .insert(seedPayload)
          .select('*')
          .order('id', { ascending: true });

        if (!seedErr && inserted && inserted.length > 0) {
          return NextResponse.json({
            success: true,
            data: inserted,
            count: inserted.length,
          });
        }
      } catch (seedErr) {
        console.warn('[Expense Categories Auto-Seed Warning]:', seedErr);
      }

      // Safe fallback if DB insert failed
      return NextResponse.json({
        success: true,
        data: DEFAULT_CAR_WASH_CATEGORIES.map((cat, idx) => ({
          id: idx + 1,
          name: cat.name,
          description: cat.description,
          code: cat.code,
        })),
        count: DEFAULT_CAR_WASH_CATEGORIES.length,
      });
    }

    return NextResponse.json({
      success: true,
      data: existingCategories,
      count: existingCategories.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({
      success: true,
      data: DEFAULT_CAR_WASH_CATEGORIES.map((cat, idx) => ({
        id: idx + 1,
        name: cat.name,
        description: cat.description,
        code: cat.code,
      })),
      error: message,
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json().catch(() => ({}));
    const { name, description = '' } = body;

    if (!name || String(name).trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Category name is required.' },
        { status: 400 }
      );
    }

    const trimmedName = String(name).trim();

    // Check if category already exists
    const { data: existing } = await supabase
      .from('expense_categories')
      .select('*')
      .ilike('name', trimmedName)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        success: true,
        message: 'Category already exists.',
        data: existing,
      });
    }

    const { data: newCat, error } = await supabase
      .from('expense_categories')
      .insert({
        name: trimmedName,
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

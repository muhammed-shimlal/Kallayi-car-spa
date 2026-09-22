/**
 * KALLAYI CAR SPA & AUTO CARE - OUTSTANDING CREDIT DASHBOARD AGGREGATION ROUTE
 * Next.js 16 Route Handler: GET /api/finance/dashboard/outstanding_credit
 * Pure Supabase PostgreSQL aggregation with null safety.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('customers')
      .select('id, name, phone_number, outstanding_balance, credit_limit')
      .gt('outstanding_balance', 0)
      .order('outstanding_balance', { ascending: false });

    if (error) {
      console.error('[Outstanding Credit API Error]:', error);
      return NextResponse.json(
        {
          success: false,
          error: `Database error: ${error.message}`,
          total_outstanding: 0,
          debtor_count: 0,
          customers: [],
          results: [],
        },
        { status: 500 }
      );
    }

    const customers = data || [];
    const sum = customers.reduce(
      (acc, curr) => acc + (Number(curr.outstanding_balance) || 0),
      0
    );

    const totalOutstanding = Math.round(sum * 100) / 100;

    return NextResponse.json({
      success: true,
      total_outstanding: totalOutstanding,
      count: customers.length,
      debtor_count: customers.length,
      customers,
      results: customers, // Backward compatibility with Django paginator
    });
  } catch (err: unknown) {
    console.error('[Outstanding Credit API Exception]:', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json(
      {
        success: false,
        error: message,
        total_outstanding: 0,
        debtor_count: 0,
        customers: [],
        results: [],
      },
      { status: 500 }
    );
  }
}

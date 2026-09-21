/**
 * KALLAYI CAR SPA & AUTO CARE - BANK DEPOSITS & SAVINGS API
 * Next.js 16 Route Handler: GET & POST /api/finance/bank-deposits
 * Manages daily collection bank savings assets, weekly/monthly accumulations, and ledger history.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';

function getWeekMondayDateString(): string {
  const now = new Date();
  const day = now.getDay(); // 0 is Sunday
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split('T')[0];
}

function getMonthStartDateString(): string {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  return firstDay.toISOString().split('T')[0];
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { data: deposits, error } = await supabase
      .from('collection_banks')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    const list = deposits || [];
    const mondayStr = getWeekMondayDateString();
    const monthStartStr = getMonthStartDateString();

    let totalAllTime = 0;
    let totalThisMonth = 0;
    let totalThisWeek = 0;

    const history = list.map((item) => {
      const amt = Number(item.amount || 0);
      totalAllTime += amt;

      if (item.date >= monthStartStr) {
        totalThisMonth += amt;
      }
      if (item.date >= mondayStr) {
        totalThisWeek += amt;
      }

      return {
        id: item.id,
        date: item.date,
        amount: amt,
        notes: item.notes || 'Daily Reserved Savings Deposit',
        recorded_by_name: 'Admin Manager',
        created_at: item.created_at,
      };
    });

    return NextResponse.json({
      success: true,
      total_all_time: Math.round(totalAllTime * 100) / 100,
      total_this_month: Math.round(totalThisMonth * 100) / 100,
      total_this_week: Math.round(totalThisWeek * 100) / 100,
      history,
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

    const {
      amount,
      date = new Date().toISOString().split('T')[0],
      notes = 'Daily Reserved Savings Deposit',
      recorded_by_id = null,
    } = body;

    const numericAmount = parseFloat(String(amount));
    if (isNaN(numericAmount) || numericAmount < 0) {
      return NextResponse.json(
        { success: false, error: 'Deposit amount must be a valid non-negative number.' },
        { status: 400 }
      );
    }

    // Check if deposit record for this date already exists (date is unique in schema)
    const { data: existing } = await supabase
      .from('collection_banks')
      .select('*')
      .eq('date', date)
      .maybeSingle();

    if (existing) {
      const updatedAmount = Number(existing.amount || 0) + numericAmount;
      const mergedNotes = notes
        ? `${existing.notes ? existing.notes + ' | ' : ''}${notes}`
        : existing.notes;

      await supabase
        .from('collection_banks')
        .update({
          amount: Math.round(updatedAmount * 100) / 100,
          notes: mergedNotes,
        })
        .eq('id', existing.id);
    } else {
      await supabase.from('collection_banks').insert({
        date,
        amount: Math.round(numericAmount * 100) / 100,
        notes,
        recorded_by_id: recorded_by_id || null,
      });
    }

    // Re-fetch all deposits to calculate updated summary statistics
    const { data: allDeposits } = await supabase
      .from('collection_banks')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    const list = allDeposits || [];
    const mondayStr = getWeekMondayDateString();
    const monthStartStr = getMonthStartDateString();

    let totalAllTime = 0;
    let totalThisMonth = 0;
    let totalThisWeek = 0;

    const history = list.map((item) => {
      const amt = Number(item.amount || 0);
      totalAllTime += amt;

      if (item.date >= monthStartStr) {
        totalThisMonth += amt;
      }
      if (item.date >= mondayStr) {
        totalThisWeek += amt;
      }

      return {
        id: item.id,
        date: item.date,
        amount: amt,
        notes: item.notes || 'Daily Reserved Savings Deposit',
        recorded_by_name: 'Admin Manager',
        created_at: item.created_at,
      };
    });

    return NextResponse.json({
      success: true,
      message: `Bank deposit of ₹${numericAmount.toFixed(2)} recorded successfully.`,
      total_all_time: Math.round(totalAllTime * 100) / 100,
      total_this_month: Math.round(totalThisMonth * 100) / 100,
      total_this_week: Math.round(totalThisWeek * 100) / 100,
      history,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

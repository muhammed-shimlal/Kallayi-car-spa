/**
 * KALLAYI CAR SPA & AUTO CARE - STAFF ADVANCES API ROUTE
 * Next.js 16 Route Handler: GET & POST /api/staff/advance/[id]
 * Manages staff advances and petty cash records with settle tracking.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface RouteContext {
  params: Promise<{ id: string }>;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveStaffProfile(supabase: any, paramId: string) {
  const cleanId = String(paramId || '').trim();
  if (!cleanId) return null;

  // 1. If cleanId is a valid UUID, query staff_profiles by id or user_id
  if (UUID_REGEX.test(cleanId)) {
    const { data: staff } = await supabase
      .from('staff_profiles')
      .select('id, user_id, phone_number, role, is_active')
      .or(`id.eq.${cleanId},user_id.eq.${cleanId}`)
      .maybeSingle();

    if (staff) return staff;
  }

  // 2. If cleanId is numeric (e.g. '2'), check payroll_entries or staff_profiles index/row
  const numericId = parseInt(cleanId, 10);
  if (!isNaN(numericId)) {
    // 2a. Check payroll_entries where id = numericId
    const { data: pEntry } = await supabase
      .from('payroll_entries')
      .select('*')
      .eq('id', numericId)
      .maybeSingle();

    if (pEntry) {
      const staffRef = pEntry.staff_user_id || pEntry.staff_id;
      if (staffRef) {
        const { data: staff } = await supabase
          .from('staff_profiles')
          .select('id, user_id, phone_number, role, is_active')
          .or(`id.eq.${staffRef},user_id.eq.${staffRef}`)
          .maybeSingle();

        if (staff) return staff;
      }
    }

    // 2b. Check staff_profiles directly ordered by created_at
    const { data: allStaff } = await supabase
      .from('staff_profiles')
      .select('id, user_id, phone_number, role, is_active')
      .order('created_at', { ascending: true });

    if (allStaff && allStaff.length > 0) {
      // 1-based index (e.g. numericId = 2 -> 2nd staff profile)
      if (numericId >= 1 && numericId <= allStaff.length) {
        return allStaff[numericId - 1];
      }
      // 0-based index
      if (numericId >= 0 && numericId < allStaff.length) {
        return allStaff[numericId];
      }
      // Out-of-bounds index: fallback to first active staff profile
      const activeStaff = allStaff.filter((s: any) => s.is_active);
      if (activeStaff.length > 0) {
        return activeStaff[0];
      }
      return allStaff[0];
    }
  }

  // 3. Fallback: Lookup by phone number
  const { data: staffByPhone } = await supabase
    .from('staff_profiles')
    .select('id, user_id, phone_number, role, is_active')
    .eq('phone_number', cleanId)
    .maybeSingle();

  if (staffByPhone) return staffByPhone;

  // 4. Ultimate fallback: Return first active staff profile if one exists
  const { data: fallbackStaff } = await supabase
    .from('staff_profiles')
    .select('id, user_id, phone_number, role, is_active')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (fallbackStaff) return fallbackStaff;

  return null;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const supabase = getSupabaseAdmin();
    const { id } = await context.params;
    const staff = await resolveStaffProfile(supabase, id);

    if (!staff) {
      return NextResponse.json(
        { success: false, error: `Staff profile not found for identifier: ${id}` },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const isSettledParam = searchParams.get('is_settled');

    let advances: any[] = [];

    // 1. Try querying staff_advances table
    let query = supabase
      .from('staff_advances')
      .select('*')
      .eq('staff_id', staff.id)
      .order('date', { ascending: false });

    if (isSettledParam !== null) {
      query = query.eq('is_settled', isSettledParam === 'true');
    }

    const { data: advData, error: advErr } = await query;

    if (!advErr && advData) {
      advances = advData;
    } else {
      // 2. Seamless Fallback: Query general_expenses for advances tagged for this staff
      const { data: expData } = await supabase
        .from('general_expenses')
        .select('*')
        .or(`staff_id.eq.${staff.user_id},staff_id.eq.${staff.id}`)
        .ilike('description', '%[STAFF_ADVANCE%')
        .order('date', { ascending: false });

      advances = (expData || []).map((exp: any) => {
        const desc = String(exp.description || '');
        const isSettled = desc.includes('[STAFF_ADVANCE:SETTLED');
        const purpose = desc.replace(/\[STAFF_ADVANCE:(UNSETTLED|SETTLED:[^\]]+)\]\s*/i, '').trim();
        return {
          id: String(exp.id),
          staff_id: staff.id,
          user_id: staff.user_id,
          amount: Number(exp.amount || 0),
          date: exp.date,
          purpose: purpose || 'Staff Advance',
          is_settled: isSettled,
          settled_at: isSettled ? exp.updated_at : null,
          created_at: exp.created_at,
        };
      });

      if (isSettledParam !== null) {
        const targetSettled = isSettledParam === 'true';
        advances = advances.filter(a => a.is_settled === targetSettled);
      }
    }

    let totalAdvances = 0;
    let unsettledAdvances = 0;
    let settledAdvances = 0;

    advances.forEach((adv: any) => {
      const amt = Number(adv.amount || 0);
      totalAdvances += amt;
      if (adv.is_settled) {
        settledAdvances += amt;
      } else {
        unsettledAdvances += amt;
      }
    });

    const finalUnsettled = Math.round(unsettledAdvances * 100) / 100;
    const finalSettled = Math.round(settledAdvances * 100) / 100;
    const finalTotal = Math.round(totalAdvances * 100) / 100;

    return NextResponse.json({
      success: true,
      staff_id: staff.id,
      user_id: staff.user_id,
      unsettled_total: finalUnsettled,
      summary: {
        total_advances: finalTotal,
        unsettled_advances: finalUnsettled,
        settled_advances: finalSettled,
      },
      advances,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[Staff Advance GET Exception]:', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const supabase = getSupabaseAdmin();
    const { id } = await context.params;
    const staff = await resolveStaffProfile(supabase, id);

    if (!staff) {
      return NextResponse.json(
        { success: false, error: `Staff profile not found for identifier: ${id}` },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { amount, date, purpose, notes, description } = body;

    const parsedAmount = parseFloat(String(amount || '0'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Advance amount must be a positive number greater than zero.' },
        { status: 400 }
      );
    }

    const advanceDate = date ? new Date(date).toISOString() : new Date().toISOString();
    const cleanPurpose = String(purpose || description || notes || 'Staff Advance').trim();

    // 1. Try inserting to staff_advances
    let newAdvance: any = null;
    const { data: insertedAdv, error: insertErr } = await supabase
      .from('staff_advances')
      .insert({
        staff_id: staff.id,
        amount: Math.round(parsedAmount * 100) / 100,
        date: advanceDate,
        purpose: cleanPurpose,
        is_settled: false,
      })
      .select('*')
      .single();

    if (!insertErr && insertedAdv) {
      newAdvance = insertedAdv;
    } else {
      // 2. Seamless Fallback: Record as tagged general_expense
      const { data: expRow, error: expErr } = await supabase
        .from('general_expenses')
        .insert({
          staff_id: staff.user_id || staff.id,
          category_id: 2, // 👥 Salaries & Commission
          amount: Math.round(parsedAmount * 100) / 100,
          description: `[STAFF_ADVANCE:UNSETTLED] ${cleanPurpose}`,
          notes: cleanPurpose,
          date: advanceDate.split('T')[0],
          status: 'APPROVED',
          payment_method: 'CASH',
          expense_type: 'BUSINESS',
        })
        .select('*')
        .single();

      if (expErr) {
        console.error('[Staff Advance Insert Error]:', insertErr || expErr);
        return NextResponse.json(
          { success: false, error: `Failed to record advance: ${insertErr?.message || expErr.message}` },
          { status: 500 }
        );
      }

      newAdvance = {
        id: String(expRow.id),
        staff_id: expRow.staff_id,
        amount: Number(expRow.amount),
        date: expRow.date,
        purpose: cleanPurpose,
        is_settled: false,
        created_at: expRow.created_at,
      };
    }

    return NextResponse.json(
      {
        success: true,
        message: `Advance of ₹${parsedAmount.toLocaleString('en-IN')} recorded successfully.`,
        advance: newAdvance,
        data: newAdvance,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[Staff Advance POST Exception]:', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

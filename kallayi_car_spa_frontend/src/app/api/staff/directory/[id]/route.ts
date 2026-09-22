/**
 * KALLAYI CAR SPA & AUTO CARE - INDIVIDUAL STAFF MEMBER API ROUTE
 * Next.js 16 Route Handler: GET, PUT, PATCH, DELETE /api/staff/directory/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';
import { normalizePhone } from '@/lib/phone';
import { StaffProfileRow, StaffRole, SalaryType } from '@/types/database';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const supabase = getSupabaseAdmin();

    if (!id || id.trim() === '') {
      return NextResponse.json({ success: false, error: 'Invalid staff ID.' }, { status: 400 });
    }

    const cleanId = id.trim();

    const { data: staff, error } = await supabase
      .from('staff_profiles')
      .select('*')
      .or(`id.eq.${cleanId},user_id.eq.${cleanId}`)
      .single();

    if (error || !staff) {
      return NextResponse.json({ success: false, error: 'Staff member not found.' }, { status: 404 });
    }

    let name = `Staff (${staff.role})`;
    let email = '';
    try {
      const { data: authUser } = await supabase.auth.admin.getUserById(staff.user_id);
      if (authUser?.user) {
        email = authUser.user.email || '';
        const meta = authUser.user.user_metadata;
        name = meta?.full_name || meta?.name || `${meta?.first_name || ''} ${meta?.last_name || ''}`.trim() || email.split('@')[0] || name;
      }
    } catch {
      // Fallback
    }

    return NextResponse.json({
      id: staff.id,
      user_id: staff.user_id,
      name,
      first_name: name,
      email,
      phone_number: staff.phone_number || '',
      phone: staff.phone_number || '',
      role: staff.role,
      salary_type: staff.salary_type,
      salary_amount: Number(staff.salary_amount || 0),
      hourly_rate: Number(staff.hourly_rate || 0),
      base_salary: Number(staff.base_salary || 0),
      commission_percentage: Number(staff.commission_percentage ?? staff.commission_rate ?? 40),
      commission_rate: Number(staff.commission_percentage ?? staff.commission_rate ?? 40),
      commission_amount: Number(staff.commission_amount || 0),
      retained_balance: Number(staff.retained_balance || 0),
      is_active: staff.is_active,
      is_online: staff.is_online,
      joining_date: staff.joining_date,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleUpdateStaff(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleUpdateStaff(request, context);
}

async function handleUpdateStaff(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const supabase = getSupabaseAdmin();
    const body = await request.json();

    if (!id || id.trim() === '') {
      return NextResponse.json({ success: false, error: 'Invalid staff ID.' }, { status: 400 });
    }

    const cleanId = id.trim();

    const {
      first_name,
      name,
      phone_number,
      phone,
      role,
      salary_type,
      salary_amount,
      base_salary,
      hourly_rate,
      commission_percentage,
      commission_rate,
      commission_amount,
      retained_balance,
      is_active,
      is_online,
      joining_date,
    } = body;

    const updates: Partial<StaffProfileRow> = {};

    if (role !== undefined) updates.role = String(role).toUpperCase() as StaffRole;
    if (salary_type !== undefined) updates.salary_type = salary_type as SalaryType;
    if (salary_amount !== undefined || base_salary !== undefined) {
      const salVal = parseFloat(String(salary_amount || base_salary || '0')) || 0;
      updates.salary_amount = salVal;
      updates.base_salary = salVal;
    }
    if (hourly_rate !== undefined) updates.hourly_rate = parseFloat(String(hourly_rate)) || 0;
    if (commission_percentage !== undefined || commission_rate !== undefined) {
      const commVal = parseFloat(String(commission_percentage ?? commission_rate)) || 0;
      updates.commission_rate = commVal;
      (updates as any).commission_percentage = commVal;
    }
    if (commission_amount !== undefined) updates.commission_amount = parseFloat(String(commission_amount)) || 0;
    if (retained_balance !== undefined) {
      (updates as any).retained_balance = parseFloat(String(retained_balance)) || 0;
    }
    if (phone_number !== undefined || phone !== undefined) {
      updates.phone_number = normalizePhone(String(phone_number || phone));
    }
    if (is_active !== undefined) updates.is_active = is_active;
    if (is_online !== undefined) updates.is_online = is_online;
    if (joining_date !== undefined) updates.joining_date = joining_date;

    let { data: updated, error: updateErr } = await supabase
      .from('staff_profiles')
      .update(updates)
      .or(`id.eq.${cleanId},user_id.eq.${cleanId}`)
      .select('*')
      .single();

    if (updateErr) {
      // Fallback: If new columns are not yet in the DB table, retry with base columns
      const safeUpdates = { ...updates };
      delete (safeUpdates as any).commission_percentage;
      delete (safeUpdates as any).retained_balance;
      const retry = await supabase
        .from('staff_profiles')
        .update(safeUpdates)
        .or(`id.eq.${cleanId},user_id.eq.${cleanId}`)
        .select('*')
        .single();
      if (!retry.error && retry.data) {
        updated = retry.data;
        updateErr = null;
      }
    }

    if (updateErr || !updated) {
      return NextResponse.json(
        { success: false, error: `Failed to update staff member: ${updateErr?.message}` },
        { status: 500 }
      );
    }

    // Update user_metadata in auth if name is provided
    const newName = String(first_name || name || '').trim();
    if (newName && updated.user_id) {
      try {
        const { data: authUser } = await supabase.auth.admin.getUserById(updated.user_id);
        if (authUser?.user) {
          await supabase.auth.admin.updateUserById(updated.user_id, {
            user_metadata: {
              ...authUser.user.user_metadata,
              full_name: newName,
              first_name: newName.split(' ')[0],
              name: newName,
              role: updated.role,
            },
          });
        }
      } catch {
        // Continue
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Staff member updated successfully.',
      data: updated,
    });
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
    const { id } = await context.params;
    const supabase = getSupabaseAdmin();

    if (!id || id.trim() === '') {
      return NextResponse.json({ success: false, error: 'Invalid staff ID.' }, { status: 400 });
    }

    const cleanId = id.trim();

    const { error: delErr } = await supabase
      .from('staff_profiles')
      .delete()
      .or(`id.eq.${cleanId},user_id.eq.${cleanId}`);

    if (delErr) {
      return NextResponse.json(
        { success: false, error: `Failed to delete staff member: ${delErr.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Staff member deleted successfully.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}


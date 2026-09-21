/**
 * KALLAYI CAR SPA & AUTO CARE - STAFF DIRECTORY API ROUTE
 * Next.js 16 Route Handler: GET & POST /api/staff/directory
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';
import { getPhoneVariants } from '@/lib/services/whatsapp';
import { StaffRole, SalaryType } from '@/types/database';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);

    const isActiveParam = searchParams.get('is_active');
    const search = searchParams.get('search');

    let query = supabase.from('staff_profiles').select('*');

    if (isActiveParam !== null) {
      query = query.eq('is_active', isActiveParam === 'true');
    }

    const { data: staffList, error } = await query;

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    const list = (staffList || []) as any[];

    // Resolve Auth user details for names & emails
    const formatted = await Promise.all(
      list.map(async (s) => {
        let name = `Staff (${s.role})`;
        let email = '';
        try {
          const { data: authUser } = await supabase.auth.admin.getUserById(s.user_id);
          if (authUser?.user) {
            email = authUser.user.email || '';
            const meta = authUser.user.user_metadata;
            name =
              meta?.full_name ||
              meta?.name ||
              `${meta?.first_name || ''} ${meta?.last_name || ''}`.trim() ||
              email.split('@')[0] ||
              name;
          }
        } catch {
          // Fallback
        }

        return {
          id: s.id,
          user_id: s.user_id,
          name,
          first_name: name,
          email,
          phone_number: s.phone_number || '',
          phone: s.phone_number || '',
          role: s.role,
          salary_type: s.salary_type,
          salary_amount: Number(s.salary_amount || 0),
          hourly_rate: Number(s.hourly_rate || 0),
          base_salary: Number(s.base_salary || 0),
          commission_rate: Number(s.commission_rate || 0),
          commission_amount: Number(s.commission_amount || 0),
          is_active: s.is_active,
          is_online: s.is_online,
          joining_date: s.joining_date,
        };
      })
    );

    let results = formatted;
    if (search) {
      const q = search.toLowerCase();
      results = results.filter(
        (st) =>
          st.name.toLowerCase().includes(q) ||
          st.phone.includes(q) ||
          st.email.toLowerCase().includes(q) ||
          st.role.toLowerCase().includes(q)
      );
    }

    return NextResponse.json(results);
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
      first_name,
      name,
      email,
      phone_number,
      phone,
      role = 'WASHER',
      salary_type = 'DAILY',
      salary_amount,
      base_salary,
      hourly_rate = 0,
      commission_rate = 0,
      commission_amount = 0,
      joining_date = new Date().toISOString().split('T')[0],
      is_active = true,
      password,
    } = body;

    const staffName = String(first_name || name || '').trim();
    const rawPhone = String(phone_number || phone || '').trim();
    const staffRole = String(role || 'WASHER').toUpperCase() as StaffRole;

    if (!staffName || staffName.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Staff member name is required (min 2 characters).' },
        { status: 400 }
      );
    }

    if (!rawPhone) {
      return NextResponse.json(
        { success: false, error: 'Staff phone number is required.' },
        { status: 400 }
      );
    }

    const { digits, e164, twelveDigit, variants } = getPhoneVariants(rawPhone);
    const targetEmail = email && email.includes('@')
      ? email.trim().toLowerCase()
      : `${twelveDigit || digits}@kallayi.internal`;

    const salaryVal = parseFloat(String(salary_amount || base_salary || '0')) || 0;
    const commVal = parseFloat(String(commission_rate || '0')) || 0;
    const hourlyVal = parseFloat(String(hourly_rate || '0')) || 0;

    // 1. Check if user already exists in auth.users or staff_profiles
    let userId: string | null = null;

    if (variants.length > 0) {
      const { data: existingStaff } = await supabase
        .from('staff_profiles')
        .select('id, user_id, phone_number')
        .in('phone_number', variants)
        .limit(1)
        .maybeSingle();

      if (existingStaff) {
        // Update existing staff profile
        const { data: updatedStaff, error: updateErr } = await supabase
          .from('staff_profiles')
          .update({
            role: staffRole,
            salary_type: salary_type as SalaryType,
            salary_amount: salaryVal,
            base_salary: salaryVal,
            hourly_rate: hourlyVal,
            commission_rate: commVal,
            is_active: is_active ?? true,
          })
          .eq('id', existingStaff.id)
          .select('*')
          .single();

        if (updateErr) {
          return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          message: 'Staff profile updated successfully.',
          data: updatedStaff,
        });
      }
    }

    // 2. Create or find Auth User in GoTrue
    const { data: allUsers } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const matchedUser = allUsers?.users?.find(
      (u) =>
        u.email?.toLowerCase() === targetEmail.toLowerCase() ||
        (u.phone && variants.includes(u.phone)) ||
        (u.user_metadata?.phone && variants.includes(u.user_metadata.phone))
    );

    if (matchedUser) {
      userId = matchedUser.id;
      // Update user metadata
      await supabase.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...matchedUser.user_metadata,
          full_name: staffName,
          first_name: staffName.split(' ')[0],
          name: staffName,
          phone: e164 || rawPhone,
          role: staffRole,
        },
      });
    } else {
      const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
        email: targetEmail,
        phone: e164,
        password: password || 'Kallayi@2026',
        email_confirm: true,
        phone_confirm: true,
        user_metadata: {
          full_name: staffName,
          first_name: staffName.split(' ')[0],
          name: staffName,
          phone: e164 || rawPhone,
          role: staffRole,
        },
      });

      if (authErr || !authData?.user) {
        return NextResponse.json(
          { success: false, error: authErr?.message || 'Failed to create auth user for staff.' },
          { status: 500 }
        );
      }

      userId = authData.user.id;
    }

    // 3. Insert into staff_profiles
    const { data: newStaff, error: staffInsertErr } = await supabase
      .from('staff_profiles')
      .insert({
        user_id: userId,
        role: staffRole,
        phone_number: e164 || rawPhone,
        salary_type: salary_type as SalaryType,
        salary_amount: salaryVal,
        base_salary: salaryVal,
        hourly_rate: hourlyVal,
        commission_rate: commVal,
        commission_amount: 0,
        joining_date: joining_date || new Date().toISOString().split('T')[0],
        is_active: is_active ?? true,
        is_online: true,
      })
      .select('*')
      .single();

    if (staffInsertErr || !newStaff) {
      return NextResponse.json(
        { success: false, error: `Failed to insert staff profile: ${staffInsertErr?.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Staff member registered successfully.',
        data: {
          ...newStaff,
          name: staffName,
          first_name: staffName,
          email: targetEmail,
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}


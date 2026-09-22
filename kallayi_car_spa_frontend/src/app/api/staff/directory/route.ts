/**
 * KALLAYI CAR SPA & AUTO CARE - STAFF DIRECTORY API ROUTE
 * Next.js 16 Route Handler: GET & POST /api/staff/directory
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';
import { getPhoneVariants, normalizePhone } from '@/lib/phone';
import { StaffProfileRow, StaffRole, SalaryType } from '@/types/database';

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

    // Fetch unsettled advances for all staff
    const { data: advances, error: advErr } = await supabase
      .from('staff_advances')
      .select('staff_id, amount')
      .eq('is_settled', false);

    const advanceMap = new Map<string, number>();
    if (!advErr && advances && advances.length > 0) {
      advances.forEach((a: any) => {
        advanceMap.set(a.staff_id, (advanceMap.get(a.staff_id) || 0) + Number(a.amount || 0));
      });
    } else {
      const { data: expAdvances } = await supabase
        .from('general_expenses')
        .select('staff_id, amount')
        .ilike('description', '%[STAFF_ADVANCE:UNSETTLED%');
      (expAdvances || []).forEach((ea: any) => {
        if (ea.staff_id) {
          advanceMap.set(ea.staff_id, (advanceMap.get(ea.staff_id) || 0) + Number(ea.amount || 0));
        }
      });
    }

    // Fetch cash collected from invoices
    const { data: cashInvoices } = await supabase
      .from('invoices')
      .select('cash_collected_by_staff_id, split_cash')
      .not('cash_collected_by_staff_id', 'is', null);

    const cashCustodyMap = new Map<string, number>();
    (cashInvoices || []).forEach((inv: any) => {
      if (inv.cash_collected_by_staff_id) {
        cashCustodyMap.set(
          inv.cash_collected_by_staff_id,
          (cashCustodyMap.get(inv.cash_collected_by_staff_id) || 0) + Number(inv.split_cash || 0)
        );
      }
    });

    // Fetch cash handovers
    const { data: handovers, error: hErr } = await supabase
      .from('staff_cash_handovers')
      .select('staff_id, amount');

    const handoverMap = new Map<string, number>();
    if (!hErr && handovers && handovers.length > 0) {
      handovers.forEach((h: any) => {
        handoverMap.set(h.staff_id, (handoverMap.get(h.staff_id) || 0) + Number(h.amount || 0));
      });
    } else {
      const { data: expHandovers } = await supabase
        .from('general_expenses')
        .select('staff_id, amount')
        .ilike('description', '%[STAFF_CASH_HANDOVER%');
      (expHandovers || []).forEach((eh: any) => {
        if (eh.staff_id) {
          handoverMap.set(eh.staff_id, (handoverMap.get(eh.staff_id) || 0) + Number(eh.amount || 0));
        }
      });
    }

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

        const staffAdvance = advanceMap.get(s.id) || 0;
        const totalCashCollected = cashCustodyMap.get(s.id) || 0;
        const totalHandedOver = handoverMap.get(s.id) || 0;
        const cashInHand = Math.max(0, Math.round((totalCashCollected - totalHandedOver) * 100) / 100);

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
          commission_percentage: Number(s.commission_percentage ?? s.commission_rate ?? 40),
          commission_rate: Number(s.commission_percentage ?? s.commission_rate ?? 40),
          commission_amount: Number(s.commission_amount || 0),
          retained_balance: Number(s.retained_balance || 0),
          previous_retained_balance: Number(s.retained_balance || 0),
          unsettled_advances: staffAdvance,
          advances: staffAdvance,
          collected_cash_holding: cashInHand,
          cash_in_hand: cashInHand,
          due_amount: Number(s.retained_balance || 0),
          pending_balance: Number(s.retained_balance || 0),
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
      commission_percentage,
      commission_rate = 0,
      commission_amount = 0,
      retained_balance = 0,
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

    const { digits, e164, tenDigit, twelveDigit, variants } = getPhoneVariants(rawPhone);
    const normalizedPhone = e164 || normalizePhone(rawPhone);
    const targetEmail = email && email.includes('@')
      ? email.trim().toLowerCase()
      : `${twelveDigit || digits}@kallayi.internal`;

    const salaryVal = parseFloat(String(salary_amount || base_salary || '0')) || 0;
    const commVal = parseFloat(String(commission_percentage ?? commission_rate ?? '0')) || 0;
    const retainedVal = parseFloat(String(retained_balance || '0')) || 0;
    const hourlyVal = parseFloat(String(hourly_rate || '0')) || 0;

    // Determine default password (CarSpa@[Last4Digits] if none provided)
    const last4 = (digits.slice(-4) || '2026').padStart(4, '0');
    const defaultPassword = password && String(password).trim().length >= 6
      ? String(password).trim()
      : `CarSpa@${last4}`;

    // 1. Check if user already exists in auth.users
    let userId: string | null = null;
    let isNewAccount = false;

    const candidateEmails = Array.from(new Set([
      targetEmail.toLowerCase(),
      `${twelveDigit}@kallayi.internal`.toLowerCase(),
      `${tenDigit}@kallayi.internal`.toLowerCase(),
      `${digits}@kallayi.internal`.toLowerCase(),
    ].filter(Boolean)));

    let matchedUser: any = null;
    for (const em of candidateEmails) {
      if (matchedUser) break;
      try {
        const { data: linkData } = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email: em,
        });
        if (linkData?.user) matchedUser = linkData.user;
      } catch {}
    }

    if (!matchedUser) {
      const { data: allUsers } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      matchedUser = allUsers?.users?.find((u) => {
        if (u.email && candidateEmails.includes(u.email.toLowerCase())) return true;
        const uPhoneDigits = u.phone?.replace(/\D/g, '');
        const uMetaPhoneDigits = u.user_metadata?.phone?.replace(/\D/g, '');
        return variants.some((v) => {
          const vDigits = v.replace(/\D/g, '');
          return (vDigits && vDigits === uPhoneDigits) || (vDigits && vDigits === uMetaPhoneDigits);
        });
      });
    }

    if (matchedUser) {
      userId = matchedUser.id;
      const updateAuthPayload: any = {
        password: defaultPassword,
        phone: normalizedPhone,
        phone_confirm: true,
        email_confirm: true,
        user_metadata: {
          ...matchedUser.user_metadata,
          role: 'STAFF',
          staff_role: staffRole,
          name: staffName,
          full_name: staffName,
          first_name: staffName.split(' ')[0],
          phone: normalizedPhone,
        },
      };
      const { error: updateErr } = await supabase.auth.admin.updateUserById(matchedUser.id, updateAuthPayload);
      if (updateErr) {
        delete updateAuthPayload.phone;
        await supabase.auth.admin.updateUserById(matchedUser.id, updateAuthPayload);
      }
    } else {
      isNewAccount = true;
      let { data: authData, error: authErr } = await supabase.auth.admin.createUser({
        phone: normalizedPhone,
        email: targetEmail,
        password: defaultPassword,
        phone_confirm: true,
        email_confirm: true,
        user_metadata: {
          role: 'STAFF',
          staff_role: staffRole,
          name: staffName,
          full_name: staffName,
          first_name: staffName.split(' ')[0],
          phone: normalizedPhone,
        },
      });

      if (authErr && authErr.message?.toLowerCase().includes('already')) {
        // Fallback: email was already registered, resolve user and update
        for (const em of candidateEmails) {
          if (userId) break;
          try {
            const { data: linkData } = await supabase.auth.admin.generateLink({
              type: 'magiclink',
              email: em,
            });
            if (linkData?.user) {
              userId = linkData.user.id;
              await supabase.auth.admin.updateUserById(userId, {
                password: defaultPassword,
                phone_confirm: true,
                email_confirm: true,
                user_metadata: {
                  ...linkData.user.user_metadata,
                  role: 'STAFF',
                  staff_role: staffRole,
                  name: staffName,
                  full_name: staffName,
                  first_name: staffName.split(' ')[0],
                  phone: normalizedPhone,
                },
              });
              authErr = null;
            }
          } catch {}
        }
      }

      if ((authErr || !authData?.user) && !userId) {
        return NextResponse.json(
          { success: false, error: authErr?.message || 'Failed to create auth user for staff.' },
          { status: 500 }
        );
      }

      if (!userId && authData?.user) {
        userId = authData.user.id;
      }
    }

    // 2. Check if staff profile already exists
    if (variants.length > 0) {
      const { data: existingStaff } = await supabase
        .from('staff_profiles')
        .select('id, user_id, phone_number')
        .or(`phone_number.in.(${variants.join(',')}),user_id.eq.${userId}`)
        .limit(1)
        .maybeSingle();

      if (existingStaff) {
        // Update existing staff profile
        const updatePayload: any = {
          user_id: userId,
          role: staffRole,
          phone_number: normalizedPhone,
          salary_type: salary_type as SalaryType,
          salary_amount: salaryVal,
          base_salary: salaryVal,
          hourly_rate: hourlyVal,
          commission_rate: commVal,
          commission_percentage: commVal,
          retained_balance: retainedVal,
          is_active: is_active ?? true,
        };

        let { data: updatedStaff, error: updateErr } = await supabase
          .from('staff_profiles')
          .update(updatePayload)
          .eq('id', existingStaff.id)
          .select('*')
          .single();

        if (updateErr) {
          delete updatePayload.commission_percentage;
          delete updatePayload.retained_balance;
          const retry = await supabase
            .from('staff_profiles')
            .update(updatePayload)
            .eq('id', existingStaff.id)
            .select('*')
            .single();
          if (!retry.error && retry.data) {
            updatedStaff = retry.data;
            updateErr = null;
          }
        }

        if (updateErr) {
          return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          message: 'Staff profile updated successfully.',
          data: {
            ...updatedStaff,
            name: staffName,
            first_name: staffName,
            email: targetEmail,
            default_password: defaultPassword,
            is_new_account: isNewAccount,
            role: 'STAFF',
            staff_role: staffRole,
          },
        });
      }
    }

    // 3. Insert new staff_profiles record
    const insertPayload: any = {
      user_id: userId,
      role: staffRole,
      phone_number: normalizedPhone,
      salary_type: salary_type as SalaryType,
      salary_amount: salaryVal,
      base_salary: salaryVal,
      hourly_rate: hourlyVal,
      commission_rate: commVal,
      commission_percentage: commVal,
      commission_amount: 0,
      retained_balance: retainedVal,
      joining_date: joining_date || new Date().toISOString().split('T')[0],
      is_active: is_active ?? true,
      is_online: true,
    };

    let { data: newStaff, error: staffInsertErr } = await supabase
      .from('staff_profiles')
      .insert(insertPayload)
      .select('*')
      .single();

    if (staffInsertErr) {
      delete insertPayload.commission_percentage;
      delete insertPayload.retained_balance;
      const retry = await supabase
        .from('staff_profiles')
        .insert(insertPayload)
        .select('*')
        .single();
      if (!retry.error && retry.data) {
        newStaff = retry.data;
        staffInsertErr = null;
      }
    }

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
          default_password: defaultPassword,
          is_new_account: isNewAccount,
          role: 'STAFF',
          staff_role: staffRole,
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}


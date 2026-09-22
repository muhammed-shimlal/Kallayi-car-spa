/**
 * KALLAYI CAR SPA & AUTO CARE - STAFF CASH HANDOVER API ROUTE
 * Next.js 16 Route Handler: GET & POST /api/staff/cash-handover
 * Records customer cash handovers from staff with itemized vehicle breakdown and audit history.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getAuthUserFromRequest } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveStaffProfile(supabase: any, paramId: string) {
  const cleanId = String(paramId || '').trim();
  if (!cleanId) return null;

  // 1. Direct UUID match
  if (UUID_REGEX.test(cleanId)) {
    const { data: staff } = await supabase
      .from('staff_profiles')
      .select('id, user_id, phone_number, role, is_active, base_salary, salary_amount, commission_rate')
      .or(`id.eq.${cleanId},user_id.eq.${cleanId}`)
      .maybeSingle();

    if (staff) return staff;
  }

  // 2. Numeric ID lookup in payroll_entries or staff_profiles index
  const numericId = parseInt(cleanId, 10);
  if (!isNaN(numericId)) {
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
          .select('id, user_id, phone_number, role, is_active, base_salary, salary_amount, commission_rate')
          .or(`id.eq.${staffRef},user_id.eq.${staffRef}`)
          .maybeSingle();

        if (staff) return staff;
      }
    }

    const { data: allStaff } = await supabase
      .from('staff_profiles')
      .select('id, user_id, phone_number, role, is_active, base_salary, salary_amount, commission_rate')
      .order('created_at', { ascending: true });

    if (allStaff && allStaff.length > 0) {
      if (numericId >= 1 && numericId <= allStaff.length) {
        return allStaff[numericId - 1];
      }
      if (numericId >= 0 && numericId < allStaff.length) {
        return allStaff[numericId];
      }
      const activeStaff = allStaff.filter((s: any) => s.is_active);
      if (activeStaff.length > 0) {
        return activeStaff[0];
      }
      return allStaff[0];
    }
  }

  // 3. Fallback: Phone number match
  const { data: staffByPhone } = await supabase
    .from('staff_profiles')
    .select('id, user_id, phone_number, role, is_active, base_salary, salary_amount, commission_rate')
    .eq('phone_number', cleanId)
    .maybeSingle();

  if (staffByPhone) return staffByPhone;

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const staffIdParam = searchParams.get('staff_id');
    const view = searchParams.get('view');

    // ─── 1. ITEMIZE VEHICLE BREAKDOWN VIEW ─────────────────────────────────
    if (view === 'breakdown' || (staffIdParam && searchParams.has('breakdown'))) {
      if (!staffIdParam) {
        return NextResponse.json(
          { success: false, error: 'staff_id is required for vehicle breakdown view.' },
          { status: 400 }
        );
      }

      const staff = await resolveStaffProfile(supabase, staffIdParam);
      if (!staff) {
        return NextResponse.json(
          { success: false, error: `Staff profile not found for ID: ${staffIdParam}` },
          { status: 404 }
        );
      }

      // Resolve staff name from auth metadata
      let staffName = `Staff (${staff.role})`;
      try {
        const { data: authUser } = await supabase.auth.admin.getUserById(staff.user_id);
        if (authUser?.user) {
          const meta = authUser.user.user_metadata;
          staffName =
            meta?.full_name ||
            meta?.name ||
            `${meta?.first_name || ''} ${meta?.last_name || ''}`.trim() ||
            authUser.user.email?.split('@')[0] ||
            staffName;
        }
      } catch {
        // Fallback
      }

      // Query cash invoices collected by this staff member
      // Query cash invoices collected by this staff member (with graceful fallback if migration columns pending)
      let rawInvoices: any[] = [];
      let hasReconciliationColumns = true;

      const { data: invWithRecon, error: reconErr } = await supabase
        .from('invoices')
        .select(`
          id,
          booking_id,
          amount,
          split_cash,
          split_online,
          split_khata,
          payment_method,
          cash_collected_by_staff_id,
          is_cash_handed_over,
          cash_handover_id,
          created_at,
          booking:bookings(
            id,
            created_at,
            service_package:service_packages(id, name),
            vehicle:customer_vehicles(id, plate_number, model, make)
          )
        `)
        .eq('cash_collected_by_staff_id', staff.id)
        .order('created_at', { ascending: false });

      if (!reconErr && invWithRecon) {
        rawInvoices = invWithRecon;
      } else {
        hasReconciliationColumns = false;
        const { data: fallbackInvs, error: fbErr } = await supabase
          .from('invoices')
          .select(`
            id,
            booking_id,
            amount,
            split_cash,
            split_online,
            split_khata,
            payment_method,
            cash_collected_by_staff_id,
            created_at,
            booking:bookings(
              id,
              created_at,
              service_package:service_packages(id, name),
              vehicle:customer_vehicles(id, plate_number, model, make)
            )
          `)
          .eq('cash_collected_by_staff_id', staff.id)
          .order('created_at', { ascending: false });

        if (fbErr) {
          console.error('[Cash Handover Breakdown Invoices Fallback Error]:', fbErr);
          return NextResponse.json({ success: false, error: fbErr.message }, { status: 500 });
        }
        rawInvoices = fallbackInvs || [];
      }

      // Fetch all past handovers for this staff member to verify net cash in hand
      const { data: pastHandovers } = await supabase
        .from('staff_cash_handovers')
        .select('amount')
        .eq('staff_id', staff.id);

      const totalHandedOver = (pastHandovers || []).reduce(
        (acc: number, h: any) => acc + Number(h.amount || 0),
        0
      );

      const allInvoices = (rawInvoices || []) as any[];
      const totalCashCollected = allInvoices.reduce(
        (acc: number, inv: any) => acc + Number(inv.split_cash || (inv.payment_method === 'CASH' ? inv.amount : 0) || 0),
        0
      );

      const netCashInHand = Math.max(0, Math.round((totalCashCollected - totalHandedOver) * 100) / 100);

      // Filter to unhanded-over invoices
      let pendingInvoices: any[] = [];
      if (hasReconciliationColumns) {
        pendingInvoices = allInvoices.filter((inv) => {
          if (inv.is_cash_handed_over === true || inv.cash_handover_id) return false;
          const cashAmt = Number(inv.split_cash || (inv.payment_method === 'CASH' ? inv.amount : 0) || 0);
          return cashAmt > 0;
        });
      }

      // If no invoices have the is_cash_handed_over flag set yet, calculate top pending invoices matching net cash in hand
      if (pendingInvoices.length === 0 && netCashInHand > 0 && allInvoices.length > 0) {
        let accumulated = 0;
        const selected = [];
        for (const inv of allInvoices) {
          const cashAmt = Number(inv.split_cash || (inv.payment_method === 'CASH' ? inv.amount : 0) || 0);
          if (cashAmt > 0 && accumulated < netCashInHand) {
            selected.push(inv);
            accumulated += cashAmt;
          }
        }
        pendingInvoices = selected;
      }

      const vehicles = pendingInvoices.map((inv: any) => {
        const bk = inv.booking || {};
        const plate = bk.vehicle?.plate_number || bk.plate_number || 'Vehicle';
        const make = bk.vehicle?.make || '';
        const model = bk.vehicle?.model || bk.vehicle_model || '';
        const vehicleModel = `${make} ${model}`.trim() || 'Standard Vehicle';
        const serviceName = bk.service_package?.name || 'Wash Service';
        const cashAmount = Number(inv.split_cash || (inv.payment_method === 'CASH' ? inv.amount : 0) || 0);
        const time = inv.created_at || bk.created_at || new Date().toISOString();

        return {
          invoice_id: inv.id,
          booking_id: inv.booking_id || bk.id,
          plate_number: plate,
          vehicle_model: vehicleModel,
          service_name: serviceName,
          cash_amount: cashAmount,
          time,
        };
      });

      return NextResponse.json({
        success: true,
        staff_id: staff.id,
        staff_name: staffName,
        total_cash_in_hand: netCashInHand,
        vehicles,
      });
    }

    // ─── 2. HANDOVER HISTORY LIST VIEW ────────────────────────────────────
    let query = supabase
      .from('staff_cash_handovers')
      .select(`
        *,
        staff:staff_profiles(
          id,
          user_id,
          role,
          phone_number
        )
      `)
      .order('handover_date', { ascending: false });

    if (staffIdParam) {
      const resolved = await resolveStaffProfile(supabase, staffIdParam);
      if (resolved) {
        query = query.eq('staff_id', resolved.id);
      }
    }

    const { data: hData, error: hErr } = await query;
    let handovers: any[] = [];

    if (!hErr && hData) {
      handovers = hData;
    } else {
      // Seamless fallback to general_expenses
      let expQuery = supabase
        .from('general_expenses')
        .select('*')
        .ilike('description', '%[STAFF_CASH_HANDOVER%')
        .order('date', { ascending: false });

      if (staffIdParam) {
        expQuery = expQuery.or(`staff_id.eq.${staffIdParam},description.ilike.%[STAFF_CASH_HANDOVER:${staffIdParam}]%`);
      }

      const { data: expRows } = await expQuery;
      handovers = (expRows || []).map((exp: any) => {
        const desc = String(exp.description || '');
        const notes = desc.replace(/\[STAFF_CASH_HANDOVER:[^\]]+\]\s*/i, '').trim();
        return {
          id: String(exp.id),
          staff_id: exp.staff_id,
          amount: Number(exp.amount || 0),
          notes: notes || 'Cash handover to admin',
          vehicle_summary: '',
          reconciled_invoices_count: 0,
          handover_date: exp.created_at || exp.date,
          created_at: exp.created_at,
        };
      });
    }

    // Resolve staff names for each handover
    const formattedHandovers = await Promise.all(
      handovers.map(async (h: any) => {
        let staffName = h.staff?.role ? `Staff (${h.staff.role})` : 'Staff Member';
        if (h.staff?.user_id) {
          try {
            const { data: authUser } = await supabase.auth.admin.getUserById(h.staff.user_id);
            if (authUser?.user?.user_metadata) {
              const meta = authUser.user.user_metadata;
              staffName =
                meta.full_name ||
                meta.name ||
                `${meta.first_name || ''} ${meta.last_name || ''}`.trim() ||
                staffName;
            }
          } catch {
            // ignore
          }
        }
        return {
          id: h.id,
          staff_id: h.staff_id,
          staff_name: staffName,
          staff_role: h.staff?.role || 'WASHER',
          amount: Number(h.amount || 0),
          notes: h.notes || '',
          vehicle_summary: h.vehicle_summary || '',
          reconciled_invoices_count: h.reconciled_invoices_count || 0,
          handover_date: h.handover_date || h.created_at,
          created_at: h.created_at,
        };
      })
    );

    const totalHandedOver = formattedHandovers.reduce((acc, h) => acc + h.amount, 0);

    return NextResponse.json({
      success: true,
      total_handed_over: Math.round(totalHandedOver * 100) / 100,
      handovers: formattedHandovers,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[Staff Cash Handover GET Exception]:', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json().catch(() => ({}));
    const {
      staff_id,
      amount,
      notes,
      reconciled_invoice_ids = [],
      vehicle_plates = [],
      vehicle_summary = '',
    } = body;

    const cleanStaffId = String(staff_id || '').trim();
    if (!cleanStaffId) {
      return NextResponse.json(
        { success: false, error: 'staff_id is required for cash handover.' },
        { status: 400 }
      );
    }

    const parsedAmount = parseFloat(String(amount || '0'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Handover amount must be a positive number greater than zero.' },
        { status: 400 }
      );
    }

    // 1. Resolve staff profile
    const staff = await resolveStaffProfile(supabase, cleanStaffId);
    if (!staff) {
      return NextResponse.json(
        { success: false, error: `Staff profile not found for identifier: ${cleanStaffId}` },
        { status: 404 }
      );
    }

    // 2. Identify receiving user (admin)
    let receiverId: string | null = null;
    try {
      const authUser = await getAuthUserFromRequest(request);
      if (authUser) receiverId = authUser.id;
    } catch {
      // Fallback
    }

    // Build vehicle summary
    let cleanVehicleSummary = String(vehicle_summary || '').trim();
    if (!cleanVehicleSummary && Array.isArray(vehicle_plates) && vehicle_plates.length > 0) {
      cleanVehicleSummary = vehicle_plates.join(', ');
    }

    const nowIso = new Date().toISOString();
    let cleanNotes = String(notes || '').trim();
    if (!cleanNotes) {
      cleanNotes = cleanVehicleSummary
        ? `Cash handover for ${cleanVehicleSummary}`
        : 'Cash handed over to admin';
    }

    const invoiceIds: number[] = Array.isArray(reconciled_invoice_ids)
      ? reconciled_invoice_ids.map((id: any) => Number(id)).filter((id: number) => !isNaN(id))
      : [];

    // 3. Try inserting into staff_cash_handovers with vehicle audit fields
    let newHandover: any = null;
    const insertPayload: any = {
      staff_id: staff.id,
      amount: Math.round(parsedAmount * 100) / 100,
      notes: cleanNotes,
      handover_date: nowIso,
      received_by_user_id: receiverId,
      vehicle_summary: cleanVehicleSummary,
      reconciled_invoices_count: invoiceIds.length,
    };

    let { data: insertedHandover, error: insertErr } = await supabase
      .from('staff_cash_handovers')
      .insert(insertPayload)
      .select('*')
      .maybeSingle();

    // If column vehicle_summary/reconciled_invoices_count failed because it's not yet in the table, retry without them
    if (insertErr && (insertErr.message?.includes('vehicle_summary') || insertErr.message?.includes('reconciled_invoices_count'))) {
      const fallbackPayload = {
        staff_id: staff.id,
        amount: Math.round(parsedAmount * 100) / 100,
        notes: cleanNotes + (cleanVehicleSummary ? ` (Reconciled: ${cleanVehicleSummary})` : ''),
        handover_date: nowIso,
        received_by_user_id: receiverId,
      };
      const retryResult = await supabase
        .from('staff_cash_handovers')
        .insert(fallbackPayload)
        .select('*')
        .maybeSingle();

      insertedHandover = retryResult.data;
      insertErr = retryResult.error;
    }

    if (!insertErr && insertedHandover) {
      newHandover = insertedHandover;
    } else {
      // 4. Seamless Fallback: Record as tagged general_expense
      const { data: expRow, error: expErr } = await supabase
        .from('general_expenses')
        .insert({
          staff_id: staff.user_id || staff.id,
          category_id: 2, // 👥 Salaries & Commission
          amount: Math.round(parsedAmount * 100) / 100,
          description: `[STAFF_CASH_HANDOVER:${staff.id}${cleanVehicleSummary ? `:${cleanVehicleSummary}` : ''}] ${cleanNotes}`,
          notes: cleanNotes,
          date: nowIso.split('T')[0],
          status: 'APPROVED',
          payment_method: 'CASH',
          expense_type: 'BUSINESS',
        })
        .select('*')
        .single();

      if (expErr) {
        console.error('[Staff Cash Handover Insert Error]:', insertErr || expErr);
        return NextResponse.json(
          { success: false, error: `Failed to record cash handover: ${insertErr?.message || expErr.message}` },
          { status: 500 }
        );
      }

      newHandover = {
        id: String(expRow.id),
        staff_id: expRow.staff_id,
        amount: Number(expRow.amount),
        notes: cleanNotes,
        vehicle_summary: cleanVehicleSummary,
        reconciled_invoices_count: invoiceIds.length,
        handover_date: expRow.created_at || expRow.date,
        created_at: expRow.created_at,
      };
    }

    // 5. Reconcile Invoices in Database
    try {
      if (invoiceIds.length > 0) {
        await (supabase.from('invoices') as any)
          .update({
            is_cash_handed_over: true,
            cash_handover_id: newHandover.id,
          })
          .in('id', invoiceIds);
      } else {
        // Auto-reconcile pending cash invoices for this staff member up to parsedAmount
        const { data: pendingInvs } = await (supabase.from('invoices') as any)
          .select('id, split_cash, amount, payment_method')
          .eq('cash_collected_by_staff_id', staff.id)
          .or('is_cash_handed_over.is.null,is_cash_handed_over.eq.false')
          .order('created_at', { ascending: true });

        if (pendingInvs && pendingInvs.length > 0) {
          let runningTotal = 0;
          const matchedIds: number[] = [];
          for (const inv of pendingInvs) {
            const val = Number(inv.split_cash || (inv.payment_method === 'CASH' ? inv.amount : 0) || 0);
            if (val > 0 && runningTotal < parsedAmount) {
              matchedIds.push(inv.id);
              runningTotal += val;
            }
          }
          if (matchedIds.length > 0) {
            await (supabase.from('invoices') as any)
              .update({
                is_cash_handed_over: true,
                cash_handover_id: newHandover.id,
              })
              .in('id', matchedIds);
          }
        }
      }
    } catch (reconcileErr) {
      console.warn('[Handover Reconcile Invoices Warning]:', reconcileErr);
    }

    return NextResponse.json(
      {
        success: true,
        message: `Cash handover of ₹${parsedAmount.toLocaleString('en-IN')} recorded successfully.`,
        handover: newHandover,
        data: newHandover,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[Staff Cash Handover POST Exception]:', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

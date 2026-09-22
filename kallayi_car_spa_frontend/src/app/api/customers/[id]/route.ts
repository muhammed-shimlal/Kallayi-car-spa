/**
 * KALLAYI CAR SPA & AUTO CARE - CUSTOMER DETAIL & MUTATION API
 * Next.js 16 Route Handler: GET, PATCH, PUT, DELETE /api/customers/[id]
 * Fetches customer with vehicles, updates customer details, and handles deletion.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';
import { normalizePhone } from '@/lib/phone';
import { CustomerRow } from '@/types/database';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const cleanId = String(id || '').trim();

    if (!cleanId) {
      return NextResponse.json({ success: false, error: 'Customer ID is required.' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: customer, error } = await supabase
      .from('customers')
      .select('*')
      .or(`id.eq.${cleanId},user_id.eq.${cleanId}`)
      .maybeSingle();

    if (error || !customer) {
      return NextResponse.json({ success: false, error: 'Customer not found.' }, { status: 404 });
    }

    const { data: vehicles } = customer.user_id
      ? await supabase
          .from('customer_vehicles')
          .select('*')
          .eq('user_id', customer.user_id)
      : { data: [] };

    return NextResponse.json({
      success: true,
      data: {
        ...customer,
        vehicles: vehicles || [],
      },
      ...customer,
      vehicles: vehicles || [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const cleanId = String(id || '').trim();

    if (!cleanId) {
      return NextResponse.json({ success: false, error: 'Customer ID is required.' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const body = await request.json();

    const updatePayload: Partial<CustomerRow> = {};
    if (body.name !== undefined) updatePayload.name = String(body.name).trim();
    if (body.phone_number !== undefined) updatePayload.phone_number = normalizePhone(String(body.phone_number));
    if (body.address !== undefined) updatePayload.address = String(body.address);
    if (body.credit_limit !== undefined) updatePayload.credit_limit = parseFloat(String(body.credit_limit));
    if (body.outstanding_balance !== undefined) updatePayload.outstanding_balance = parseFloat(String(body.outstanding_balance));
    if (body.loyalty_points !== undefined) updatePayload.loyalty_points = parseInt(String(body.loyalty_points), 10);

    const { data: updated, error } = await supabase
      .from('customers')
      .update(updatePayload)
      .or(`id.eq.${cleanId},user_id.eq.${cleanId}`)
      .select('*')
      .single();

    if (updated?.user_id && updatePayload.name) {
      try {
        await supabase.auth.admin.updateUserById(updated.user_id, {
          user_metadata: {
            full_name: updatePayload.name,
            name: updatePayload.name,
          },
        });
      } catch {
        // Non-blocking
      }
    }

    if (error || !updated) {
      return NextResponse.json({ success: false, error: error?.message || 'Failed to update customer.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Customer updated successfully.',
      data: updated,
      ...updated,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return PATCH(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const cleanId = String(id || '').trim();

    if (!cleanId) {
      return NextResponse.json({ success: false, error: 'Customer ID is required.' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from('customers')
      .delete()
      .or(`id.eq.${cleanId},user_id.eq.${cleanId}`);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Customer record deleted successfully.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

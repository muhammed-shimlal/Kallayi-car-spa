/**
 * KALLAYI CAR SPA & AUTO CARE - AUTHENTICATED CUSTOMER PROFILE API
 * Next.js 16 Route Handler: GET & PATCH /api/customers/me
 * Returns detailed customer profile, balances, loyalty points, and garage info.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getAuthUserFromRequest } from '@/lib/supabaseServer';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const authUser = await getAuthUserFromRequest(request);

    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. No active session.' },
        { status: 401 }
      );
    }

    const userId = authUser.id;

    // 1. Fetch or provision customer record in `public.customers`
    let { data: customer } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    const firstName =
      authUser.user_metadata?.first_name ||
      authUser.user_metadata?.name ||
      authUser.user_metadata?.full_name ||
      authUser.email?.split('@')[0] ||
      'Customer';

    const fullName =
      authUser.user_metadata?.full_name ||
      authUser.user_metadata?.name ||
      firstName;

    if (!customer) {
      const userPhone =
        authUser.phone ||
        authUser.user_metadata?.phone ||
        authUser.user_metadata?.phone_number ||
        '';

      const { data: newCustomer, error: insertErr } = await supabase
        .from('customers')
        .insert({
          user_id: userId,
          name: fullName,
          phone_number: userPhone,
          address: '',
          loyalty_points: 0,
          outstanding_balance: 0.0,
          credit_limit: 5000.0,
        })
        .select('*')
        .single();

      if (!insertErr && newCustomer) {
        customer = newCustomer;
      } else {
        customer = {
          id: userId,
          user_id: userId,
          name: fullName,
          phone_number: userPhone,
          address: '',
          loyalty_points: 0,
          outstanding_balance: 0.0,
          credit_limit: 5000.0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
    } else if (!customer.name || customer.name === 'Guest Customer') {
      // Sync customer display name if missing in customers table
      const { data: refreshedCust } = await supabase
        .from('customers')
        .update({ name: fullName, updated_at: new Date().toISOString() })
        .eq('id', customer.id)
        .select('*')
        .maybeSingle();

      if (refreshedCust) {
        customer = refreshedCust;
      }
    }

    // 2. Fetch Customer Vehicles
    const { data: vehicles } = await supabase
      .from('customer_vehicles')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    const finalDisplayName = customer.name || fullName;

    return NextResponse.json({
      success: true,
      id: customer.id,
      user_id: userId,
      name: finalDisplayName,
      first_name: firstName,
      full_name: finalDisplayName,
      email: authUser.email || '',
      phone: customer.phone_number || authUser.phone || '',
      phone_number: customer.phone_number || authUser.phone || '',
      address: customer.address || '',
      outstanding_balance: Number(customer.outstanding_balance || 0),
      loyalty_points: Number(customer.loyalty_points || 0),
      credit_limit: Number(customer.credit_limit || 5000),
      vehicles: vehicles || [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const authUser = await getAuthUserFromRequest(request);

    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, address, phone_number } = body;

    const updates: {
      name?: string;
      address?: string;
      phone_number?: string;
      updated_at?: string;
    } = {
      updated_at: new Date().toISOString(),
    };
    if (name !== undefined) updates.name = String(name).trim();
    if (address !== undefined) updates.address = String(address).trim();
    if (phone_number !== undefined) updates.phone_number = String(phone_number).trim();

    const { data: updatedCustomer, error: updateErr } = await supabase
      .from('customers')
      .update(updates)
      .eq('user_id', authUser.id)
      .select('*')
      .single();

    if (updateErr) {
      return NextResponse.json(
        { success: false, error: updateErr.message },
        { status: 500 }
      );
    }

    // Also update auth user metadata if name changed
    if (updates.name) {
      try {
        await supabase.auth.admin.updateUserById(authUser.id, {
          user_metadata: {
            ...authUser.user_metadata,
            full_name: updates.name,
            name: updates.name,
          },
        });
      } catch {
        // Non-blocking
      }
    }

    return NextResponse.json({
      success: true,
      customer: updatedCustomer,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}


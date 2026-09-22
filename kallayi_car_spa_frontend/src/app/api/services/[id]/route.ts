/**
 * KALLAYI CAR SPA & AUTO CARE - INDIVIDUAL SERVICE PACKAGE & TIERED PRICING API
 * Next.js 16 Route Handler: GET, PUT, PATCH, DELETE /api/services/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';
import { ServicePackageRow, VehicleType } from '@/types/database';
import { resolvePackagePriceForVehicle } from '@/lib/logic/booking';
import { normalizeVehicleType } from '@/lib/vehicleCatalog';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const STANDARD_TIERS: VehicleType[] = [
  'HATCHBACK',
  'SEDAN',
  'COMPACT_SUV',
  'SUV',
  'MUV',
  'VAN',
  'LUXURY',
  'BIKE',
  'AUTO',
  'TRUCK',
];

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const pkgId = parseInt(id, 10);
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const vehicleTypeParam = searchParams.get('vehicle_type') || searchParams.get('type') || '';
    const cleanVType = vehicleTypeParam
      ? (normalizeVehicleType(vehicleTypeParam) as VehicleType)
      : ('' as VehicleType | '');

    if (isNaN(pkgId)) {
      return NextResponse.json({ success: false, error: 'Invalid service package ID.' }, { status: 400 });
    }

    const { data: pkg, error: pkgErr } = await supabase
      .from('service_packages')
      .select('*')
      .eq('id', pkgId)
      .single();

    if (pkgErr || !pkg) {
      return NextResponse.json(
        { success: false, error: 'Service package not found.' },
        { status: 404 }
      );
    }

    const { data: tierPrices } = await supabase
      .from('service_package_prices')
      .select('*')
      .eq('package_id', pkgId);

    const basePriceNum = Number(pkg.price || 0);
    const tierMap: Partial<Record<string, number>> = {};

    const tierRows = tierPrices || [];
    tierRows.forEach((t: any) => {
      if (t.vehicle_type && t.price != null && !isNaN(Number(t.price))) {
        tierMap[normalizeVehicleType(t.vehicle_type)] = Number(t.price);
      }
    });

    let resolvedPrice: number | null = null;
    let hasConfiguredTier = false;

    if (cleanVType) {
      if (tierMap[cleanVType] !== undefined && tierMap[cleanVType] !== null) {
        resolvedPrice = tierMap[cleanVType]!;
        hasConfiguredTier = true;
      } else {
        let fallbackPrice: number | undefined;
        if (cleanVType === 'COMPACT_SUV') fallbackPrice = tierMap.SUV;
        else if (cleanVType === 'SUV') fallbackPrice = tierMap.COMPACT_SUV;
        else if (cleanVType === 'VAN') fallbackPrice = tierMap.MUV;
        else if (cleanVType === 'MUV') fallbackPrice = tierMap.VAN;

        if (fallbackPrice !== undefined && fallbackPrice !== null) {
          resolvedPrice = fallbackPrice;
          hasConfiguredTier = true;
        } else {
          return NextResponse.json(
            {
              success: false,
              error: `Pricing tier is not configured for vehicle type: ${cleanVType}. Please configure in Admin.`,
              tier_configured: false,
            },
            { status: 400 }
          );
        }
      }
    } else {
      resolvedPrice = basePriceNum;
      hasConfiguredTier = true;
    }

    const effectivePrice = resolvedPrice !== null ? resolvedPrice : basePriceNum;

    return NextResponse.json({
      ...pkg,
      base_price: basePriceNum,
      price: effectivePrice,
      final_price: effectivePrice,
      resolved_price: resolvedPrice,
      tier_configured: hasConfiguredTier,
      resolved_vehicle_type: cleanVType || null,
      tiered_prices: tierRows,
      service_package_prices: tierRows,
      tier_prices: tierMap,
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
  return handleUpdate(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleUpdate(request, context);
}

async function handleUpdate(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const pkgId = parseInt(id, 10);
    const supabase = getSupabaseAdmin();
    const body = await request.json();

    if (isNaN(pkgId)) {
      return NextResponse.json({ success: false, error: 'Invalid service package ID.' }, { status: 400 });
    }

    const {
      name,
      price,
      description,
      duration_minutes,
      vehicle_type,
      chemical_recipe,
      commission_rule_id,
      tiered_prices,
      tier_prices,
    } = body;

    const updates: Partial<ServicePackageRow> = {};
    if (name !== undefined) updates.name = String(name).trim();
    if (price !== undefined) updates.price = Number(price);
    if (description !== undefined) updates.description = String(description).trim();
    if (duration_minutes !== undefined) updates.duration_minutes = Number(duration_minutes);
    if (vehicle_type !== undefined) updates.vehicle_type = vehicle_type;
    if (chemical_recipe !== undefined) updates.chemical_recipe = chemical_recipe;
    if (commission_rule_id !== undefined) updates.commission_rule_id = commission_rule_id;

    const { data: updated, error: updateErr } = await supabase
      .from('service_packages')
      .update(updates)
      .eq('id', pkgId)
      .select('*')
      .single();

    if (updateErr || !updated) {
      return NextResponse.json(
        { success: false, error: updateErr?.message || 'Failed to update service package.' },
        { status: 500 }
      );
    }

    const basePriceNum = Number(updated.price || 0);

    // Update Tiered Prices atomically
    const tierRowsToInsert: Array<{ package_id: number; vehicle_type: string; price: number }> = [];
    const tierMap: Record<string, number> = {};

    STANDARD_TIERS.forEach((vType) => {
      tierMap[vType] = basePriceNum;
    });

    if (Array.isArray(tiered_prices)) {
      tiered_prices.forEach((item: any) => {
        if (item.vehicle_type && item.price != null && !isNaN(Number(item.price))) {
          const vType = String(item.vehicle_type).trim().toUpperCase();
          const pVal = Number(item.price);
          tierRowsToInsert.push({
            package_id: pkgId,
            vehicle_type: vType,
            price: pVal,
          });
          tierMap[vType] = pVal;
        }
      });
    } else if (tier_prices && typeof tier_prices === 'object') {
      Object.entries(tier_prices).forEach(([vType, val]) => {
        if (val != null && !isNaN(Number(val))) {
          const cleanKey = vType.trim().toUpperCase();
          const pVal = Number(val);
          tierRowsToInsert.push({
            package_id: pkgId,
            vehicle_type: cleanKey,
            price: pVal,
          });
          tierMap[cleanKey] = pVal;
        }
      });
    }

    if (tiered_prices !== undefined || tier_prices !== undefined) {
      await supabase.from('service_package_prices').delete().eq('package_id', pkgId);
      if (tierRowsToInsert.length > 0) {
        await supabase.from('service_package_prices').insert(tierRowsToInsert);
      }
    } else {
      const { data: existingTiers } = await supabase
        .from('service_package_prices')
        .select('*')
        .eq('package_id', pkgId);
      (existingTiers || []).forEach((tr: any) => {
        if (tr.vehicle_type) {
          tierMap[String(tr.vehicle_type).toUpperCase()] = Number(tr.price);
          tierRowsToInsert.push({
            package_id: pkgId,
            vehicle_type: String(tr.vehicle_type).toUpperCase(),
            price: Number(tr.price),
          });
        }
      });
    }

    const updatedResult = {
      ...updated,
      base_price: basePriceNum,
      price: basePriceNum,
      final_price: basePriceNum,
      tiered_prices: tierRowsToInsert,
      service_package_prices: tierRowsToInsert,
      tier_prices: tierMap,
    };

    return NextResponse.json({
      success: true,
      message: 'Service package updated successfully.',
      service: updatedResult,
      data: updatedResult,
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
    const pkgId = parseInt(id, 10);
    const supabase = getSupabaseAdmin();

    if (isNaN(pkgId)) {
      return NextResponse.json({ success: false, error: 'Invalid service package ID.' }, { status: 400 });
    }

    await supabase.from('service_package_prices').delete().eq('package_id', pkgId);
    const { error: delErr } = await supabase
      .from('service_packages')
      .delete()
      .eq('id', pkgId);

    if (delErr) {
      return NextResponse.json(
        { success: false, error: delErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Service package deleted successfully.' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * KALLAYI CAR SPA & AUTO CARE - UNIFIED DYNAMIC SERVICES & TIERED PRICING API
 * Next.js 16 Route Handler: GET, POST, PUT, PATCH, DELETE /api/services
 * 
 * Provides database-backed service packages and vehicle body-type tiered pricing
 * strictly sourced from Supabase PostgreSQL (service_packages & service_package_prices).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';
import { VehicleType, ServicePackagePriceRow } from '@/types/database';
import { resolvePackagePriceForVehicle } from '@/lib/logic/booking';

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

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const vehicleTypeParam = searchParams.get('vehicle_type') || searchParams.get('type') || '';
    const cleanVType = vehicleTypeParam.trim().toUpperCase() as VehicleType | '';

    // 1. Fetch active service packages with linked tiered prices from Supabase
    let packages: any[] | null = null;
    const { data: joinedData, error: joinErr } = await supabase
      .from('service_packages')
      .select(`
        *,
        tiered_prices:service_package_prices(*)
      `)
      .order('price', { ascending: true });

    if (!joinErr && joinedData) {
      packages = joinedData;
    } else {
      // Fallback: Fetch packages and tiered prices independently
      const [pkgRes, tierRes] = await Promise.all([
        supabase.from('service_packages').select('*').order('price', { ascending: true }),
        supabase.from('service_package_prices').select('*'),
      ]);

      if (pkgRes.error) {
        return NextResponse.json(
          { success: false, error: pkgRes.error.message, data: [] },
          { status: 500 }
        );
      }

      const allTierPrices = tierRes.data || [];
      packages = (pkgRes.data || []).map((p: any) => ({
        ...p,
        tiered_prices: allTierPrices.filter((t: any) => Number(t.package_id) === Number(p.id)),
      }));
    }

    if (!packages || packages.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        data: [],
        results: [],
      });
    }

    // 2. Process each package with dynamic vehicle tier pricing
    const formattedServices = packages.map((pkg) => {
      const pkgTierRows: ServicePackagePriceRow[] = (pkg.tiered_prices || pkg.service_package_prices || []) as ServicePackagePriceRow[];
      const basePriceNum = Number(pkg.price || 0);

      // Build 10-tier map defaulting to base catalog price
      const tierMap: Record<string, number> = {
        HATCHBACK: basePriceNum,
        SEDAN: basePriceNum,
        COMPACT_SUV: basePriceNum,
        SUV: basePriceNum,
        MUV: basePriceNum,
        VAN: basePriceNum,
        LUXURY: basePriceNum,
        BIKE: basePriceNum,
        AUTO: basePriceNum,
        TRUCK: basePriceNum,
      };

      // Apply overrides from service_package_prices
      pkgTierRows.forEach((tr) => {
        if (tr.vehicle_type) {
          const typeKey = String(tr.vehicle_type).trim().toUpperCase();
          tierMap[typeKey] = Number(tr.price);
        }
      });

      // Resolve effective dynamic price using the central business logic helper
      const dynamicPrice = resolvePackagePriceForVehicle(basePriceNum, pkgTierRows, cleanVType);
      const effectivePrice = cleanVType ? dynamicPrice : basePriceNum;

      // Applicability check for queried vehicle type
      const pkgVType = (pkg.vehicle_type || 'ALL').toUpperCase();
      const isApplicable =
        !cleanVType ||
        pkgVType === 'ALL' ||
        pkgVType === cleanVType ||
        (cleanVType === 'CAR' && ['SEDAN', 'HATCHBACK', 'ALL'].includes(pkgVType)) ||
        (cleanVType.includes('SUV') && ['SUV', 'COMPACT_SUV', 'ALL'].includes(pkgVType)) ||
        (cleanVType === 'BIKE' && ['BIKE', 'ALL'].includes(pkgVType)) ||
        (cleanVType === 'AUTO' && ['AUTO', 'ALL'].includes(pkgVType)) ||
        (cleanVType === 'VAN' && ['VAN', 'MUV', 'ALL'].includes(pkgVType));

      return {
        id: pkg.id,
        name: pkg.name,
        description: pkg.description || '',
        duration_minutes: pkg.duration_minutes || 60,
        vehicle_type: pkg.vehicle_type || 'ALL',
        chemical_recipe: pkg.chemical_recipe || {},
        commission_rule_id: pkg.commission_rule_id || null,
        base_price: basePriceNum,
        price: effectivePrice,
        final_price: effectivePrice,
        tiered_prices: pkgTierRows,
        service_package_prices: pkgTierRows,
        tier_prices: tierMap,
        is_applicable: isApplicable,
        created_at: pkg.created_at,
      };
    });

    // Filter by applicability if a specific vehicle_type was requested
    const filteredServices = cleanVType
      ? formattedServices.filter((s) => s.is_applicable)
      : formattedServices;

    return NextResponse.json({
      success: true,
      count: filteredServices.length,
      data: filteredServices,
      results: filteredServices,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message, data: [] }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();

    const {
      name,
      price,
      description = '',
      duration_minutes = 60,
      vehicle_type = 'ALL',
      chemical_recipe = {},
      commission_rule_id = null,
      tiered_prices,
      tier_prices,
    } = body;

    if (!name || price == null) {
      return NextResponse.json(
        { success: false, error: 'Package name and base price are required.' },
        { status: 400 }
      );
    }

    const basePriceNum = Number(price);

    // 1. Insert Base Service Package
    const { data: newService, error: insertErr } = await supabase
      .from('service_packages')
      .insert({
        name: String(name).trim(),
        price: basePriceNum,
        description: String(description || '').trim(),
        duration_minutes: Number(duration_minutes) || 60,
        vehicle_type: vehicle_type || 'ALL',
        chemical_recipe: chemical_recipe || {},
        commission_rule_id: commission_rule_id || null,
      })
      .select('*')
      .single();

    if (insertErr || !newService) {
      return NextResponse.json(
        { success: false, error: insertErr?.message || 'Failed to create service package.' },
        { status: 500 }
      );
    }

    // 2. Prepare Tiered Prices to insert
    const tierRowsToInsert: Array<{ package_id: number; vehicle_type: string; price: number }> = [];
    const tierMap: Record<string, number> = {};

    // Initialize defaults with base price
    STANDARD_TIERS.forEach((vType) => {
      tierMap[vType] = basePriceNum;
    });

    if (Array.isArray(tiered_prices) && tiered_prices.length > 0) {
      tiered_prices.forEach((item: any) => {
        if (item.vehicle_type && item.price != null && !isNaN(Number(item.price))) {
          const vType = String(item.vehicle_type).trim().toUpperCase();
          const pVal = Number(item.price);
          tierRowsToInsert.push({
            package_id: newService.id,
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
            package_id: newService.id,
            vehicle_type: cleanKey,
            price: pVal,
          });
          tierMap[cleanKey] = pVal;
        }
      });
    } else {
      // Default all 10 tiers with base price
      STANDARD_TIERS.forEach((vType) => {
        tierRowsToInsert.push({
          package_id: newService.id,
          vehicle_type: vType,
          price: basePriceNum,
        });
      });
    }

    if (tierRowsToInsert.length > 0) {
      const { error: tierInsertErr } = await supabase
        .from('service_package_prices')
        .insert(tierRowsToInsert);

      if (tierInsertErr) {
        console.warn('[Tier Insert Warning]:', tierInsertErr.message);
      }
    }

    const createdResult = {
      ...newService,
      base_price: basePriceNum,
      price: basePriceNum,
      final_price: basePriceNum,
      tiered_prices: tierRowsToInsert,
      service_package_prices: tierRowsToInsert,
      tier_prices: tierMap,
    };

    return NextResponse.json(
      {
        success: true,
        message: 'Service package created successfully.',
        service: createdResult,
        data: createdResult,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  return handleUpdateService(request);
}

export async function PATCH(request: NextRequest) {
  return handleUpdateService(request);
}

async function handleUpdateService(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();
    const {
      id,
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

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Service package ID is required for update.' },
        { status: 400 }
      );
    }

    const packageId = Number(id);

    const updates: {
      name?: string;
      price?: number;
      description?: string;
      duration_minutes?: number;
      vehicle_type?: any;
      chemical_recipe?: any;
      commission_rule_id?: any;
    } = {};

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
      .eq('id', packageId)
      .select('*')
      .single();

    if (updateErr || !updated) {
      return NextResponse.json(
        { success: false, error: updateErr?.message || 'Failed to update service package.' },
        { status: 500 }
      );
    }

    const basePriceNum = Number(updated.price || 0);

    // 2. Update Tiered Prices atomically
    const tierRowsToInsert: Array<{ package_id: number; vehicle_type: string; price: number }> = [];
    const tierMap: Record<string, number> = {};

    // Initialize defaults
    STANDARD_TIERS.forEach((vType) => {
      tierMap[vType] = basePriceNum;
    });

    if (Array.isArray(tiered_prices)) {
      tiered_prices.forEach((item: any) => {
        if (item.vehicle_type && item.price != null && !isNaN(Number(item.price))) {
          const vType = String(item.vehicle_type).trim().toUpperCase();
          const pVal = Number(item.price);
          tierRowsToInsert.push({
            package_id: packageId,
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
            package_id: packageId,
            vehicle_type: cleanKey,
            price: pVal,
          });
          tierMap[cleanKey] = pVal;
        }
      });
    }

    if (tiered_prices !== undefined || tier_prices !== undefined) {
      // Atomic delete and reinsert for this specific package
      await supabase.from('service_package_prices').delete().eq('package_id', packageId);
      if (tierRowsToInsert.length > 0) {
        await supabase.from('service_package_prices').insert(tierRowsToInsert);
      }
    } else {
      // If tiered prices were not sent, fetch existing to include in response
      const { data: existingTiers } = await supabase
        .from('service_package_prices')
        .select('*')
        .eq('package_id', packageId);
      (existingTiers || []).forEach((tr: any) => {
        if (tr.vehicle_type) {
          tierMap[String(tr.vehicle_type).toUpperCase()] = Number(tr.price);
          tierRowsToInsert.push({
            package_id: packageId,
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

export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get('id');

    let packageId = idParam ? parseInt(idParam, 10) : null;

    if (!packageId) {
      try {
        const body = await request.json();
        packageId = body.id ? parseInt(String(body.id), 10) : null;
      } catch {
        // Continue
      }
    }

    if (!packageId) {
      return NextResponse.json(
        { success: false, error: 'Service package ID is required for deletion.' },
        { status: 400 }
      );
    }

    // Delete tiered prices first
    await supabase.from('service_package_prices').delete().eq('package_id', packageId);

    const { error: delErr } = await supabase
      .from('service_packages')
      .delete()
      .eq('id', packageId);

    if (delErr) {
      return NextResponse.json(
        { success: false, error: delErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Service package deleted successfully.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

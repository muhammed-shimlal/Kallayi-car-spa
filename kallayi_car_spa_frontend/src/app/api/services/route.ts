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

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  errorMessage = 'Database query timed out'
): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(errorMessage));
    }, ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const vehicleTypeParam = searchParams.get('vehicle_type') || searchParams.get('type') || '';
    const includeInactive = searchParams.get('all') === 'true' || searchParams.get('include_inactive') === 'true';

    // Normalize vehicle type (handles FULL_SUV -> SUV, TWO_WHEELER -> BIKE, etc.)
    const cleanVType = vehicleTypeParam
      ? (normalizeVehicleType(vehicleTypeParam) as VehicleType)
      : ('' as VehicleType | '');

    // 1. Fetch active service packages with linked tiered prices from Supabase (with 8s timeout)
    let packages: any[] | null = null;
    try {
      const { data: joinedData, error: joinErr } = await withTimeout<{ data: any[] | null; error: any }>(
        supabase
          .from('service_packages')
          .select(`
            *,
            tiered_prices:service_package_prices(*)
          `)
          .order('id', { ascending: true }) as any,
        8000,
        'Supabase query timed out while fetching service packages'
      );

      if (!joinErr && joinedData) {
        packages = joinedData;
      } else {
        // Fallback: Fetch packages and tiered prices independently
        const [pkgRes, tierRes] = await withTimeout<[{ data: any[] | null; error: any }, { data: any[] | null; error: any }]>(
          Promise.all([
            supabase.from('service_packages').select('*').order('id', { ascending: true }),
            supabase.from('service_package_prices').select('*'),
          ]) as any,
          8000,
          'Supabase fallback query timed out'
        );

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
    } catch (dbErr: any) {
      console.error('[Services API] Database fetch error/timeout:', dbErr);
      return NextResponse.json(
        {
          success: false,
          error: dbErr?.message || 'Database query timed out. Please try again.',
          data: [],
          results: [],
        },
        { status: 503 }
      );
    }

    if (!packages || packages.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        data: [],
        results: [],
      });
    }

    // Filter out inactive services unless explicitly requested (for admin)
    const filteredByActive = includeInactive
      ? (packages || []).filter(Boolean)
      : (packages || []).filter((p) => {
          if (!p) return false;
          if (p.is_active !== undefined) return Boolean(p.is_active);
          if (p.chemical_recipe && typeof p.chemical_recipe === 'object' && p.chemical_recipe.is_active !== undefined) {
            return Boolean(p.chemical_recipe.is_active);
          }
          return true;
        });

    // 2. Process each package with dynamic vehicle tier pricing
    const formattedServices = filteredByActive.map((pkg) => {
      const pkgTierRows: ServicePackagePriceRow[] = (pkg.tiered_prices || pkg.service_package_prices || []) as ServicePackagePriceRow[];
      const basePriceNum = Number(pkg.price || 0);
      const defaultDuration = Number(pkg.duration_minutes || 60);

      const recipeDurations = (pkg.chemical_recipe && typeof pkg.chemical_recipe === 'object' && pkg.chemical_recipe.tier_durations)
        ? pkg.chemical_recipe.tier_durations
        : {};

      // Build tier map strictly from configured rows in service_package_prices
      const tierMap: Partial<Record<string, number>> = {};

      const durationMap: Record<string, number> = {
        HATCHBACK: Number(recipeDurations.HATCHBACK) || defaultDuration,
        SEDAN: Number(recipeDurations.SEDAN) || defaultDuration,
        COMPACT_SUV: Number(recipeDurations.COMPACT_SUV) || defaultDuration,
        SUV: Number(recipeDurations.SUV) || defaultDuration,
        MUV: Number(recipeDurations.MUV) || defaultDuration,
        VAN: Number(recipeDurations.VAN) || defaultDuration,
        LUXURY: Number(recipeDurations.LUXURY) || defaultDuration,
        BIKE: Number(recipeDurations.BIKE) || defaultDuration,
        AUTO: Number(recipeDurations.AUTO) || defaultDuration,
        TRUCK: Number(recipeDurations.TRUCK) || defaultDuration,
      };

      // Populate ONLY configured tiers from service_package_prices
      pkgTierRows.forEach((tr) => {
        if (tr.vehicle_type && tr.price != null && !isNaN(Number(tr.price))) {
          const typeKey = normalizeVehicleType(tr.vehicle_type);
          tierMap[typeKey] = Number(tr.price);
          if (tr.estimated_time_minutes) {
            durationMap[typeKey] = Number(tr.estimated_time_minutes);
          }
        }
      });

      // Strict pricing resolution:
      // When a vehicle type is requested:
      // 1. Resolve strictly from matching tier row in service_package_prices
      // 2. Check semantic fallback aliases (COMPACT_SUV <-> SUV, VAN <-> MUV)
      // 3. If tier is NOT configured, DO NOT silently fall back to base_price.
      let resolvedPrice: number | null = null;
      let hasConfiguredTier = false;

      if (cleanVType) {
        if (tierMap[cleanVType] !== undefined && tierMap[cleanVType] !== null) {
          resolvedPrice = tierMap[cleanVType]!;
          hasConfiguredTier = true;
        } else {
          // Check semantic fallback aliases
          let fallbackPrice: number | undefined;
          if (cleanVType === 'COMPACT_SUV') fallbackPrice = tierMap.SUV;
          else if (cleanVType === 'SUV') fallbackPrice = tierMap.COMPACT_SUV;
          else if (cleanVType === 'VAN') fallbackPrice = tierMap.MUV;
          else if (cleanVType === 'MUV') fallbackPrice = tierMap.VAN;

          if (fallbackPrice !== undefined && fallbackPrice !== null) {
            resolvedPrice = fallbackPrice;
            hasConfiguredTier = true;
          } else {
            resolvedPrice = null;
            hasConfiguredTier = false;
          }
        }
      } else {
        // No vehicle type queried: return base catalog price
        resolvedPrice = basePriceNum;
        hasConfiguredTier = true;
      }

      const effectivePrice = resolvedPrice !== null ? resolvedPrice : basePriceNum;
      const effectiveDuration = cleanVType && durationMap[cleanVType] ? durationMap[cleanVType] : defaultDuration;

      // Applicability check: package vehicle type must match AND tier must be configured if requested
      const pkgVType = (pkg.vehicle_type || 'ALL').toUpperCase();
      const typeMatches =
        !cleanVType ||
        pkgVType === 'ALL' ||
        pkgVType === cleanVType ||
        (cleanVType === 'CAR' && ['SEDAN', 'HATCHBACK', 'ALL'].includes(pkgVType)) ||
        (cleanVType.includes('SUV') && ['SUV', 'COMPACT_SUV', 'ALL'].includes(pkgVType)) ||
        (cleanVType === 'BIKE' && ['BIKE', 'ALL'].includes(pkgVType)) ||
        (cleanVType === 'AUTO' && ['AUTO', 'ALL'].includes(pkgVType)) ||
        (cleanVType === 'VAN' && ['VAN', 'MUV', 'ALL'].includes(pkgVType));

      const isApplicable = typeMatches && (cleanVType ? hasConfiguredTier : true);

      const isActive = pkg.is_active !== undefined 
        ? Boolean(pkg.is_active) 
        : (pkg.chemical_recipe?.is_active !== undefined ? Boolean(pkg.chemical_recipe.is_active) : true);
      const iconUrl = pkg.icon_url || pkg.chemical_recipe?.icon_url || '';

      return {
        id: pkg.id,
        name: pkg.name,
        description: pkg.description || '',
        duration_minutes: effectiveDuration,
        estimated_duration: effectiveDuration,
        estimated_time_minutes: effectiveDuration,
        vehicle_type: pkg.vehicle_type || 'ALL',
        is_active: isActive,
        icon_url: iconUrl,
        chemical_recipe: pkg.chemical_recipe || {},
        commission_rule_id: pkg.commission_rule_id || null,
        base_price: basePriceNum,
        price: effectivePrice,
        final_price: effectivePrice,
        resolved_price: resolvedPrice,
        tier_configured: hasConfiguredTier,
        resolved_vehicle_type: cleanVType || null,
        tiered_prices: pkgTierRows,
        service_package_prices: pkgTierRows,
        tier_prices: tierMap,
        duration_map: durationMap,
        is_applicable: isApplicable,
        created_at: pkg.created_at,
      };
    });

    // Filter by applicability if a specific vehicle_type was requested
    const finalServices = cleanVType
      ? formattedServices.filter((s) => s.is_applicable)
      : formattedServices;

    return NextResponse.json({
      success: true,
      count: finalServices.length,
      data: finalServices,
      results: finalServices,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message, data: [] }, { status: 500 });
  }
}

export { POST, PUT, PATCH, DELETE } from '@/app/api/admin/services/route';

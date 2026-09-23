/**
 * KALLAYI CAR SPA & AUTO CARE - UNIVERSAL CUSTOMER & VEHICLE LIVE SEARCH API
 * Next.js 16 Route Handler: GET /api/customers/search?q=XYZ
 * Performs fast case-insensitive live search across Customer Name, Mobile Number, and Vehicle Plate.
 * Powered by unified cross-table search backend.
 */

import { NextRequest, NextResponse } from 'next/server';
import { GET as getUniversalSearch, UnifiedSearchResult } from '@/app/api/search/universal/route';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export interface CustomerSearchResult {
  customer_id: string;
  customer_name: string;
  phone_number: string;
  vehicle_id: string | number;
  plate_number: string;
  brand: string;
  make: string;
  model: string;
  vehicle_type: string;
  color: string;
  outstanding_balance?: number;
}

export async function GET(request: NextRequest) {
  try {
    const res = await getUniversalSearch(request);
    const data = await res.json();
    const results: UnifiedSearchResult[] = Array.isArray(data.results) ? data.results : [];

    const mapped: CustomerSearchResult[] = results.map((item) => ({
      customer_id: item.customer_id || '',
      customer_name: item.customer_name || 'Valued Customer',
      phone_number: item.phone_number || '',
      vehicle_id: item.vehicle_id || '',
      plate_number: item.plate_number || '',
      brand: item.make || '',
      make: item.make || '',
      model: item.model || '',
      vehicle_type: item.vehicle_type || 'SEDAN',
      color: item.color || '',
      outstanding_balance: item.outstanding_balance || 0,
    }));

    return NextResponse.json(mapped);
  } catch (error: any) {
    console.error('[Universal Customer Search Error]:', error);
    return NextResponse.json([]);
  }
}

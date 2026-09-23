/**
 * KALLAYI CAR SPA & AUTO CARE - UNIFIED MULTI-FIELD SEARCH & VEHICLE LOOKUP API
 * Next.js 16 Route Handler: GET /api/customer-vehicles/lookup?q=XYZ
 * Performs universal search across Customer Name, License Plate, and Phone Number.
 * Powered by unified cross-table search backend.
 */

import { NextRequest } from 'next/server';
import { GET as getUniversalSearch } from '@/app/api/search/universal/route';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export type { UnifiedSearchResult } from '@/app/api/search/universal/route';

export async function GET(request: NextRequest) {
  return getUniversalSearch(request);
}

/**
 * KALLAYI CAR SPA & AUTO CARE - OUTSTANDING CREDIT ALIAS ROUTE
 * Next.js 16 Route Handler: GET /api/finance/dashboard/outstanding_credit
 */

import { NextRequest } from 'next/server';
import { GET as getKhata } from '@/app/api/finance/khata/route';

export async function GET(request: NextRequest) {
  return getKhata(request);
}

/**
 * KALLAYI CAR SPA & AUTO CARE - CUSTOMERS ME LEDGER ALIAS ROUTE
 * Next.js 16 Route Handler: GET /api/customers/me/ledger
 */

import { NextRequest } from 'next/server';
import { GET as getCustomerKhata } from '@/app/api/customer/khata/route';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  return getCustomerKhata(request);
}

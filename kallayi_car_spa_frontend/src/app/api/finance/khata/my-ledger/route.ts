/**
 * KALLAYI CAR SPA & AUTO CARE - FINANCE KHATA MY-LEDGER ALIAS ROUTE
 * Next.js 16 Route Handler: GET /api/finance/khata/my-ledger
 */

import { NextRequest } from 'next/server';
import { GET as getCustomerLedger } from '@/app/api/customers/me/ledger/route';

export async function GET(request: NextRequest) {
  return getCustomerLedger(request);
}

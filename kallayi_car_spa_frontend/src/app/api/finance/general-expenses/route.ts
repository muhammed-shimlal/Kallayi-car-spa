/**
 * KALLAYI CAR SPA & AUTO CARE - GENERAL EXPENSES ROUTE
 * Next.js 16 Route Handler: GET & POST /api/finance/general-expenses
 * Mirrors and delegates to /api/finance/expenses for full database parity.
 */

import { NextRequest } from 'next/server';
import { GET as getExpenses, POST as postExpenses } from '@/app/api/finance/expenses/route';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  return getExpenses(request);
}

export async function POST(request: NextRequest) {
  return postExpenses(request);
}

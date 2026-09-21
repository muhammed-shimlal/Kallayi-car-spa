/**
 * KALLAYI CAR SPA & AUTO CARE - CLOSE REGISTER API ROUTE
 * Next.js 16 Route Handler: GET & POST /api/finance/close-register
 */

import { NextRequest } from 'next/server';
import { GET as getDailyAudit, POST as postDailyAudit } from '@/app/api/finance/daily-audit/route';

export async function GET(request: NextRequest) {
  const res = await getDailyAudit(request);
  const json = await res.json();
  if (json?.data?.summary) {
    return new Response(JSON.stringify({
      gross_revenue: json.data.summary.gross_revenue,
      expected_cash_in_till: json.data.summary.expected_cash_in_till,
      total_expenses: json.data.summary.total_expenses,
      is_locked: json.data.is_locked,
      ...json.data.summary,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return res;
}

export async function POST(request: NextRequest) {
  return postDailyAudit(request);
}

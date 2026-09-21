/**
 * KALLAYI CAR SPA & AUTO CARE - DASHBOARD REVENUE CHART ALIAS ROUTE
 * Next.js 16 Route Handler: GET /api/finance/dashboard/revenue_chart
 */

import { NextResponse } from 'next/server';
import { GET as getOverview } from '@/app/api/dashboard/overview/route';

export async function GET() {
  const res = await getOverview();
  const json = await res.json();
  return NextResponse.json(json.chartData || []);
}

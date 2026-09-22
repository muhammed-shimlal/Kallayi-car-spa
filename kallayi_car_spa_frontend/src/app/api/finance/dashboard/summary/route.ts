/**
 * KALLAYI CAR SPA & AUTO CARE - FINANCE DASHBOARD SUMMARY API
 * Next.js 16 Route Handler: GET /api/finance/dashboard/summary
 * Direct endpoint for real-time financial KPI aggregations.
 */

import { NextResponse } from 'next/server';
import { GET as getOverview } from '@/app/api/dashboard/overview/route';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const res = await getOverview();
    const data = await res.json();
    return NextResponse.json({
      success: true,
      ...(data.kpiData || {}),
      kpiData: data.kpiData || {},
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

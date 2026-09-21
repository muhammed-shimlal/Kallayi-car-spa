/**
 * KALLAYI CAR SPA & AUTO CARE - TODAY WASHED VEHICLES API
 * Next.js 16 Route Handler: GET /api/bookings/today-washed
 */

import { NextResponse } from 'next/server';
import { GET as getOverview } from '@/app/api/dashboard/overview/route';

export async function GET() {
  const res = await getOverview();
  const json = await res.json();
  const list = json.todayWashedVehicles || [];
  return NextResponse.json({
    count: list.length,
    today_washed_count: list.length,
    results: list,
    data: list,
  });
}

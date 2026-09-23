/**
 * KALLAYI CAR SPA & AUTO CARE - STAFF DASHBOARD STATS ALIAS ROUTE
 * Next.js 16 Route Handler: GET /api/staff/dashboard/stats
 */

import { NextRequest } from 'next/server';
import { GET as handleDashboardStats } from '../../dashboard-stats/route';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  return handleDashboardStats(request);
}

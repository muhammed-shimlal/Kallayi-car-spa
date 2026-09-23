/**
 * KALLAYI CAR SPA & AUTO CARE - STAFF DASHBOARD STATS V1 ALIAS ROUTE
 * Next.js 16 Route Handler: GET /api/v1/staff/dashboard-stats
 */

import { NextRequest } from 'next/server';
import { GET as handleDashboardStats } from '../../staff/dashboard-stats/route';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  return handleDashboardStats(request);
}

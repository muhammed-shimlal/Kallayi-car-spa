/**
 * KALLAYI CAR SPA & AUTO CARE - CASH HANDOVER VEHICLE BREAKDOWN ENDPOINT
 * Next.js 16 Route Handler: GET /api/staff/cash-handover/breakdown?staff_id=[id]
 * Directly returns itemized vehicles for a staff member's cash custody.
 */

import { NextRequest } from 'next/server';
import { GET as handleHandoverGet } from '../route';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  url.searchParams.set('view', 'breakdown');
  const modifiedRequest = new NextRequest(url, { headers: request.headers });
  return handleHandoverGet(modifiedRequest);
}

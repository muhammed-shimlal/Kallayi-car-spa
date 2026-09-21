/**
 * KALLAYI CAR SPA & AUTO CARE - MANUAL KHATA CHARGE API ALIAS
 * Next.js 16 Route Handler: POST /api/finance/khata/manual-charge
 * Delegates to /api/finance/khata POST handler.
 */

import { NextRequest } from 'next/server';
import { POST as handleKhataPost } from '../route';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  return handleKhataPost(request);
}

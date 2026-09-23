/**
 * KALLAYI CAR SPA & AUTO CARE - CHANGE PASSWORD V1 ALIAS ROUTE
 * Next.js 16 Route Handler: POST /api/v1/core/change-password
 */

import { NextRequest } from 'next/server';
import { POST as handleChangePassword } from '../../core/change-password/route';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  return handleChangePassword(request);
}

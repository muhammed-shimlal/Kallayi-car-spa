/**
 * KALLAYI CAR SPA & AUTO CARE - USERS ME ALIAS ROUTE
 * Next.js 16 Route Handler: GET /api/core/users/me
 * Ensures 100% backward compatibility for existing client guards.
 */

import { NextRequest } from 'next/server';
import { GET as getAuthMe } from '@/app/api/auth/me/route';

export async function GET(request: NextRequest) {
  return getAuthMe(request);
}

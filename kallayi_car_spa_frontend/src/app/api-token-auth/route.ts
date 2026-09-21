/**
 * KALLAYI CAR SPA & AUTO CARE - API TOKEN AUTH ALIAS
 * Next.js 16 Route Handler: POST /api-token-auth
 */

import { NextRequest } from 'next/server';
import { POST as authLogin } from '@/app/api/auth/login/route';

export async function POST(request: NextRequest) {
  return authLogin(request);
}

/**
 * KALLAYI CAR SPA & AUTO CARE - WALK-IN ACCOUNT CLAIMING API
 * Next.js 16 Route Handler: POST /api/auth/claim-account
 * 
 * Allows a walk-in customer whose phone was entered at the POS
 * to register their password and claim their full customer profile,
 * vehicle garage, booking history, and loyalty/credit balance.
 */

import { NextRequest, NextResponse } from 'next/server';
import { POST as registerHandler } from '@/app/api/customers/register/route';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  // Delegate directly to the comprehensive registerHandler which implements
  // walk-in claiming (Case B) with zero duplicate constraint errors, balance preservation,
  // and garage vehicle auto-linking.
  return await registerHandler(request);
}

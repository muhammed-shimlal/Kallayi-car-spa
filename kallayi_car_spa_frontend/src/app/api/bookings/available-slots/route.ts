/**
 * KALLAYI CAR SPA & AUTO CARE - TIME SLOT AVAILABILITY API ALIAS
 * Next.js 16 Route Handler: GET /api/bookings/available-slots
 */

import { NextRequest } from 'next/server';
import { GET as getAvailableSlots } from '@/app/api/bookings/available_slots/route';

export async function GET(request: NextRequest) {
  return getAvailableSlots(request);
}

/**
 * KALLAYI CAR SPA & AUTO CARE - EXPRESS WALKIN BOOKING ALIAS ROUTE
 * Next.js 16 Route Handler: POST /api/bookings/express-walkin
 */

import { NextRequest } from 'next/server';
import { POST as createBooking } from '@/app/api/bookings/route';

export async function POST(request: NextRequest) {
  return createBooking(request);
}

/**
 * KALLAYI CAR SPA & AUTO CARE - SERVICE PACKAGES ALIAS ROUTE
 * Next.js 16 Route Handler: GET, POST, PUT, PATCH, DELETE /api/service-packages
 */

import { NextRequest } from 'next/server';
import {
  GET as getServices,
  POST as postServices,
  PUT as putServices,
  PATCH as patchServices,
  DELETE as deleteServices,
} from '@/app/api/bookings/services/route';

export async function GET(request: NextRequest) {
  return getServices(request);
}

export async function POST(request: NextRequest) {
  return postServices(request);
}

export async function PUT(request: NextRequest) {
  return putServices(request);
}

export async function PATCH(request: NextRequest) {
  return patchServices(request);
}

export async function DELETE(request: NextRequest) {
  return deleteServices(request);
}

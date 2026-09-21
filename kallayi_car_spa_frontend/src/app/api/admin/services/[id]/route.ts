/**
 * KALLAYI CAR SPA & AUTO CARE - INDIVIDUAL ADMIN SERVICE ALIAS ROUTE
 * Next.js 16 Route Handler: GET, PUT, PATCH, DELETE /api/admin/services/[id]
 */

import { NextRequest } from 'next/server';
import {
  GET as getServiceById,
  PUT as putServiceById,
  PATCH as patchServiceById,
  DELETE as deleteServiceById,
} from '@/app/api/services/[id]/route';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return getServiceById(request, context);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return putServiceById(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return patchServiceById(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return deleteServiceById(request, context);
}

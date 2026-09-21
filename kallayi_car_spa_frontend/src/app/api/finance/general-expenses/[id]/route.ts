/**
 * KALLAYI CAR SPA & AUTO CARE - INDIVIDUAL GENERAL EXPENSES ALIAS ROUTE
 * Next.js 16 Route Handler: GET, PUT, PATCH, DELETE /api/finance/general-expenses/[id]
 */

import { NextRequest } from 'next/server';
import {
  GET as getExpenseById,
  PUT as putExpenseById,
  PATCH as patchExpenseById,
  DELETE as deleteExpenseById,
} from '@/app/api/finance/expenses/[id]/route';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return getExpenseById(request, context);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return putExpenseById(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return patchExpenseById(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return deleteExpenseById(request, context);
}

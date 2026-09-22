/**
 * KALLAYI CAR SPA & AUTO CARE - EXPENSES CATEGORIES ALIAS ROUTE
 * Next.js 16 Route Handler: GET & POST /api/finance/expenses/categories
 * Delegates to /api/finance/expense-categories.
 */

import { NextRequest } from 'next/server';
import { GET as getCategories, POST as postCategory } from '@/app/api/finance/expense-categories/route';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  return getCategories();
}

export async function POST(request: NextRequest) {
  return postCategory(request);
}

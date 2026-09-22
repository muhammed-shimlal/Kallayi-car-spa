/**
 * KALLAYI CAR SPA & AUTO CARE - PDF INVOICE GENERATION ROUTE (PLURAL ALIAS)
 * Next.js 16 Route Handler: GET /api/finance/invoices/[id]/pdf
 * Delegates to /api/finance/invoice/[id]/pdf.
 */

import { NextRequest } from 'next/server';
import { GET as getInvoicePdf } from '@/app/api/finance/invoice/[id]/pdf/route';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface RouteContext {
  params: Promise<{ id: string }> | { id: string };
}

export async function GET(request: NextRequest, context: RouteContext) {
  return getInvoicePdf(request, context);
}

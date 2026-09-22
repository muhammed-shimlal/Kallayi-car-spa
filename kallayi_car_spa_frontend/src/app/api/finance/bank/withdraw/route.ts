/**
 * KALLAYI CAR SPA & AUTO CARE - BANK CASH WITHDRAWAL API
 * Next.js 16 Route Handler: POST /api/finance/bank/withdraw
 * Dedicated endpoint for recording shop expenses, petty cash, or owner drawings.
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    // Forward directly to the unified bank POST handler with WITHDRAWAL transaction_type
    const origin = request.nextUrl.origin;
    const contentType = request.headers.get('content-type') || '';

    let forwardBody: BodyInit;
    const forwardHeaders: HeadersInit = {};

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      formData.set('transaction_type', 'WITHDRAWAL');
      forwardBody = formData;
    } else {
      const json = await request.json();
      json.transaction_type = 'WITHDRAWAL';
      forwardBody = JSON.stringify(json);
      forwardHeaders['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${origin}/api/finance/bank`, {
      method: 'POST',
      headers: {
        ...forwardHeaders,
        cookie: request.headers.get('cookie') || '',
        authorization: request.headers.get('authorization') || '',
      },
      body: forwardBody,
    });

    const result = await res.json();
    return NextResponse.json(result, { status: res.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to process cash withdrawal';
    console.error('[Bank Withdraw API Exception]:', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

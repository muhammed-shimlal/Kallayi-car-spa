/**
 * KALLAYI CAR SPA & AUTO CARE - BANK CASH DEPOSIT API
 * Next.js 16 Route Handler: POST /api/finance/bank/deposit
 * Dedicated endpoint for recording cash deposits into bank accounts.
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const origin = request.nextUrl.origin;
    const contentType = request.headers.get('content-type') || '';

    let forwardBody: BodyInit;
    const forwardHeaders: HeadersInit = {};

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      formData.set('transaction_type', 'DEPOSIT');
      forwardBody = formData;
    } else {
      const json = await request.json();
      json.transaction_type = 'DEPOSIT';
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
    const message = err instanceof Error ? err.message : 'Failed to process cash deposit';
    console.error('[Bank Deposit API Exception]:', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

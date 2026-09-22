/**
 * KALLAYI CAR SPA & AUTO CARE - BANK TRANSACTIONS LEDGER API
 * Next.js 16 Route Handler: GET & POST /api/finance/bank/transactions
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const res = await fetch(`${origin}/api/finance/bank`, {
    headers: {
      cookie: request.headers.get('cookie') || '',
      authorization: request.headers.get('authorization') || '',
    },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const contentType = request.headers.get('content-type') || '';

  let forwardBody: BodyInit;
  const forwardHeaders: HeadersInit = {};

  if (contentType.includes('multipart/form-data')) {
    forwardBody = await request.formData();
  } else {
    forwardBody = JSON.stringify(await request.json());
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
}

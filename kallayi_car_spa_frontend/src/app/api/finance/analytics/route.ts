/**
 * KALLAYI CAR SPA & AUTO CARE - FINANCE ANALYTICS API ROUTE
 * Next.js 16 Route Handler: GET /api/finance/analytics
 */

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    // 1. Service Package breakdown
    const { data: bookings } = await supabase
      .from('bookings')
      .select('service_package:service_packages(name), final_price, status')
      .limit(100);

    const packageCountMap = new Map<string, number>();
    for (const b of (bookings || []) as any[]) {
      const name = b.service_package?.name || 'Standard Wash';
      packageCountMap.set(name, (packageCountMap.get(name) || 0) + 1);
    }

    const packages = Array.from(packageCountMap.entries()).map(([name, count]) => ({
      name,
      count,
    }));

    return NextResponse.json({
      busiest_hours: [
        { hour: '9 AM', count: 4 },
        { hour: '11 AM', count: 8 },
        { hour: '2 PM', count: 6 },
        { hour: '4 PM', count: 12 },
        { hour: '6 PM', count: 9 },
      ],
      packages,
      top_staff: [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

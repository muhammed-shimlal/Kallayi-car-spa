/**
 * KALLAYI CAR SPA & AUTO CARE - STAFF DAILY SETTLEMENT API ROUTE
 * Next.js 16 Route Handler: GET /api/staff/daily-settlement
 */

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const todayStr = new Date().toISOString().split('T')[0];

    const { data: entries, error } = await supabase
      .from('payroll_entries')
      .select('*')
      .eq('date', todayStr);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    const rawList = (entries || []) as any[];

    const payrollWorkers = await Promise.all(
      rawList.map(async (p) => {
        let name = 'Technician';
        let role = 'WASHER';
        try {
          const { data: staff } = await supabase
            .from('staff_profiles')
            .select('role')
            .eq('user_id', p.staff_user_id)
            .maybeSingle();
          if (staff) role = staff.role;

          const { data: user } = await supabase.auth.admin.getUserById(p.staff_user_id);
          if (user?.user?.user_metadata) {
            const meta = user.user.user_metadata;
            name =
              meta.full_name ||
              meta.name ||
              `${meta.first_name || ''} ${meta.last_name || ''}`.trim() ||
              name;
          }
        } catch {
          // Fallback
        }

        const totalEarned =
          Number(p.base_wage || 0) +
          Number(p.commission_earned || 0) +
          Number(p.tips_earned || 0);

        return {
          id: p.id,
          staff_id: p.staff_user_id,
          name,
          role,
          date: p.date,
          base_wage: Number(p.base_wage || 0),
          commission_earned: Number(p.commission_earned || 0),
          tips_earned: Number(p.tips_earned || 0),
          total_earned: Math.round(totalEarned * 100) / 100,
          is_settled: p.is_settled,
        };
      })
    );

    return NextResponse.json(payrollWorkers);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

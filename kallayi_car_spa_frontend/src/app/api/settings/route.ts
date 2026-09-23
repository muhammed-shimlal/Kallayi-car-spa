import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export interface BusinessSettingsResponse {
  success: boolean;
  settings: {
    upi_id: string;
    business_name: string;
    merchant_name: string;
    phone?: string;
  };
}

/**
 * GET /api/settings
 * Returns public / staff business settings including merchant UPI configuration.
 */
export async function GET() {
  try {
    let upiId = (process.env.NEXT_PUBLIC_UPI_ID || process.env.UPI_ID || 'kabeerkallayi2020-1@oksbi').trim();
    let businessName = (process.env.NEXT_PUBLIC_MERCHANT_NAME || process.env.MERCHANT_NAME || 'Kallayi Car Spa').trim();

    // Check if dynamic business_settings table exists in database
    try {
      const supabase = getSupabaseAdmin() as any;
      const { data: dbSettings, error } = await supabase
        .from('business_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (!error && dbSettings) {
        if (dbSettings.upi_id) upiId = String(dbSettings.upi_id).trim();
        if (dbSettings.business_name || dbSettings.merchant_name) {
          businessName = String(dbSettings.business_name || dbSettings.merchant_name).trim();
        }
      }
    } catch {
      // Fallback cleanly to configured environment variables
    }

    return NextResponse.json({
      success: true,
      settings: {
        upi_id: upiId,
        business_name: businessName,
        merchant_name: businessName,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to retrieve business settings',
        settings: {
          upi_id: process.env.NEXT_PUBLIC_UPI_ID || 'kabeerkallayi2020-1@oksbi',
          business_name: process.env.NEXT_PUBLIC_MERCHANT_NAME || 'Kallayi Car Spa',
          merchant_name: process.env.NEXT_PUBLIC_MERCHANT_NAME || 'Kallayi Car Spa',
        },
      },
      { status: 500 }
    );
  }
}

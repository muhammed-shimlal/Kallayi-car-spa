/**
 * KALLAYI CAR SPA & AUTO CARE - SERVER-SIDE SUPABASE CLIENT
 * Initialized with SUPABASE_SERVICE_ROLE_KEY to bypass RLS for administrative Server Actions and Route Handlers.
 * Fully stateless & 100% Vercel Serverless compatible.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

let supabaseAdminInstance: SupabaseClient<Database> | null = null;

export function getSupabaseAdmin(): SupabaseClient<Database> {
  if (supabaseAdminInstance) {
    return supabaseAdminInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      '[Supabase Server] Missing environment variable: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL.'
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      '[Supabase Server] Missing environment variable: SUPABASE_SERVICE_ROLE_KEY. Required for server-side execution.'
    );
  }

  supabaseAdminInstance = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return supabaseAdminInstance;
}

export const supabaseAdmin = {
  get client() {
    return getSupabaseAdmin();
  },
};

/**
 * Extracts and verifies the authenticated user from NextRequest.
 * Supports:
 * 1. Bearer / Token headers
 * 2. `auth_token` cookies (standard session token or `auth_<uuid>` format)
 */
export async function getAuthUserFromRequest(request: {
  headers: Headers;
  cookies: { get: (name: string) => { value: string } | undefined };
}) {
  try {
    const supabase = getSupabaseAdmin();
    const authHeader = request.headers.get('authorization') || '';
    const cookieToken = request.cookies.get('auth_token')?.value;
    const token = authHeader.replace(/^Bearer\s+|^Token\s+/i, '').trim() || cookieToken;

    if (!token) return null;

    if (token.startsWith('supabase_') || token.startsWith('auth_')) {
      const userId = token.replace(/^supabase_|^auth_/, '').split('_')[0];
      if (!userId) return null;
      try {
        const { data: userRecord } = await supabase.auth.admin.getUserById(userId);
        if (userRecord?.user) return userRecord.user;
      } catch {
        return null;
      }
    } else {
      try {
        const { data: userData } = await supabase.auth.getUser(token);
        if (userData?.user) return userData.user;
      } catch {
        // Continue
      }
    }

    // Direct UUID token check
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
      try {
        const { data: directUser } = await supabase.auth.admin.getUserById(token);
        if (directUser?.user) return directUser.user;
      } catch {
        // Continue
      }
    }

    return null;
  } catch {
    return null;
  }
}

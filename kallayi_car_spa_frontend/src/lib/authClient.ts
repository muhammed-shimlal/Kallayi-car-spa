import { createBrowserClient } from '@supabase/ssr';
import Cookies from 'js-cookie';
import api from '@/lib/api';

/**
 * Standardized, robust sign-out handler across all portals and screen sizes.
 * - Signs out from Supabase Auth
 * - Completely clears localStorage and sessionStorage
 * - Cleans up auth_token, access_token, and user_role cookies
 * - Resets in-memory Axios authorization headers
 * - Performs a clean, hard redirect to /login
 */
export const handleSignOut = async (): Promise<void> => {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
      await supabase.auth.signOut().catch((err: unknown) => {
        console.warn('[SignOut] Supabase signOut notice:', err);
      });
    }

    // 1. Clear local cache & storage
    if (typeof window !== 'undefined') {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (storageErr) {
        console.warn('[SignOut] Storage clear warning:', storageErr);
      }
    }

    // 2. Clear standard cookies (both root and default paths)
    try {
      Cookies.remove('auth_token');
      Cookies.remove('auth_token', { path: '/' });
      Cookies.remove('access_token');
      Cookies.remove('access_token', { path: '/' });
      Cookies.remove('user_role');
      Cookies.remove('user_role', { path: '/' });
    } catch {
      // ignore
    }

    if (typeof document !== 'undefined') {
      const expireStr = '=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; Max-Age=0;';
      document.cookie = `auth_token${expireStr}`;
      document.cookie = `access_token${expireStr}`;
      document.cookie = `user_role${expireStr}`;
    }

    // 3. Clear Axios in-memory authorization header
    if (api?.defaults?.headers?.common) {
      delete api.defaults.headers.common['Authorization'];
    }

    // 4. Force hard redirect to login page
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  } catch (error) {
    console.error('Sign out error:', error);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }
};

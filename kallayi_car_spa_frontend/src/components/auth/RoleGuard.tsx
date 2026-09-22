'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import api from '@/lib/api';

export type UserRole = 'ADMIN' | 'MANAGER' | 'WASHER' | 'DRIVER' | 'TECHNICIAN' | 'CUSTOMER' | 'STAFF';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

export default function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Stabilize allowedRoles to prevent infinite re-render loops caused by array literals in layouts
  const rolesKey = useMemo(() => allowedRoles.slice().sort().join(','), [allowedRoles]);

  useEffect(() => {
    let isMounted = true;

    const checkAuthAndRole = async () => {
      // 1. Check for token across Cookies, localStorage, and sessionStorage
      let token =
        Cookies.get('auth_token') ||
        Cookies.get('access_token') ||
        (typeof window !== 'undefined'
          ? localStorage.getItem('auth_token') ||
            localStorage.getItem('access_token') ||
            localStorage.getItem('token') ||
            sessionStorage.getItem('auth_token')
          : null);

      // If token not found immediately, provide a brief 100ms grace period for storage flush
      if (!token && typeof window !== 'undefined') {
        await new Promise((resolve) => setTimeout(resolve, 100));
        token =
          Cookies.get('auth_token') ||
          Cookies.get('access_token') ||
          localStorage.getItem('auth_token') ||
          localStorage.getItem('access_token') ||
          localStorage.getItem('token');
      }

      if (!token) {
        if (isMounted) {
          setIsAuthorized(false);
          setIsLoading(false);
          router.replace('/login');
        }
        return;
      }

      // Ensure axios instance in-memory header has the token attached
      const cleanToken = token.replace(/^Bearer\s+|^Token\s+/i, '').trim();
      api.defaults.headers.common['Authorization'] = `Bearer ${cleanToken}`;

      // 2. Fast-path: Check cached user profile in localStorage for instantaneous UX
      let cachedUser: any = null;
      try {
        const rawUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
        if (rawUser) cachedUser = JSON.parse(rawUser);
      } catch {
        // Continue
      }

      let hasFastPathAuthorized = false;

      if (cachedUser && isMounted) {
        const cachedRole = (cachedUser.role || '').toUpperCase();
        const isCachedAdmin = Boolean(
          cachedUser.is_superuser ||
          cachedRole === 'ADMIN' ||
          cachedRole === 'MANAGER'
        );
        const isCachedStaff = Boolean(
          !isCachedAdmin && (
            cachedRole === 'STAFF' ||
            cachedUser.is_staff ||
            cachedUser.is_staff_user ||
            ['WASHER', 'DRIVER', 'TECHNICIAN'].includes(cachedRole)
          )
        );

        const effectiveCachedRole = isCachedAdmin ? 'ADMIN' : isCachedStaff ? 'STAFF' : (cachedRole || 'CUSTOMER');

        if (
          allowedRoles.includes(cachedRole as UserRole) ||
          allowedRoles.includes(effectiveCachedRole as UserRole) ||
          (isCachedAdmin && allowedRoles.includes('ADMIN')) ||
          (isCachedStaff && (allowedRoles.includes('STAFF') || allowedRoles.some(r => ['WASHER', 'DRIVER', 'TECHNICIAN'].includes(r))))
        ) {
          setIsAuthorized(true);
          setIsLoading(false);
          hasFastPathAuthorized = true;
        }
      }

      // 3. Verify user & role against the backend source of truth (/api/core/users/me)
      try {
        const res = await api.get('/core/users/me');
        const user = res.data;

        if (!user || (!user.id && !user.role)) {
          throw new Error('Invalid user profile response');
        }

        // Cache fresh verified user profile in localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(user));
        }

        const userRole = (user.role || '').toUpperCase();
        const isAdmin = Boolean(
          user.is_superuser ||
          userRole === 'ADMIN' ||
          userRole === 'MANAGER'
        );

        const isStaff = Boolean(
          !isAdmin && (
            userRole === 'STAFF' ||
            user.is_staff ||
            user.is_staff_user ||
            ['WASHER', 'DRIVER', 'TECHNICIAN'].includes(userRole)
          )
        );

        const effectiveRole: UserRole = isAdmin
          ? 'ADMIN'
          : isStaff
          ? (allowedRoles.includes(userRole as UserRole) ? (userRole as UserRole) : 'STAFF')
          : (userRole || 'CUSTOMER');

        if (!isMounted) return;

        const isAllowed = 
          allowedRoles.includes(effectiveRole) ||
          (isAdmin && allowedRoles.includes('ADMIN')) ||
          (isStaff && (allowedRoles.includes('STAFF') || allowedRoles.some(r => ['WASHER', 'DRIVER', 'TECHNICIAN'].includes(r))));

        if (isAllowed) {
          setIsAuthorized(true);
        } else {
          // Redirect unauthorized user to their appropriate dashboard
          if (isAdmin) {
            router.replace('/admin/dashboard');
          } else if (isStaff) {
            router.replace('/staff/queue');
          } else {
            router.replace('/customer/dashboard');
          }
        }
      } catch (error: any) {
        console.error('RoleGuard authentication verification error:', error);

        // If cached user was already verified as authorized, do not immediately bounce back on transient errors
        if (hasFastPathAuthorized) {
          console.warn('Retaining authorization based on validated cached session.');
          if (isMounted) setIsLoading(false);
          return;
        }

        // Check if genuine 401 Unauthorized
        if (error.response?.status === 401) {
          if (isMounted) {
            Cookies.remove('auth_token', { path: '/' });
            Cookies.remove('access_token', { path: '/' });
            if (typeof window !== 'undefined') {
              localStorage.removeItem('auth_token');
              localStorage.removeItem('access_token');
              localStorage.removeItem('token');
              localStorage.removeItem('user');
            }
            router.replace('/login');
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    checkAuthAndRole();

    return () => {
      isMounted = false;
    };
  }, [router, rolesKey]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050507] flex flex-col items-center justify-center text-white">
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-[#01FFFF]/20 border-t-[#01FFFF] animate-spin" />
          <div className="w-8 h-8 rounded-full bg-[#01FFFF]/10 flex items-center justify-center">
            <span className="w-2 h-2 rounded-full bg-[#01FFFF] animate-ping" />
          </div>
        </div>
        <p className="mt-4 text-xs font-mono text-neutral-400 tracking-widest uppercase">
          Verifying Authorization...
        </p>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}

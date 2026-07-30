'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import api from '@/lib/api';

export type UserRole = 'ADMIN' | 'MANAGER' | 'WASHER' | 'DRIVER' | 'TECHNICIAN' | 'CUSTOMER';

interface RoleGuardProps {
    children: React.ReactNode;
    allowedRoles: UserRole[];
}

export default function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const checkAuthAndRole = async () => {
            const token = Cookies.get('auth_token') || (typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null);

            if (!token) {
                if (isMounted) {
                    setIsAuthorized(false);
                    setIsLoading(false);
                    router.replace('/login');
                }
                return;
            }

            try {
                // Verify user & role against the backend source of truth
                const res = await api.get('/core/users/me/');
                const user = res.data;
                const userRole: UserRole = user.role || 'CUSTOMER';

                if (!isMounted) return;

                if (allowedRoles.includes(userRole)) {
                    setIsAuthorized(true);
                } else {
                    // Redirect unauthorized user to their role-specific dashboard
                    if (['ADMIN', 'MANAGER'].includes(userRole)) {
                        router.replace('/admin/dashboard');
                    } else if (['WASHER', 'DRIVER', 'TECHNICIAN'].includes(userRole)) {
                        router.replace('/staff/dashboard');
                    } else {
                        router.replace('/customer/dashboard');
                    }
                }
            } catch (error) {
                console.error('RoleGuard authentication error:', error);
                if (isMounted) {
                    Cookies.remove('auth_token');
                    if (typeof window !== 'undefined') {
                        localStorage.removeItem('auth_token');
                    }
                    router.replace('/login');
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
    }, [router, allowedRoles]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#050505] flex flex-col items-[#center] justify-center text-white">
                <div className="relative w-16 h-16 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-2 border-red-500/20 border-t-red-500 animate-spin" />
                    <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    </div>
                </div>
                <p className="mt-4 text-xs font-mono text-neutral-400 tracking-widest uppercase">
                    Verifying Access Level...
                </p>
            </div>
        );
    }

    if (!isAuthorized) {
        return null;
    }

    return <>{children}</>;
}

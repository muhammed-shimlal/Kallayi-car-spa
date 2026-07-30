import React from 'react';
import RoleGuard from '@/components/auth/RoleGuard';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <RoleGuard allowedRoles={['ADMIN', 'MANAGER']}>
            {children}
        </RoleGuard>
    );
}

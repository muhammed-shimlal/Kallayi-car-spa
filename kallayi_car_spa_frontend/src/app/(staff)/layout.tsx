import React from 'react';
import RoleGuard from '@/components/auth/RoleGuard';

export default function StaffLayout({ children }: { children: React.ReactNode }) {
    return (
        <RoleGuard allowedRoles={['WASHER', 'DRIVER', 'TECHNICIAN', 'ADMIN', 'MANAGER']}>
            {children}
        </RoleGuard>
    );
}

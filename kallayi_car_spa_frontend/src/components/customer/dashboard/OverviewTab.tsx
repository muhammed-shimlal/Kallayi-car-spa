'use client';

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Plus, Activity, LogOut } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/Skeleton';
import api from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ActiveWash {
    status: string;
    progress: number;
    package: string;
    vehicle: string;
}

interface OverviewTabProps {
    setIsBooking: (val: boolean) => void;
    handleLogout: () => void;
    customerName?: string;
}

// ---------------------------------------------------------------------------
// Hook: useActiveWash (React Query)
// ---------------------------------------------------------------------------
function useActiveWash() {
    return useQuery<ActiveWash | null>({
        queryKey: ['activeWash'],
        queryFn: async () => {
            const res = await api.get('/bookings/');
            const bookings: any[] = res.data;
            const active = bookings.find(
                (b) => !['COMPLETED', 'CANCELLED'].includes(b.status)
            );
            if (!active) return null;

            let progress = 10;
            if (active.status === 'IN_PROGRESS') progress = 50;
            if (active.status === 'READY') progress = 90;

            return {
                status: active.status,
                progress,
                package: active.service_package_name || active.service_package_details?.name || 'Standard Wash',
                vehicle: active.vehicle_plate || active.vehicle_info || 'Unknown Vehicle',
            };
        },
        // Refetch every 30 s as a polling fallback
        refetchInterval: 30_000,
        staleTime: 15_000,
    });
}

// ---------------------------------------------------------------------------
// Sub-component: Cinematic Skeleton
// ---------------------------------------------------------------------------
function ActiveWashSkeleton() {
    return (
        <div className="w-full border border-white/10 bg-white/[0.03] p-6 md:p-8 rounded-3xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-white/10" />
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="space-y-2">
                    <Skeleton className="h-5 w-36 rounded-lg" />
                    <Skeleton className="h-3 w-24 rounded-md" />
                </div>
                <Skeleton className="h-7 w-28 rounded-sm" />
            </div>
            <Skeleton className="h-1 w-full rounded-full mb-3" />
            <div className="flex justify-between">
                <Skeleton className="h-2.5 w-16 rounded" />
                <Skeleton className="h-2.5 w-14 rounded" />
                <Skeleton className="h-2.5 w-12 rounded" />
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Sub-component: Active Wash Tracker
// ---------------------------------------------------------------------------
function ActiveWashCard({ wash }: { wash: ActiveWash }) {
    return (
        <div
            role="status"
            aria-label={`Active wash: ${wash.vehicle}, status ${wash.status}`}
            className="w-full border border-white/10 bg-white/[0.03] p-6 md:p-8 rounded-3xl relative overflow-hidden"
        >
            <div className="absolute top-0 left-0 w-full h-[1px] bg-white/20" />
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-6">
                <div>
                    <h3 className="text-xl font-bold">{wash.vehicle}</h3>
                    <p className="text-white/40 text-xs uppercase tracking-widest font-bold mt-1">{wash.package}</p>
                </div>
                <span className="bg-spa-sky text-slate-950 px-4 py-1.5 rounded-sm text-[10px] uppercase tracking-widest font-extrabold animate-pulse">
                    {wash.status}
                </span>
            </div>
            {/* Animated progress bar */}
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mb-2">
                <motion.div
                    className="h-full bg-spa-sky shadow-[0_0_8px_rgba(135,189,216,0.6)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${wash.progress}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                />
            </div>
            <div className="flex justify-between text-[10px] text-white/20 uppercase tracking-widest font-bold">
                <span>Dropped Off</span>
                <span className="text-white/60">Washing</span>
                <span>Ready</span>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Sub-component: Empty State
// ---------------------------------------------------------------------------
function NoActiveWash({ onBook }: { onBook: () => void }) {
    return (
        <div className="w-full bg-white/5 border border-white/10 p-6 md:p-10 rounded-3xl flex flex-col items-center justify-center text-center shadow-inner">
            <Activity className="w-12 h-12 text-white/10 mb-4" aria-hidden="true" />
            <h3 className="text-xl font-bold text-gray-500">No Active Bookings</h3>
            <p className="text-[10px] text-gray-600 uppercase tracking-widest mt-2 font-bold">
                You have no car washes currently in progress.
            </p>
            <button
                onClick={onBook}
                aria-label="Book a new car wash"
                className="mt-6 bg-spa-sky text-slate-950 px-6 py-3 min-h-[44px] rounded-full font-extrabold text-xs uppercase tracking-widest hover:bg-[#6FA8C8] transition flex items-center gap-2 shadow-[0_0_20px_rgba(135,189,216,0.4)] active:scale-95"
            >
                <Plus className="w-4 h-4 text-slate-950" aria-hidden="true" /> Schedule a Wash
            </button>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function OverviewTab({ setIsBooking, handleLogout, customerName }: OverviewTabProps) {
    const { data: activeWash, isLoading } = useActiveWash();
    const queryClient = useQueryClient();

    // Profile query fallback if customerName prop is missing
    const { data: fetchedProfile } = useQuery({
        queryKey: ['customerProfile'],
        queryFn: async () => {
            const res = await api.get('/core/users/me/');
            return res.data;
        },
        enabled: !customerName,
        staleTime: 5 * 60 * 1000,
    });

    const rawName = customerName || fetchedProfile?.first_name || fetchedProfile?.username || '';
    const displayName = rawName ? rawName.charAt(0).toUpperCase() + rawName.slice(1) : '';

    // ------------------------------------------------------------------
    // WebSocket stub — listens to the live_queue channel from Django Channels
    // and invalidates the React Query cache on any booking update event.
    // The Django consumer broadcasts to ws://host/ws/queue/
    // ------------------------------------------------------------------
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        const WS_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8001/api')
            .replace(/^http/, 'ws')
            .replace('/api', '');

        let ws: WebSocket;
        try {
            ws = new WebSocket(`${WS_BASE}/ws/queue/`);
            wsRef.current = ws;

            ws.onmessage = (e) => {
                try {
                    const msg = JSON.parse(e.data);
                    if (msg.type === 'queue_update') {
                        // Invalidate so React Query refetches the active wash
                        queryClient.invalidateQueries({ queryKey: ['activeWash'] });
                    }
                } catch { /* ignore malformed frames */ }
            };

            ws.onerror = () => {
                // WebSocket unavailable (no Django Channels configured yet) — fail silently,
                // polling via refetchInterval covers real-time updates as a fallback.
            };
        } catch {
            // new WebSocket() can throw in SSR — safe to ignore
        }

        return () => {
            wsRef.current?.close();
        };
    }, [queryClient]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
        >
            {/* Header row */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-10">
                <div className="w-full md:w-auto flex justify-between items-start">
                    <div>
                        <span className="text-white/30 text-[10px] font-bold tracking-[0.3em] uppercase" aria-hidden="true">
                            Live Dashboard
                        </span>
                        <h1 className="text-4xl font-bold tracking-tighter mt-2">
                            Welcome Back{displayName ? <span className="text-spa-sky">, {displayName}</span> : '.'}
                        </h1>
                    </div>
                    <button
                        onClick={handleLogout}
                        aria-label="Log out of your account"
                        className="md:hidden flex items-center gap-2 text-gray-500 hover:text-white transition-colors font-bold text-[10px] uppercase tracking-widest mt-2 bg-white/5 px-3 py-2 rounded-lg border border-white/10"
                    >
                        <LogOut className="w-4 h-4" aria-hidden="true" /> Log Out
                    </button>
                </div>
                <button
                    onClick={() => setIsBooking(true)}
                    aria-label="Open booking wizard to schedule a car wash"
                    className="w-full md:w-auto justify-center bg-spa-sky text-slate-950 px-6 py-3 min-h-[44px] rounded-full font-extrabold text-xs uppercase tracking-widest hover:scale-105 hover:bg-[#6FA8C8] transition flex items-center gap-2 shadow-[0_0_20px_rgba(135,189,216,0.4)] active:scale-95"
                >
                    <Plus className="w-4 h-4 text-slate-950" aria-hidden="true" /> Book Wash
                </button>
            </div>

            {/* Tracking widget */}
            <div className="flex flex-col gap-6 mb-8">
                {isLoading ? (
                    <ActiveWashSkeleton />
                ) : activeWash ? (
                    <ActiveWashCard wash={activeWash} />
                ) : (
                    <NoActiveWash onBook={() => setIsBooking(true)} />
                )}
            </div>
        </motion.div>
    );
}

'use client';

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Plus, Activity, LogOut, Car, Key, Waves, Sparkles, Check, ShieldCheck, Clock } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/Skeleton';
import api from '@/lib/api';

// ---------------------------------------------------------------------------
// Types & Stepper Configuration
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

const STEPS = [
    {
        id: 'queued',
        title: 'Dropped Off',
        subtitle: 'Queued & Registered',
        icon: Key,
    },
    {
        id: 'washing',
        title: 'Washing',
        subtitle: 'Spa Detailing',
        icon: Waves,
    },
    {
        id: 'ready',
        title: 'Ready',
        subtitle: 'Ready for Pickup',
        icon: Car,
    },
];

function getStepState(status: string) {
    const s = (status || '').toUpperCase();
    if (s === 'READY' || s === 'COMPLETED') {
        return { isReady: true, activeStep: 2, statusLabel: 'Ready for Pickup' };
    }
    if (s === 'IN_PROGRESS' || s === 'WASHING' || s === 'CLEANING') {
        return { isReady: false, activeStep: 1, statusLabel: 'Washing' };
    }
    return { isReady: false, activeStep: 0, statusLabel: 'Dropped Off' };
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
// Sub-component: Refined Minimal Skeleton
// ---------------------------------------------------------------------------
function ActiveWashSkeleton() {
    return (
        <div className="w-full border border-white/[0.06] bg-[#0a0a0c] p-6 md:p-8 rounded-2xl md:rounded-3xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full bg-white/[0.04]" />
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-32 rounded bg-white/[0.06]" />
                        <Skeleton className="h-3 w-20 rounded bg-white/[0.04]" />
                    </div>
                </div>
                <Skeleton className="h-7 w-28 rounded-full bg-white/[0.04]" />
            </div>
            <div className="grid grid-cols-3 gap-4 my-6">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex flex-col items-center space-y-2">
                        <Skeleton className="h-9 w-9 rounded-full bg-white/[0.04]" />
                        <Skeleton className="h-3 w-16 rounded bg-white/[0.04]" />
                    </div>
                ))}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Sub-component: Active Wash Tracker (Emotional Minimal Luxury Aesthetic)
// ---------------------------------------------------------------------------
function ActiveWashCard({ wash }: { wash: ActiveWash }) {
    const { isReady, activeStep, statusLabel } = getStepState(wash.status);

    return (
        <div
            role="status"
            aria-label={`Active wash: ${wash.vehicle}, status ${wash.status}`}
            className="w-full border border-white/[0.06] bg-[#0a0a0c] backdrop-blur-md p-6 sm:p-8 rounded-2xl md:rounded-3xl relative overflow-hidden shadow-2xl transition-all"
        >
            {/* Subtle top border accent */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            {/* Header section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div className="flex items-center gap-3.5">
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-zinc-300">
                        <Car className="w-5 h-5" strokeWidth={1.5} />
                    </div>
                    <div>
                        <h3 className="text-lg font-mono tracking-widest text-zinc-100 font-medium">{wash.vehicle}</h3>
                        <p className="text-[11px] text-zinc-400 font-medium uppercase tracking-[0.25em] mt-0.5">
                            {wash.package}
                        </p>
                    </div>
                </div>

                {/* Status Pill Badge */}
                {isReady ? (
                    <div className="flex items-center gap-2 bg-[#01FFFF]/10 border border-[#01FFFF]/30 px-3.5 py-1.5 rounded-full shadow-[0_0_15px_rgba(1,255,255,0.25)]">
                        <div className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#01FFFF] opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#01FFFF]"></span>
                        </div>
                        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#01FFFF]">
                            {statusLabel}
                        </span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.08] px-3.5 py-1.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-200" />
                        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-200">
                            {statusLabel}
                        </span>
                    </div>
                )}
            </div>

            {/* Compact "Ready for pickup" Badge (Only when status is Ready) */}
            {isReady && (
                <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#01FFFF]/[0.08] border border-[#01FFFF]/30 shadow-[0_0_15px_rgba(1,255,255,0.15)] my-2"
                >
                    <div className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#01FFFF] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#01FFFF]"></span>
                    </div>
                    <span className="text-xs font-medium tracking-wide text-[#01FFFF]">
                        Ready for pickup
                    </span>
                </motion.div>
            )}

            {/* Progress Stepper Section */}
            <div className="relative my-8 px-2 sm:px-8">
                {/* Ultra-thin Connecting Track Line */}
                <div className="absolute top-5 sm:top-5 left-[16%] right-[16%] h-[1px] bg-white/10 -z-0">
                    <motion.div
                        className="h-full bg-white/80 transition-all duration-700"
                        initial={{ width: '0%' }}
                        animate={{
                            width: activeStep === 0 ? '0%' : activeStep === 1 ? '50%' : '100%'
                        }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    />
                </div>

                {/* Stepper Nodes */}
                <div className="grid grid-cols-3 relative z-10">
                    {STEPS.map((step, idx) => {
                        const isCompleted = idx < activeStep || (isReady && idx === 2);
                        const isActive = idx === activeStep && !isReady;
                        const isReadyStep = isReady && idx === 2;
                        const Icon = step.icon;

                        return (
                            <div key={step.id} className="flex flex-col items-center text-center">
                                {/* Circle Node */}
                                <div className="relative mb-3">
                                    <div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                                            isReadyStep
                                                ? 'bg-[#01FFFF] text-slate-950 border border-[#01FFFF] shadow-[0_0_20px_rgba(1,255,255,0.7)]'
                                                : isCompleted
                                                ? 'bg-white text-black border border-white'
                                                : isActive
                                                ? 'bg-white/[0.08] text-white border border-white/60 backdrop-blur-md ring-1 ring-white/20 ring-offset-4 ring-offset-[#0a0a0c]'
                                                : 'bg-white/[0.02] text-zinc-600 border border-white/[0.06]'
                                        }`}
                                    >
                                        {isReadyStep ? (
                                            <motion.div
                                                animate={{ scale: [1, 1.25, 1] }}
                                                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                                                className="flex items-center justify-center"
                                            >
                                                <Car className="w-4 h-4 text-slate-950 stroke-[2.2]" />
                                            </motion.div>
                                        ) : isCompleted ? (
                                            <Check className="w-4 h-4 stroke-[2.5]" />
                                        ) : (
                                            <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-zinc-500'}`} strokeWidth={1.5} />
                                        )}
                                    </div>
                                </div>

                                {/* Step Labels */}
                                <div className="space-y-0.5">
                                    <p
                                        className={`text-[11px] font-medium uppercase tracking-[0.2em] transition-colors ${
                                            isReadyStep
                                                ? 'text-[#01FFFF] font-bold'
                                                : isCompleted
                                                ? 'text-zinc-200'
                                                : isActive
                                                ? 'text-white font-semibold'
                                                : 'text-zinc-500'
                                        }`}
                                    >
                                        {step.title}
                                    </p>
                                    <p
                                        className={`text-[10px] font-mono hidden sm:block tracking-wider ${
                                            isReadyStep
                                                ? 'text-[#01FFFF]/80 font-medium'
                                                : isActive
                                                ? 'text-zinc-400 font-medium'
                                                : isCompleted
                                                ? 'text-zinc-500'
                                                : 'text-zinc-600'
                                        }`}
                                    >
                                        {step.subtitle}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
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

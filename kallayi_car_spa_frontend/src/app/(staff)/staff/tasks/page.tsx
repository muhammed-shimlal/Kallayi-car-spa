'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
    Activity, CheckCircle, PlayCircle, Car, Droplets,
    SprayCan, Sparkles, Clock, LogOut, RefreshCw
} from 'lucide-react';

interface Task {
    id: number;
    status: string;
    plate_number: string;
    vehicle_model: string;
    service_name: string;
    service_price: number;
    customer_name: string;
    bay_assignment: string | null;
    created_at: string | null;
    start_time: string | null;
}

export default function StaffTasksPage() {
    const router = useRouter();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [workerName, setWorkerName] = useState('Worker');
    const [actionLoading, setActionLoading] = useState<number | null>(null);
    const [sentTasks, setSentTasks] = useState<Set<number>>(new Set());

    const API_BASE = 'http://127.0.0.1:8001/api';

    const getHeaders = () => ({
        'Authorization': `Token ${localStorage.getItem('auth_token')}`,
        'Content-Type': 'application/json',
    });

    const fetchTasks = useCallback(async () => {
        const token = localStorage.getItem('auth_token');
        if (!token) { router.push('/login'); return; }

        try {
            const [tasksRes, userRes] = await Promise.all([
                fetch(`${API_BASE}/bookings/my-tasks/`, { headers: getHeaders() }),
                fetch(`${API_BASE}/core/users/me/`, { headers: getHeaders() }),
            ]);

            if (tasksRes.ok) {
                const serverTasks = await tasksRes.json();
                setTasks(serverTasks);
                // Clear sentTasks that are no longer in the list
                setSentTasks(prev => {
                    const currentIds = new Set(serverTasks.map((t: Task) => t.id));
                    const next = new Set<number>();
                    prev.forEach(id => { if (currentIds.has(id)) next.add(id); });
                    return next;
                });
            }
            if (userRes.ok) {
                const user = await userRes.json();
                setWorkerName(user.first_name || user.username || 'Worker');
            }
        } catch (e) {
            console.error('Failed to fetch tasks:', e);
        } finally {
            setIsLoading(false);
        }
    }, [router]);

    // Initial fetch & 30-second polling
    useEffect(() => {
        fetchTasks();
        const interval = setInterval(fetchTasks, 30000);
        return () => clearInterval(interval);
    }, [fetchTasks]);

    const handleStartTask = async (bookingId: number) => {
        // Optimistic UI — instantly flip to IN_PROGRESS
        const previousTasks = [...tasks];
        setTasks(prev =>
            prev.map(t =>
                t.id === bookingId
                    ? { ...t, status: 'IN_PROGRESS', start_time: new Date().toISOString() }
                    : t
            )
        );
        toast.success('Wash started! Timer running ⏱️');

        try {
            const res = await fetch(`${API_BASE}/bookings/task/${bookingId}/start/`, {
                method: 'PATCH',
                headers: getHeaders(),
            });
            if (!res.ok) {
                // Revert on failure
                setTasks(previousTasks);
                toast.error('Network failed. Please tap again.');
            }
        } catch (e) {
            setTasks(previousTasks);
            toast.error('Network failed. Please tap again.');
        }
    };

    const handleFinishTask = async (bookingId: number) => {
        // Optimistic UI — instantly mark as SENT (green state)
        const previousTasks = [...tasks];
        const previousSent = new Set(sentTasks);
        setSentTasks(prev => new Set(prev).add(bookingId));
        toast.success('Complete! Customer has been notified ✅');

        try {
            const res = await fetch(`${API_BASE}/bookings/task/${bookingId}/finish/`, {
                method: 'PATCH',
                headers: getHeaders(),
            });
            if (!res.ok) {
                // Revert on failure
                setSentTasks(previousSent);
                toast.error('Network failed. Please tap again.');
            } else {
                // Remove from list after a brief moment to show green state
                setTimeout(() => {
                    setTasks(prev => prev.filter(t => t.id !== bookingId));
                    setSentTasks(prev => {
                        const next = new Set(prev);
                        next.delete(bookingId);
                        return next;
                    });
                }, 1500);
            }
        } catch (e) {
            setSentTasks(previousSent);
            toast.error('Network failed. Please tap again.');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('auth_token');
        router.push('/login');
    };

    // Elapsed time helper
    const getElapsedTime = (startIso: string | null) => {
        if (!startIso) return null;
        const start = new Date(startIso).getTime();
        const now = Date.now();
        const diffMs = now - start;
        const mins = Math.floor(diffMs / 60000);
        if (mins < 1) return 'Just started';
        if (mins < 60) return `${mins} min`;
        const hrs = Math.floor(mins / 60);
        return `${hrs}h ${mins % 60}m`;
    };

    const checklist = [
        { icon: <Droplets className="w-5 h-5" />, label: 'Pre-Rinse & Snow Foam' },
        { icon: <SprayCan className="w-5 h-5" />, label: 'Deep Wheel Clean' },
        { icon: <Sparkles className="w-5 h-5" />, label: 'Interior Vacuum & Wipe' },
    ];

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center">
                <Activity className="w-12 h-12 text-[#01FFFF] animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] text-white font-jakarta selection:bg-[#FF2A6D]">

            {/* STICKY HEADER */}
            <header className="sticky top-0 z-50 bg-[#050505]/95 backdrop-blur-xl border-b border-white/5 px-5 py-4">
                <div className="flex justify-between items-center max-w-lg mx-auto">
                    <div>
                        <h1 className="font-syncopate font-bold text-sm tracking-[0.2em]">
                            KALLAYI<span className="text-[#FF2A6D]">.</span>
                        </h1>
                        <p className="text-[9px] text-[#8E939B] uppercase tracking-[0.3em] font-bold mt-0.5">
                            {workerName}'s Queue
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => fetchTasks()}
                            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#8E939B] hover:text-[#01FFFF] hover:border-[#01FFFF]/30 transition-all active:scale-90"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleLogout}
                            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#8E939B] hover:text-[#FF2A6D] hover:border-[#FF2A6D]/30 transition-all active:scale-90"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </header>

            {/* TASK COUNT BADGE */}
            <div className="px-5 py-6 max-w-lg mx-auto">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-[#01FFFF]/10 border border-[#01FFFF]/30 flex items-center justify-center">
                        <Car className="w-5 h-5 text-[#01FFFF]" />
                    </div>
                    <div>
                        <h2 className="font-syncopate font-bold text-lg tracking-wider">
                            {tasks.length} {tasks.length === 1 ? 'CAR' : 'CARS'}
                        </h2>
                        <p className="text-[10px] text-[#8E939B] uppercase tracking-[0.25em] font-bold">
                            In Your Queue
                        </p>
                    </div>
                    {tasks.some(t => t.status === 'IN_PROGRESS') && (
                        <div className="ml-auto flex items-center gap-2 bg-[#FF2A6D]/10 border border-[#FF2A6D]/30 px-3 py-1.5 rounded-full">
                            <span className="w-2 h-2 rounded-full bg-[#FF2A6D] animate-pulse shadow-[0_0_8px_rgba(255,42,109,0.8)]"></span>
                            <span className="text-[10px] text-[#FF2A6D] font-bold uppercase tracking-widest">In Progress</span>
                        </div>
                    )}
                </div>

                {/* EMPTY STATE */}
                {tasks.length === 0 && (
                    <div className="text-center py-20">
                        <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="w-10 h-10 text-emerald-400" />
                        </div>
                        <h3 className="font-syncopate font-bold text-lg tracking-widest mb-2">ALL CLEAR</h3>
                        <p className="text-[#8E939B] text-sm max-w-xs mx-auto">
                            No cars in your queue right now. New assignments will appear here automatically.
                        </p>
                    </div>
                )}

                {/* TASK CARDS */}
                <div className="space-y-6">
                    {tasks.map((task) => {
                        const isInProgress = task.status === 'IN_PROGRESS';
                        const elapsed = getElapsedTime(task.start_time);

                        return (
                            <div
                                key={task.id}
                                className={`bg-[#141518]/80 backdrop-blur-xl border rounded-3xl p-6 relative overflow-hidden transition-all ${
                                    isInProgress
                                        ? 'border-[#FF2A6D]/30 shadow-[0_0_40px_rgba(255,42,109,0.08)]'
                                        : 'border-white/10'
                                }`}
                            >
                                {/* Active glow */}
                                {isInProgress && (
                                    <div className="absolute top-0 right-0 w-40 h-40 bg-[#FF2A6D]/10 rounded-full blur-[60px] pointer-events-none"></div>
                                )}

                                {/* STATUS + BAY BADGE */}
                                <div className="flex justify-between items-center mb-4">
                                    <span className={`text-[9px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-full border ${
                                        isInProgress
                                            ? 'bg-[#FF2A6D]/10 text-[#FF2A6D] border-[#FF2A6D]/30'
                                            : 'bg-white/5 text-[#8E939B] border-white/10'
                                    }`}>
                                        {isInProgress ? '🔴 Washing...' : '⏳ Waiting'}
                                    </span>
                                    {task.bay_assignment && (
                                        <span className="text-[9px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-full bg-[#01FFFF]/10 text-[#01FFFF] border border-[#01FFFF]/20">
                                            {task.bay_assignment}
                                        </span>
                                    )}
                                </div>

                                {/* LICENSE PLATE — Giant for quick identification */}
                                <h3 className="font-syncopate font-black text-3xl tracking-[0.15em] text-white mb-1">
                                    {task.plate_number}
                                </h3>
                                <p className="text-[#8E939B] text-xs mb-1">{task.vehicle_model}</p>

                                {/* SERVICE PACKAGE */}
                                <div className="bg-white/5 border border-white/5 rounded-2xl px-4 py-3 mb-5 mt-4">
                                    <p className="text-[9px] text-[#8E939B] uppercase tracking-[0.2em] font-bold mb-1">Service Package</p>
                                    <p className="font-bold text-[#01FFFF] text-base tracking-wide">{task.service_name}</p>
                                </div>

                                {/* ELAPSED TIMER */}
                                {isInProgress && elapsed && (
                                    <div className="flex items-center gap-2 mb-5 bg-[#FF2A6D]/5 border border-[#FF2A6D]/20 px-4 py-2.5 rounded-xl">
                                        <Clock className="w-4 h-4 text-[#FF2A6D]" />
                                        <span className="text-[#FF2A6D] text-xs font-bold uppercase tracking-widest">
                                            Elapsed: {elapsed}
                                        </span>
                                    </div>
                                )}

                                {/* CHECKLIST */}
                                <div className="space-y-3 mb-6">
                                    <p className="text-[9px] text-[#8E939B] uppercase tracking-[0.2em] font-bold">Wash Checklist</p>
                                    {checklist.map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-3 bg-white/2 border border-white/5 rounded-xl px-4 py-3">
                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                                                isInProgress
                                                    ? 'bg-[#01FFFF]/10 text-[#01FFFF]'
                                                    : 'bg-white/5 text-[#8E939B]'
                                            }`}>
                                                {item.icon}
                                            </div>
                                            <span className="text-sm font-medium text-white/80">
                                                {idx + 1}. {item.label}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {/* ACTION BUTTON — Massive tap target */}
                                {sentTasks.has(task.id) ? (
                                    <button
                                        disabled
                                        className="w-full bg-emerald-500 text-white font-syncopate font-bold text-base tracking-[0.15em] py-5 rounded-2xl flex items-center justify-center gap-3 shadow-[0_0_40px_rgba(16,185,129,0.4)] transition-all opacity-90"
                                    >
                                        <CheckCircle className="w-7 h-7" />
                                        ✔ SENT
                                    </button>
                                ) : !isInProgress ? (
                                    <button
                                        onClick={() => handleStartTask(task.id)}
                                        className="w-full bg-[#01FFFF] text-black font-syncopate font-bold text-base tracking-[0.15em] py-5 rounded-2xl flex items-center justify-center gap-3 shadow-[0_0_40px_rgba(1,255,255,0.3)] hover:bg-white active:scale-[0.97] transition-all"
                                    >
                                        <PlayCircle className="w-7 h-7" />
                                        ▶ START WASH
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleFinishTask(task.id)}
                                        className="w-full bg-[#FF2A6D] text-white font-syncopate font-bold text-base tracking-[0.15em] py-5 rounded-2xl flex items-center justify-center gap-3 shadow-[0_0_40px_rgba(255,42,109,0.4)] hover:bg-[#ff4080] active:scale-[0.97] transition-all"
                                    >
                                        <CheckCircle className="w-7 h-7" />
                                        ✔ FINISH & ALERT MANAGER
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* BOTTOM SAFE AREA SPACER */}
            <div className="h-8"></div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}} />
        </div>
    );
}

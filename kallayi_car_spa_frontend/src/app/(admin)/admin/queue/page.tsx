'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { 
    Activity, Car, Clock, RefreshCw, 
    ChevronLeft, Droplets, Sparkles, CheckCircle, 
    AlertCircle, User, Wifi, WifiOff, LayoutDashboard
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface BookingCard {
    id: number;
    status: string;
    plate_number: string;
    vehicle_model: string;
    service_name: string;
    customer_name: string;
    technician_name: string | null;
    created_at: string | null;
    time_slot: string | null;
    bay_assignment: string | null;
}

interface Column {
    id: string;
    title: string;
    icon: React.ReactNode;
    accent: string;
    glow: string;
    borderColor: string;
    headerBg: string;
}

const COLUMNS: Column[] = [
    {
        id: 'WAITING',
        title: 'Waiting Pool',
        icon: <Clock className="w-5 h-5" />,
        accent: 'text-yellow-400',
        glow: 'shadow-[0_0_20px_rgba(234,179,8,0.1)]',
        borderColor: 'border-yellow-500/30',
        headerBg: 'bg-yellow-500/10',
    },
    {
        id: 'IN_BAY_1',
        title: 'Washing Bay 1',
        icon: <Droplets className="w-5 h-5" />,
        accent: 'text-[#01FFFF]',
        glow: 'shadow-[0_0_20px_rgba(1,255,255,0.1)]',
        borderColor: 'border-[#01FFFF]/30',
        headerBg: 'bg-[#01FFFF]/10',
    },
    {
        id: 'IN_BAY_2',
        title: 'Washing Bay 2',
        icon: <Droplets className="w-5 h-5" />,
        accent: 'text-blue-400',
        glow: 'shadow-[0_0_20px_rgba(96,165,250,0.1)]',
        borderColor: 'border-blue-400/30',
        headerBg: 'bg-blue-400/10',
    },
    {
        id: 'READY',
        title: 'Ready for Pickup',
        icon: <CheckCircle className="w-5 h-5" />,
        accent: 'text-emerald-400',
        glow: 'shadow-[0_0_20px_rgba(52,211,153,0.1)]',
        borderColor: 'border-emerald-400/30',
        headerBg: 'bg-emerald-400/10',
    },
];

// ─── Elapsed Timer ────────────────────────────────────────────────────────────

function ElapsedTimer({ since }: { since: string | null }) {
    const [elapsed, setElapsed] = useState('');

    useEffect(() => {
        if (!since) return;
        const update = () => {
            const diffMs = Date.now() - new Date(since).getTime();
            const totalMins = Math.floor(diffMs / 60000);
            const hours = Math.floor(totalMins / 60);
            const mins = totalMins % 60;
            setElapsed(hours > 0 ? `${hours}h ${mins}m` : `${mins}m`);
        };
        update();
        const interval = setInterval(update, 30000);
        return () => clearInterval(interval);
    }, [since]);

    if (!since) return null;
    const totalMins = Math.floor((Date.now() - new Date(since).getTime()) / 60000);
    const isLong = totalMins > 30;

    return (
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border ${isLong ? 'text-[#FF2A6D] border-[#FF2A6D]/40 bg-[#FF2A6D]/10' : 'text-[#8E939B] border-white/10 bg-white/5'}`}>
            <Clock className="w-3 h-3" /> {elapsed}
        </span>
    );
}

// ─── Booking Card ─────────────────────────────────────────────────────────────

function BookingCard({ card, index, col }: { card: BookingCard; index: number; col: Column }) {
    return (
        <Draggable draggableId={`card-${card.id}`} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`
                        bg-[#141518] border rounded-2xl p-4 select-none cursor-grab active:cursor-grabbing
                        transition-all duration-200
                        ${snapshot.isDragging
                            ? `${col.borderColor} ${col.glow} scale-105 rotate-1 opacity-95`
                            : 'border-white/8 hover:border-white/20 hover:bg-white/5'}
                    `}
                >
                    {/* License Plate */}
                    <div className={`font-syncopate font-black text-3xl tracking-[0.15em] mb-3 ${col.accent}`}>
                        {card.plate_number}
                    </div>

                    {/* Customer name — admin-specific extra info */}
                    <div className="text-[10px] text-[#8E939B] uppercase tracking-widest mb-2 font-bold">{card.customer_name}</div>

                    <div className="flex items-center gap-2 mb-2">
                        <Car className="w-3.5 h-3.5 text-[#8E939B] flex-shrink-0" />
                        <span className="text-white text-sm font-bold truncate">{card.vehicle_model}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-3.5 h-3.5 text-[#8E939B] flex-shrink-0" />
                        <span className="text-[#8E939B] text-xs truncate">{card.service_name}</span>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                        <div className="flex items-center gap-1.5">
                            {card.technician_name ? (
                                <span className="inline-flex items-center gap-1 text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded-full font-bold">
                                    <User className="w-3 h-3" /> {card.technician_name}
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] bg-white/5 text-[#8E939B] border border-white/10 px-2 py-0.5 rounded-full font-bold">
                                    <User className="w-3 h-3" /> Unassigned
                                </span>
                            )}
                        </div>
                        <ElapsedTimer since={card.time_slot || card.created_at} />
                    </div>
                </div>
            )}
        </Draggable>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminQueueBoard() {
    const router = useRouter();
    const [columns, setColumns] = useState<Record<string, BookingCard[]>>({
        WAITING: [], IN_BAY_1: [], IN_BAY_2: [], READY: [],
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchQueue = useCallback(async (silent = false) => {
        const token = localStorage.getItem('auth_token');
        if (!token) return router.push('/login');
        if (!silent) setIsLoading(true);

        try {
            const res = await fetch('http://127.0.0.1:8001/api/bookings/live-queue/', {
                headers: { 'Authorization': `Token ${token}` }
            });
            if (!res.ok) throw new Error('API error');

            const data: BookingCard[] = await res.json();
            const newCols: Record<string, BookingCard[]> = { WAITING: [], IN_BAY_1: [], IN_BAY_2: [], READY: [] };
            data.forEach(card => {
                const colKey = newCols[card.status] !== undefined ? card.status : 'WAITING';
                newCols[colKey].push(card);
            });
            setColumns(newCols);
            setIsConnected(true);
            setLastUpdated(new Date());
        } catch {
            setIsConnected(false);
        } finally {
            setIsLoading(false);
        }
    }, [router]);

    useEffect(() => {
        fetchQueue();
        const interval = setInterval(() => fetchQueue(true), 30000);
        return () => clearInterval(interval);
    }, [fetchQueue]);

    const onDragEnd = async (result: DropResult) => {
        const { source, destination, draggableId } = result;
        if (!destination) return;
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        const bookingId = parseInt(draggableId.replace('card-', ''));
        const sourceCol = source.droppableId;
        const destCol = destination.droppableId;

        // Optimistic update
        setColumns(prev => {
            const newCols = { ...prev };
            const sourceCards = [...newCols[sourceCol]];
            const destCards = sourceCol === destCol ? sourceCards : [...newCols[destCol]];
            const [movedCard] = sourceCards.splice(source.index, 1);
            movedCard.status = destCol;
            if (sourceCol === destCol) {
                sourceCards.splice(destination.index, 0, movedCard);
                newCols[sourceCol] = sourceCards;
            } else {
                destCards.splice(destination.index, 0, movedCard);
                newCols[sourceCol] = sourceCards;
                newCols[destCol] = destCards;
            }
            return newCols;
        });

        // Backend sync
        try {
            const token = localStorage.getItem('auth_token');
            await fetch(`http://127.0.0.1:8001/api/bookings/update-stage/${bookingId}/`, {
                method: 'PATCH',
                headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    new_status: destCol,
                    bay_assignment: destCol.startsWith('IN_BAY') ? destCol.replace('IN_BAY_', 'Bay ') : null,
                }),
            });
        } catch {
            fetchQueue(); // Revert on error
        }
    };

    const totalActive = Object.values(columns).flat().length;

    return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col font-jakarta overflow-hidden">

            {/* ── TOP BAR ───────────────────────────────────────────────────── */}
            <header className="flex items-center justify-between px-8 py-5 border-b border-white/5 bg-[#141518]/80 backdrop-blur-xl flex-shrink-0">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => router.push('/admin/dashboard')}
                        className="flex items-center gap-2 text-[#8E939B] hover:text-white transition-colors text-xs font-bold uppercase tracking-widest"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        <LayoutDashboard className="w-4 h-4" /> Admin Dashboard
                    </button>
                    <div className="w-px h-6 bg-white/10" />
                    <div>
                        <h1 className="font-syncopate font-black text-lg tracking-widest">
                            LIVE QUEUE<span className="text-[#FF2A6D]">.</span>
                        </h1>
                        <p className="text-[10px] text-[#8E939B] uppercase tracking-[0.3em]">Admin Bay Control Board</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-full flex items-center gap-2">
                        <Car className="w-4 h-4 text-[#01FFFF]" />
                        <span className="font-bold text-sm">{totalActive}</span>
                        <span className="text-[10px] text-[#8E939B] uppercase tracking-widest">Vehicles Active</span>
                    </div>

                    <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest px-3 py-2 rounded-full border ${isConnected ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : 'border-red-500/30 text-red-400 bg-red-500/10'}`}>
                        {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                        {isConnected ? 'Live' : 'Offline'}
                    </div>

                    <button
                        onClick={() => fetchQueue()}
                        className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-full text-[#8E939B] hover:text-white transition-all text-xs font-bold uppercase tracking-widest"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </header>

            {/* ── KANBAN BOARD ─────────────────────────────────────────────── */}
            {isLoading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <Activity className="w-12 h-12 text-[#01FFFF] animate-spin" />
                        <p className="text-[#8E939B] text-sm uppercase tracking-widest font-bold">Loading Live Queue...</p>
                    </div>
                </div>
            ) : (
                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="flex-1 flex gap-6 p-6 overflow-x-auto overflow-y-hidden">
                        {COLUMNS.map(col => {
                            const cards = columns[col.id] || [];
                            return (
                                <div
                                    key={col.id}
                                    className={`flex flex-col flex-shrink-0 w-80 xl:w-96 bg-[#0C0D0F] border ${col.borderColor} rounded-3xl overflow-hidden ${col.glow}`}
                                >
                                    <div className={`${col.headerBg} border-b ${col.borderColor} p-5 flex-shrink-0`}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className={col.accent}>{col.icon}</span>
                                                <span className={`font-syncopate font-bold text-sm tracking-widest uppercase ${col.accent}`}>
                                                    {col.title}
                                                </span>
                                            </div>
                                            <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-black ${col.headerBg} ${col.accent} border ${col.borderColor}`}>
                                                {cards.length}
                                            </span>
                                        </div>
                                    </div>

                                    <Droppable droppableId={col.id}>
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.droppableProps}
                                                className={`flex-1 p-4 space-y-3 overflow-y-auto transition-colors duration-200 ${snapshot.isDraggingOver ? col.headerBg : ''}`}
                                                style={{ minHeight: '200px' }}
                                            >
                                                {cards.length === 0 && !snapshot.isDraggingOver && (
                                                    <div className="flex flex-col items-center justify-center h-32 text-center opacity-30">
                                                        <AlertCircle className="w-8 h-8 mb-2 text-[#8E939B]" />
                                                        <p className="text-[10px] text-[#8E939B] uppercase tracking-widest font-bold">Empty</p>
                                                    </div>
                                                )}
                                                {cards.map((card, index) => (
                                                    <BookingCard key={card.id} card={card} index={index} col={col} />
                                                ))}
                                                {provided.placeholder}
                                            </div>
                                        )}
                                    </Droppable>
                                </div>
                            );
                        })}
                    </div>
                </DragDropContext>
            )}

            <footer className="flex items-center justify-between px-8 py-3 border-t border-white/5 bg-[#141518]/80 backdrop-blur-xl flex-shrink-0">
                <p className="text-[10px] text-[#8E939B] uppercase tracking-widest">
                    Admin Control — Drag cards to update bay assignments in real time
                </p>
                {lastUpdated && (
                    <p className="text-[10px] text-[#8E939B] font-mono">
                        Last sync: {lastUpdated.toLocaleTimeString()}
                    </p>
                )}
            </footer>

            <style dangerouslySetInnerHTML={{ __html: `
                .font-syncopate { font-family: 'Syncopate', sans-serif; }
            `}} />
        </div>
    );
}

'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { 
    Activity, Car, Clock, Loader2, RefreshCw, 
    ChevronLeft, Droplets, Sparkles, CheckCircle, 
    AlertCircle, User, Wifi, WifiOff, IndianRupee,
    PlusCircle, ArrowRight, CheckCircle2, ShieldCheck, Play
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import PaymentPickupModal from '@/components/staff/PaymentPickupModal';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BookingCard {
    id: number;
    status: string;
    plate_number: string;
    vehicle_model: string;
    service_name: string;
    customer_name: string;
    customer_phone?: string;
    technician_name: string | null;
    created_at: string | null;
    time_slot: string | null;
    bay_assignment: string | null;
    price?: number;
    base_price?: number;
    final_price?: number;
    service_package?: any;
    vehicle?: any;
    customer?: any;
}

export interface Column {
    id: string;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    accent: string;
    badgeBg: string;
    glow: string;
    borderColor: string;
    headerBg: string;
}

// ─── 3-Stage Lifecycle Columns ───────────────────────────────────────────────

const COLUMNS: Column[] = [
    {
        id: 'WAITING',
        title: 'In Queue',
        subtitle: 'വെയ്റ്റിംഗ് ലിസ്റ്റ്',
        icon: <Clock className="w-5 h-5 text-amber-400" />,
        accent: 'text-amber-400',
        badgeBg: 'bg-amber-500/20 border-amber-500/40 text-amber-300',
        glow: 'shadow-[0_0_25px_rgba(245,158,11,0.08)]',
        borderColor: 'border-amber-500/25',
        headerBg: 'bg-gradient-to-r from-amber-500/10 to-amber-950/20',
    },
    {
        id: 'WASHING',
        title: 'Washing Bay',
        subtitle: 'വാഷിംഗ് നടക്കുന്നു',
        icon: <Droplets className="w-5 h-5 text-[#01FFFF]" />,
        accent: 'text-[#01FFFF]',
        badgeBg: 'bg-[#01FFFF]/20 border-[#01FFFF]/40 text-[#01FFFF]',
        glow: 'shadow-[0_0_25px_rgba(1,255,255,0.08)]',
        borderColor: 'border-[#01FFFF]/25',
        headerBg: 'bg-gradient-to-r from-[#01FFFF]/10 to-[#01FFFF]/5',
    },
    {
        id: 'READY',
        title: 'Ready for Pickup',
        subtitle: 'ഡെലിവറി & പണം',
        icon: <CheckCircle className="w-5 h-5 text-emerald-400" />,
        accent: 'text-emerald-400',
        badgeBg: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
        glow: 'shadow-[0_0_25px_rgba(52,211,153,0.08)]',
        borderColor: 'border-emerald-500/25',
        headerBg: 'bg-gradient-to-r from-emerald-500/10 to-emerald-950/20',
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
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full border ${isLong ? 'text-[#FF2A6D] border-[#FF2A6D]/40 bg-[#FF2A6D]/10' : 'text-zinc-400 border-white/10 bg-white/5'}`}>
            <Clock className="w-3 h-3" /> {elapsed}
        </span>
    );
}

// ─── Booking Card Component ───────────────────────────────────────────────────

function QueueCardItem({ 
    card, 
    index, 
    col, 
    onAdvanceStage,
    onOpenCheckout,
    isUpdating
}: { 
    card: BookingCard; 
    index: number; 
    col: Column;
    onAdvanceStage: (card: BookingCard, targetCol: string) => void;
    onOpenCheckout: (card: BookingCard) => void;
    isUpdating: boolean;
}) {
    const rawPrice = card.final_price || card.base_price || card.price || 0;

    return (
        <Draggable draggableId={`card-${card.id}`} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`
                        bg-[#111215] border rounded-2xl p-4 sm:p-5 select-none
                        transition-all duration-200 group relative
                        ${snapshot.isDragging 
                            ? `${col.borderColor} ${col.glow} scale-105 rotate-1 opacity-95 shadow-2xl z-50` 
                            : 'border-white/10 hover:border-white/20 hover:bg-[#15171c]'}
                    `}
                >
                    {/* Top Row: License Plate + Rate Badge */}
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                        <div className={`font-syncopate font-black text-2xl sm:text-3xl tracking-[0.12em] ${col.accent}`}>
                            {card.plate_number}
                        </div>
                        {rawPrice > 0 && (
                            <span className="font-mono text-xs font-bold text-zinc-300 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">
                                ₹{rawPrice.toFixed(0)}
                            </span>
                        )}
                    </div>
                    
                    {/* Vehicle & Service */}
                    <div className="space-y-1 mb-3.5">
                        <div className="flex items-center gap-2">
                            <Car className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                            <span className="text-white text-sm font-bold truncate">{card.vehicle_model}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5 text-[#01FFFF] flex-shrink-0" />
                            <span className="text-zinc-400 text-xs font-medium truncate">{card.service_name}</span>
                        </div>
                    </div>

                    {/* Metadata & Bay Tag */}
                    <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/5 text-[11px]">
                        <div className="flex items-center gap-1.5 truncate">
                            <span className="text-zinc-500 font-medium truncate max-w-[120px]">
                                {card.customer_name}
                            </span>
                            {card.bay_assignment && (
                                <span className="px-2 py-0.5 rounded bg-[#01FFFF]/10 border border-[#01FFFF]/30 text-[#01FFFF] text-[10px] font-mono font-bold">
                                    {card.bay_assignment}
                                </span>
                            )}
                        </div>
                        <ElapsedTimer since={card.time_slot || card.created_at} />
                    </div>
                    
                    {/* 1-Click Status Progression CTA */}
                    <div className="mt-3">
                        {col.id === 'WAITING' && (
                            <button
                                type="button"
                                disabled={isUpdating}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAdvanceStage(card, 'WASHING');
                                }}
                                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/30 hover:from-amber-500/30 hover:to-amber-600/40 text-amber-300 border border-amber-500/40 hover:border-amber-400 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer min-h-[44px]"
                            >
                                <Play className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                <span>Start Wash (വാഷിംഗ് തുടങ്ങുക)</span>
                            </button>
                        )}

                        {col.id === 'WASHING' && (
                            <button
                                type="button"
                                disabled={isUpdating}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAdvanceStage(card, 'READY');
                                }}
                                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#01FFFF]/20 to-cyan-600/30 hover:from-[#01FFFF]/30 hover:to-cyan-600/40 text-[#01FFFF] border border-[#01FFFF]/40 hover:border-[#01FFFF] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer min-h-[44px]"
                            >
                                <CheckCircle2 className="w-4 h-4 text-[#01FFFF]" />
                                <span>Finish Wash (വാഷിംഗ് കഴിഞ്ഞു)</span>
                            </button>
                        )}

                        {col.id === 'READY' && (
                            <button
                                type="button"
                                disabled={isUpdating}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenCheckout(card);
                                }}
                                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] active:scale-[0.98] cursor-pointer min-h-[44px]"
                            >
                                <IndianRupee className="w-4 h-4" />
                                <span>Collect & Deliver (പണം വാങ്ങുക)</span>
                            </button>
                        )}
                    </div>
                </div>
            )}
        </Draggable>
    );
}

// ─── Main QueueBoard Page ─────────────────────────────────────────────────────

export default function QueueBoard() {
    const router = useRouter();
    const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
    const [selectedDate, setSelectedDate] = useState<string>(todayStr);
    
    // Active staff profile for wallet attribution
    const [staffProfile, setStaffProfile] = useState<any>(null);

    // 3-Stage Columns
    const [columns, setColumns] = useState<Record<string, BookingCard[]>>({
        WAITING: [], 
        WASHING: [], 
        READY: [],
    });

    // Mobile View Tab Switcher: 'ALL' | 'WAITING' | 'WASHING' | 'READY'
    const [activeMobileTab, setActiveMobileTab] = useState<string>('ALL');

    const [isLoading, setIsLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(true);
    const [isUpdatingStage, setIsUpdatingStage] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    // Checkout Modal State
    const [activeCheckoutBooking, setActiveCheckoutBooking] = useState<BookingCard | null>(null);

    // ─── Fetch Current Staff Profile ──────────────────────────────────────────
    useEffect(() => {
        api.get('/auth/me')
            .then(res => {
                if (res?.data?.user) {
                    setStaffProfile(res.data.user);
                }
            })
            .catch(() => null);
    }, []);

    // ─── Normalize Booking Item ───────────────────────────────────────────────
    const normalizeCard = (b: any): BookingCard => {
        const vehicleMake = b.vehicle_make || b.vehicle?.make || '';
        const vehicleModel = b.vehicle_model || (b.vehicle ? `${b.vehicle.make || ''} ${b.vehicle.model || ''}`.trim() : 'Vehicle');
        const fullModel = vehicleMake && !vehicleModel.includes(vehicleMake) ? `${vehicleMake} ${vehicleModel}` : vehicleModel;

        const custPhone = b.customer_phone || b.customer?.phone_number || b.customer?.phone || b.phone || '';
        const custName = b.customer_name || b.customer?.full_name || b.customer?.name || (typeof b.customer === 'string' ? b.customer : 'Walk-In');
        const sName = b.service_name || b.service_package?.name || 'Walk-In Wash';

        const baseP = Number(b.base_price ?? b.service_package?.price ?? b.price ?? 0);
        const finalP = Number(b.final_price ?? baseP);

        return {
            id: b.id,
            status: String(b.status || '').toUpperCase().trim(),
            plate_number: b.plate_number || b.vehicle?.plate_number || '???',
            vehicle_model: fullModel || 'Vehicle',
            service_name: sName,
            customer_name: custName,
            customer_phone: custPhone,
            technician_name: b.technician_name || (b.technician ? (b.technician.full_name || b.technician.username) : null),
            created_at: b.created_at || null,
            time_slot: b.time_slot || null,
            bay_assignment: b.bay_assignment || null,
            price: finalP,
            base_price: baseP,
            final_price: finalP,
            service_package: b.service_package,
            vehicle: b.vehicle,
            customer: b.customer,
        };
    };

    // ─── Fetch Queue Data ─────────────────────────────────────────────────────
    const fetchQueue = useCallback(async (silent = false) => {
        if (!silent) setIsLoading(true);

        try {
            // Fetch live queue from Next.js route handler /api/bookings/queue
            let data: any[] = [];
            const res = await api.get('/bookings/queue', { params: { date: selectedDate, _t: Date.now() } });
            data = Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.results || []);

            // Distribute into 3 lifecycle columns
            const newCols: Record<string, BookingCard[]> = {
                WAITING: [], 
                WASHING: [], 
                READY: [],
            };

            data.forEach(item => {
                const card = normalizeCard(item);
                const rawStatus = card.status;

                // Strictly exclude finished and cancelled bookings from active queue columns
                if (rawStatus === 'COMPLETED' || rawStatus === 'CANCELLED' || rawStatus === 'PAID') {
                    return;
                }

                if (rawStatus === 'WAITING' || rawStatus === 'PENDING' || rawStatus === 'CONFIRMED') {
                    newCols.WAITING.push(card);
                } else if (
                    rawStatus === 'IN_BAY_1' || 
                    rawStatus === 'IN_BAY_2' || 
                    rawStatus === 'IN_PROGRESS' || 
                    rawStatus === 'DETAILING'
                ) {
                    newCols.WASHING.push(card);
                } else if (rawStatus === 'READY') {
                    newCols.READY.push(card);
                } else {
                    // Default unknown active status to waiting
                    newCols.WAITING.push(card);
                }
            });
            
            setColumns(newCols);
            setIsConnected(true);
            setLastUpdated(new Date());
        } catch (err) {
            setIsConnected(false);
            console.error('Queue fetch failed:', err);
        } finally {
            setIsLoading(false);
        }
    }, [selectedDate]);

    useEffect(() => {
        fetchQueue();
        
        const handleQueueUpdated = () => fetchQueue(true);
        window.addEventListener('queue:updated', handleQueueUpdated);
        window.addEventListener('booking:completed', handleQueueUpdated);

        // Active polling (every 25s)
        const interval = setInterval(() => fetchQueue(true), 25000);

        return () => {
            clearInterval(interval);
            window.removeEventListener('queue:updated', handleQueueUpdated);
            window.removeEventListener('booking:completed', handleQueueUpdated);
        };
    }, [fetchQueue]);

    // ─── 1-Click Advance Stage Handler ────────────────────────────────────────
    const advanceBookingStage = async (card: BookingCard, targetCol: string) => {
        setIsUpdatingStage(true);

        const currentCol = card.status === 'READY' 
            ? 'READY' 
            : ['IN_BAY_1', 'IN_BAY_2', 'IN_PROGRESS', 'DETAILING'].includes(card.status) 
                ? 'WASHING' 
                : 'WAITING';

        const newStatus = targetCol === 'WASHING' 
            ? 'IN_BAY_1' 
            : targetCol === 'READY' 
                ? 'READY' 
                : 'WAITING';

        const bayAssignment = targetCol === 'WASHING' 
            ? (card.bay_assignment || 'Washing Bay 1') 
            : card.bay_assignment;

        // 1. Optimistic Update
        setColumns(prev => {
            const nextCols = { ...prev };
            nextCols[currentCol] = nextCols[currentCol].filter(c => c.id !== card.id);
            const updatedCard = { 
                ...card, 
                status: newStatus, 
                bay_assignment: bayAssignment 
            };
            nextCols[targetCol] = [updatedCard, ...nextCols[targetCol]];
            return nextCols;
        });

        // 2. Persist to Backend
        try {
            await api.patch(`/bookings/update-stage/${card.id}`, {
                new_status: newStatus,
                bay_assignment: bayAssignment,
            });
            toast.success(`Vehicle ${card.plate_number} moved to ${targetCol === 'WASHING' ? 'Washing Bay' : 'Ready for Pickup'}!`);
            window.dispatchEvent(new CustomEvent('queue:updated'));
        } catch (err: any) {
            console.error('Failed to advance stage:', err);
            toast.error(err.response?.data?.error || 'Failed to update vehicle stage');
            fetchQueue(true); // Revert
        } finally {
            setIsUpdatingStage(false);
        }
    };

    // ─── Drag End Handler ─────────────────────────────────────────────────────
    const onDragEnd = async (result: DropResult) => {
        const { source, destination, draggableId } = result;
        if (!destination) return;
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        const bookingId = parseInt(draggableId.replace('card-', ''));
        const sourceCol = source.droppableId;
        const destCol = destination.droppableId;

        const newStatus = destCol === 'WASHING' 
            ? 'IN_BAY_1' 
            : destCol === 'READY' 
                ? 'READY' 
                : 'WAITING';

        // 1. OPTIMISTIC UPDATE
        setColumns(prev => {
            const newCols = { ...prev };
            const sourceCards = [...newCols[sourceCol]];
            const destCards = sourceCol === destCol ? sourceCards : [...newCols[destCol]];
            
            const [movedCard] = sourceCards.splice(source.index, 1);
            const updatedCard = { ...movedCard, status: newStatus };
            
            if (sourceCol === destCol) {
                sourceCards.splice(destination.index, 0, updatedCard);
                newCols[sourceCol] = sourceCards;
            } else {
                destCards.splice(destination.index, 0, updatedCard);
                newCols[sourceCol] = sourceCards;
                newCols[destCol] = destCards;
            }
            return newCols;
        });

        // 2. SYNC TO BACKEND
        try {
            await api.patch(`/bookings/update-stage/${bookingId}`, {
                new_status: newStatus,
                bay_assignment: destCol === 'WASHING' ? 'Washing Bay 1' : null,
            });
            window.dispatchEvent(new CustomEvent('queue:updated'));
        } catch (err) {
            console.error('Sync failed, reverting', err);
            toast.error('Sync failed, reverting to previous stage');
            fetchQueue(true);
        }
    };

    const totalActive = Object.values(columns).flat().length;

    // Filter columns for mobile tabs
    const displayedColumns = COLUMNS.filter(col => 
        activeMobileTab === 'ALL' || activeMobileTab === col.id
    );

    return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col font-jakarta overflow-x-hidden">
            
            {/* ── TOP BAR ───────────────────────────────────────────────────── */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 sm:px-8 py-4 border-b border-white/5 bg-[#101114]/90 backdrop-blur-xl flex-shrink-0 sticky top-0 z-30">
                <div className="flex items-center justify-between sm:justify-start gap-4">
                    <button
                        type="button"
                        onClick={() => router.push('/staff/dashboard')}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all text-xs font-bold uppercase tracking-wider border border-white/10 cursor-pointer"
                        title="Back to Staff Dashboard"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Dashboard</span>
                    </button>
                    
                    <div className="h-6 w-px bg-white/10 hidden sm:block" />
                    
                    <div>
                        <h1 className="font-syncopate font-bold text-lg sm:text-xl tracking-wider text-white uppercase flex items-center gap-2">
                            Live <span className="text-[#01FFFF]">Queue</span>
                            <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                                3-STAGE
                            </span>
                        </h1>
                        <p className="text-[10px] sm:text-xs tracking-widest text-zinc-500 uppercase font-medium">
                            Wash Bay Workflow & Quick Cash Settlement
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 sm:gap-3.5 self-end sm:self-auto">
                    {/* Primary New Walk-In CTA */}
                    <button
                        type="button"
                        onClick={() => router.push('/staff/pos')}
                        className="flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-[#E52323] hover:bg-red-700 text-white transition-all text-xs font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(229,35,35,0.4)] cursor-pointer"
                    >
                        <PlusCircle className="w-4 h-4" />
                        <span>+ Walk-In</span>
                    </button>

                    {/* Active Vehicle Count */}
                    <div className="bg-white/5 border border-white/10 px-3 py-2 rounded-xl flex items-center gap-2">
                        <Car className="w-3.5 h-3.5 text-[#01FFFF]" />
                        <span className="font-mono font-bold text-xs sm:text-sm">{totalActive}</span>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider hidden sm:inline">Active</span>
                    </div>

                    {/* Connection Status */}
                    <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-2 rounded-xl border ${isConnected ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : 'border-red-500/30 text-red-400 bg-red-500/10'}`}>
                        {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                        <span className="hidden sm:inline">{isConnected ? 'Live' : 'Offline'}</span>
                    </div>

                    {/* Manual Refresh */}
                    <button
                        type="button"
                        onClick={() => fetchQueue()}
                        className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all border border-white/10 text-xs font-bold uppercase cursor-pointer"
                        title="Refresh Queue"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </header>

            {/* ── MOBILE TAB SWITCHER (Touch-Friendly for Wash Bay Staff) ──────── */}
            <div className="flex sm:hidden p-3 bg-[#0c0d10] border-b border-white/5 gap-2 overflow-x-auto">
                {[
                    { id: 'ALL', label: `All (${totalActive})` },
                    { id: 'WAITING', label: `Queue (${columns.WAITING.length})` },
                    { id: 'WASHING', label: `Washing (${columns.WASHING.length})` },
                    { id: 'READY', label: `Ready (${columns.READY.length})` },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveMobileTab(tab.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                            activeMobileTab === tab.id
                                ? 'bg-[#01FFFF]/20 border-[#01FFFF] text-[#01FFFF]'
                                : 'bg-white/5 border-white/5 text-zinc-400'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ── 3-STAGE KANBAN BOARD ──────────────────────────────────────── */}
            {isLoading ? (
                <div className="flex-1 flex items-center justify-center p-12">
                    <div className="flex flex-col items-center gap-4">
                        <Activity className="w-10 h-10 text-[#01FFFF] animate-spin" />
                        <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold">
                            Synchronizing Live Queue...
                        </p>
                    </div>
                </div>
            ) : (
                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-5 p-4 sm:p-6 overflow-y-auto max-w-7xl mx-auto w-full">
                        {displayedColumns.map(col => {
                            const cards = columns[col.id] || [];
                            return (
                                <div
                                    key={col.id}
                                    className={`flex flex-col bg-[#0b0c0e] border ${col.borderColor} rounded-3xl overflow-hidden ${col.glow} shadow-xl`}
                                >
                                    {/* Column Header */}
                                    <div className={`${col.headerBg} border-b ${col.borderColor} p-4 sm:p-5 flex-shrink-0`}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                                                    {col.icon}
                                                </div>
                                                <div>
                                                    <h3 className={`font-syncopate font-bold text-sm tracking-wider uppercase ${col.accent}`}>
                                                        {col.title}
                                                    </h3>
                                                    <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
                                                        {col.subtitle}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold border ${col.badgeBg}`}>
                                                {cards.length}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Droppable Card Area */}
                                    <Droppable droppableId={col.id}>
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.droppableProps}
                                                className={`
                                                    flex-1 p-3 sm:p-4 space-y-3.5 overflow-y-auto min-h-[300px] transition-colors duration-200
                                                    ${snapshot.isDraggingOver ? `${col.headerBg}` : ''}
                                                `}
                                            >
                                                {cards.length === 0 && !snapshot.isDraggingOver && (
                                                    <div className="flex flex-col items-center justify-center h-48 text-center opacity-40">
                                                        <AlertCircle className="w-8 h-8 mb-2 text-zinc-600" />
                                                        <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">
                                                            No Vehicles in this stage
                                                        </p>
                                                        <p className="text-[10px] text-zinc-600 mt-1">
                                                            Drag cards here or add via Walk-In POS
                                                        </p>
                                                    </div>
                                                )}
                                                {cards.map((card, index) => (
                                                    <QueueCardItem 
                                                        key={card.id} 
                                                        card={card} 
                                                        index={index} 
                                                        col={col}
                                                        onAdvanceStage={advanceBookingStage}
                                                        onOpenCheckout={(c) => setActiveCheckoutBooking(c)}
                                                        isUpdating={isUpdatingStage}
                                                    />
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

            {/* ── FOOTER BAR ───────────────────────────────────────────────── */}
            <footer className="flex items-center justify-between px-6 py-3 border-t border-white/5 bg-[#101114]/80 backdrop-blur-xl flex-shrink-0 text-[11px] text-zinc-500">
                <p className="uppercase tracking-wider hidden sm:inline">
                    Tap action buttons or drag cards across stages • Negotiate counter discounts at checkout
                </p>
                <p className="uppercase tracking-wider sm:hidden">
                    Kallayi Car Spa Live Operations
                </p>
                {lastUpdated && (
                    <p className="font-mono text-zinc-400">
                        Synced: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </p>
                )}
            </footer>

            {/* ── REUSABLE PAYMENT & PICKUP CHECKOUT MODAL ─────────────────── */}
            {activeCheckoutBooking && (
                <PaymentPickupModal
                    isOpen={!!activeCheckoutBooking}
                    onClose={() => setActiveCheckoutBooking(null)}
                    booking={{
                        id: activeCheckoutBooking.id,
                        plate_number: activeCheckoutBooking.plate_number,
                        customer_name: activeCheckoutBooking.customer_name,
                        phone: activeCheckoutBooking.customer_phone,
                        vehicle_model: activeCheckoutBooking.vehicle_model,
                        service_name: activeCheckoutBooking.service_name,
                        base_price: activeCheckoutBooking.base_price || activeCheckoutBooking.price || 0,
                        final_price: activeCheckoutBooking.final_price || activeCheckoutBooking.price || 0,
                    }}
                    staffProfile={staffProfile}
                    onSuccess={() => {
                        setActiveCheckoutBooking(null);
                        fetchQueue(true);
                        toast.success(`Booking #${activeCheckoutBooking.id} settled and marked delivered!`);
                        window.dispatchEvent(new CustomEvent('queue:updated'));
                        window.dispatchEvent(new CustomEvent('booking:completed'));
                    }}
                />
            )}
        </div>
    );
}

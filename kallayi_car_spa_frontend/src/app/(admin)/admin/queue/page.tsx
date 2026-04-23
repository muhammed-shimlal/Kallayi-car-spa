'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { 
    Activity, Car, Clock, RefreshCw, 
    ChevronLeft, Droplets, Sparkles, CheckCircle, 
    AlertCircle, User, Wifi, WifiOff, LayoutDashboard,
    Pencil, Trash2, X
} from 'lucide-react';

import toast from 'react-hot-toast';
import { StaffMember, ServicePackage } from '@/types/admin';
import { Skeleton } from '@/components/ui/Skeleton';


const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8001/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface BookingCard {
    id: number;
    status: string;
    plate_number: string;
    vehicle_model: string;
    service_name: string;
    customer_name: string;
    customer_id: number | null;
    price: number;
    technician_name: string | null;
    technician_id: number | null;
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

function BookingCard({ 
    card, index, col, onCheckout, staffMembers, onAssignStaff, onCancel, onEditService 
}: { 
    card: BookingCard; index: number; col: Column; 
    onCheckout?: (bookingId: number) => void; 
    staffMembers?: StaffMember[]; 
    onAssignStaff?: (bookingId: number, staffId: number) => void; 
    onCancel?: (bookingId: number) => void;
    onEditService?: (bookingId: number) => void;
}) {
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
                    <div className="flex items-center justify-between mb-3">
                        <div className={`font-syncopate font-black text-3xl tracking-[0.15em] ${col.accent}`}>
                            {card.plate_number}
                        </div>
                        <div className="flex items-center gap-1">
                            {onEditService && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onEditService(card.id); }}
                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#8E939B] hover:text-blue-400 transition-colors"
                                    title="Change Service"
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                </button>
                            )}
                            {onCancel && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onCancel(card.id); }}
                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#8E939B] hover:text-red-500 transition-colors"
                                    title="Cancel Wash"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
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
                            <div className="relative inline-flex items-center">
                                <User className="w-3 h-3 absolute left-2 pointer-events-none text-purple-400" />
                                <select 
                                    className={`appearance-none border pl-6 pr-6 py-0.5 rounded-full text-[10px] font-bold cursor-pointer focus:outline-none focus:ring-1 
                                        ${card.technician_id
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 focus:ring-emerald-400/50' 
                                            : 'bg-purple-500/10 text-purple-400 border-purple-500/30 focus:ring-purple-400/50'}`}
                                    onClick={(e) => e.stopPropagation()}
                                    value={card.technician_id || ""} 
                                    onChange={(e) => {
                                        if (onAssignStaff && e.target.value) {
                                            const staffId = parseInt(e.target.value);
                                            if (!isNaN(staffId)) onAssignStaff(card.id, staffId);
                                        }
                                    }}
                                >
                                    <option value="" disabled className="bg-[#141518] text-[#8E939B]">
                                        {card.technician_name ? `Assigned: ${card.technician_name}` : "Assign Worker"}
                                    </option>
                                    
                                    {staffMembers?.map(s => (
                                        <option key={s.id} value={s.user_id} className="bg-[#141518] text-white">
                                            {s.first_name || s.username} ({s.role})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <ElapsedTimer since={card.time_slot || card.created_at} />
                    </div>

                    {col.id === 'READY' && onCheckout && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onCheckout(card.id); }}
                            className="w-full mt-4 bg-emerald-500 hover:bg-emerald-400 text-black font-syncopate font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-xs shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                        >
                            <CheckCircle className="w-4 h-4" />
                            COMPLETE & CHECKOUT
                        </button>
                    )}
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
    const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [checkoutModal, setCheckoutModal] = useState({ 
        isOpen: false, 
        bookingId: null as number | null, 
        totalAmount: 0, 
        cash: 0, 
        upi: 0, 
        khata: 0, 
        customerName: '',
        customerId: null as number | null
    });

    const [servicePackages, setServicePackages] = useState<ServicePackage[]>([]);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editBookingId, setEditBookingId] = useState<number | null>(null);
    const [newPackageId, setNewPackageId] = useState('');

    const fetchQueue = useCallback(async (silent = false) => {
        const token = localStorage.getItem('auth_token');
        if (!token) return router.push('/login');
        if (!silent) setIsLoading(true);

        try {
            const res = await fetch(`${API_BASE}/bookings/live-queue/`, {
                headers: { 'Authorization': `Token ${token}` }
            });
            if (!res.ok) throw new Error('API error');

            const data: BookingCard[] = await res.json();
            const newCols: Record<string, BookingCard[]> = { WAITING: [], IN_BAY_1: [], IN_BAY_2: [], READY: [] };
            data.forEach(card => {
                let targetCol = card.status;
                if (card.status === 'IN_PROGRESS') {
                    if (card.bay_assignment === 'Bay 1') targetCol = 'IN_BAY_1';
                    else if (card.bay_assignment === 'Bay 2') targetCol = 'IN_BAY_2';
                    else targetCol = 'IN_BAY_1';
                }
                const colKey = newCols[targetCol] !== undefined ? targetCol : 'WAITING';
                newCols[colKey].push(card);
            });
            setColumns(newCols);
            setIsConnected(true);
            setLastUpdated(new Date());

            if (!silent) {
                try {
                    const staffRes = await fetch(`${API_BASE}/staff/directory/`, {
                        headers: { 'Authorization': `Token ${token}` }
                    });
                    if (staffRes.ok) {
                        const staffData = await staffRes.json();
                        const list = Array.isArray(staffData) ? staffData : (staffData.results || []);
                        setStaffMembers(list.filter((s: StaffMember) => s.role === 'WASHER' || s.role === 'TECHNICIAN'));
                    }
                } catch { /* ignore staff error */ }

                try {
                    const svcRes = await fetch(`${API_BASE}/service-packages/`, {
                        headers: { 'Authorization': `Token ${token}` }
                    });
                    if (svcRes.ok) {
                        const svcData = await svcRes.json();
                        const svcList = Array.isArray(svcData) ? svcData : (svcData.results || []);
                        setServicePackages(svcList);
                    }
                } catch { /* ignore err */ }
            }
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

    const handleCancelBooking = async (id: number) => {
        if (!window.confirm("Are you sure you want to cancel this wash?")) return;
        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(`${API_BASE}/bookings/${id}/`, {
                method: 'PATCH',
                headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'CANCELLED' })
            });
            if (!res.ok) throw new Error('API failed');
            toast.success("Booking cancelled successfully.");
            fetchQueue(true);
        } catch {
            toast.error("Failed to cancel booking.");
        }
    };

    const openEditServiceModal = (id: number) => {
        setEditBookingId(id);
        setNewPackageId('');
        setIsEditModalOpen(true);
    };

    const handleChangeServiceSubmit = async () => {
        if (!editBookingId || !newPackageId) {
            toast.error("Please select a service package.");
            return;
        }
        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(`${API_BASE}/bookings/${editBookingId}/`, {
                method: 'PATCH',
                headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ service_package: parseInt(newPackageId) })
            });
            if (!res.ok) throw new Error('API failed');
            toast.success("Service package updated!");
            setIsEditModalOpen(false);
            setEditBookingId(null);
            fetchQueue(true);
        } catch {
            toast.error("Failed to change service package.");
        }
    };

    const handleAssignStaff = async (bookingId: number, staffId: number) => {
        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(`http://127.0.0.1:8001/api/bookings/update-stage/${bookingId}/`, {
                method: 'PATCH',
                headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ assigned_technician_id: staffId }),
            });
            if (!res.ok) {
                const errBody = await res.json().catch(() => ({}));
                console.error('[assignStaff] API error:', res.status, errBody);
                toast.error(`Failed to assign. (${res.status}: ${errBody.error || errBody.detail || 'See console'})`);
                return;
            }
            toast.success('Worker assigned!');
            fetchQueue(true);
        } catch (e) {
            console.error('[assignStaff] Network error:', e);
            toast.error('Failed to assign worker. Check network connection.');
        }
    };

    const handleCheckout = (bookingId: number) => {
        let foundCard = null;
        for (const col of Object.values(columns)) {
            const match = col.find(c => c.id === bookingId);
            if (match) {
                foundCard = match;
                break;
            }
        }
        if (!foundCard) return;
        
        setCheckoutModal({ 
            isOpen: true, 
            bookingId, 
            totalAmount: foundCard.price, 
            cash: foundCard.price, 
            upi: 0, 
            khata: 0, 
            customerName: foundCard.customer_name,
            customerId: foundCard.customer_id
        });
    };

    const submitPayment = async () => {
        const totalTendered = (checkoutModal.cash || 0) + (checkoutModal.upi || 0) + (checkoutModal.khata || 0);
        let finalCashAmount = checkoutModal.cash || 0;
        if (totalTendered > checkoutModal.totalAmount) {
            const changeToGiveBack = totalTendered - checkoutModal.totalAmount;
            finalCashAmount = finalCashAmount - changeToGiveBack; 
        }

        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(`http://127.0.0.1:8001/api/bookings/update-stage/${checkoutModal.bookingId}/`, {
                method: 'PATCH',
                headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    new_status: 'COMPLETED', 
                    bay_assignment: null,
                    payment_cash: checkoutModal.cash,
                    payment_upi: checkoutModal.upi,
                    payment_khata: checkoutModal.khata
                }),
            });
            if (!res.ok) throw new Error('API failed');
            toast.success('Vehicle Complete & Checkout Successful!');
            
            setCheckoutModal({ isOpen: false, bookingId: null, totalAmount: 0, cash: 0, upi: 0, khata: 0, customerName: '', customerId: null });
            fetchQueue();
        } catch {
            toast.error('Failed to checkout vehicle.');
        }
    };

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
            const updatedCard = { ...movedCard, status: destCol };
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

        // Backend sync
        try {
            const token = localStorage.getItem('auth_token');
            await fetch(`http://127.0.0.1:8001/api/bookings/update-stage/${bookingId}/`, {
                method: 'PATCH',
                headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    new_status: destCol.startsWith('IN_BAY') ? 'IN_PROGRESS' : destCol,
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
                <div className="flex-1 flex gap-6 p-6 overflow-x-auto overflow-y-hidden">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex flex-col flex-shrink-0 w-80 xl:w-96 bg-[#0C0D0F] border border-white/5 rounded-3xl overflow-hidden shadow-[0_0_20px_rgba(255,255,255,0.02)]">
                            <div className="bg-white/5 border-b border-white/5 p-5">
                                <div className="flex items-center justify-between">
                                    <Skeleton className="h-5 w-32" />
                                    <Skeleton className="h-7 w-7 rounded-full" />
                                </div>
                            </div>
                            <div className="flex-1 p-4 space-y-3">
                                <Skeleton className="h-44 w-full" />
                                <Skeleton className="h-44 w-full" />
                                <Skeleton className="h-44 w-full opacity-50" />
                            </div>
                        </div>
                    ))}
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
                                                    <BookingCard 
                                                        key={card.id} 
                                                        card={card} 
                                                        index={index} 
                                                        col={col} 
                                                        onCheckout={handleCheckout} 
                                                        staffMembers={staffMembers} 
                                                        onAssignStaff={handleAssignStaff} 
                                                        onCancel={handleCancelBooking} 
                                                        onEditService={openEditServiceModal} 
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

            {/* ── CHECKOUT MODAL ────────────────────────────────────────────── */}
            {checkoutModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
                    <div className="bg-[#141518] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#0C0D0F]">
                            <div>
                                <h2 className="font-syncopate font-black text-lg tracking-widest text-emerald-400">
                                    CHECKOUT
                                </h2>
                                <p className="text-[10px] text-[#8E939B] uppercase tracking-widest mt-1">
                                    {checkoutModal.customerName || "Walk-in"} • Total: ₹{checkoutModal.totalAmount}
                                </p>
                            </div>
                            <button 
                                onClick={() => setCheckoutModal(prev => ({...prev, isOpen: false}))} 
                                className="text-[#8E939B] hover:text-[#FF2A6D] transition-colors p-2 rounded-full hover:bg-white/5"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Payment Inputs */}
                        <div className="p-6 space-y-5">
                            <div>
                                <label className="text-[10px] text-emerald-400 uppercase font-bold tracking-[0.2em] ml-2">Cash Tendered</label>
                                <div className="relative mt-2">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8E939B] font-bold">₹</span>
                                    <input
                                        type="number"
                                        value={checkoutModal.cash || ''}
                                        onChange={(e) => setCheckoutModal(prev => ({ ...prev, cash: parseFloat(e.target.value) || 0 }))}
                                        className="w-full bg-white/5 border border-white/10 py-4 pl-8 pr-4 rounded-xl text-white font-mono text-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-[10px] text-blue-400 uppercase font-bold tracking-[0.2em] ml-2">UPI / Card</label>
                                <div className="relative mt-2">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8E939B] font-bold">₹</span>
                                    <input
                                        type="number"
                                        value={checkoutModal.upi || ''}
                                        onChange={(e) => setCheckoutModal(prev => ({ ...prev, upi: parseFloat(e.target.value) || 0 }))}
                                        className="w-full bg-white/5 border border-white/10 py-4 pl-8 pr-4 rounded-xl text-white font-mono text-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] text-purple-400 uppercase font-bold tracking-[0.2em] ml-2">Add to Khata (Credit)</label>
                                <div className="relative mt-2">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8E939B] font-bold">₹</span>
                                    <input
                                        type="number"
                                        value={checkoutModal.khata || ''}
                                        onChange={(e) => setCheckoutModal(prev => ({ ...prev, khata: parseFloat(e.target.value) || 0 }))}
                                        className="w-full bg-white/5 border border-white/10 py-4 pl-8 pr-4 rounded-xl text-white font-mono text-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer & Actions */}
                        <div className="p-6 bg-[#0B0C10] border-t border-white/5 flex items-center justify-between">
                            {/* Dynamic Remaining / Change Calculator */}
                            {(() => {
                                const sum = (checkoutModal.cash || 0) + (checkoutModal.upi || 0) + (checkoutModal.khata || 0);
                                const diff = checkoutModal.totalAmount - sum;
                                
                                if (diff > 0) {
                                    return (
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-[#8E939B] uppercase tracking-wider">Remaining</span>
                                            <span className="text-xl font-black text-white transition-colors font-mono">
                                                ₹{diff.toFixed(2)}
                                            </span>
                                        </div>
                                    );
                                } else if (diff < 0) {
                                    return (
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-[#FF2A6D] uppercase tracking-wider animate-pulse">Change (Give Back)</span>
                                            <span className="text-xl font-black text-[#FF2A6D] transition-colors shadow-red-500/50 drop-shadow-md font-mono">
                                                ₹{Math.abs(diff).toFixed(2)}
                                            </span>
                                        </div>
                                    );
                                } else {
                                    return (
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Balance</span>
                                            <span className="text-xl font-black text-emerald-400 transition-colors font-mono">
                                                Exact (₹0.00)
                                            </span>
                                        </div>
                                    );
                                }
                            })()}
                            
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setCheckoutModal(prev => ({...prev, isOpen: false}))}
                                    className="px-5 py-3 rounded-xl font-bold text-sm text-[#8E939B] hover:text-white hover:bg-white/5 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={submitPayment}
                                    disabled={((checkoutModal.cash || 0) + (checkoutModal.upi || 0) + (checkoutModal.khata || 0)) < checkoutModal.totalAmount}
                                    className="px-6 py-3 rounded-xl font-bold text-sm bg-emerald-500 text-black hover:bg-emerald-400 transition-all disabled:opacity-20 disabled:hover:bg-emerald-500 disabled:cursor-not-allowed flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                                >
                                    Confirm Payment
                                </button>
                            </div>
                        </div>      
                    </div>
                </div>
            )}       

            {/* ── EDIT SERVICE MODAL ───────────────────────────────────────── */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
                    <div className="bg-[#141518] border border-white/10 rounded-3xl w-full max-w-sm overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] p-6">
                        <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
                            <h2 className="font-syncopate font-bold text-sm tracking-widest text-[#01FFFF]">
                                CHANGE SERVICE PACKAGE
                            </h2>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-[#8E939B] hover:text-[#FF2A6D] transition-colors p-1">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="text-[10px] text-[#8E939B] uppercase font-bold tracking-[0.2em] ml-2">New Package</label>
                                <select
                                    value={newPackageId}
                                    onChange={(e) => setNewPackageId(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 py-4 px-6 rounded-xl text-white focus:outline-none focus:border-[#01FFFF] focus:ring-1 focus:ring-[#01FFFF] transition-all appearance-none mt-2"
                                >
                                    <option value="" className="bg-[#141518]">-- Select New Service --</option>
                                    {servicePackages.map(pkg => (
                                        <option key={pkg.id} value={pkg.id} className="bg-[#141518]">
                                            {pkg.name} (₹{pkg.price})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="flex-1 px-4 py-3.5 rounded-xl border border-white/10 text-[#8E939B] hover:text-white hover:bg-white/5 transition-all text-xs uppercase font-bold tracking-widest"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleChangeServiceSubmit}
                                className="flex-1 px-4 py-3.5 rounded-xl bg-[#01FFFF] text-black shadow-[0_0_15px_rgba(1,255,255,0.4)] hover:bg-white transition-all text-xs uppercase font-bold tracking-widest"
                            >
                                Update Service
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{ __html: `
                .font-syncopate { font-family: 'Syncopate', sans-serif; }
            `}} />
        </div>
    );
}

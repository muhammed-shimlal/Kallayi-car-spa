'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { 
    Activity, Car, Clock, RefreshCw, 
    ChevronLeft, Droplets, Sparkles, CheckCircle, 
    AlertCircle, User, Wifi, WifiOff, LayoutDashboard,
    Pencil, Trash2, X, LayoutGrid, Kanban, Filter, BookOpen, Phone, Search, Calendar
} from 'lucide-react';

import toast from 'react-hot-toast';
import { StaffMember, ServicePackage } from '@/types/admin';
import { Skeleton } from '@/components/ui/Skeleton';
import api, { getApiBaseUrl } from '@/lib/api';

const getApiBase = () => getApiBaseUrl();

// ─── Types ───────────────────────────────────────────────────────────────────

interface BookingCardData {
    id: number;
    status: string;
    plate_number: string;
    vehicle_make?: string;
    vehicle_model: string;
    service_name: string;
    service_details?: string;
    customer_name: string;
    customer_phone?: string;
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
        icon: <Clock className="w-4 h-4" />,
        accent: 'text-yellow-400',
        glow: 'shadow-[0_0_20px_rgba(234,179,8,0.1)]',
        borderColor: 'border-yellow-500/30',
        headerBg: 'bg-yellow-500/10',
    },
    {
        id: 'IN_BAY_1',
        title: 'Washing Bay 1',
        icon: <Droplets className="w-4 h-4" />,
        accent: 'text-[#01FFFF]',
        glow: 'shadow-[0_0_20px_rgba(1,255,255,0.1)]',
        borderColor: 'border-[#01FFFF]/30',
        headerBg: 'bg-[#01FFFF]/10',
    },
    {
        id: 'IN_BAY_2',
        title: 'Washing Bay 2',
        icon: <Droplets className="w-4 h-4" />,
        accent: 'text-blue-400',
        glow: 'shadow-[0_0_20px_rgba(96,165,250,0.1)]',
        borderColor: 'border-blue-400/30',
        headerBg: 'bg-blue-400/10',
    },
    {
        id: 'READY',
        title: 'Ready for Pickup',
        icon: <CheckCircle className="w-4 h-4" />,
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

// ─── Touch-Optimized Queue Card Component ─────────────────────────────────────

function QueueCard({
    card,
    col,
    onCheckout,
    staffMembers,
    onAssignStaff,
    onCancel,
    onEditService,
    onMoveStage,
    isDragging = false,
    dragProps = {}
}: {
    card: BookingCardData;
    col: Column;
    onCheckout?: (id: number) => void;
    staffMembers?: StaffMember[];
    onAssignStaff?: (bookingId: number, staffId: number) => void;
    onCancel?: (id: number) => void;
    onEditService?: (id: number) => void;
    onMoveStage?: (id: number, targetColId: string) => void;
    isDragging?: boolean;
    dragProps?: any;
}) {
    return (
        <div
            {...dragProps}
            className={`
                bg-[#141518] border rounded-2xl p-4 sm:p-5 select-none transition-all duration-200 shadow-lg relative group
                ${isDragging
                    ? `${col.borderColor} ${col.glow} scale-105 rotate-1 opacity-95 z-50`
                    : 'border-white/10 hover:border-white/20 bg-[#141518]/90 hover:bg-[#181a1f]'}
            `}
        >
            {/* Top Bar: Plate Number & Status Badge */}
            <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                    <div className={`font-syncopate font-black text-2xl sm:text-3xl tracking-[0.15em] ${col.accent} drop-shadow-sm`}>
                        {card.plate_number}
                    </div>
                    <div className="text-[10px] text-[#8E939B] uppercase tracking-widest font-bold mt-0.5 flex items-center gap-1.5">
                        <User className="w-3 h-3 text-[#8E939B]" /> {card.customer_name || 'Walk-In Customer'}
                        {card.customer_phone && <span className="text-white/60 font-mono">({card.customer_phone})</span>}
                    </div>
                </div>

                <div className="flex flex-col items-end gap-1.5">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${col.borderColor} ${col.headerBg} ${col.accent} shadow-sm flex items-center gap-1.5`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${col.id === 'IN_BAY_1' || col.id === 'IN_BAY_2' ? 'bg-[#01FFFF] animate-ping' : col.accent.replace('text-', 'bg-')}`} />
                        {col.title}
                    </span>
                    {card.time_slot ? (
                        <span className="text-[10px] font-mono text-[#01FFFF] font-bold bg-[#01FFFF]/10 px-2 py-0.5 rounded border border-[#01FFFF]/20">
                            {new Date(card.time_slot).toLocaleDateString([], { month: 'short', day: 'numeric' })} @ {new Date(card.time_slot).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    ) : (
                        <ElapsedTimer since={card.created_at} />
                    )}
                </div>
            </div>

            {/* Main Content Info Box: Vehicle Model & Service Package */}
            <div className="bg-[#0c0d0f] rounded-xl p-3.5 mb-3 border border-white/5 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <Car className="w-4 h-4 text-white/80 flex-shrink-0" />
                        <span className="text-white text-sm font-bold truncate">{card.vehicle_model || 'Standard Vehicle'}</span>
                    </div>
                    {onEditService && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onEditService(card.id); }}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#8E939B] hover:text-[#01FFFF] transition-colors active:scale-95 touch-manipulation min-h-[36px] min-w-[36px] flex items-center justify-center"
                            title="Edit Service Package"
                        >
                            <Pencil className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-white/5">
                    <div className="flex items-center gap-2 min-w-0">
                        <Sparkles className="w-3.5 h-3.5 text-[#01FFFF] flex-shrink-0" />
                        <span className="text-[#01FFFF] font-semibold truncate">{card.service_name}</span>
                    </div>
                    <span className="font-mono text-white/90 font-bold">₹{card.price}</span>
                </div>
            </div>

            {/* Controls: Technician Selector & Quick Stage Switcher */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                {/* Staff Select */}
                <div className="relative flex items-center">
                    <User className="w-3.5 h-3.5 absolute left-3 pointer-events-none text-purple-400 z-10" />
                    <select
                        className={`w-full appearance-none border pl-8 pr-7 py-2 rounded-xl text-xs font-bold cursor-pointer focus:outline-none focus:ring-1 min-h-[40px] touch-manipulation ${
                            card.technician_id
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                        }`}
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
                            {card.technician_name ? `Tech: ${card.technician_name}` : "Assign Tech..."}
                        </option>
                        {staffMembers?.map(s => (
                            <option key={s.id} value={s.user_id || s.id} className="bg-[#141518] text-white">
                                {s.first_name || s.username} ({s.role})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Quick Stage Move Dropdown */}
                <div className="relative flex items-center">
                    <Activity className="w-3.5 h-3.5 absolute left-3 pointer-events-none text-[#01FFFF] z-10" />
                    <select
                        className="w-full appearance-none border border-white/10 bg-white/5 text-white pl-8 pr-7 py-2 rounded-xl text-xs font-bold cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#01FFFF]/50 min-h-[40px] touch-manipulation"
                        onClick={(e) => e.stopPropagation()}
                        value={col.id}
                        onChange={(e) => {
                            if (onMoveStage && e.target.value) {
                                onMoveStage(card.id, e.target.value);
                            }
                        }}
                    >
                        <option value="" disabled className="bg-[#141518] text-[#8E939B]">Move Stage...</option>
                        {COLUMNS.map(c => (
                            <option key={c.id} value={c.id} className="bg-[#141518] text-white">
                                {c.id === col.id ? `✓ ${c.title}` : `Move to ${c.title}`}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
                {col.id === 'READY' && onCheckout ? (
                    <button
                        onClick={(e) => { e.stopPropagation(); onCheckout(card.id); }}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-syncopate font-bold py-2.5 rounded-xl transition-all active:scale-95 touch-manipulation flex items-center justify-center gap-2 text-xs shadow-[0_0_15px_rgba(16,185,129,0.3)] min-h-[44px]"
                    >
                        <CheckCircle className="w-4 h-4" />
                        COMPLETE &amp; CHECKOUT
                    </button>
                ) : (
                    <div className="flex items-center gap-2 w-full justify-between">
                        {/* Stage Quick Move Chips */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {col.id !== 'IN_BAY_1' && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onMoveStage && onMoveStage(card.id, 'IN_BAY_1'); }}
                                    className="px-2.5 py-1.5 rounded-lg bg-[#01FFFF]/10 border border-[#01FFFF]/30 text-[#01FFFF] hover:bg-[#01FFFF]/20 text-[10px] font-bold uppercase transition-all active:scale-95 touch-manipulation min-h-[36px]"
                                >
                                    Bay 1
                                </button>
                            )}
                            {col.id !== 'IN_BAY_2' && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onMoveStage && onMoveStage(card.id, 'IN_BAY_2'); }}
                                    className="px-2.5 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 text-[10px] font-bold uppercase transition-all active:scale-95 touch-manipulation min-h-[36px]"
                                >
                                    Bay 2
                                </button>
                            )}
                            {col.id !== 'READY' && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onMoveStage && onMoveStage(card.id, 'READY'); }}
                                    className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-[10px] font-bold uppercase transition-all active:scale-95 touch-manipulation min-h-[36px]"
                                >
                                    Ready
                                </button>
                            )}
                        </div>

                        {onCancel && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onCancel(card.id); }}
                                className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-[#8E939B] hover:text-red-400 transition-colors active:scale-95 touch-manipulation min-h-[36px] min-w-[36px] flex items-center justify-center"
                                title="Cancel Wash"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Main Queue Component ────────────────────────────────────────────────────

export default function AdminQueueBoard() {
    const router = useRouter();
    const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
    const [selectedDate, setSelectedDate] = useState<string>(todayStr);
    const [viewFilter, setViewFilter] = useState<'date' | 'upcoming'>('date');
    const [columns, setColumns] = useState<Record<string, BookingCardData[]>>({
        WAITING: [], IN_BAY_1: [], IN_BAY_2: [], READY: [],
    });
    const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
    const [existingCustomers, setExistingCustomers] = useState<{ id: number; name: string; phone_number: string }[]>([]);
    const [khataCustomerMode, setKhataCustomerMode] = useState<'EXISTING' | 'NEW'>('EXISTING');
    const [khataSearchInput, setKhataSearchInput] = useState('');
    const [khataSearchResults, setKhataSearchResults] = useState<{ id: number; name: string; phone_number: string; outstanding_balance?: number }[]>([]);
    const [isSearchingKhata, setIsSearchingKhata] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [activeMobileTab, setActiveMobileTab] = useState<string>('ALL');
    const [viewMode, setViewMode] = useState<'cards' | 'board'>('cards');

    const [checkoutModal, setCheckoutModal] = useState({ 
        isOpen: false, 
        bookingId: null as number | null, 
        totalAmount: 0, 
        cash: 0, 
        upi: 0, 
        khata: 0, 
        customerName: '',
        customerId: null as number | null,
        phoneNumber: '',
        vehicleModel: '',
        plateNumber: '',
        isSplit: false,
        method: 'CASH' as 'CASH' | 'UPI' | 'KHATA'
    });

    const [servicePackages, setServicePackages] = useState<ServicePackage[]>([]);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editBookingId, setEditBookingId] = useState<number | null>(null);
    const [newPackageId, setNewPackageId] = useState('');

    // Flat queueData array combining all columns
    const queueData = useMemo(() => {
        return Object.values(columns).flat();
    }, [columns]);

    const totalActive = queueData.length;

    // Smart Customer Lookup & Linking
    const matchedCustomer = useMemo(() => {
        if (!checkoutModal.isOpen) return null;
        const pool = [...(khataSearchResults || []), ...(existingCustomers || [])];

        // 1. If explicit customerId set
        if (checkoutModal.customerId) {
            const found = pool.find(c => c.id === checkoutModal.customerId);
            if (found) return found;
        }

        // 2. If phone number entered/auto-filled
        const cleanPhone = (checkoutModal.phoneNumber || '').replace(/\D/g, '');
        if (cleanPhone.length >= 7) {
            const found = pool.find(c => {
                const cClean = (c.phone_number || '').replace(/\D/g, '');
                return cClean && (cClean.endsWith(cleanPhone) || cleanPhone.endsWith(cClean));
            });
            if (found) return found;
        }

        return null;
    }, [checkoutModal.isOpen, checkoutModal.customerId, checkoutModal.phoneNumber, khataSearchResults, existingCustomers]);

    // Auto-set customerId when matched
    useEffect(() => {
        if (matchedCustomer && checkoutModal.customerId !== matchedCustomer.id) {
            setCheckoutModal(prev => ({
                ...prev,
                customerId: matchedCustomer.id,
                customerName: prev.customerName || matchedCustomer.name,
                phoneNumber: prev.phoneNumber || matchedCustomer.phone_number
            }));
        }
    }, [matchedCustomer, checkoutModal.customerId]);

    const fetchQueue = useCallback(async (silent = false) => {
        const token = localStorage.getItem('auth_token');
        if (!token) return router.push('/login');
        if (!silent) setIsLoading(true);

        try {
            const endpoint = viewFilter === 'upcoming' 
                ? `${getApiBase()}/bookings/live-queue/?type=upcoming`
                : `${getApiBase()}/bookings/live-queue/?date=${selectedDate}`;
            const res = await fetch(endpoint, {
                headers: { 'Authorization': `Token ${token}` }
            });
            if (!res.ok) throw new Error('API error');

            const data: BookingCardData[] = await res.json();
            const newCols: Record<string, BookingCardData[]> = { WAITING: [], IN_BAY_1: [], IN_BAY_2: [], READY: [] };
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
                    const staffRes = await fetch(`${getApiBase()}/staff/directory/`, {
                        headers: { 'Authorization': `Token ${token}` }
                    });
                    if (staffRes.ok) {
                        const staffData = await staffRes.json();
                        const list = Array.isArray(staffData) ? staffData : (staffData.results || []);
                        const activeList = list.filter((s: any) => s.is_active !== false);
                        const assignable = activeList.filter((s: StaffMember) => 
                            ['WASHER', 'TECHNICIAN', 'DRIVER', 'MANAGER', 'ADMIN'].includes((s.role || '').toUpperCase())
                        );
                        setStaffMembers(assignable.length > 0 ? assignable : activeList);
                    }
                } catch (e) { console.error('[fetchQueue] Staff fetch error:', e); }

                try {
                    const svcRes = await fetch(`${getApiBase()}/service-packages/`, {
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
    }, [router, selectedDate, viewFilter]);

    useEffect(() => {
        fetchQueue();
        const interval = setInterval(() => fetchQueue(true), 30000);
        return () => clearInterval(interval);
    }, [fetchQueue]);

    // Debounced Async Khata Customer Search
    useEffect(() => {
        if (!khataSearchInput.trim()) {
            setKhataSearchResults([]);
            setIsDropdownOpen(false);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearchingKhata(true);
            const token = localStorage.getItem('auth_token');
            try {
                const res = await fetch(`${getApiBase()}/customers/search/?search=${encodeURIComponent(khataSearchInput.trim())}`, {
                    headers: { 'Authorization': `Token ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setKhataSearchResults(Array.isArray(data) ? data : (data.results || []));
                    setIsDropdownOpen(true);
                }
            } catch (e) {
                console.error('[KhataSearch] API error:', e);
            } finally {
                setIsSearchingKhata(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [khataSearchInput]);

    const handleMoveStage = async (bookingId: number, targetColId: string) => {
        let currentColId = '';
        let targetCard: BookingCardData | null = null;
        for (const [colId, cardList] of Object.entries(columns)) {
            const found = cardList.find(c => c.id === bookingId);
            if (found) {
                currentColId = colId;
                targetCard = found;
                break;
            }
        }
        if (!targetCard || currentColId === targetColId) return;

        setColumns(prev => {
            const newCols = { ...prev };
            const sourceCards = [...(newCols[currentColId] || [])];
            const destCards = [...(newCols[targetColId] || [])];
            const index = sourceCards.findIndex(c => c.id === bookingId);
            if (index > -1) {
                const [moved] = sourceCards.splice(index, 1);
                const updated = { ...moved, status: targetColId };
                destCards.push(updated);
                newCols[currentColId] = sourceCards;
                newCols[targetColId] = destCards;
            }
            return newCols;
        });

        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(`${getApiBase()}/bookings/update-stage/${bookingId}/`, {
                method: 'PATCH',
                headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    new_status: targetColId.startsWith('IN_BAY') ? 'IN_PROGRESS' : targetColId,
                    bay_assignment: targetColId.startsWith('IN_BAY') ? targetColId.replace('IN_BAY_', 'Bay ') : null,
                }),
            });
            if (!res.ok) throw new Error('API failed');
            const destCol = COLUMNS.find(c => c.id === targetColId);
            toast.success(`Vehicle moved to ${destCol?.title || targetColId}`);
            fetchQueue(true);
        } catch {
            toast.error("Failed to move vehicle stage.");
            fetchQueue(true);
        }
    };

    const handleCancelBooking = async (id: number) => {
        if (!window.confirm("Are you sure you want to cancel this wash?")) return;
        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(`${getApiBase()}/bookings/${id}/`, {
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
            const res = await fetch(`${getApiBase()}/bookings/${editBookingId}/`, {
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
        const baseUrl = getApiBase();
        try {
            const res = await fetch(`${baseUrl}/bookings/update-stage/${bookingId}/`, {
                method: 'PATCH',
                headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assigned_technician_id: staffId,
                    technician_id: staffId,
                    technician: staffId
                }),
            });
            if (!res.ok) {
                toast.error(`Failed to assign technician.`);
                return;
            }
            toast.success('Worker assigned successfully!');
            fetchQueue(true);
        } catch {
            toast.error('Failed to assign worker.');
        }
    };

    const handleCheckout = async (bookingId: number) => {
        const foundCard = queueData.find(c => c.id === bookingId);
        if (!foundCard) return;

        let initialPhone = '';
        let initialCustName = foundCard.customer_name || '';
        let initialCustId = foundCard.customer_id || null;

        const token = localStorage.getItem('auth_token');
        if (foundCard.plate_number && token) {
            try {
                const res = await fetch(`${getApiBase()}/vehicles/lookup/?plate=${encodeURIComponent(foundCard.plate_number)}`, {
                    headers: { 'Authorization': `Token ${token}` }
                });
                if (res.ok) {
                    const lookupData = await res.json();
                    if (lookupData.phone) initialPhone = lookupData.phone;
                    if (lookupData.customer_name) initialCustName = lookupData.customer_name;
                }
            } catch { /* fallback silently */ }
        }

        setCheckoutModal({ 
            isOpen: true, 
            bookingId, 
            totalAmount: foundCard.price, 
            cash: foundCard.price, 
            upi: 0, 
            khata: 0, 
            customerName: initialCustName,
            customerId: initialCustId,
            phoneNumber: initialPhone,
            vehicleModel: foundCard.vehicle_model || '',
            plateNumber: foundCard.plate_number || '',
            isSplit: false,
            method: 'CASH'
        });
    };

    const submitPayment = async () => {
        const totalKhata = checkoutModal.khata || (checkoutModal.method === 'KHATA' ? checkoutModal.totalAmount : 0);

        if (totalKhata > 0 && !checkoutModal.customerName.trim()) {
            toast.error("Please enter a Customer Name to log the Khata credit.");
            return;
        }

        const totalTendered = (checkoutModal.cash || 0) + (checkoutModal.upi || 0) + totalKhata;
        let finalCashAmount = checkoutModal.cash || 0;
        if (totalTendered > checkoutModal.totalAmount) {
            const changeToGiveBack = totalTendered - checkoutModal.totalAmount;
            finalCashAmount = finalCashAmount - changeToGiveBack; 
        }

        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(`${getApiBase()}/bookings/${checkoutModal.bookingId}/checkout/`, {
                method: 'POST',
                headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    amount_cash: finalCashAmount,
                    amount_upi: checkoutModal.upi,
                    amount_khata: totalKhata,
                    customer_id: checkoutModal.customerId || (matchedCustomer ? matchedCustomer.id : null),
                    customer_name: checkoutModal.customerName,
                    phone_number: checkoutModal.phoneNumber,
                    vehicle_model: checkoutModal.vehicleModel,
                    plate_number: checkoutModal.plateNumber
                }),
            });
            if (!res.ok) throw new Error('API failed');

            toast.dismiss();
            toast((t) => (
                <div className="flex items-center justify-between gap-4 p-1">
                    <span className="font-bold text-emerald-400 text-xs sm:text-sm">
                        Vehicle Complete &amp; Checkout Successful!
                    </span>
                    <button 
                        onClick={() => toast.dismiss(t.id)} 
                        className="px-4 py-2 bg-[#141518] hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-bold transition flex items-center justify-center tracking-widest uppercase active:scale-95 touch-manipulation"
                    >
                        Done
                    </button>
                </div>
            ), { duration: 5000 });
            
            setCheckoutModal({ 
                isOpen: false, 
                bookingId: null, 
                totalAmount: 0, 
                cash: 0, 
                upi: 0, 
                khata: 0, 
                customerName: '', 
                customerId: null, 
                phoneNumber: '',
                vehicleModel: '',
                plateNumber: '',
                isSplit: false, 
                method: 'CASH' 
            });
            fetchQueue(true);
        } catch {
            toast.error('Failed to checkout vehicle.');
        }
    };

    const toggleSplit = () => {
        setCheckoutModal(prev => {
            if (!prev.isSplit) {
                return { ...prev, isSplit: true };
            } else {
                return { 
                    ...prev, 
                    isSplit: false, 
                    cash: prev.method === 'CASH' ? prev.totalAmount : 0,
                    upi: prev.method === 'UPI' ? prev.totalAmount : 0,
                    khata: prev.method === 'KHATA' ? prev.totalAmount : 0
                };
            }
        });
    };

    const handleMethodChange = (method: 'CASH' | 'UPI' | 'KHATA') => {
        setCheckoutModal(prev => ({
            ...prev,
            method,
            cash: method === 'CASH' ? prev.totalAmount : 0,
            upi: method === 'UPI' ? prev.totalAmount : 0,
            khata: method === 'KHATA' ? prev.totalAmount : 0
        }));
    };

    const onDragEnd = async (result: DropResult) => {
        const { source, destination, draggableId } = result;
        if (!destination) return;
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        const bookingId = parseInt(draggableId.replace('card-', ''));
        const destCol = destination.droppableId;
        handleMoveStage(bookingId, destCol);
    };

    // Filter cards for list view based on mobile active tab
    const filteredCards = useMemo(() => {
        if (activeMobileTab === 'ALL') return queueData;
        return columns[activeMobileTab] || [];
    }, [activeMobileTab, queueData, columns]);

    return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col font-jakarta overflow-x-hidden max-w-full">

            {/* ── TOP HEADER ───────────────────────────────────────────────────── */}
            <header className="flex flex-col lg:flex-row items-start lg:items-center gap-4 justify-between px-4 sm:px-8 py-4 sm:py-5 border-b border-white/5 bg-[#141518]/90 backdrop-blur-xl flex-shrink-0 sticky top-0 z-30">
                <div className="flex items-center justify-between w-full lg:w-auto gap-4">
                    <div className="flex items-center gap-3 sm:gap-6">
                        <button
                            onClick={() => router.push('/admin/dashboard')}
                            className="flex items-center gap-2 text-[#8E939B] hover:text-white transition-colors text-xs font-bold uppercase tracking-widest active:scale-95 touch-manipulation min-h-[44px]"
                        >
                            <ChevronLeft className="w-5 h-5 text-[#01FFFF]" />
                            <LayoutDashboard className="w-4 h-4 hidden sm:inline" />
                            <span className="hidden sm:inline">Dashboard</span>
                        </button>
                        <div className="w-px h-6 bg-white/10 hidden sm:block" />
                        <div>
                            <h1 className="font-syncopate font-black text-base sm:text-lg tracking-widest flex items-center gap-2">
                                LIVE QUEUE<span className="text-[#FF2A6D]">.</span>
                            </h1>
                            <p className="text-[10px] text-[#8E939B] uppercase tracking-[0.25em] font-bold">Bay Operations Board</p>
                        </div>
                    </div>

                    {/* View Switcher toggle */}
                    <div className="flex items-center gap-1 bg-[#0a0a0d] p-1 rounded-xl border border-white/10">
                        <button
                            onClick={() => setViewMode('cards')}
                            className={`p-2 rounded-lg text-xs font-bold transition-all ${
                                viewMode === 'cards'
                                    ? 'bg-[#01FFFF]/20 text-[#01FFFF] border border-[#01FFFF]/30'
                                    : 'text-[#8E939B] hover:text-white'
                            }`}
                            title="Cards Grid View"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('board')}
                            className={`p-2 rounded-lg text-xs font-bold transition-all ${
                                viewMode === 'board'
                                    ? 'bg-[#01FFFF]/20 text-[#01FFFF] border border-[#01FFFF]/30'
                                    : 'text-[#8E939B] hover:text-white'
                            }`}
                            title="Kanban Board View"
                        >
                            <Kanban className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-between w-full lg:w-auto gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-full flex items-center gap-2">
                            <Car className="w-4 h-4 text-[#01FFFF]" />
                            <span className="font-bold text-sm font-mono">{totalActive}</span>
                            <span className="text-[10px] text-[#8E939B] uppercase tracking-widest hidden sm:inline">Active</span>
                        </div>

                        {/* View Filter Mode Selector */}
                        <div className="flex items-center gap-1 bg-[#0a0a0d] p-1 rounded-full border border-white/10">
                            <button
                                onClick={() => setViewFilter('date')}
                                className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                                    viewFilter === 'date'
                                        ? 'bg-[#01FFFF]/20 text-[#01FFFF] border border-[#01FFFF]/30'
                                        : 'text-[#8E939B] hover:text-white'
                                }`}
                            >
                                <Calendar className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">By Date</span>
                            </button>
                            <button
                                onClick={() => setViewFilter('upcoming')}
                                className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                                    viewFilter === 'upcoming'
                                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                        : 'text-[#8E939B] hover:text-white'
                                }`}
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Upcoming</span>
                            </button>
                        </div>

                        {viewFilter === 'date' && (
                            <div className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-full flex items-center gap-2 animate-[fadeIn_0.2s]">
                                <Calendar className="w-3.5 h-3.5 text-[#01FFFF]" />
                                <input 
                                    type="date" 
                                    value={selectedDate} 
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="bg-transparent text-white outline-none text-xs font-bold font-mono cursor-pointer [color-scheme:dark]"
                                />
                            </div>
                        )}

                        <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border ${isConnected ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : 'border-red-500/30 text-red-400 bg-red-500/10'}`}>
                            {isConnected ? <Wifi className="w-3 h-3 animate-pulse" /> : <WifiOff className="w-3 h-3" />}
                            <span>{isConnected ? 'Live' : 'Offline'}</span>
                        </div>
                    </div>

                    <button
                        onClick={() => fetchQueue()}
                        className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-full text-[#8E939B] hover:text-white transition-all text-xs font-bold uppercase tracking-widest active:scale-95 touch-manipulation min-h-[44px]"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>
                </div>
            </header>

            {/* ── MOBILE FILTER TAB BAR ───────────────────────────────────────── */}
            <div className="w-full bg-[#0a0a0d] border-b border-white/5 px-4 py-3 sticky top-[73px] z-20 overflow-x-auto scrollbar-none shadow-md">
                <div className="flex items-center gap-2 min-w-max">
                    <button
                        onClick={() => setActiveMobileTab('ALL')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all touch-manipulation flex items-center gap-2 border ${
                            activeMobileTab === 'ALL'
                                ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]'
                                : 'bg-[#141518] text-[#8E939B] border-white/10 hover:text-white'
                        }`}
                    >
                        <Filter className="w-3.5 h-3.5" />
                        All ({totalActive})
                    </button>

                    {COLUMNS.map(col => {
                        const count = (columns[col.id] || []).length;
                        const isActive = activeMobileTab === col.id;
                        return (
                            <button
                                key={col.id}
                                onClick={() => setActiveMobileTab(col.id)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all touch-manipulation flex items-center gap-2 border ${
                                    isActive
                                        ? `${col.headerBg} ${col.accent} ${col.borderColor} shadow-md`
                                        : 'bg-[#141518] text-[#8E939B] border-white/10 hover:text-white'
                                }`}
                            >
                                <span className={isActive ? col.accent : 'text-[#8E939B]'}>{col.icon}</span>
                                {col.title} ({count})
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── MAIN QUEUE CONTENT ────────────────────────────────────────────── */}
            <main className="flex-1 p-4 sm:p-6 max-w-full overflow-x-hidden max-lg:pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
                {isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="bg-[#141518] border border-white/5 rounded-2xl p-5 space-y-4">
                                <div className="flex justify-between items-center">
                                    <Skeleton className="h-7 w-36" />
                                    <Skeleton className="h-6 w-20 rounded-full" />
                                </div>
                                <Skeleton className="h-20 w-full rounded-xl" />
                                <Skeleton className="h-10 w-full rounded-xl" />
                            </div>
                        ))}
                    </div>
                ) : viewMode === 'cards' || (typeof window !== 'undefined' && window.innerWidth < 1024) ? (
                    /* ── STACKED CARD GRID VIEW (MOBILE FIRST) ────────────────── */
                    <div className="space-y-4">
                        {filteredCards.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center bg-[#141518]/50 border border-white/5 rounded-3xl p-8">
                                <AlertCircle className="w-12 h-12 text-[#8E939B] mb-3 opacity-40" />
                                <h3 className="font-syncopate font-bold text-base text-white tracking-widest">
                                    NO VEHICLES IN QUEUE
                                </h3>
                                <p className="text-xs text-[#8E939B] mt-1 max-w-xs">
                                    {activeMobileTab === 'ALL'
                                        ? 'There are currently no active wash bookings.'
                                        : `No vehicles in ${COLUMNS.find(c => c.id === activeMobileTab)?.title}.`}
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                                {filteredCards.map((card) => {
                                    let colKey = card.status;
                                    if (card.status === 'IN_PROGRESS') {
                                        if (card.bay_assignment === 'Bay 1') colKey = 'IN_BAY_1';
                                        else if (card.bay_assignment === 'Bay 2') colKey = 'IN_BAY_2';
                                        else colKey = 'IN_BAY_1';
                                    }
                                    const col = COLUMNS.find(c => c.id === colKey) || COLUMNS[0];

                                    return (
                                        <QueueCard
                                            key={card.id}
                                            card={card}
                                            col={col}
                                            onCheckout={handleCheckout}
                                            staffMembers={staffMembers}
                                            onAssignStaff={handleAssignStaff}
                                            onCancel={handleCancelBooking}
                                            onEditService={openEditServiceModal}
                                            onMoveStage={handleMoveStage}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ) : (
                    /* ── KANBAN BOARD VIEW (DESKTOP) ────────────────────────── */
                    <DragDropContext onDragEnd={onDragEnd}>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
                            {COLUMNS.map(col => {
                                const cards = columns[col.id] || [];
                                return (
                                    <div
                                        key={col.id}
                                        className={`flex flex-col bg-[#0C0D0F] border ${col.borderColor} rounded-3xl overflow-hidden ${col.glow} min-h-[500px]`}
                                    >
                                        <div className={`${col.headerBg} border-b ${col.borderColor} p-4 sm:p-5 flex items-center justify-between`}>
                                            <div className="flex items-center gap-2.5">
                                                <span className={col.accent}>{col.icon}</span>
                                                <span className={`font-syncopate font-bold text-xs sm:text-sm tracking-widest uppercase ${col.accent}`}>
                                                    {col.title}
                                                </span>
                                            </div>
                                            <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-black ${col.headerBg} ${col.accent} border ${col.borderColor}`}>
                                                {cards.length}
                                            </span>
                                        </div>

                                        <Droppable droppableId={col.id}>
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.droppableProps}
                                                    className={`flex-1 p-4 space-y-4 overflow-y-auto transition-colors duration-200 ${snapshot.isDraggingOver ? col.headerBg : ''}`}
                                                >
                                                    {cards.length === 0 && !snapshot.isDraggingOver && (
                                                        <div className="flex flex-col items-center justify-center h-40 text-center opacity-30">
                                                            <AlertCircle className="w-8 h-8 mb-2 text-[#8E939B]" />
                                                            <p className="text-[10px] text-[#8E939B] uppercase tracking-widest font-bold">Empty Bay</p>
                                                        </div>
                                                    )}
                                                    {cards.map((card, index) => (
                                                        <Draggable key={card.id} draggableId={`card-${card.id}`} index={index}>
                                                            {(dragProvided, dragSnapshot) => (
                                                                <QueueCard
                                                                    card={card}
                                                                    col={col}
                                                                    onCheckout={handleCheckout}
                                                                    staffMembers={staffMembers}
                                                                    onAssignStaff={handleAssignStaff}
                                                                    onCancel={handleCancelBooking}
                                                                    onEditService={openEditServiceModal}
                                                                    onMoveStage={handleMoveStage}
                                                                    isDragging={dragSnapshot.isDragging}
                                                                    dragProps={{
                                                                        ref: dragProvided.innerRef,
                                                                        ...dragProvided.draggableProps,
                                                                        ...dragProvided.dragHandleProps
                                                                    }}
                                                                />
                                                            )}
                                                        </Draggable>
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
            </main>

            {/* ── FOOTER BAR ─────────────────────────────────────────────────── */}
            <footer className="flex items-center justify-between px-6 py-3 border-t border-white/5 bg-[#141518]/90 backdrop-blur-xl flex-shrink-0 text-[10px] text-[#8E939B] uppercase tracking-widest">
                <span>Live Admin Control — Touch-optimized live wash tracking</span>
                {lastUpdated && (
                    <span className="font-mono">Sync: {lastUpdated.toLocaleTimeString()}</span>
                )}
            </footer>

            {/* ── CHECKOUT MODAL ────────────────────────────────────────────── */}
            {checkoutModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
                    <div className="bg-[#141518] border border-white/10 rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#0C0D0F]">
                            <div>
                                <h2 className="font-syncopate font-black text-base sm:text-lg tracking-widest text-emerald-400">
                                    CHECKOUT &amp; SETTLEMENT
                                </h2>
                                <p className="text-[10px] text-[#8E939B] uppercase tracking-widest mt-1">
                                    {checkoutModal.customerName || "Walk-in Customer"} • Total: ₹{checkoutModal.totalAmount}
                                </p>
                            </div>
                            <button 
                                onClick={() => setCheckoutModal(prev => ({...prev, isOpen: false}))} 
                                className="text-[#8E939B] hover:text-[#FF2A6D] transition-colors p-2 rounded-full hover:bg-white/5"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-white">Payment Method</h3>
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <span className="text-[10px] uppercase font-bold text-[#8E939B] group-hover:text-white transition">Split Payment</span>
                                    <div 
                                        onClick={toggleSplit}
                                        className={`w-10 h-5 rounded-full flex items-center p-1 transition-colors ${checkoutModal.isSplit ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-gray-600'}`}
                                    >
                                        <div className={`w-3 h-3 bg-white rounded-full transition-transform ${checkoutModal.isSplit ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                    </div>
                                </label>
                            </div>

                            {!checkoutModal.isSplit ? (
                                <div className="grid grid-cols-3 gap-3">
                                    {(['CASH', 'UPI', 'KHATA'] as const).map((method) => (
                                        <div 
                                            key={method}
                                            onClick={() => handleMethodChange(method)}
                                            className={`border p-4 rounded-xl cursor-pointer text-center transition-all ${
                                                checkoutModal.method === method 
                                                    ? method === 'KHATA'
                                                        ? 'border-purple-500 bg-purple-500/10 text-purple-400 shadow-[0_0_15px_rgba(147,51,234,0.3)]'
                                                        : 'border-emerald-500 bg-emerald-500/10 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                                                    : 'border-white/10 bg-white/5 text-[#8E939B] hover:border-white/30 hover:bg-white/10'
                                            }`}
                                        >
                                            <span className="text-xs font-bold uppercase tracking-wider">{method === 'KHATA' ? 'Khata (Credit)' : method}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
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
                            )}

                            {/* ── KHATA DETAILS FORM (WITH ASYNC SEARCHABLE DROPDOWN & DUAL OPTIONS) ───────────────── */}
                            {(checkoutModal.method === 'KHATA' || checkoutModal.khata > 0) && (
                                <div className="bg-purple-950/30 border border-purple-500/30 p-4 sm:p-5 rounded-2xl space-y-4 animate-in fade-in slide-in-from-top-2 shadow-[0_0_20px_rgba(147,51,234,0.15)]">
                                    <div className="flex items-center justify-between border-b border-purple-500/20 pb-3">
                                        <div className="flex items-center gap-2 text-purple-300 font-bold text-xs uppercase tracking-wider">
                                            <BookOpen className="w-4 h-4 text-purple-400" />
                                            Khata Credit Management
                                        </div>
                                        <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2.5 py-1 rounded-full font-mono font-bold">
                                            Credit: ₹{checkoutModal.khata || checkoutModal.totalAmount}
                                        </span>
                                    </div>

                                    {/* DUAL MODE TOGGLE BUTTONS */}
                                    <div className="grid grid-cols-2 gap-2 bg-black/40 p-1 rounded-xl border border-purple-500/20">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setKhataCustomerMode('EXISTING');
                                                setKhataSearchInput('');
                                                setKhataSearchResults([]);
                                            }}
                                            className={`py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                                                khataCustomerMode === 'EXISTING'
                                                    ? 'bg-purple-600 text-white shadow-md'
                                                    : 'text-purple-300 hover:text-white hover:bg-white/5'
                                            }`}
                                        >
                                            <Search className="w-3.5 h-3.5" /> Select Existing Customer
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setKhataCustomerMode('NEW');
                                                setCheckoutModal(prev => ({ ...prev, customerId: null }));
                                            }}
                                            className={`py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                                                khataCustomerMode === 'NEW'
                                                    ? 'bg-purple-600 text-white shadow-md'
                                                    : 'text-purple-300 hover:text-white hover:bg-white/5'
                                            }`}
                                        >
                                            <Sparkles className="w-3.5 h-3.5" /> Create New Credit Account
                                        </button>
                                    </div>

                                    {/* MODE A: ASYNC SEARCHABLE DROPDOWN FOR EXISTING CUSTOMERS */}
                                    {khataCustomerMode === 'EXISTING' && (
                                        <div className="space-y-3">
                                            <div className="relative">
                                                <label className="text-[10px] text-purple-300 uppercase font-bold tracking-wider block mb-1">
                                                    Search Existing Khata Account (By Name or Phone)
                                                </label>
                                                <div className="relative flex items-center">
                                                    <Search className="w-4 h-4 absolute left-3.5 text-purple-400 pointer-events-none" />
                                                    <input
                                                        type="text"
                                                        value={khataSearchInput}
                                                        onChange={(e) => setKhataSearchInput(e.target.value)}
                                                        onFocus={() => { if (khataSearchResults.length > 0) setIsDropdownOpen(true); }}
                                                        placeholder="Type name or phone number (e.g. 9876543210)..."
                                                        className="w-full bg-[#141518] border border-purple-500/40 py-2.5 pl-10 pr-9 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
                                                    />
                                                    {isSearchingKhata && (
                                                        <RefreshCw className="w-4 h-4 absolute right-3 text-purple-400 animate-spin" />
                                                    )}
                                                </div>

                                                {/* DEBOUNCED SEARCH RESULTS DROPDOWN */}
                                                {isDropdownOpen && khataSearchResults.length > 0 && (
                                                    <div className="absolute left-0 right-0 top-full mt-1 bg-[#141518] border border-purple-500/40 rounded-xl shadow-2xl max-h-56 overflow-y-auto z-50 divide-y divide-white/5">
                                                        {khataSearchResults.map((c) => (
                                                            <div
                                                                key={c.id}
                                                                onClick={() => {
                                                                    setCheckoutModal(prev => ({
                                                                        ...prev,
                                                                        customerId: c.id,
                                                                        customerName: c.name,
                                                                        phoneNumber: c.phone_number
                                                                    }));
                                                                    setIsDropdownOpen(false);
                                                                    setKhataSearchInput(c.name);
                                                                }}
                                                                className="p-3 hover:bg-purple-600/20 cursor-pointer transition-colors flex items-center justify-between"
                                                            >
                                                                <div>
                                                                    <p className="font-bold text-white text-xs">{c.name}</p>
                                                                    <p className="text-[10px] font-mono text-purple-300">{c.phone_number || 'No Phone'}</p>
                                                                </div>
                                                                {c.outstanding_balance !== undefined && c.outstanding_balance > 0 && (
                                                                    <span className="text-[9px] font-mono font-bold bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30">
                                                                        Due: ₹{c.outstanding_balance}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* SELECTED CUSTOMER BADGE */}
                                            {checkoutModal.customerId && (
                                                <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                                                        <div>
                                                            <p className="text-xs font-bold text-white">{checkoutModal.customerName}</p>
                                                            <p className="text-[10px] font-mono text-emerald-400">{checkoutModal.phoneNumber}</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setCheckoutModal(prev => ({ ...prev, customerId: null, customerName: '', phoneNumber: '' }));
                                                            setKhataSearchInput('');
                                                        }}
                                                        className="text-[10px] font-bold text-red-400 hover:text-white uppercase tracking-wider px-2 py-1 bg-red-500/10 rounded border border-red-500/20"
                                                    >
                                                        Unlink
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* MODE B OR OVERRIDE INPUT FIELDS */}
                                    {(khataCustomerMode === 'NEW' || !checkoutModal.customerId) && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[10px] text-purple-300 uppercase font-bold tracking-wider block mb-1">
                                                    Customer Name *
                                                </label>
                                                <input
                                                    type="text"
                                                    value={checkoutModal.customerName}
                                                    onChange={(e) => setCheckoutModal(prev => ({ ...prev, customerName: e.target.value }))}
                                                    placeholder="e.g. Rahul Sharma"
                                                    className="w-full bg-black/40 border border-purple-500/30 py-2.5 px-3 rounded-xl text-white font-semibold text-xs focus:outline-none focus:border-purple-400"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-purple-300 uppercase font-bold tracking-wider block mb-1">
                                                    Phone Number *
                                                </label>
                                                <input
                                                    type="tel"
                                                    value={checkoutModal.phoneNumber}
                                                    onChange={(e) => setCheckoutModal(prev => ({ ...prev, phoneNumber: e.target.value }))}
                                                    placeholder="e.g. 9876543210"
                                                    className="w-full bg-black/40 border border-purple-500/30 py-2.5 px-3 rounded-xl text-white font-semibold text-xs focus:outline-none focus:border-purple-400"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] text-purple-300 uppercase font-bold tracking-wider block mb-1">
                                                Vehicle Model
                                            </label>
                                            <input
                                                type="text"
                                                value={checkoutModal.vehicleModel}
                                                onChange={(e) => setCheckoutModal(prev => ({ ...prev, vehicleModel: e.target.value }))}
                                                placeholder="e.g. BMW M4"
                                                className="w-full bg-black/40 border border-purple-500/30 py-2.5 px-3 rounded-xl text-white font-semibold text-xs focus:outline-none focus:border-purple-400"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-purple-300 uppercase font-bold tracking-wider block mb-1">
                                                Plate Number
                                            </label>
                                            <input
                                                type="text"
                                                value={checkoutModal.plateNumber}
                                                onChange={(e) => setCheckoutModal(prev => ({ ...prev, plateNumber: e.target.value }))}
                                                placeholder="e.g. KL-07-CC-1001"
                                                className="w-full bg-black/40 border border-purple-500/30 py-2.5 px-3 rounded-xl text-white font-mono font-bold text-xs focus:outline-none focus:border-purple-400 uppercase"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-6 bg-[#0B0C10] border-t border-white/5 flex items-center justify-between gap-4">
                            {(() => {
                                const totalKhata = checkoutModal.khata || (checkoutModal.method === 'KHATA' ? checkoutModal.totalAmount : 0);
                                const sum = (checkoutModal.cash || 0) + (checkoutModal.upi || 0) + totalKhata;
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
                                    className="px-4 py-3 rounded-xl font-bold text-xs text-[#8E939B] hover:text-white hover:bg-white/5 transition-colors uppercase tracking-wider"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={submitPayment}
                                    disabled={
                                        ((checkoutModal.cash || 0) + (checkoutModal.upi || 0) + (checkoutModal.khata || (checkoutModal.method === 'KHATA' ? checkoutModal.totalAmount : 0))) < checkoutModal.totalAmount
                                    }
                                    className={`px-5 py-3 rounded-xl font-bold text-xs transition-all active:scale-95 touch-manipulation disabled:opacity-20 disabled:cursor-not-allowed flex items-center gap-2 uppercase tracking-wider ${
                                        checkoutModal.method === 'KHATA' || checkoutModal.khata > 0
                                            ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_20px_rgba(147,51,234,0.4)]'
                                            : 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                                    }`}
                                >
                                    {checkoutModal.method === 'KHATA' || checkoutModal.khata > 0
                                        ? 'Confirm Khata & Complete'
                                        : 'Settle Payment'}
                                </button>
                            </div>
                        </div>      
                    </div>
                </div>
            )}       

            {/* ── EDIT SERVICE MODAL ───────────────────────────────────────── */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
                    <div className="bg-[#141518] border border-white/10 rounded-3xl w-full max-w-sm max-h-[90vh] overflow-y-auto shadow-[0_0_50px_rgba(0,0,0,0.5)] p-6">
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
        </div>
    );
}

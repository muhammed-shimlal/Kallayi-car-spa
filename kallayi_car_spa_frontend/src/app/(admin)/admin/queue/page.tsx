'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { 
    Activity, Car, Clock, RefreshCw, 
    ChevronLeft, Droplets, Sparkles, CheckCircle, 
    AlertCircle, User, Wifi, WifiOff, LayoutDashboard,
    Pencil, Trash2, X, LayoutGrid, Kanban, Filter, BookOpen, Phone, Search, Calendar, Camera, Image as ImageIcon, QrCode, FileText, ShieldCheck
} from 'lucide-react';

import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import { StaffMember, ServicePackage } from '@/types/admin';
import { Skeleton } from '@/components/ui/Skeleton';
import api, { getApiBaseUrl } from '@/lib/api';

const UpiQrModal = dynamic(() => import('@/components/ui/UpiQrModal').then(m => m.UpiQrModal), { ssr: false });
const CameraCaptureModal = dynamic(() => import('@/components/ui/CameraCaptureModal').then(m => m.CameraCaptureModal), { ssr: false });

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
    technician_id: string | number | null;
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
    onAssignStaff?: (bookingId: number, staffId: string) => void;
    onCancel?: (card: BookingCardData) => void;
    onEditService?: (id: number) => void;
    onMoveStage?: (id: number, targetColId: string) => void;
    isDragging?: boolean;
    dragProps?: any;
}) {
    const assignedStaff = staffMembers?.find(
        (s) => String(s.user_id) === String(card.technician_id) || String(s.id) === String(card.technician_id)
    );
    const displayTechName = card.technician_name || assignedStaff?.first_name || assignedStaff?.name || null;

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
                    <div className="flex items-center gap-1.5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${col.borderColor} ${col.headerBg} ${col.accent} shadow-sm flex items-center gap-1.5`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${col.id === 'IN_BAY_1' || col.id === 'IN_BAY_2' ? 'bg-[#01FFFF] animate-ping' : col.accent.replace('text-', 'bg-')}`} />
                            {col.title}
                        </span>
                        {onCancel && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onCancel(card); }}
                                className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500 hover:text-white transition-all active:scale-95 touch-manipulation min-h-[32px] min-w-[32px] flex items-center justify-center shadow-sm"
                                title="Cancel & Delete Booking"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
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
                        value={card.technician_id ? String(card.technician_id) : ""}
                        onChange={(e) => {
                            if (onAssignStaff && e.target.value) {
                                onAssignStaff(card.id, e.target.value);
                            }
                        }}
                    >
                        <option value="" disabled className="bg-[#141518] text-[#8E939B]">
                            {displayTechName ? `Tech: ${displayTechName}` : "Assign Tech..."}
                        </option>
                        {staffMembers?.map(s => (
                            <option key={String(s.id)} value={String(s.user_id || s.id)} className="bg-[#141518] text-white">
                                {s.first_name || s.name || s.username} ({s.role})
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
                                onClick={(e) => { e.stopPropagation(); onCancel(card); }}
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
    const [viewFilter, setViewFilter] = useState<'date' | 'upcoming' | 'completed'>('date');
    const [completedBookings, setCompletedBookings] = useState<any[]>([]);
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
        catalogPrice: 0,
        totalAmount: 0, 
        cash: 0, 
        upi: 0, 
        khata: 0, 
        discountReason: '',
        customerName: '',
        customerId: null as number | null,
        phoneNumber: '',
        vehicleModel: '',
        plateNumber: '',
        isSplit: false,
        method: 'CASH' as 'CASH' | 'UPI' | 'KHATA',
        collectorType: 'ADMIN' as 'ADMIN' | 'STAFF',
        cashCollectedByStaffId: '',
    });

    const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
    const [khataProofFile, setKhataProofFile] = useState<File | null>(null);
    const [khataProofPreview, setKhataProofPreview] = useState<string | null>(null);
    const [isUpiQrOpen, setIsUpiQrOpen] = useState(false);

    const [servicePackages, setServicePackages] = useState<ServicePackage[]>([]);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editBookingId, setEditBookingId] = useState<number | null>(null);
    const [newPackageId, setNewPackageId] = useState('');
    const [deleteTargetBooking, setDeleteTargetBooking] = useState<BookingCardData | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

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
        if (!silent) setIsLoading(true);

        try {
            if (viewFilter === 'completed') {
                const queryDate = selectedDate ? `?date=${encodeURIComponent(selectedDate)}` : '';
                const res = await fetch(`/api/bookings/completed${queryDate}`);
                if (res.ok) {
                    const compJson = await res.json();
                    const list = Array.isArray(compJson) ? compJson : (compJson.data || compJson.results || []);
                    setCompletedBookings(list);
                }
                setColumns({ WAITING: [], IN_BAY_1: [], IN_BAY_2: [], READY: [] });
                setIsConnected(true);
                setLastUpdated(new Date());
                return;
            }

            const queryParams = new URLSearchParams();
            if (viewFilter === 'upcoming') {
                // upcoming view
            } else if (selectedDate) {
                queryParams.append('date', selectedDate);
            }
            queryParams.append('queue', 'true');
            queryParams.append('_t', Date.now().toString());

            const res = await fetch(`/api/bookings?${queryParams.toString()}`, { cache: 'no-store' });
            if (!res.ok) throw new Error('API error');

            const json = await res.json();
            const data: any[] = json.data || (Array.isArray(json) ? json : []);

            const newCols: Record<string, BookingCardData[]> = { WAITING: [], IN_BAY_1: [], IN_BAY_2: [], READY: [] };
            data.forEach((card: any) => {
                const rawStatus = String(card.status || '').toUpperCase().trim();
                // Strictly exclude finished and cancelled bookings from active queue columns
                if (rawStatus === 'COMPLETED' || rawStatus === 'CANCELLED' || rawStatus === 'PAID') {
                    return;
                }

                const mappedCard: BookingCardData = {
                    id: card.id,
                    status: card.status,
                    plate_number: card.vehicle?.plate_number || card.plate_number || 'KL-XX-0000',
                    vehicle_make: card.vehicle?.make || card.vehicle_make,
                    vehicle_model: `${card.vehicle?.make || ''} ${card.vehicle?.model || ''}`.trim() || card.vehicle_model || 'Vehicle',
                    service_name: card.service_package?.name || card.service_name || 'Car Spa Service',
                    service_details: card.service_package?.description || card.service_details || '',
                    customer_name: card.customer?.name || card.customer_name || 'Customer',
                    customer_phone: card.customer?.phone_number || card.customer_phone || '',
                    customer_id: card.customer_id,
                    price: Number(card.final_price || card.base_price || card.price || 0),
                    technician_name: card.technician?.first_name || card.technician?.username || card.technician_name || null,
                    technician_id: card.technician_id,
                    created_at: card.created_at,
                    time_slot: card.time_slot,
                    bay_assignment: card.bay_assignment,
                };

                let targetCol: string | null = null;
                if (rawStatus === 'IN_PROGRESS' || rawStatus === 'DETAILING') {
                    if (card.bay_assignment === 'Bay 2' || card.bay_assignment === 'IN_BAY_2') targetCol = 'IN_BAY_2';
                    else targetCol = 'IN_BAY_1';
                } else if (rawStatus === 'IN_BAY_1' || rawStatus === 'IN_BAY_2') {
                    targetCol = rawStatus;
                } else if (rawStatus === 'READY') {
                    targetCol = 'READY';
                } else if (rawStatus === 'WAITING' || rawStatus === 'PENDING' || rawStatus === 'CONFIRMED') {
                    targetCol = 'WAITING';
                }

                if (targetCol && newCols[targetCol]) {
                    newCols[targetCol].push(mappedCard);
                }
            });
            setColumns(newCols);
            setIsConnected(true);
            setLastUpdated(new Date());

            if (!silent) {
                try {
                    const staffRes = await fetch(`/api/staff/directory`).catch(() => null);
                    if (staffRes && staffRes.ok) {
                        const staffData = await staffRes.json();
                        const list = Array.isArray(staffData) ? staffData : (staffData.results || staffData.data || []);
                        const activeList = list.filter((s: any) => s.is_active !== false);
                        setStaffMembers(activeList);
                    }
                } catch (e) { console.error('[fetchQueue] Staff fetch error:', e); }

                try {
                    const svcRes = await fetch(`/api/service-packages`).catch(() => null);
                    if (svcRes && svcRes.ok) {
                        const svcData = await svcRes.json();
                        const svcList = Array.isArray(svcData) ? svcData : (svcData.results || svcData.data || []);
                        setServicePackages(svcList);
                    }
                } catch { /* ignore err */ }
            }
        } catch {
            setIsConnected(false);
        } finally {
            setIsLoading(false);
        }
    }, [selectedDate, viewFilter]);

    useEffect(() => {
        fetchQueue();
        const interval = setInterval(() => fetchQueue(true), 30000);

        const handleQueueUpdated = () => fetchQueue(true);
        window.addEventListener('queue:updated', handleQueueUpdated);
        window.addEventListener('booking:completed', handleQueueUpdated);

        return () => {
            clearInterval(interval);
            window.removeEventListener('queue:updated', handleQueueUpdated);
            window.removeEventListener('booking:completed', handleQueueUpdated);
        };
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
            try {
                const res = await fetch(`/api/search/universal?q=${encodeURIComponent(khataSearchInput.trim())}`).catch(() => null);
                if (res && res.ok) {
                    const data = await res.json();
                    const list = Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : (data?.data || []));
                    setKhataSearchResults(list);
                    setIsDropdownOpen(list.length > 0);
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

        try {
            const destStatus = targetColId.startsWith('IN_BAY') ? 'IN_PROGRESS' : targetColId;
            const bayAssignment = targetColId.startsWith('IN_BAY') ? targetColId.replace('IN_BAY_', 'Bay ') : null;

            await api.patch(`/bookings/update-stage/${bookingId}`, {
                new_status: destStatus,
                status: destStatus,
                bay_assignment: bayAssignment,
                start_time: new Date().toISOString(),
            });

            const destCol = COLUMNS.find(c => c.id === targetColId);
            toast.success(`Vehicle moved to ${destCol?.title || targetColId}! WhatsApp update dispatched.`);
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('queue:updated'));
            }, 1000);
        } catch (err: any) {
            console.error('Failed to move stage:', err);
            toast.error(err.response?.data?.error || err.message || "Failed to move vehicle stage.");
            fetchQueue(true);
        }
    };

    const handleCancelBooking = (booking: BookingCardData | number) => {
        if (typeof booking === 'object' && booking !== null) {
            setDeleteTargetBooking(booking);
        } else {
            const found = queueData.find(b => b.id === booking);
            if (found) setDeleteTargetBooking(found);
            else setDeleteTargetBooking({ id: booking } as any);
        }
    };

    const confirmDeleteBooking = async () => {
        if (!deleteTargetBooking) return;
        const id = deleteTargetBooking.id;
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/bookings/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'CANCELLED' }),
            });
            if (!res.ok) throw new Error('API failed');

            // Dynamically remove deleted booking from frontend state
            setColumns(prev => {
                const newCols = { ...prev };
                for (const colId in newCols) {
                    newCols[colId] = newCols[colId].filter(item => item.id !== id);
                }
                return newCols;
            });

            toast.success("Booking cancelled successfully!");
            setDeleteTargetBooking(null);
            fetchQueue(true);
        } catch {
            toast.error("Failed to cancel booking.");
        } finally {
            setIsDeleting(false);
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
        try {
            const res = await fetch(`/api/bookings/${editBookingId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ service_package_id: parseInt(newPackageId) })
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

    const handleAssignStaff = async (bookingId: number, staffId: string) => {
        try {
            const res = await fetch(`/api/bookings/${bookingId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    technician_id: staffId
                }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                toast.error(err.error || `Failed to assign technician.`);
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

        let initialPhone = foundCard.customer_phone || '';
        let initialCustName = foundCard.customer_name || '';
        let initialCustId = foundCard.customer_id || null;

        // Default to Counter / Admin direct deposit (DO NOT pre-select technician or staff member)
        const catalogPrice = foundCard.price;
        setCheckoutModal({ 
            isOpen: true, 
            bookingId, 
            catalogPrice: catalogPrice,
            totalAmount: catalogPrice, 
            cash: catalogPrice, 
            upi: 0, 
            khata: 0, 
            discountReason: '',
            customerName: initialCustName,
            customerId: initialCustId,
            phoneNumber: initialPhone,
            vehicleModel: foundCard.vehicle_model || '',
            plateNumber: foundCard.plate_number || '',
            isSplit: false,
            method: 'CASH',
            collectorType: 'ADMIN',
            cashCollectedByStaffId: '',
        });
    };

    const submitPayment = async (bypassUpiCheck = false, bypassCameraCheck = false, overridePhotoFile?: File | null) => {
        const isUpiSelected = checkoutModal.method === 'UPI' || (checkoutModal.isSplit && (checkoutModal.upi || 0) > 0);

        // Intercept UPI payment if QR confirmation has not occurred yet
        if (isUpiSelected && !bypassUpiCheck) {
            setIsUpiQrOpen(true);
            return;
        }

        const totalKhata = checkoutModal.khata || (checkoutModal.method === 'KHATA' ? checkoutModal.totalAmount : 0);

        if (totalKhata > 0 && !checkoutModal.customerName.trim()) {
            toast.error("Please enter a Customer Name to log the Khata credit.");
            return;
        }

        const activePhotoFile = overridePhotoFile || khataProofFile;

        // Intercept Khata payment if camera proof photo has not been captured yet
        if (totalKhata > 0 && !activePhotoFile && !bypassCameraCheck) {
            setIsCameraModalOpen(true);
            return;
        }

        const baseCashAmount = (!checkoutModal.isSplit && checkoutModal.method === 'CASH')
            ? checkoutModal.totalAmount
            : (checkoutModal.cash || 0);

        const upiAmount = checkoutModal.method === 'UPI' && !checkoutModal.isSplit
            ? checkoutModal.totalAmount
            : (checkoutModal.upi || 0);

        const totalTendered = baseCashAmount + upiAmount + totalKhata;
        let finalCashAmount = baseCashAmount;
        if (checkoutModal.isSplit && totalTendered > checkoutModal.totalAmount) {
            const changeToGiveBack = totalTendered - checkoutModal.totalAmount;
            finalCashAmount = Math.max(0, finalCashAmount - changeToGiveBack); 
        }

        const isCashRequired = (!checkoutModal.isSplit && checkoutModal.method === 'CASH') || (checkoutModal.isSplit && finalCashAmount > 0);
        const collectorType = checkoutModal.collectorType || 'ADMIN';
        const staffCustodyId = (isCashRequired && collectorType === 'STAFF') ? (checkoutModal.cashCollectedByStaffId || null) : null;

        if (isCashRequired && collectorType === 'STAFF' && !staffCustodyId) {
            toast.error('Please select the staff member who collected the physical cash.');
            return;
        }

        try {
            let res: Response;

            if (activePhotoFile) {
                const formData = new FormData();
                formData.append('booking_id', String(checkoutModal.bookingId!));
                formData.append('base_price', String(checkoutModal.catalogPrice));
                formData.append('final_price', String(checkoutModal.totalAmount));
                formData.append('custom_price', String(checkoutModal.totalAmount));
                formData.append('discount_amount', String(Math.max(0, checkoutModal.catalogPrice - checkoutModal.totalAmount)));
                if (checkoutModal.discountReason) formData.append('discount_reason', checkoutModal.discountReason);
                formData.append('split_cash', String(finalCashAmount));
                formData.append('split_online', String(upiAmount));
                formData.append('split_khata', String(totalKhata));
                formData.append('payment_method', checkoutModal.isSplit ? 'SPLIT' : checkoutModal.method);
                formData.append('collector_type', collectorType);
                if (staffCustodyId) {
                    formData.append('cash_collected_by_staff_id', staffCustodyId);
                    formData.append('collected_by_staff_id', staffCustodyId);
                }
                if (checkoutModal.customerId) formData.append('customer_id', String(checkoutModal.customerId));
                if (checkoutModal.customerName) formData.append('customer_name', checkoutModal.customerName);
                if (checkoutModal.phoneNumber) formData.append('customer_phone', checkoutModal.phoneNumber);
                if (checkoutModal.plateNumber) formData.append('plate_number', checkoutModal.plateNumber);
                if (checkoutModal.vehicleModel) formData.append('vehicle_model', checkoutModal.vehicleModel);
                formData.append('number_plate_image', activePhotoFile);

                res = await fetch('/api/pos/checkout', {
                    method: 'POST',
                    body: formData,
                });
            } else {
                const payload = {
                    booking_id: Number(checkoutModal.bookingId!),
                    base_price: checkoutModal.catalogPrice,
                    final_price: checkoutModal.totalAmount,
                    custom_price: checkoutModal.totalAmount,
                    discount_amount: Math.max(0, checkoutModal.catalogPrice - checkoutModal.totalAmount),
                    discount_reason: checkoutModal.discountReason || null,
                    split_cash: finalCashAmount,
                    split_online: upiAmount,
                    split_khata: totalKhata,
                    payment_method: checkoutModal.isSplit ? 'SPLIT' : checkoutModal.method,
                    collector_type: collectorType,
                    cash_collected_by_staff_id: staffCustodyId || null,
                    collected_by_staff_id: staffCustodyId || null,
                    customer_id: checkoutModal.customerId,
                    customer_name: checkoutModal.customerName,
                    customer_phone: checkoutModal.phoneNumber,
                    plate_number: checkoutModal.plateNumber,
                    vehicle_model: checkoutModal.vehicleModel,
                };

                res = await fetch('/api/pos/checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
            }

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Checkout failed.');
            }

            setKhataProofFile(null);
            setKhataProofPreview(null);
            setCheckoutModal(prev => ({ ...prev, isOpen: false }));

            const invoiceId = data.data?.invoice?.id;
            const settledBookingId = checkoutModal.bookingId;

            // OPTIMISTIC REMOVAL: Instantly remove settled card from all active queue columns
            if (settledBookingId) {
                setColumns(prev => {
                    const next = { ...prev };
                    for (const colKey of Object.keys(next)) {
                        next[colKey] = next[colKey].filter(c => c.id !== settledBookingId);
                    }
                    return next;
                });
            }

            // Real-time synchronization events
            try {
                window.dispatchEvent(new CustomEvent('booking:completed', { detail: { bookingId: settledBookingId } }));
                window.dispatchEvent(new CustomEvent('queue:updated'));
                window.dispatchEvent(new CustomEvent('khata:updated'));
            } catch {
                // Ignore in non-window environments
            }

            toast.dismiss();
            toast((t) => (
                <div className="flex flex-col gap-2 p-1">
                    <span className="font-bold text-emerald-400 text-xs sm:text-sm">
                        Vehicle Complete &amp; Checkout Successful! WhatsApp invoice sent.
                    </span>
                    <div className="flex items-center gap-2 pt-1">
                        {invoiceId && (
                            <button 
                                onClick={() => {
                                    window.open(`/invoice-preview?id=${invoiceId}`, '_blank');
                                    toast.dismiss(t.id);
                                }}
                                className="px-3 py-1.5 bg-[#01FFFF] hover:bg-[#01FFFF]/80 text-black rounded-lg text-xs font-bold transition flex items-center justify-center uppercase active:scale-95"
                            >
                                View Receipt #INV-{invoiceId}
                            </button>
                        )}
                        <button 
                            onClick={() => toast.dismiss(t.id)} 
                            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition uppercase"
                        >
                            Done
                        </button>
                    </div>
                </div>
            ), { duration: 6000 });

            setKhataProofFile(null);
            if (khataProofPreview) {
                URL.revokeObjectURL(khataProofPreview);
                setKhataProofPreview(null);
            }
            
            setCheckoutModal({ 
                isOpen: false, 
                bookingId: null, 
                catalogPrice: 0,
                totalAmount: 0, 
                cash: 0, 
                upi: 0, 
                khata: 0, 
                discountReason: '',
                customerName: '', 
                customerId: null, 
                phoneNumber: '', 
                vehicleModel: '', 
                plateNumber: '', 
                isSplit: false, 
                method: 'CASH',
                collectorType: 'ADMIN',
                cashCollectedByStaffId: '',
            });
            fetchQueue(true);
        } catch (err: any) {
            toast.error(err.message || 'Failed to checkout vehicle.');
        }
    };

    const toggleSplit = () => {
        setCheckoutModal(prev => {
            if (!prev.isSplit) {
                return { ...prev, isSplit: true, cash: prev.totalAmount, upi: 0, khata: 0 };
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
                                <span className="hidden sm:inline">Active Queue</span>
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
                            <button
                                onClick={() => setViewFilter('completed')}
                                className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                                    viewFilter === 'completed'
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                        : 'text-[#8E939B] hover:text-white'
                                }`}
                            >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Completed</span>
                            </button>
                        </div>

                        {(viewFilter === 'date' || viewFilter === 'completed') && (
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
                ) : viewFilter === 'completed' ? (
                    /* ── COMPLETED & PICKED UP VEHICLES VIEW ───────────────────── */
                    <div className="space-y-6 animate-in fade-in">
                        <div className="flex items-center justify-between border-b border-white/5 pb-4">
                            <div>
                                <h2 className="font-syncopate font-bold text-base sm:text-lg text-white tracking-widest flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                                    COMPLETED &amp; PICKED UP VEHICLES
                                </h2>
                                <p className="text-xs text-[#8E939B] mt-1">
                                    Showing settled orders for {selectedDate || 'today'}.
                                </p>
                            </div>
                            <span className="px-3 py-1 rounded-full text-xs font-bold font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                {completedBookings.length} Vehicles
                            </span>
                        </div>

                        {completedBookings.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center bg-[#141518]/50 border border-white/5 rounded-3xl p-8">
                                <CheckCircle className="w-12 h-12 text-emerald-400/30 mb-3" />
                                <h3 className="font-syncopate font-bold text-base text-white tracking-widest">
                                    NO COMPLETED VEHICLES FOR THIS DATE
                                </h3>
                                <p className="text-xs text-[#8E939B] mt-1 max-w-xs">
                                    Vehicles that complete payment and pickup will appear here.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                                {completedBookings.map((b: any) => {
                                    const plate = b.vehicle?.plate_number || b.plate_number || 'KL-XX-0000';
                                    const vModel = `${b.vehicle?.make || ''} ${b.vehicle?.model || ''}`.trim() || b.vehicle?.model || 'Vehicle';
                                    const sName = b.service_package?.name || b.service_name || 'Car Spa Wash';
                                    const cName = b.customer?.name || b.customer_name || 'Customer';
                                    const cPhone = b.customer?.phone_number || b.customer_phone || '';
                                    const invId = b.invoice?.id || b.invoice_id;
                                    const pMethod = b.invoice?.payment_method || 'PAID';
                                    const finalAmount = Number(b.final_price || b.price || b.base_price || 0);

                                    return (
                                        <div
                                            key={b.id}
                                            className="bg-[#141518] border border-emerald-500/30 rounded-2xl p-5 space-y-4 shadow-[0_0_20px_rgba(16,185,129,0.05)] relative group hover:border-emerald-500/60 transition-all"
                                        >
                                            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                                                <div className="font-syncopate font-black text-2xl tracking-[0.15em] text-emerald-400">
                                                    {plate}
                                                </div>
                                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                                    <CheckCircle className="w-3 h-3" />
                                                    Picked Up
                                                </span>
                                            </div>

                                            <div className="space-y-1.5 text-xs">
                                                <div className="flex items-center gap-2 text-white font-bold truncate">
                                                    <Car className="w-3.5 h-3.5 text-[#8E939B]" />
                                                    <span>{vModel}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-[#8E939B] truncate">
                                                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                                                    <span>{sName}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-[#8E939B] truncate">
                                                    <User className="w-3.5 h-3.5 text-[#8E939B]" />
                                                    <span>{cName} {cPhone ? `(${cPhone})` : ''}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                                <div>
                                                    <div className="text-[10px] font-bold text-[#8E939B] uppercase tracking-wider">Settled</div>
                                                    <div className="text-base font-black font-mono text-emerald-400">₹{finalAmount}</div>
                                                </div>
                                                <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-white/5 text-white/80 border border-white/10">
                                                    {pMethod}
                                                </span>
                                            </div>

                                            {invId && (
                                                <button
                                                    onClick={() => window.open(`/invoice-preview?id=${invId}`, '_blank')}
                                                    className="w-full py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 uppercase tracking-wider active:scale-95"
                                                >
                                                    <FileText className="w-3.5 h-3.5" />
                                                    View Receipt #INV-{invId}
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-in fade-in overflow-hidden">
                    <div className="bg-[#141518] border border-white/10 rounded-2xl sm:rounded-3xl w-full max-w-md max-h-[90dvh] flex flex-col overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] my-auto">
                        <div className="p-4 sm:p-5 border-b border-white/5 flex justify-between items-center bg-[#0C0D0F] shrink-0">
                            <div>
                                <h2 className="font-syncopate font-black text-sm sm:text-base tracking-widest text-emerald-400">
                                    CHECKOUT &amp; SETTLEMENT
                                </h2>
                                <p className="text-[10px] text-[#8E939B] uppercase tracking-widest mt-1">
                                    {checkoutModal.customerName || "Walk-in Customer"} • Total: ₹{checkoutModal.totalAmount}
                                </p>
                            </div>
                            <button 
                                onClick={() => setCheckoutModal(prev => ({...prev, isOpen: false}))} 
                                className="text-[#8E939B] hover:text-[#FF2A6D] transition-colors p-2 rounded-full hover:bg-white/5 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                                aria-label="Close Modal"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 flex-1 overflow-y-auto overscroll-contain">
                            {/* Negotiated Price & Concession Card */}
                            <div className="p-4 rounded-2xl bg-[#181a1f] border border-[#01FFFF]/30 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                                        Catalog Base Rate: <strong className="text-white font-mono">₹{checkoutModal.catalogPrice}</strong>
                                    </span>
                                    {checkoutModal.totalAmount < checkoutModal.catalogPrice && (
                                        <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                                            Discount: -₹{(checkoutModal.catalogPrice - checkoutModal.totalAmount).toFixed(2)} ({(((checkoutModal.catalogPrice - checkoutModal.totalAmount) / (checkoutModal.catalogPrice || 1)) * 100).toFixed(1)}% OFF)
                                        </span>
                                    )}
                                </div>

                                <div>
                                    <label className="text-[10px] uppercase tracking-wider font-bold text-[#01FFFF] block mb-1">
                                        Payable Amount (₹)
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#01FFFF] font-bold text-base">₹</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={checkoutModal.totalAmount || ''}
                                            onChange={(e) => {
                                                const newTotal = parseFloat(e.target.value) || 0;
                                                setCheckoutModal(prev => {
                                                    const updated = { ...prev, totalAmount: newTotal };
                                                    if (!prev.isSplit) {
                                                        if (prev.method === 'CASH') updated.cash = newTotal;
                                                        else if (prev.method === 'UPI') updated.upi = newTotal;
                                                        else if (prev.method === 'KHATA') updated.khata = newTotal;
                                                    } else {
                                                        if ((prev.upi || 0) === 0) {
                                                            updated.cash = newTotal;
                                                        } else {
                                                            updated.cash = Math.max(0, newTotal - (prev.upi || 0));
                                                        }
                                                    }
                                                    return updated;
                                                });
                                            }}
                                            className="w-full bg-black/50 border border-[#01FFFF]/40 focus:border-[#01FFFF] py-2.5 pl-8 pr-3 rounded-xl text-white font-mono text-base font-bold outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Discount Reason & Quick Chips */}
                                <div>
                                    <label className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 block mb-1">
                                        Discount Reason {checkoutModal.totalAmount < checkoutModal.catalogPrice ? <strong className="text-amber-400">(Recommended)</strong> : ''}
                                    </label>
                                    <input
                                        type="text"
                                        value={checkoutModal.discountReason}
                                        onChange={(e) => setCheckoutModal(prev => ({ ...prev, discountReason: e.target.value }))}
                                        placeholder="e.g. Regular Customer, Fleet Bargain..."
                                        className="w-full bg-black/40 border border-white/10 focus:border-[#01FFFF] py-2 px-3 rounded-xl text-white font-mono text-xs outline-none transition-all placeholder:text-zinc-600"
                                    />
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                        {["Customer Bargain", "Regular", "Regular Customer", "Fleet Bargain", "Dirtiness Concession"].map((chip) => (
                                            <button
                                                key={chip}
                                                type="button"
                                                onClick={() => setCheckoutModal(prev => ({ ...prev, discountReason: chip }))}
                                                className={`text-[9px] font-bold px-2 py-0.5 rounded border transition-all ${
                                                    checkoutModal.discountReason === chip
                                                        ? "bg-[#01FFFF]/20 border-[#01FFFF] text-[#01FFFF]"
                                                        : "bg-white/5 border-white/10 text-zinc-400 hover:text-white"
                                                }`}
                                            >
                                                + {chip}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

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

                                    {/* DYNAMIC UPI QR GENERATOR TRIGGER */}
                                    {(checkoutModal.method === 'UPI' || checkoutModal.upi > 0) && (
                                        <button
                                            type="button"
                                            onClick={() => setIsUpiQrOpen(true)}
                                            className="w-full py-3 px-4 rounded-xl bg-[#01FFFF]/10 border border-[#01FFFF]/40 text-[#01FFFF] hover:bg-[#01FFFF]/20 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 shadow-[0_0_20px_rgba(1,255,255,0.2)]"
                                        >
                                            <QrCode className="w-4 h-4 text-[#01FFFF]" />
                                            Generate Dynamic UPI QR Code (₹{checkoutModal.upi || checkoutModal.totalAmount})
                                        </button>
                                    )}

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

                            {/* ── CASH CUSTODY SELECTOR (WHEN PAYMENT INCLUDES CASH) ───────────────── */}
                            {((!checkoutModal.isSplit && checkoutModal.method === 'CASH') || (checkoutModal.isSplit && (checkoutModal.cash || 0) > 0)) && (
                                <div className="bg-[#141518] border border-white/10 p-3.5 sm:p-4 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] text-neutral-300 uppercase font-bold tracking-[0.2em] flex items-center gap-1.5">
                                            <span>💵 Cash Collection Target</span>
                                        </label>
                                        <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">
                                            Physical Tender
                                        </span>
                                    </div>

                                    {/* Dual Option Toggle Buttons */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setCheckoutModal(prev => ({ ...prev, collectorType: 'ADMIN', cashCollectedByStaffId: '' }))}
                                            className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                                                checkoutModal.collectorType === 'ADMIN'
                                                    ? 'bg-emerald-500/15 border-emerald-500/50 text-white shadow-sm'
                                                    : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white hover:bg-white/10'
                                            }`}
                                        >
                                            <div className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                                                checkoutModal.collectorType === 'ADMIN' ? 'border-emerald-400 bg-emerald-500' : 'border-neutral-500'
                                            }`}>
                                                {checkoutModal.collectorType === 'ADMIN' && <span className="w-1.5 h-1.5 rounded-full bg-[#050507]" />}
                                            </div>
                                            <div>
                                                <div className="font-bold text-white text-xs">Collected at Counter / Directly by Admin</div>
                                                <div className="text-[10px] text-neutral-400">Direct register till deposit</div>
                                            </div>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setCheckoutModal(prev => ({
                                                ...prev,
                                                collectorType: 'STAFF',
                                                cashCollectedByStaffId: prev.cashCollectedByStaffId || (staffMembers.length > 0 ? String(staffMembers[0].id) : '')
                                            }))}
                                            className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                                                checkoutModal.collectorType === 'STAFF'
                                                    ? 'bg-amber-500/15 border-amber-500/50 text-white shadow-sm'
                                                    : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white hover:bg-white/10'
                                            }`}
                                        >
                                            <div className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                                                checkoutModal.collectorType === 'STAFF' ? 'border-amber-400 bg-amber-500' : 'border-neutral-500'
                                            }`}>
                                                {checkoutModal.collectorType === 'STAFF' && <span className="w-1.5 h-1.5 rounded-full bg-[#050507]" />}
                                            </div>
                                            <div>
                                                <div className="font-bold text-white text-xs">Collected by Staff Member (at Bay/Floor)</div>
                                                <div className="text-[10px] text-neutral-400">Worker cash custody</div>
                                            </div>
                                        </button>
                                    </div>

                                    {/* Option 1: Green Badge */}
                                    {checkoutModal.collectorType === 'ADMIN' && (
                                        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                                            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
                                            <span>✓ Direct Shop Till Deposit (No staff handover required)</span>
                                        </div>
                                    )}

                                    {/* Option 2: Staff Dropdown & Alert */}
                                    {checkoutModal.collectorType === 'STAFF' && (
                                        <div className="space-y-2 pt-1 animate-in fade-in">
                                            <select
                                                required
                                                value={checkoutModal.cashCollectedByStaffId || ''}
                                                onChange={(e) => setCheckoutModal(prev => ({ ...prev, cashCollectedByStaffId: e.target.value }))}
                                                className="w-full bg-[#141518] border border-amber-500/40 py-2.5 px-3 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-amber-400 cursor-pointer"
                                            >
                                                <option value="" className="text-neutral-400">-- Select Staff Member Who Took Cash --</option>
                                                {staffMembers.map((s: any) => (
                                                    <option key={String(s.id)} value={String(s.id)} className="bg-[#141518] text-white">
                                                        {s.first_name || s.name || s.full_name || s.username || `Staff #${s.id}`} ({s.role || 'Staff'})
                                                    </option>
                                                ))}
                                            </select>

                                            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-start gap-2">
                                                <span className="text-base shrink-0 leading-none">⚠️</span>
                                                <span>
                                                    Cash Custody Alert: ₹{checkoutModal.isSplit ? (checkoutModal.cash || 0) : checkoutModal.totalAmount} will be assigned to{' '}
                                                    <strong>
                                                        {staffMembers.find((s: any) => String(s.id) === String(checkoutModal.cashCollectedByStaffId))?.name ||
                                                         staffMembers.find((s: any) => String(s.id) === String(checkoutModal.cashCollectedByStaffId))?.first_name ||
                                                         staffMembers.find((s: any) => String(s.id) === String(checkoutModal.cashCollectedByStaffId))?.username ||
                                                         'Selected Staff'}
                                                    </strong>
                                                    &apos;s &quot;Cash in Hand&quot; and must be handed over during EOD reconciliation.
                                                </span>
                                            </div>
                                        </div>
                                    )}
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

                        <div className="p-4 sm:p-5 bg-[#0B0C10]/95 backdrop-blur-md border-t border-white/10 flex items-center justify-between gap-3 sm:gap-4 shrink-0 sticky bottom-0 z-10 shadow-[0_-10px_25px_rgba(0,0,0,0.6)]">
                            {(() => {
                                const totalKhata = checkoutModal.khata || (checkoutModal.method === 'KHATA' ? checkoutModal.totalAmount : 0);
                                const sum = (checkoutModal.cash || 0) + (checkoutModal.upi || 0) + totalKhata;
                                const diff = checkoutModal.totalAmount - sum;
                                
                                if (diff > 0) {
                                    return (
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-[#8E939B] uppercase tracking-wider">Remaining</span>
                                            <span className="text-lg sm:text-xl font-black text-white transition-colors font-mono">
                                                ₹{diff.toFixed(2)}
                                            </span>
                                        </div>
                                    );
                                } else if (diff < 0) {
                                    return (
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-[#FF2A6D] uppercase tracking-wider animate-pulse">Change (Give Back)</span>
                                            <span className="text-lg sm:text-xl font-black text-[#FF2A6D] transition-colors shadow-red-500/50 drop-shadow-md font-mono">
                                                ₹{Math.abs(diff).toFixed(2)}
                                            </span>
                                        </div>
                                    );
                                } else {
                                    return (
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Balance</span>
                                            <span className="text-lg sm:text-xl font-black text-emerald-400 transition-colors font-mono">
                                                Exact (₹0.00)
                                            </span>
                                        </div>
                                    );
                                }
                            })()}
                            
                            <div className="flex items-center gap-2 sm:gap-3">
                                <button 
                                    type="button"
                                    onClick={() => setCheckoutModal(prev => ({...prev, isOpen: false}))}
                                    className="px-3 sm:px-4 py-2.5 sm:py-3 min-h-[44px] rounded-xl font-bold text-xs text-[#8E939B] hover:text-white hover:bg-white/5 transition-colors uppercase tracking-wider cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => submitPayment(false)}
                                    disabled={
                                        ((checkoutModal.cash || 0) + (checkoutModal.upi || 0) + (checkoutModal.khata || (checkoutModal.method === 'KHATA' ? checkoutModal.totalAmount : (checkoutModal.method === 'UPI' ? checkoutModal.totalAmount : 0)))) < checkoutModal.totalAmount
                                    }
                                    className={`px-4 sm:px-5 py-2.5 sm:py-3 min-h-[44px] rounded-xl font-bold text-xs transition-all active:scale-95 touch-manipulation disabled:opacity-20 disabled:cursor-not-allowed flex items-center justify-center gap-2 uppercase tracking-wider cursor-pointer ${
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

            {/* CAMERA POPUP FOR CREDIT PHOTO PROOF */}
            <CameraCaptureModal
                isOpen={isCameraModalOpen}
                onClose={() => setIsCameraModalOpen(false)}
                onCapture={(file, previewUrl) => {
                    setKhataProofFile(file);
                    setKhataProofPreview(previewUrl);
                    setIsCameraModalOpen(false);
                    submitPayment(false, true, file);
                }}
                title="Capture Back Number Plate Photo"
            />

            {/* DYNAMIC UPI QR CODE MODAL WITH CENTER LOGO */}
            <UpiQrModal
                isOpen={isUpiQrOpen}
                onClose={() => setIsUpiQrOpen(false)}
                amount={checkoutModal.upi || checkoutModal.totalAmount}
                shopName="Kallayi Car Spa"
                bookingId={checkoutModal.bookingId || undefined}
                customerName={checkoutModal.customerName || undefined}
                logoUrl="/images/logo/QRlogo.png"
                onConfirm={() => {
                    setIsUpiQrOpen(false);
                    submitPayment(true);
                }}
            />

            {/* ── BEAUTIFUL CUSTOM DELETE CONFIRMATION MODAL ───────────────────────── */}
            {deleteTargetBooking && (
                <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-6 animate-[fadeIn_0.2s_ease-out]">
                    <div className="bg-[#0c0d10] border border-[#FF2A6D]/30 rounded-[2.5rem] w-full max-w-md shadow-[0_0_90px_rgba(255,42,109,0.2)] flex flex-col overflow-hidden relative">
                        
                        {/* Ambient Red Glow Header Bar */}
                        <div className="h-1.5 w-full bg-gradient-to-r from-[#FF2A6D] via-amber-500 to-[#FF2A6D]" />

                        {/* Header */}
                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/40">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-2xl bg-[#FF2A6D]/10 border border-[#FF2A6D]/30 text-[#FF2A6D]">
                                    <Trash2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-syncopate font-bold text-sm tracking-wider text-white uppercase">Cancel &amp; Delete Wash</h3>
                                    <p className="text-[10px] text-[#8E939B] font-mono tracking-widest mt-0.5">Permanent Queue Removal</p>
                                </div>
                            </div>

                            <button
                                onClick={() => setDeleteTargetBooking(null)}
                                disabled={isDeleting}
                                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition disabled:opacity-30"
                                aria-label="Close Modal"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 flex flex-col items-center justify-center text-center space-y-4 bg-gradient-to-b from-[#161218]/60 to-[#08090c]">
                            
                            {/* Vehicle Plate Card Preview */}
                            <div className="bg-black/60 border border-[#FF2A6D]/30 rounded-2xl px-6 py-4 shadow-inner text-center w-full">
                                <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-[0.2em] block mb-1">Target Vehicle</span>
                                <div className="text-2xl sm:text-3xl font-syncopate font-black text-[#FF2A6D] tracking-wider uppercase">
                                    {deleteTargetBooking.plate_number || `Booking #${deleteTargetBooking.id}`}
                                </div>
                                {deleteTargetBooking.vehicle_model && (
                                    <p className="text-xs text-zinc-300 mt-1 font-semibold">
                                        {deleteTargetBooking.vehicle_model} {deleteTargetBooking.service_name ? `• ${deleteTargetBooking.service_name}` : ''}
                                    </p>
                                )}
                                {deleteTargetBooking.customer_name && (
                                    <p className="text-[11px] text-zinc-400 mt-0.5 font-mono">
                                        Customer: <span className="text-white font-bold">{deleteTargetBooking.customer_name}</span>
                                    </p>
                                )}
                            </div>

                            {/* Warning Text */}
                            <div className="p-4 bg-[#FF2A6D]/10 border border-[#FF2A6D]/20 rounded-2xl flex items-start gap-3 text-left">
                                <AlertCircle className="w-5 h-5 text-[#FF2A6D] flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-zinc-300 leading-relaxed">
                                    Are you sure you want to cancel and delete this vehicle booking? All associated queue, bay, and financial records will be permanently removed.
                                </p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="p-6 border-t border-white/10 bg-black/60 flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setDeleteTargetBooking(null)}
                                disabled={isDeleting}
                                className="w-1/3 py-3.5 bg-white/5 border border-white/10 text-zinc-300 hover:text-white font-syncopate font-bold text-xs uppercase tracking-widest rounded-xl transition hover:bg-white/10 active:scale-95 disabled:opacity-40"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={confirmDeleteBooking}
                                disabled={isDeleting}
                                className="flex-1 py-3.5 bg-[#FF2A6D] text-white font-syncopate font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-red-600 transition shadow-[0_0_25px_rgba(255,42,109,0.5)] flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                            >
                                {isDeleting ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" /> Deleting...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4" /> Yes, Delete Booking
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

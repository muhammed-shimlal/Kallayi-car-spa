'use client';

import React, { useState, useEffect } from 'react';
import { 
    PlusCircle, Wallet, CheckCircle, BadgeDollarSign, 
    Coins, AlertTriangle, ArrowRightLeft, ShieldCheck, DollarSign,
    Car, History, Receipt, Pencil, Percent, Sparkles, TrendingUp
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useDashboard } from '../context/DashboardContext';
import { ResponsiveDataContainer } from '../ResponsiveDataContainer';

export default function StaffTab() {
    const queryClient = useQueryClient();
    const { uiState, staffState, financeState } = useDashboard();
    const { 
        staffSubTab, setStaffSubTab, 
        isAdvanceModalOpen, setIsAdvanceModalOpen, 
        isHandoverModalOpen, setIsHandoverModalOpen,
        openStaffModal 
    } = uiState;
    const { totalDailyPayout } = financeState;
    const { 
        payrollData = [], staffDirectory = [], editingStaff, staffForm, advanceForm, setStaffForm, setAdvanceForm,
        handoverForm, setHandoverForm,
        staffStatusFilter, setStaffStatusFilter, staffSearchQuery, setStaffSearchQuery,
        handoversData = [], totalHandedOver = 0, refetchHandovers,
        saveStaff, terminateStaff, toggleStaffStatus, settleWorkerPay, handleAddAdvance, handleRecordHandover
    } = staffState;

    const [selectedWorkerToPay, setSelectedWorkerToPay] = useState<any>(null);
    const [payForm, setPayForm] = useState({ customAmount: '', paymentMethod: 'CASH', notes: '' });
    const [settlePreview, setSettlePreview] = useState<{ loading: boolean; data: any }>({ loading: false, data: null });

    // --- Quick Commission Editing State ---
    const [editingCommissionStaff, setEditingCommissionStaff] = useState<any>(null);
    const [quickCommissionRate, setQuickCommissionRate] = useState<string>('');
    const [isSavingCommission, setIsSavingCommission] = useState<boolean>(false);

    // --- Cash Handover Breakdown & Submission State ---
    const [handoverBreakdown, setHandoverBreakdown] = useState<{
        loading: boolean;
        data: {
            staff_id: string;
            staff_name: string;
            total_cash_in_hand: number;
            vehicles: Array<{
                invoice_id: number;
                booking_id: number;
                plate_number: string;
                vehicle_model: string;
                service_name: string;
                cash_amount: number;
                time: string;
            }>;
        } | null;
        error: string | null;
    }>({ loading: false, data: null, error: null });
    const [isSubmittingHandover, setIsSubmittingHandover] = useState(false);

    const formatVehicleTime = (isoString?: string) => {
        if (!isoString) return 'Recent';
        try {
            const d = new Date(isoString);
            if (isNaN(d.getTime())) return isoString;
            const now = new Date();
            const isToday = now.toDateString() === d.toDateString();
            const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
            return isToday ? `Today, ${timeStr}` : `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${timeStr}`;
        } catch {
            return isoString;
        }
    };

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    const resolveStaffProfileUUID = (worker: any): string | null => {
        if (!worker) return null;

        // 1. Direct UUID match on staff_id or profile_id
        if (worker.staff_id && UUID_REGEX.test(String(worker.staff_id))) return String(worker.staff_id);
        if (worker.profile_id && UUID_REGEX.test(String(worker.profile_id))) return String(worker.profile_id);

        // 2. Direct UUID match on id
        if (worker.id && UUID_REGEX.test(String(worker.id))) return String(worker.id);

        // 3. Direct UUID match on user_id or staff_user_id
        if (worker.user_id && UUID_REGEX.test(String(worker.user_id))) return String(worker.user_id);
        if (worker.staff_user_id && UUID_REGEX.test(String(worker.staff_user_id))) return String(worker.staff_user_id);

        // 4. Look up matching record in staffDirectory
        const directory = staffDirectory || [];
        const rawId = String(worker.id ?? worker.staff_id ?? '');

        // 4a. Match by exact ID or user_id
        const matchedById = directory.find((s: any) => 
            String(s.id) === rawId || 
            String(s.user_id) === rawId || 
            String(s.payroll_id) === rawId
        );
        if (matchedById?.id && UUID_REGEX.test(String(matchedById.id))) return String(matchedById.id);
        if (matchedById?.user_id && UUID_REGEX.test(String(matchedById.user_id))) return String(matchedById.user_id);

        // 4b. Match by Name
        const workerName = String(worker.name || worker.first_name || '').toLowerCase().trim();
        if (workerName) {
            const matchedByName = directory.find((s: any) => {
                const sName = String(s.name || s.first_name || '').toLowerCase().trim();
                return sName && (sName === workerName || sName.includes(workerName) || workerName.includes(sName));
            });
            if (matchedByName?.id && UUID_REGEX.test(String(matchedByName.id))) return String(matchedByName.id);
            if (matchedByName?.user_id && UUID_REGEX.test(String(matchedByName.user_id))) return String(matchedByName.user_id);
        }

        // 4c. Match by 1-based index (e.g. numeric ID 2)
        const num = parseInt(rawId, 10);
        if (!isNaN(num) && num >= 1 && num <= directory.length) {
            const indexed = directory[num - 1];
            if (indexed?.id && UUID_REGEX.test(String(indexed.id))) return String(indexed.id);
            if (indexed?.user_id && UUID_REGEX.test(String(indexed.user_id))) return String(indexed.user_id);
        }

        // 4d. Fallback if single staff profile exists
        if (directory.length === 1 && directory[0]?.id && UUID_REGEX.test(String(directory[0].id))) {
            return String(directory[0].id);
        }

        return worker.staff_id || worker.user_id || (worker.id !== undefined ? String(worker.id) : null);
    };

    const targetStaffId = resolveStaffProfileUUID(selectedWorkerToPay);

    // Fetch live settle-pay preview when a worker is selected
    const handleQuickCommissionSave = async () => {
        if (!editingCommissionStaff || quickCommissionRate === '') return;
        const rateVal = parseFloat(quickCommissionRate);
        if (isNaN(rateVal) || rateVal < 0 || rateVal > 100) {
            toast.error('Please enter a valid commission percentage between 0% and 100%');
            return;
        }
        setIsSavingCommission(true);
        try {
            const staffId = resolveStaffProfileUUID(editingCommissionStaff) || String(editingCommissionStaff.id);
            const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
            const res = await fetch(`/api/staff/directory/${staffId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    commission_percentage: rateVal,
                    commission_rate: rateVal
                })
            });
            if (res.ok) {
                toast.success(`Commission rate updated to ${rateVal}%!`);
                setEditingCommissionStaff(null);
                queryClient.invalidateQueries({ queryKey: ['payrollData'] });
                queryClient.invalidateQueries({ queryKey: ['staff'] });
            } else {
                const err = await res.json().catch(() => ({}));
                toast.error(err.error || 'Failed to update commission rate');
            }
        } catch {
            toast.error('Network error updating commission rate');
        } finally {
            setIsSavingCommission(false);
        }
    };

    // Fetch live settle-pay preview when a worker is selected
    useEffect(() => {
        if (!selectedWorkerToPay || !targetStaffId) {
            setSettlePreview({ loading: false, data: null });
            return;
        }

        let isCancelled = false;
        setSettlePreview({ loading: true, data: null });
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

        fetch(`/api/staff/settle-pay/${targetStaffId}`, {
            headers: { 'Authorization': `Token ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                if (!isCancelled) {
                    setSettlePreview({ loading: false, data });
                    if (data) {
                        const defaultDue = data.total_payable_due !== undefined 
                            ? data.total_payable_due 
                            : (data.net_payout ?? 0);
                        setPayForm(prev => ({ ...prev, customAmount: String(defaultDue) }));
                    }
                }
            })
            .catch(() => {
                if (!isCancelled) setSettlePreview({ loading: false, data: null });
            });

        return () => { isCancelled = true; };
    }, [selectedWorkerToPay]);

    // Fetch live vehicle collection breakdown when Cash Handover Modal is opened for a staff member
    useEffect(() => {
        if (!isHandoverModalOpen || !handoverForm.staff_id) {
            setHandoverBreakdown({ loading: false, data: null, error: null });
            return;
        }

        let isCancelled = false;
        setHandoverBreakdown(prev => ({ ...prev, loading: true, error: null }));
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

        fetch(`/api/staff/cash-handover?staff_id=${encodeURIComponent(handoverForm.staff_id)}&view=breakdown`, {
            headers: { 'Authorization': `Token ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                if (!isCancelled) {
                    if (data.success) {
                        setHandoverBreakdown({ loading: false, data, error: null });
                        const totalHolding = Number(data.total_cash_in_hand ?? 0);
                        const vehicles = data.vehicles || [];
                        const plates = vehicles.map((v: any) => v.plate_number).filter(Boolean);

                        // Auto-populate handover amount if empty or 0
                        const currentAmt = parseFloat(handoverForm.amount || '0');
                        const newAmt = (currentAmt <= 0 || isNaN(currentAmt) || currentAmt === totalHolding) && totalHolding > 0
                            ? String(totalHolding)
                            : (handoverForm.amount || (totalHolding > 0 ? String(totalHolding) : ''));

                        // Auto-generate itemized notes mentioning collected vehicle plates
                        const autoNote = plates.length > 0
                            ? `Handed over cash for ${plates.slice(0, 3).join(', ')}${plates.length > 3 ? ` +${plates.length - 3} more` : ''}`
                            : 'Cash handed over to admin';

                        setHandoverForm((prev: any) => ({
                            ...prev,
                            amount: newAmt,
                            notes: prev.notes && prev.notes !== 'Full cash handover' && prev.notes !== 'Cash Handover to Admin' 
                                ? prev.notes 
                                : autoNote
                        }));
                    } else {
                        setHandoverBreakdown({ loading: false, data: null, error: data.error || 'Failed to load vehicle breakdown' });
                    }
                }
            })
            .catch(() => {
                if (!isCancelled) {
                    setHandoverBreakdown({ loading: false, data: null, error: 'Network error loading vehicle breakdown' });
                }
            });

        return () => { isCancelled = true; };
    }, [isHandoverModalOpen, handoverForm.staff_id]);

    const handleConfirmHandover = async () => {
        if (!handoverForm.staff_id || !handoverForm.amount || parseFloat(handoverForm.amount) <= 0) {
            return;
        }

        setIsSubmittingHandover(true);
        try {
            const vehicles = handoverBreakdown.data?.vehicles || [];
            const invoiceIds = vehicles.map((v: any) => v.invoice_id).filter(Boolean);
            const plates = vehicles.map((v: any) => v.plate_number).filter(Boolean);

            await handleRecordHandover(
                handoverForm.staff_id,
                parseFloat(handoverForm.amount),
                handoverForm.notes,
                invoiceIds,
                plates
            );
        } finally {
            setIsSubmittingHandover(false);
        }
    };

    const roleColors: Record<string, string> = {
        MANAGER: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
        TECHNICIAN: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        WASHER: 'bg-[#01FFFF]/15 text-[#01FFFF] border-[#01FFFF]/30',
        DRIVER: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    };

    const payrollColumns = [
        {
            header: 'Worker',
            accessor: (worker: any) => (
                <div>
                    <p className="font-bold text-white text-sm sm:text-base">{worker.name}</p>
                    <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border mt-0.5 ${roleColors[worker.role] || 'bg-white/10 text-white'}`}>
                        {worker.role}
                    </span>
                </div>
            ),
            mobilePrimary: true
        },
        {
            header: '1. Commission Rate',
            accessor: (worker: any) => {
                const rate = Number(worker.commission_percentage ?? worker.commission_rate ?? 40);
                return (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setEditingCommissionStaff(worker);
                            setQuickCommissionRate(String(rate));
                        }}
                        title="Click to edit commission percentage"
                        className="px-2.5 py-1 rounded-xl bg-[#01FFFF]/10 hover:bg-[#01FFFF]/20 text-[#01FFFF] border border-[#01FFFF]/30 font-mono font-bold text-xs flex items-center gap-1.5 transition active:scale-95 group shadow-[0_0_10px_rgba(1,255,255,0.1)]"
                    >
                        <span>💰 {rate}%</span>
                        <Pencil className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                    </button>
                );
            }
        },
        {
            header: '2. Today\'s Wash & Share',
            accessor: (worker: any) => {
                const rev = Number(worker.wash_revenue_today ?? worker.wash_revenue ?? 0);
                const commEarned = Number(worker.commission_earned ?? worker.commission_amount ?? 0);
                const rate = Number(worker.commission_percentage ?? worker.commission_rate ?? 40);
                return (
                    <div>
                        <div className="flex items-center gap-1.5 font-mono text-xs">
                            <span className="text-neutral-400">Rev:</span>
                            <span className="font-bold text-white">₹{rev.toLocaleString()}</span>
                            <span className="text-neutral-500">➔</span>
                            <span className="font-bold text-[#01FFFF]">₹{commEarned.toLocaleString()}</span>
                        </div>
                        <p className="text-[10px] text-neutral-400 font-mono mt-0.5">
                            {rate}% share • {worker.jobs_completed || 0} jobs
                        </p>
                    </div>
                );
            },
            mobileSecondary: true
        },
        {
            header: '3. Unsettled Advances',
            accessor: (worker: any) => {
                const adv = parseFloat(worker.unsettled_advances ?? worker.advances ?? 0);
                return adv > 0 ? (
                    <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-[#FF2A6D]/20 text-[#FF2A6D] border border-[#FF2A6D]/30 inline-flex items-center gap-1">
                        -₹{adv.toLocaleString()}
                    </span>
                ) : (
                    <span className="font-mono text-neutral-500 text-xs">₹0</span>
                );
            }
        },
        {
            header: '4. Pending Wage Balance',
            accessor: (worker: any) => {
                const retained = Number(worker.retained_balance ?? worker.previous_retained_balance ?? 0);
                return retained > 0 ? (
                    <div>
                        <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1">
                            ₹{retained.toLocaleString()}
                        </span>
                        <p className="text-[9px] text-amber-400 font-mono mt-0.5">ബാക്കി കുടിശ്ശിക</p>
                    </div>
                ) : (
                    <span className="font-mono text-neutral-500 text-xs">₹0</span>
                );
            }
        },
        {
            header: 'Total Due Today',
            accessor: (worker: any) => {
                const due = Number(worker.total_payable_due ?? worker.final_payout ?? 0);
                return (
                    <div>
                        <span className="font-syncopate font-bold text-base text-emerald-400">₹{due.toLocaleString()}</span>
                        {Number(worker.base_salary || 0) > 0 && (
                            <p className="text-[10px] font-mono text-neutral-400 mt-0.5">Base: ₹{worker.base_salary}</p>
                        )}
                    </div>
                );
            },
            mobileBadge: true
        },
        {
            header: 'Cash in Hand',
            accessor: (worker: any) => {
                const cashHolding = parseFloat(worker.cash_in_hand ?? worker.collected_cash_holding ?? 0);
                return cashHolding > 0 ? (
                    <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            💵 ₹{cashHolding.toLocaleString()}
                        </span>
                        <button
                            title="Record Cash Handover to Admin"
                            onClick={(e) => {
                                e.stopPropagation();
                                const resolvedId = resolveStaffProfileUUID(worker) || String(worker.id);
                                setHandoverForm({ staff_id: resolvedId, amount: String(cashHolding), notes: '' });
                                setIsHandoverModalOpen(true);
                            }}
                            className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-bold uppercase transition active:scale-95"
                        >
                            Handover
                        </button>
                    </div>
                ) : (
                    <span className="font-mono text-gray-500 text-xs">₹0</span>
                );
            }
        },
        {
            header: 'Settlement',
            accessor: (worker: any) => {
                if (worker.status === 'Paid' || worker.is_settled) {
                    const bal = Number(worker.balance_retained || 0);
                    return (
                        <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1 text-[9px] bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded uppercase tracking-widest font-bold border border-emerald-500/30">
                                <CheckCircle className="w-3 h-3" /> Settled
                            </span>
                            {bal > 0 && (
                                <span className="text-[9px] text-amber-300 font-mono">
                                    ₹{bal.toLocaleString()} retained
                                </span>
                            )}
                        </div>
                    );
                }
                return (
                    <button
                        onClick={() => {
                            setSelectedWorkerToPay(worker);
                            setPayForm({ customAmount: '', paymentMethod: 'CASH', notes: '' });
                        }}
                        className="inline-flex items-center gap-1.5 text-[10px] bg-[#01FFFF] text-black hover:bg-white transition-colors px-3 py-1.5 rounded-xl uppercase tracking-widest font-bold shadow-[0_0_12px_rgba(1,255,255,0.3)] min-h-[36px] active:scale-95 touch-manipulation font-syncopate"
                    >
                        <BadgeDollarSign className="w-3.5 h-3.5" /> Settle Pay
                    </button>
                );
            }
        }
    ];

    const directoryColumns = [
        {
            header: 'Staff Member',
            accessor: (staff: any) => (
                <div>
                    <p className="font-bold text-white text-sm">{staff.first_name || staff.name || staff.username}</p>
                    <p className="text-[10px] font-mono text-[#8E939B]">{staff.phone_number || staff.phone || staff.username}</p>
                </div>
            ),
            mobilePrimary: true
        },
        {
            header: 'Role & Status',
            accessor: (staff: any) => (
                <div className="flex flex-col gap-1">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md border w-fit ${roleColors[staff.role] || 'bg-white/10 text-white'}`}>
                        {staff.role}
                    </span>
                    <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded w-fit ${staff.is_active ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                        {staff.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                </div>
            ),
            mobileSecondary: true
        },
        {
            header: 'Commission %',
            accessor: (staff: any) => {
                const rate = Number(staff.commission_percentage ?? staff.commission_rate ?? 40);
                return (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setEditingCommissionStaff(staff);
                            setQuickCommissionRate(String(rate));
                        }}
                        title="Click to edit commission percentage"
                        className="px-2.5 py-1 rounded-xl bg-[#01FFFF]/10 hover:bg-[#01FFFF]/20 text-[#01FFFF] border border-[#01FFFF]/30 font-mono font-bold text-xs flex items-center gap-1.5 transition active:scale-95 group"
                    >
                        <span>💰 {rate}%</span>
                        <Pencil className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                    </button>
                );
            }
        },
        {
            header: 'Base Wage',
            accessor: (staff: any) => <span className="text-xs font-mono font-bold text-white">₹{staff.salary_amount ?? staff.base_salary ?? 0}</span>
        },
        {
            header: 'Advances',
            accessor: (staff: any) => {
                const adv = parseFloat(staff.unsettled_advances ?? 0);
                return adv > 0 ? (
                    <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-md bg-[#FF2A6D]/20 text-[#FF2A6D] border border-[#FF2A6D]/30">
                        -₹{adv.toLocaleString()}
                    </span>
                ) : (
                    <span className="font-mono text-gray-500 text-xs">₹0</span>
                );
            }
        },
        {
            header: 'Pending Wage Balance',
            accessor: (staff: any) => {
                const retained = Number(staff.retained_balance ?? staff.previous_retained_balance ?? staff.pending_balance ?? 0);
                return retained > 0 ? (
                    <div>
                        <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            ₹{retained.toLocaleString()}
                        </span>
                        <p className="text-[9px] text-amber-400 font-mono mt-0.5">കുടിശ്ശിക</p>
                    </div>
                ) : (
                    <span className="font-mono text-emerald-400 text-xs font-bold">₹0</span>
                );
            },
            mobileBadge: true
        },
        {
            header: 'Cash Custody',
            accessor: (staff: any) => {
                const holding = parseFloat(staff.collected_cash_holding ?? staff.cash_in_hand ?? 0);
                return holding > 0 ? (
                    <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 w-fit">
                            💵 ₹{holding.toLocaleString()}
                        </span>
                        <button
                            title="Record Cash Handover to Admin"
                            onClick={(e) => {
                                e.stopPropagation();
                                const resolvedId = resolveStaffProfileUUID(staff) || String(staff.id);
                                setHandoverForm({ staff_id: resolvedId, amount: String(holding), notes: '' });
                                setIsHandoverModalOpen(true);
                            }}
                            className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-bold uppercase transition active:scale-95"
                        >
                            Handover
                        </button>
                    </div>
                ) : (
                    <span className="font-mono text-gray-500 text-xs">₹0</span>
                );
            }
        },
        {
            header: 'Actions',
            accessor: (staff: any) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => openStaffModal(staff)}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition border border-white/10 flex items-center gap-1"
                    >
                        <Pencil className="w-3 h-3 text-[#01FFFF]" /> Edit
                    </button>
                </div>
            )
        }
    ];

    const handoversColumns = [
        {
            header: 'Date & Time',
            accessor: (item: any) => (
                <div>
                    <p className="font-bold text-white text-xs sm:text-sm">
                        {item.handover_date ? new Date(item.handover_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Today'}
                    </p>
                    <p className="text-[10px] font-mono text-[#8E939B] mt-0.5">
                        {item.handover_date ? new Date(item.handover_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : ''}
                    </p>
                </div>
            ),
            mobilePrimary: true
        },
        {
            header: 'Staff Member',
            accessor: (item: any) => (
                <div>
                    <p className="font-bold text-white text-sm">{item.staff_name || 'Staff'}</p>
                    <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border mt-0.5 ${roleColors[item.staff_role] || 'bg-white/10 text-white'}`}>
                        {item.staff_role || 'STAFF'}
                    </span>
                </div>
            ),
            mobileSecondary: true
        },
        {
            header: 'Amount Handed Over',
            accessor: (item: any) => (
                <span className="font-mono font-bold text-base text-amber-300">
                    ₹{Number(item.amount || 0).toLocaleString()}
                </span>
            )
        },
        {
            header: 'Reconciled Vehicles (വാഹനങ്ങൾ)',
            accessor: (item: any) => {
                const plates = item.vehicle_summary
                    ? item.vehicle_summary.split(',').map((p: string) => p.trim()).filter(Boolean)
                    : [];
                return plates.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 max-w-xs">
                        {plates.map((plate: string, idx: number) => (
                            <span 
                                key={idx} 
                                className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-mono font-bold flex items-center gap-1"
                            >
                                🚗 {plate}
                            </span>
                        ))}
                    </div>
                ) : (
                    <span className="text-neutral-500 text-xs font-mono">Manual Handover</span>
                );
            }
        },
        {
            header: 'Notes / Reference',
            accessor: (item: any) => (
                <p className="text-xs text-neutral-300 max-w-xs truncate" title={item.notes}>
                    {item.notes || 'Cash handed over to admin'}
                </p>
            )
        },
        {
            header: 'Audit Status',
            accessor: () => (
                <span className="inline-flex items-center gap-1 text-[9px] bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded uppercase tracking-widest font-bold border border-emerald-500/30">
                    <ShieldCheck className="w-3 h-3" /> Reconciled
                </span>
            ),
            mobileBadge: true
        }
    ];

    return (
        <div className="animate-[fadeIn_0.5s_ease-out] space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h3 className="font-syncopate font-bold tracking-widest text-lg sm:text-xl text-white">STAFF OPERATIONS</h3>
                    <p className="text-xs text-neutral-400 font-mono tracking-wider">Payroll calculations, advances, cash custody & directory control</p>
                </div>
                <div className="flex items-center gap-2 bg-[#0a0a0d] border border-white/10 rounded-2xl p-1 shadow-[4px_4px_10px_#020203,-4px_-4px_10px_#14151a]">
                    <button
                        onClick={() => setStaffSubTab('payroll')}
                        className={`min-h-[44px] px-3 sm:px-5 py-2 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all touch-manipulation ${staffSubTab === 'payroll' ? 'bg-[#01FFFF]/10 text-[#01FFFF] border border-[#01FFFF]/30' : 'text-[#8E939B] hover:text-white'}`}
                    >
                        Payroll Ledger
                    </button>
                    <button
                        onClick={() => setStaffSubTab('directory')}
                        className={`min-h-[44px] px-3 sm:px-5 py-2 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all touch-manipulation ${staffSubTab === 'directory' ? 'bg-[#01FFFF]/10 text-[#01FFFF] border border-[#01FFFF]/30' : 'text-[#8E939B] hover:text-white'}`}
                    >
                        Staff Directory
                    </button>
                    <button
                        onClick={() => setStaffSubTab('handovers')}
                        className={`min-h-[44px] px-3 sm:px-5 py-2 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all touch-manipulation flex items-center gap-1.5 ${staffSubTab === 'handovers' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' : 'text-[#8E939B] hover:text-white'}`}
                    >
                        <Coins className="w-3.5 h-3.5 text-amber-400" />
                        <span>Cash Handovers</span>
                        {handoversData.length > 0 && (
                            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] bg-amber-500/30 text-amber-300 font-mono font-bold">
                                {handoversData.length}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* PAYROLL SUB-TAB */}
            {staffSubTab === 'payroll' && (
                <>
                    <div className="flex flex-wrap items-center gap-3">
                        <button 
                            onClick={() => setIsAdvanceModalOpen(true)} 
                            className="flex items-center justify-center gap-2 bg-[#0a0a0d] text-white border border-white/15 px-6 py-3.5 rounded-2xl font-bold text-xs uppercase tracking-widest hover:border-[#01FFFF] transition shadow-[4px_4px_10px_#020203,-4px_-4px_10px_#14151a] min-h-[48px] w-full sm:w-auto touch-manipulation"
                        >
                            <PlusCircle className="w-4 h-4 text-[#01FFFF]" /> Add Expense/Advance
                        </button>

                        <button 
                            onClick={() => setIsHandoverModalOpen(true)} 
                            className="flex items-center justify-center gap-2 bg-[#0a0a0d] text-amber-300 border border-amber-500/30 hover:border-amber-400 px-6 py-3.5 rounded-2xl font-bold text-xs uppercase tracking-widest transition shadow-[4px_4px_10px_#020203,-4px_-4px_10px_#14151a] min-h-[48px] w-full sm:w-auto touch-manipulation"
                        >
                            <Coins className="w-4 h-4 text-amber-400" /> Record Cash Handover
                        </button>

                        <button 
                            onClick={() => setStaffSubTab('handovers')} 
                            className="flex items-center justify-center gap-2 bg-[#0a0a0d] text-neutral-300 border border-white/10 hover:border-amber-400/50 px-5 py-3.5 rounded-2xl font-bold text-xs uppercase tracking-widest transition shadow-[4px_4px_10px_#020203,-4px_-4px_10px_#14151a] min-h-[48px] w-full sm:w-auto touch-manipulation"
                        >
                            <History className="w-4 h-4 text-amber-400" /> Handover History ({handoversData.length})
                        </button>
                    </div>

                    <div className="bg-[#0a0a0d] border border-emerald-500/30 p-5 sm:p-6 rounded-3xl mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-[4px_4px_12px_#020203,-4px_-4px_12px_#14151a]">
                        <div>
                            <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-1 flex items-center gap-2">
                                <Wallet className="w-4 h-4" /> Total Daily Net Payout
                            </p>
                            <h2 className="text-3xl sm:text-4xl font-syncopate font-bold text-white tracking-tighter">₹{totalDailyPayout?.toLocaleString() || 0}</h2>
                        </div>
                        <div className="text-left sm:text-right text-[11px] font-mono text-neutral-400">
                            <p className="text-white/80 font-bold">[Base Wage] + [Commissions] - [Advances] = Net Payout</p>
                            <p className="text-[10px] text-neutral-500 mt-1">Advances are automatically deducted when settling worker pay.</p>
                        </div>
                    </div>

                    <ResponsiveDataContainer
                        data={payrollData}
                        columns={payrollColumns}
                        keyExtractor={(item, idx) => item.id || idx}
                        title="Staff Payroll Ledger (Today)"
                        emptyMessage="No active staff records today."
                    />
                </>
            )}

            {/* DIRECTORY SUB-TAB */}
            {staffSubTab === 'directory' && (
                <>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                        <div>
                            <h2 className="font-syncopate font-bold text-base sm:text-lg tracking-widest text-white">STAFF DIRECTORY<span className="text-[#01FFFF]">.</span></h2>
                            <p className="text-[10px] text-[#8E939B] uppercase tracking-[0.25em] font-bold mt-0.5">Hire, Edit, Pay & Manage Workers</p>
                        </div>
                        <button
                            onClick={() => openStaffModal()}
                            className="w-full sm:w-auto min-h-[48px] bg-gradient-to-r from-[#E52323] to-red-700 text-white font-syncopate font-bold text-xs tracking-widest px-6 py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(229,35,35,0.4)] transition-all active:scale-95 touch-manipulation"
                        >
                            <PlusCircle className="w-4 h-4" /> REGISTER NEW STAFF
                        </button>
                    </div>

                    {/* Controls Row: Status Filters & Search Bar */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-1 bg-[#0a0a0d] border border-white/10 p-1.5 rounded-2xl shadow-[4px_4px_10px_#020203,-4px_-4px_10px_#14151a]">
                            <button
                                onClick={() => setStaffStatusFilter('active')}
                                className={`min-h-[40px] px-3.5 py-2 rounded-xl font-grotesk text-xs uppercase tracking-wider font-bold transition-all touch-manipulation ${
                                    staffStatusFilter === 'active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-[#8E939B] hover:text-white'
                                }`}
                            >
                                Active
                            </button>
                            <button
                                onClick={() => setStaffStatusFilter('terminated')}
                                className={`min-h-[40px] px-3.5 py-2 rounded-xl font-grotesk text-xs uppercase tracking-wider font-bold transition-all touch-manipulation ${
                                    staffStatusFilter === 'terminated' ? 'bg-[#FF2A6D]/20 text-[#FF2A6D] border border-[#FF2A6D]/30' : 'text-[#8E939B] hover:text-white'
                                }`}
                            >
                                Terminated
                            </button>
                            <button
                                onClick={() => setStaffStatusFilter('all')}
                                className={`min-h-[40px] px-3.5 py-2 rounded-xl font-grotesk text-xs uppercase tracking-wider font-bold transition-all touch-manipulation ${
                                    staffStatusFilter === 'all' ? 'bg-white/10 text-[#01FFFF] border border-white/20' : 'text-[#8E939B] hover:text-white'
                                }`}
                            >
                                All Staff
                            </button>
                        </div>

                        <div className="relative flex-1 max-w-sm">
                            <input
                                type="text"
                                value={staffSearchQuery}
                                onChange={(e) => setStaffSearchQuery(e.target.value)}
                                placeholder="Search by name, phone, or role..."
                                className="w-full bg-[#0a0a0d] border border-white/10 py-3 px-4 rounded-2xl text-xs text-white placeholder-[#8E939B] focus:outline-none focus:border-[#01FFFF] transition-all font-mono min-h-[44px] shadow-[inset_3px_3px_6px_#020203,inset_-3px_-3px_6px_#14151a]"
                            />
                        </div>
                    </div>

                    <ResponsiveDataContainer
                        data={staffDirectory}
                        columns={directoryColumns}
                        keyExtractor={(item, idx) => item.id || idx}
                        emptyMessage="No staff records match your criteria."
                        actionButtons={(staff: any) => (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => toggleStaffStatus(staff.id, staff.is_active)}
                                    className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors active:scale-95 touch-manipulation ${
                                        staff.is_active ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                    }`}
                                >
                                    {staff.is_active ? 'Deactivate' : 'Activate'}
                                </button>
                            </div>
                        )}
                    />
                </>
            )}

            {/* CASH HANDOVERS AUDIT SUB-TAB */}
            {staffSubTab === 'handovers' && (
                <>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                        <div>
                            <h2 className="font-syncopate font-bold text-base sm:text-lg tracking-widest text-white">
                                STAFF CASH HANDOVERS<span className="text-amber-400">.</span>
                            </h2>
                            <p className="text-[10px] text-[#8E939B] uppercase tracking-[0.25em] font-bold mt-0.5">
                                ക്യാഷ് വാങ്ങലുകൾ — Vehicle Reconciliation &amp; Audit Trail
                            </p>
                        </div>
                        <button
                            onClick={() => setIsHandoverModalOpen(true)}
                            className="w-full sm:w-auto min-h-[48px] bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-syncopate font-bold text-xs tracking-widest px-6 py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all active:scale-95 touch-manipulation"
                        >
                            <Coins className="w-4 h-4" /> RECORD CASH HANDOVER
                        </button>
                    </div>

                    {/* KPI / SUMMARY ROW */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                        <div className="bg-[#0a0a0d] border border-amber-500/30 p-5 rounded-3xl shadow-[4px_4px_10px_#020203,-4px_-4px_10px_#14151a]">
                            <p className="text-amber-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-1 flex items-center gap-1.5">
                                <Coins className="w-4 h-4" /> Total Handed Over
                            </p>
                            <h3 className="text-2xl sm:text-3xl font-syncopate font-bold text-white tracking-tight">
                                ₹{Number(totalHandedOver || 0).toLocaleString()}
                            </h3>
                        </div>
                        <div className="bg-[#0a0a0d] border border-white/10 p-5 rounded-3xl shadow-[4px_4px_10px_#020203,-4px_-4px_10px_#14151a]">
                            <p className="text-neutral-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-1 flex items-center gap-1.5">
                                <Receipt className="w-4 h-4 text-[#01FFFF]" /> Handover Records
                            </p>
                            <h3 className="text-2xl sm:text-3xl font-syncopate font-bold text-white tracking-tight">
                                {handoversData.length}
                            </h3>
                        </div>
                        <div className="bg-[#0a0a0d] border border-emerald-500/30 p-5 rounded-3xl shadow-[4px_4px_10px_#020203,-4px_-4px_10px_#14151a]">
                            <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-1 flex items-center gap-1.5">
                                <Car className="w-4 h-4" /> Reconciled Vehicles
                            </p>
                            <h3 className="text-2xl sm:text-3xl font-syncopate font-bold text-white tracking-tight">
                                {handoversData.reduce((acc: number, h: any) => acc + (h.reconciled_invoices_count || (h.vehicle_summary ? h.vehicle_summary.split(',').filter(Boolean).length : 0)), 0)}
                            </h3>
                        </div>
                    </div>

                    <ResponsiveDataContainer
                        data={handoversData}
                        columns={handoversColumns}
                        keyExtractor={(item, idx) => item.id || idx}
                        title="Cash Handover Audit Log"
                        subtitle="Verified staff customer collections transferred to shop counter"
                        emptyMessage="No cash handover records found."
                    />
                </>
            )}

            {/* SALARY ADVANCE MODAL WITH QUICK CHIPS */}
            {isAdvanceModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center animate-[fadeIn_0.2s_ease-out] px-4">
                    <div className="bg-[#141518] border border-white/10 p-5 sm:p-8 rounded-3xl sm:rounded-[2.5rem] w-full max-w-md max-h-[90vh] overflow-y-auto shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="font-syncopate font-bold tracking-widest text-[#01FFFF] text-base sm:text-lg">RECORD STAFF ADVANCE</h3>
                                <p className="text-xs text-neutral-400 font-mono mt-0.5">Deducted automatically upon payroll settlement</p>
                            </div>
                            <button onClick={() => setIsAdvanceModalOpen(false)} className="text-[#8E939B] hover:text-white transition-colors">
                                <PlusCircle className="w-6 h-6 rotate-45" />
                            </button>
                        </div>

                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="font-grotesk text-[10px] uppercase tracking-[0.2em] text-[#8E939B] font-bold ml-2">Select Staff Member *</label>
                                <select
                                    value={advanceForm?.staff_id || ''}
                                    onChange={(e) => setAdvanceForm && setAdvanceForm({ ...advanceForm, staff_id: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 py-3.5 sm:py-4 px-4 sm:px-6 rounded-xl text-white text-base sm:text-sm focus:outline-none focus:border-[#01FFFF] focus:ring-1 focus:ring-[#01FFFF] transition-all mt-2 appearance-none"
                                >
                                    <option value="" className="bg-[#141518]">-- Select Staff Member --</option>
                                    {staffDirectory.map((staff: any) => (
                                        <option key={staff.id} value={staff.id} className="bg-[#141518]">{staff.first_name || staff.name} ({staff.role})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="font-grotesk text-[10px] uppercase tracking-[0.2em] text-[#8E939B] font-bold ml-2">Advance Amount (₹) *</label>
                                </div>
                                <input
                                    type="number"
                                    value={advanceForm?.amount || ''}
                                    onChange={(e) => setAdvanceForm && setAdvanceForm({ ...advanceForm, amount: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 py-3.5 sm:py-4 px-4 sm:px-6 rounded-xl text-white font-mono text-base sm:text-sm focus:outline-none focus:border-[#01FFFF] focus:ring-1 focus:ring-[#01FFFF] transition-all"
                                    placeholder="e.g. 500"
                                />

                                {/* QUICK AMOUNT CHIPS */}
                                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                    {[100, 200, 500, 1000, 2000].map((chipVal) => (
                                        <button
                                            key={chipVal}
                                            type="button"
                                            onClick={() => {
                                                const current = parseFloat(advanceForm?.amount || '0') || 0;
                                                setAdvanceForm({ ...advanceForm, amount: String(current + chipVal) });
                                            }}
                                            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-[11px] font-mono font-bold text-white transition active:scale-95"
                                        >
                                            +₹{chipVal}
                                        </button>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => setAdvanceForm({ ...advanceForm, amount: '' })}
                                        className="px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-bold uppercase transition"
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="font-grotesk text-[10px] uppercase tracking-[0.2em] text-[#8E939B] font-bold ml-2">Purpose / Notes</label>
                                <input
                                    type="text"
                                    value={advanceForm?.description || ''}
                                    onChange={(e) => setAdvanceForm && setAdvanceForm({ ...advanceForm, description: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 py-3.5 sm:py-4 px-4 sm:px-6 rounded-xl text-white text-base sm:text-sm focus:outline-none focus:border-[#01FFFF] focus:ring-1 focus:ring-[#01FFFF] transition-all mt-2"
                                    placeholder="e.g. Petrol expense, personal advance"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleAddAdvance}
                            className="w-full bg-[#01FFFF] text-black font-syncopate font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(1,255,255,0.4)] hover:bg-white transition-all flex items-center justify-center gap-2 min-h-[48px] touch-manipulation"
                        >
                            <PlusCircle className="w-5 h-5" /> CONFIRM &amp; RECORD ADVANCE
                        </button>
                    </div>
                </div>
            )}

            {/* CASH HANDOVER MODAL (STAFF TO ADMIN WITH VEHICLE BREAKDOWN) */}
            {isHandoverModalOpen && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center animate-[fadeIn_0.2s_ease-out] p-4">
                    <div className="bg-[#141518] border border-amber-500/30 p-6 sm:p-8 rounded-3xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-[0_0_50px_rgba(245,158,11,0.25)]">
                        <div className="flex justify-between items-center mb-6 pb-3 border-b border-white/10">
                            <div>
                                <h3 className="font-syncopate font-bold tracking-widest text-amber-400 text-base sm:text-lg flex items-center gap-2">
                                    <Coins className="w-5 h-5 text-amber-400" /> RECORD CASH HANDOVER
                                </h3>
                                <p className="text-xs text-neutral-400 font-mono mt-0.5">
                                    Staff customer cash handover to admin with vehicle audit
                                </p>
                            </div>
                            <button 
                                onClick={() => setIsHandoverModalOpen(false)} 
                                className="text-[#8E939B] hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
                            >
                                <PlusCircle className="w-6 h-6 rotate-45" />
                            </button>
                        </div>

                        <div className="space-y-4 mb-6">
                            {/* Staff Selection Dropdown */}
                            <div>
                                <label className="font-grotesk text-[10px] uppercase tracking-[0.2em] text-[#8E939B] font-bold block mb-1.5 ml-1">
                                    Select Staff Member *
                                </label>
                                <select
                                    value={handoverForm?.staff_id || ''}
                                    onChange={(e) => {
                                        const sid = e.target.value;
                                        const found = staffDirectory.find((s: any) => String(s.id) === String(sid) || String(s.user_id) === String(sid));
                                        const holding = found ? (found.collected_cash_holding ?? found.cash_in_hand ?? 0) : 0;
                                        const resolvedId = found ? (resolveStaffProfileUUID(found) || sid) : sid;
                                        setHandoverForm({ 
                                            ...handoverForm, 
                                            staff_id: resolvedId, 
                                            amount: holding > 0 ? String(holding) : '',
                                            notes: '' 
                                        });
                                    }}
                                    className="w-full bg-[#0a0a0d] border border-white/15 py-3.5 px-4 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all cursor-pointer"
                                >
                                    <option value="" className="bg-[#141518]">-- Select Staff Member --</option>
                                    {staffDirectory.map((staff: any) => {
                                        const holding = staff.collected_cash_holding ?? staff.cash_in_hand ?? 0;
                                        return (
                                            <option key={staff.id} value={staff.id} className="bg-[#141518]">
                                                {staff.first_name || staff.name} ({staff.role}) — {holding > 0 ? `Holding ₹${holding.toLocaleString()}` : 'No cash held'}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            {/* 1. Highlighted Total Cash In Hand Banner */}
                            {handoverForm?.staff_id && (
                                <div className="bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-yellow-500/5 border border-amber-500/30 p-4 rounded-2xl flex items-center justify-between shadow-[inset_0_1px_0_rgba(245,158,11,0.2)]">
                                    <div className="space-y-0.5">
                                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400 flex items-center gap-1.5">
                                            <Wallet className="w-3.5 h-3.5" /> Total Cash In Hand
                                        </span>
                                        <p className="text-[11px] text-neutral-300 font-mono">
                                            {handoverBreakdown.data?.vehicles?.length 
                                                ? `${handoverBreakdown.data.vehicles.length} Vehicle${handoverBreakdown.data.vehicles.length > 1 ? 's' : ''} awaiting handover`
                                                : 'Unreconciled cash holding'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-syncopate font-bold text-xl sm:text-2xl text-amber-300 tracking-tight">
                                            ₹{Number(handoverBreakdown.data?.total_cash_in_hand ?? 0).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* 2. Itemized Vehicle Breakdown Section (ക്യാഷ് വാങ്ങിയ വണ്ടികൾ) */}
                            {handoverForm?.staff_id && (
                                <div className="space-y-2.5">
                                    <div className="flex items-center justify-between px-1">
                                        <label className="font-grotesk text-[10px] uppercase tracking-[0.2em] text-[#8E939B] font-bold flex items-center gap-1.5">
                                            <Car className="w-3.5 h-3.5 text-[#01FFFF]" />
                                            ക്യാഷ് വാങ്ങിയ വണ്ടികൾ (Vehicles Collected)
                                        </label>
                                        {handoverBreakdown.data?.vehicles && handoverBreakdown.data.vehicles.length > 0 && (
                                            <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                                                {handoverBreakdown.data.vehicles.length} Vehicle{handoverBreakdown.data.vehicles.length > 1 ? 's' : ''}
                                            </span>
                                        )}
                                    </div>

                                    {/* Loading State */}
                                    {handoverBreakdown.loading && (
                                        <div className="p-4 rounded-2xl bg-black/40 border border-white/10 text-center text-xs text-neutral-400 font-mono animate-pulse flex items-center justify-center gap-2">
                                            <Coins className="w-4 h-4 text-amber-400 animate-spin" />
                                            Fetching vehicle collections...
                                        </div>
                                    )}

                                    {/* Vehicle Cards List */}
                                    {!handoverBreakdown.loading && handoverBreakdown.data?.vehicles && handoverBreakdown.data.vehicles.length > 0 && (
                                        <div className="max-h-52 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                            {handoverBreakdown.data.vehicles.map((v: any, idx: number) => (
                                                <div 
                                                    key={v.invoice_id || idx}
                                                    className="p-3 rounded-2xl bg-black/50 border border-white/10 hover:border-amber-500/40 transition-all flex items-center justify-between gap-3 shadow-[2px_2px_6px_#020203]"
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                                            <span className="font-mono font-bold text-xs px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 tracking-wider">
                                                                🚗 {v.plate_number}
                                                            </span>
                                                            <span className="text-[10px] text-neutral-400 font-mono">
                                                                {formatVehicleTime(v.time)}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-neutral-200 font-medium truncate">
                                                            {v.vehicle_model} • <span className="text-[#01FFFF]">{v.service_name}</span>
                                                        </p>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <span className="font-mono font-bold text-sm text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20">
                                                            +₹{Number(v.cash_amount).toLocaleString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Empty State */}
                                    {!handoverBreakdown.loading && (!handoverBreakdown.data?.vehicles || handoverBreakdown.data.vehicles.length === 0) && (
                                        <div className="p-3.5 rounded-2xl bg-black/30 border border-white/5 text-center text-xs text-neutral-400 font-mono">
                                            No vehicle collections directly linked to this holding. Handover will reconcile general cash custody.
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 3. Handover Amount Input */}
                            <div>
                                <div className="flex justify-between items-center mb-1.5 ml-1">
                                    <label className="font-grotesk text-[10px] uppercase tracking-[0.2em] text-[#8E939B] font-bold">
                                        Handover Amount (₹) *
                                    </label>
                                    {handoverBreakdown.data?.total_cash_in_hand ? (
                                        <button
                                            type="button"
                                            onClick={() => setHandoverForm({ ...handoverForm, amount: String(handoverBreakdown.data?.total_cash_in_hand || 0) })}
                                            className="text-[10px] text-amber-400 hover:text-amber-300 font-mono underline"
                                        >
                                            Full Amount (₹{Number(handoverBreakdown.data?.total_cash_in_hand).toLocaleString()})
                                        </button>
                                    ) : null}
                                </div>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={handoverForm?.amount || ''}
                                    onChange={(e) => setHandoverForm({ ...handoverForm, amount: e.target.value })}
                                    className="w-full bg-[#0a0a0d] border border-white/15 py-3.5 px-4 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all"
                                    placeholder="e.g. 1100"
                                />
                            </div>

                            {/* 4. Notes Field */}
                            <div>
                                <label className="font-grotesk text-[10px] uppercase tracking-[0.2em] text-[#8E939B] font-bold block mb-1.5 ml-1">
                                    Notes / Audit Reference
                                </label>
                                <input
                                    type="text"
                                    value={handoverForm?.notes || ''}
                                    onChange={(e) => setHandoverForm({ ...handoverForm, notes: e.target.value })}
                                    className="w-full bg-[#0a0a0d] border border-white/15 py-3.5 px-4 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all"
                                    placeholder="e.g. Handed over cash for Swift & Innova"
                                />
                            </div>
                        </div>

                        {/* 5. Action Buttons */}
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setIsHandoverModalOpen(false)}
                                className="flex-1 py-3.5 border border-white/20 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmHandover}
                                disabled={isSubmittingHandover || !handoverForm?.staff_id || !handoverForm?.amount || parseFloat(handoverForm?.amount) <= 0}
                                className="flex-[2] bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-syncopate font-bold py-3.5 rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
                            >
                                <ShieldCheck className="w-4 h-4" />
                                {isSubmittingHandover ? 'RECORDING...' : 'CONFIRM CASH HANDOVER'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ITEMIZED SALARY SETTLEMENT MODAL WITH AUTO-DEDUCTION & WAGE RETENTION */}
            {selectedWorkerToPay && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center animate-[fadeIn_0.2s_ease-out] p-4">
                    <div className="bg-[#141518] border border-white/10 p-6 sm:p-8 rounded-3xl w-full max-w-lg shadow-[0_0_50px_rgba(0,0,0,0.8)] max-h-[95vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-5 pb-3 border-b border-white/10">
                            <div>
                                <h3 className="font-syncopate font-bold tracking-widest text-[#01FFFF] text-base sm:text-lg">
                                    SETTLE WORKER PAY
                                </h3>
                                <p className="text-xs text-neutral-400 font-mono mt-0.5">
                                    Worker: <span className="text-white font-bold">{selectedWorkerToPay.name || selectedWorkerToPay.first_name || selectedWorkerToPay.username}</span> ({selectedWorkerToPay.role || 'WASHER'})
                                </p>
                            </div>
                            <button 
                                onClick={() => setSelectedWorkerToPay(null)} 
                                className="text-[#8E939B] hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
                            >
                                <PlusCircle className="w-6 h-6 rotate-45" />
                            </button>
                        </div>

                        {/* Financial calculations for preview */}
                        {(() => {
                            const totalDue = settlePreview.data?.total_payable_due !== undefined 
                                ? Number(settlePreview.data.total_payable_due) 
                                : Number(selectedWorkerToPay.total_payable_due ?? selectedWorkerToPay.final_payout ?? 0);

                            const washRev = Number(settlePreview.data?.wash_revenue ?? selectedWorkerToPay.wash_revenue_today ?? 0);
                            const commRate = Number(settlePreview.data?.commission_percentage ?? selectedWorkerToPay.commission_percentage ?? selectedWorkerToPay.commission_rate ?? 40);
                            const commEarned = Number(settlePreview.data?.commission_earned ?? selectedWorkerToPay.commission_earned ?? 0);
                            const baseWage = Number(settlePreview.data?.base_wage ?? selectedWorkerToPay.base_salary ?? 0);
                            const tips = Number(settlePreview.data?.tips_earned ?? 0);
                            const grossEarnings = Number(settlePreview.data?.gross_earnings ?? (baseWage + commEarned + tips));
                            const previousRetained = Number(settlePreview.data?.previous_retained_balance ?? selectedWorkerToPay.retained_balance ?? 0);
                            const advances = Number(settlePreview.data?.unsettled_advances ?? selectedWorkerToPay.unsettled_advances ?? selectedWorkerToPay.advances ?? 0);

                            const payingAmount = payForm.customAmount !== '' ? parseFloat(payForm.customAmount) || 0 : totalDue;
                            const remainingToHold = Math.max(0, Math.round((totalDue - payingAmount) * 100) / 100);

                            return (
                                <>
                                    {/* TOTAL DUE HERO CARD */}
                                    <div className="bg-gradient-to-br from-emerald-950/40 via-black to-emerald-950/20 border border-emerald-500/30 p-4 sm:p-5 rounded-2xl mb-4 flex items-center justify-between shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                                        <div>
                                            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.2em]">Total Payable Due Today</p>
                                            <p className="text-[10px] text-neutral-400 font-mono mt-0.5">Gross Earnings + Previous Due - Advances</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="font-syncopate font-bold text-2xl sm:text-3xl text-emerald-400 tracking-tight">
                                                ₹{totalDue.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>

                                    {/* ITEMIZED DEDUCTION PREVIEW */}
                                    {settlePreview.loading ? (
                                        <div className="p-4 rounded-2xl bg-black/40 border border-white/10 text-center text-xs text-neutral-400 font-mono animate-pulse mb-4">
                                            Calculating wages, commissions &amp; advances...
                                        </div>
                                    ) : (
                                        <div className="bg-black/60 border border-white/10 p-4 rounded-2xl space-y-2.5 mb-4">
                                            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] border-b border-white/10 pb-2 flex items-center justify-between">
                                                <span>Itemized Financial Breakdown</span>
                                                <span className="text-[#01FFFF] font-mono">{commRate}% Commission</span>
                                            </div>

                                            <div className="flex justify-between text-xs font-mono">
                                                <span className="text-neutral-400">Attributed Wash Revenue (Today):</span>
                                                <span className="font-bold text-white">₹{washRev.toLocaleString()}</span>
                                            </div>

                                            <div className="flex justify-between text-xs font-mono">
                                                <span className="text-[#01FFFF] font-bold">Gross Commission ({commRate}%):</span>
                                                <span className="font-bold text-[#01FFFF]">+ ₹{commEarned.toLocaleString()}</span>
                                            </div>

                                            {baseWage > 0 && (
                                                <div className="flex justify-between text-xs font-mono">
                                                    <span className="text-neutral-400">Base Wage:</span>
                                                    <span className="font-bold text-white">+ ₹{baseWage.toLocaleString()}</span>
                                                </div>
                                            )}

                                            {tips > 0 && (
                                                <div className="flex justify-between text-xs font-mono">
                                                    <span className="text-neutral-400">Tips:</span>
                                                    <span className="font-bold text-white">+ ₹{tips.toLocaleString()}</span>
                                                </div>
                                            )}

                                            <div className="flex justify-between text-xs font-mono border-t border-white/5 pt-1.5">
                                                <span className="text-neutral-300 font-bold">Total Gross Earnings:</span>
                                                <span className="font-bold text-white">₹{grossEarnings.toLocaleString()}</span>
                                            </div>

                                            {previousRetained > 0 && (
                                                <div className="flex justify-between text-xs font-mono bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl">
                                                    <span className="text-amber-300 font-bold flex items-center gap-1">
                                                        📌 Previous Retained Balance (കുടിശ്ശിക):
                                                    </span>
                                                    <span className="font-bold text-amber-300">
                                                        + ₹{previousRetained.toLocaleString()}
                                                    </span>
                                                </div>
                                            )}

                                            {advances > 0 ? (
                                                <div className="flex justify-between text-xs font-mono bg-red-950/20 border border-red-500/20 p-2.5 rounded-xl">
                                                    <span className="text-[#FF2A6D] font-bold flex items-center gap-1">
                                                        🔻 Less Unsettled Advances:
                                                    </span>
                                                    <span className="font-bold text-[#FF2A6D]">
                                                        - ₹{advances.toLocaleString()}
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="flex justify-between text-xs font-mono text-neutral-500">
                                                    <span>Unsettled Advances:</span>
                                                    <span>₹0</span>
                                                </div>
                                            )}

                                            {/* CASH CUSTODY NOTICE IF STAFF HOLDS CASH */}
                                            {(settlePreview.data?.cash_in_hand > 0 || selectedWorkerToPay.cash_in_hand > 0) && (
                                                <div className="bg-amber-950/20 border border-amber-500/30 p-2.5 rounded-xl flex items-start gap-2 text-xs text-amber-200 mt-2">
                                                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                                    <div className="text-[11px] font-mono">
                                                        Worker currently holds <span className="text-amber-300 font-bold">₹{(settlePreview.data?.cash_in_hand ?? selectedWorkerToPay.cash_in_hand).toLocaleString()}</span> in customer cash. Confirm cash handover when possible.
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <form onSubmit={(e) => {
                                        e.preventDefault();
                                        const staffIdToSettle = targetStaffId || resolveStaffProfileUUID(selectedWorkerToPay) || selectedWorkerToPay.id;
                                        settleWorkerPay(staffIdToSettle, payingAmount, payForm.paymentMethod, payForm.notes);
                                        setSelectedWorkerToPay(null);
                                        setPayForm({ customAmount: '', paymentMethod: 'CASH', notes: '' });
                                    }} className="space-y-4">
                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="font-grotesk text-[10px] uppercase tracking-[0.2em] text-[#8E939B] font-bold">
                                                    Amount Paying Today (₹) *
                                                </label>
                                                <div className="flex gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => setPayForm({ ...payForm, customAmount: String(totalDue) })}
                                                        className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30"
                                                    >
                                                        Pay Full (₹{totalDue})
                                                    </button>
                                                    {totalDue > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setPayForm({ ...payForm, customAmount: String(Math.round(totalDue / 2)) })}
                                                            className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30"
                                                        >
                                                            Pay Half (₹{Math.round(totalDue / 2)})
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => setPayForm({ ...payForm, customAmount: '0' })}
                                                        className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white/5 text-neutral-400 border border-white/10 hover:border-white/20"
                                                    >
                                                        Hold All (₹0)
                                                    </button>
                                                </div>
                                            </div>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={payForm.customAmount}
                                                onChange={(e) => setPayForm({ ...payForm, customAmount: e.target.value })}
                                                placeholder={`Total Due (₹${totalDue})`}
                                                className="w-full bg-white/5 border border-white/10 py-3 px-4 rounded-xl text-white font-mono text-base font-bold focus:outline-none focus:border-[#01FFFF] transition-all"
                                            />
                                        </div>

                                        {/* LIVE WAGE RETENTION / WITHHOLDING BALANCE BANNER */}
                                        {remainingToHold > 0 ? (
                                            <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-2xl space-y-1 animate-[fadeIn_0.2s_ease-out]">
                                                <div className="flex items-center justify-between text-xs font-mono font-bold text-amber-300">
                                                    <span>Remaining Balance to Hold:</span>
                                                    <span className="text-base font-syncopate">₹{remainingToHold.toLocaleString()}</span>
                                                </div>
                                                <p className="text-[11px] text-neutral-300 font-mono">
                                                    ⚠️ ₹{remainingToHold.toLocaleString()} will roll over into {selectedWorkerToPay.name}'s retained balance (ബാക്കി കുടിശ്ശിക) as shop debt.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-2xl flex items-center gap-2 text-xs font-mono text-emerald-400">
                                                <CheckCircle className="w-4 h-4 shrink-0" />
                                                <span>Full Settlement. Zero balance will be retained.</span>
                                            </div>
                                        )}

                                        <div>
                                            <label className="font-grotesk text-[10px] uppercase tracking-[0.2em] text-[#8E939B] font-bold block mb-1">
                                                Payment Method *
                                            </label>
                                            <select
                                                value={payForm.paymentMethod}
                                                onChange={(e) => setPayForm({ ...payForm, paymentMethod: e.target.value })}
                                                className="w-full bg-[#141518] border border-white/10 py-3 px-4 rounded-xl text-white text-sm focus:outline-none focus:border-[#01FFFF] transition-all cursor-pointer"
                                            >
                                                <option value="CASH">Cash</option>
                                                <option value="UPI">UPI Transfer</option>
                                                <option value="BANK_TRANSFER">Bank Transfer</option>
                                                <option value="CHEQUE">Cheque</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="font-grotesk text-[10px] uppercase tracking-[0.2em] text-[#8E939B] font-bold block mb-1">
                                                Notes / Settlement Reference
                                            </label>
                                            <input
                                                type="text"
                                                value={payForm.notes}
                                                onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                                                placeholder="e.g. Daily settlement with percentage commission & advance deduction"
                                                className="w-full bg-white/5 border border-white/10 py-3 px-4 rounded-xl text-white text-sm focus:outline-none focus:border-[#01FFFF] transition-all"
                                            />
                                        </div>

                                        <div className="flex gap-3 pt-3">
                                            <button
                                                type="button"
                                                onClick={() => setSelectedWorkerToPay(null)}
                                                className="flex-1 py-3.5 border border-white/20 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                className="flex-1 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-syncopate font-bold text-xs uppercase tracking-widest rounded-xl hover:opacity-90 transition shadow-[0_0_20px_rgba(16,185,129,0.4)] flex items-center justify-center gap-1.5"
                                            >
                                                <CheckCircle className="w-4 h-4" /> PAY &amp; SETTLE (₹{payingAmount.toLocaleString()})
                                            </button>
                                        </div>
                                    </form>
                                </>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* QUICK COMMISSION RATE EDITING MODAL */}
            {editingCommissionStaff && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center animate-[fadeIn_0.2s_ease-out] p-4">
                    <div className="bg-[#141518] border border-white/10 p-6 rounded-3xl w-full max-w-sm shadow-[0_0_50px_rgba(0,0,0,0.8)]">
                        <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/10">
                            <div className="flex items-center gap-2">
                                <Percent className="w-5 h-5 text-[#01FFFF]" />
                                <h3 className="font-syncopate font-bold tracking-wider text-white text-sm">SET COMMISSION RATE</h3>
                            </div>
                            <button 
                                onClick={() => setEditingCommissionStaff(null)} 
                                className="text-[#8E939B] hover:text-white transition-colors p-1"
                            >
                                <PlusCircle className="w-5 h-5 rotate-45" />
                            </button>
                        </div>
                        <p className="text-xs text-neutral-300 font-mono mb-4">
                            Worker: <span className="text-white font-bold">{editingCommissionStaff.name || editingCommissionStaff.first_name}</span>
                        </p>
                        <div className="space-y-4">
                            <div>
                                <label className="font-grotesk text-[10px] uppercase tracking-[0.2em] text-[#8E939B] font-bold block mb-1">
                                    Commission Percentage (%) *
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.5"
                                        value={quickCommissionRate}
                                        onChange={(e) => setQuickCommissionRate(e.target.value)}
                                        placeholder="e.g. 45"
                                        className="w-full bg-white/5 border border-white/10 py-3 px-4 rounded-xl text-white font-mono text-base font-bold focus:outline-none focus:border-[#01FFFF] transition-all pr-10"
                                        autoFocus
                                    />
                                    <span className="absolute right-4 top-3.5 text-neutral-400 font-mono font-bold">%</span>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                {[35, 40, 45, 50].map((preset) => (
                                    <button
                                        key={preset}
                                        type="button"
                                        onClick={() => setQuickCommissionRate(String(preset))}
                                        className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold border transition ${
                                            quickCommissionRate === String(preset)
                                                ? 'bg-[#01FFFF]/20 text-[#01FFFF] border-[#01FFFF]/50'
                                                : 'bg-white/5 text-neutral-400 border-white/10 hover:border-white/30'
                                        }`}
                                    >
                                        {preset}%
                                    </button>
                                ))}
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingCommissionStaff(null)}
                                    className="flex-1 py-2.5 border border-white/20 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={isSavingCommission}
                                    onClick={handleQuickCommissionSave}
                                    className="flex-1 py-2.5 bg-[#01FFFF] text-black font-syncopate font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-white transition disabled:opacity-50"
                                >
                                    {isSavingCommission ? 'Saving...' : 'Save Rate'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

'use client';

import React from 'react';
import { PlusCircle, Wallet, UserCog, CheckCircle, BadgeDollarSign, Pencil, UserMinus } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';
import { ResponsiveDataContainer } from '../ResponsiveDataContainer';

export default function StaffTab() {
    const { uiState, staffState, financeState } = useDashboard();
    const { staffSubTab, setStaffSubTab, isAdvanceModalOpen, setIsAdvanceModalOpen, openStaffModal } = uiState;
    const { totalDailyPayout } = financeState;
    const { 
        payrollData = [], staffDirectory = [], editingStaff, staffForm, advanceForm, setStaffForm, setAdvanceForm,
        staffStatusFilter, setStaffStatusFilter, staffSearchQuery, setStaffSearchQuery,
        saveStaff, terminateStaff, toggleStaffStatus, settleWorkerPay, handleAddAdvance
    } = staffState;

    const [selectedWorkerToPay, setSelectedWorkerToPay] = React.useState<any>(null);
    const [payForm, setPayForm] = React.useState({ customAmount: '', paymentMethod: 'CASH', notes: '' });

    const roleColors: Record<string, string> = {
        MANAGER: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
        TECHNICIAN: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        WASHER: 'bg-[#01FFFF]/15 text-[#01FFFF] border-[#01FFFF]/30',
        DRIVER: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    };

    const payrollColumns = [
        {
            header: 'Worker Info',
            accessor: (worker: any) => (
                <div>
                    <p className="font-bold text-white text-sm sm:text-base">{worker.name}</p>
                    <p className="text-[10px] text-[#8E939B] uppercase tracking-widest mt-0.5">{worker.role}</p>
                </div>
            ),
            mobilePrimary: true
        },
        {
            header: 'Jobs Done',
            accessor: (worker: any) => (
                <span className="bg-white/10 text-white px-3 py-1 rounded-full text-xs font-bold font-mono">
                    {worker.jobs_completed} Jobs
                </span>
            ),
            mobileSecondary: true
        },
        {
            header: 'Status',
            accessor: (worker: any) => (
                worker.status === 'Paid' ? (
                    <span className="inline-flex items-center gap-1 text-[9px] bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded uppercase tracking-widest font-bold border border-emerald-500/30">
                        <CheckCircle className="w-3 h-3" /> Settled
                    </span>
                ) : (
                    <button
                        onClick={() => setSelectedWorkerToPay(worker)}
                        className="inline-flex items-center gap-1 text-[10px] bg-[#01FFFF] text-black hover:bg-white transition-colors px-3 py-1.5 rounded uppercase tracking-widest font-bold shadow-[0_0_12px_rgba(1,255,255,0.3)] min-h-[36px] active:scale-95 touch-manipulation"
                    >
                        <BadgeDollarSign className="w-3 h-3" /> Pay Salary
                    </button>
                )
            ),
            mobileBadge: true
        },
        {
            header: 'Base Wage',
            accessor: (worker: any) => <span className="font-mono text-gray-400">₹{worker.base_salary}</span>
        },
        {
            header: 'Commissions',
            accessor: (worker: any) => <span className="font-mono font-bold text-[#01FFFF]">₹{worker.commission_earned}</span>
        },
        {
            header: 'Advances',
            accessor: (worker: any) => <span className="font-mono font-bold text-[#FF2A6D]">₹{worker.advances}</span>
        },
        {
            header: 'Final Payout',
            accessor: (worker: any) => <span className="font-syncopate font-bold text-base text-emerald-400">₹{worker.final_payout}</span>
        },
        {
            header: 'Pending Balance',
            accessor: (worker: any) => {
                const due = parseFloat(worker.pending_balance ?? worker.due_amount ?? 0);
                return (
                    <span className={`font-mono font-bold text-xs px-2.5 py-1 rounded-md border ${
                        due > 0 
                        ? 'bg-red-500/20 text-[#FF2A6D] border-red-500/30' 
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}>
                        ₹{due.toLocaleString()}
                    </span>
                );
            }
        }
    ];

    const directoryColumns = [
        {
            header: 'Name',
            accessor: (staff: any) => (
                <div>
                    <p className="font-bold text-white text-sm">{staff.first_name || staff.name || staff.username}</p>
                    <p className="text-[10px] font-mono text-[#8E939B]">{staff.phone_number || staff.phone || staff.username}</p>
                </div>
            ),
            mobilePrimary: true
        },
        {
            header: 'Role',
            accessor: (staff: any) => (
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${roleColors[staff.role] || 'bg-white/10 text-white'}`}>
                    {staff.role}
                </span>
            ),
            mobileSecondary: true
        },
        {
            header: 'Status',
            accessor: (staff: any) => (
                <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${staff.is_active ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                    {staff.is_active ? 'ACTIVE' : 'INACTIVE'}
                </span>
            ),
            mobileBadge: true
        },
        {
            header: 'Salary Type',
            accessor: (staff: any) => <span className="text-xs font-mono uppercase text-neutral-300">{staff.salary_type || 'COMMISSION'}</span>
        },
        {
            header: 'Amount',
            accessor: (staff: any) => <span className="text-xs font-mono font-bold text-white">₹{staff.salary_amount ?? staff.base_salary ?? 0}</span>
        },
        {
            header: 'Comm %',
            accessor: (staff: any) => <span className="text-xs font-mono text-[#01FFFF]">{staff.commission_rate ?? 0}%</span>
        },
        {
            header: 'Pending Balance',
            accessor: (staff: any) => {
                const due = parseFloat(staff.pending_balance ?? staff.due_amount ?? 0);
                return (
                    <span className={`font-mono font-bold text-xs px-2.5 py-1 rounded-md border ${
                        due > 0 
                        ? 'bg-red-500/20 text-[#FF2A6D] border-red-500/30' 
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}>
                        ₹{due.toLocaleString()}
                    </span>
                );
            }
        }
    ];

    return (
        <div className="animate-[fadeIn_0.5s_ease-out] space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h3 className="font-syncopate font-bold tracking-widest text-lg sm:text-xl text-white">STAFF OPERATIONS</h3>
                    <p className="text-xs text-neutral-400 font-mono tracking-wider">Payroll calculations & directory control</p>
                </div>
                <div className="flex items-center gap-2 bg-[#0a0a0d] border border-white/10 rounded-2xl p-1 shadow-[4px_4px_10px_#020203,-4px_-4px_10px_#14151a]">
                    <button
                        onClick={() => setStaffSubTab('payroll')}
                        className={`min-h-[44px] px-4 sm:px-5 py-2 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all touch-manipulation ${staffSubTab === 'payroll' ? 'bg-[#01FFFF]/10 text-[#01FFFF] border border-[#01FFFF]/30' : 'text-[#8E939B] hover:text-white'}`}
                    >
                        Payroll Ledger
                    </button>
                    <button
                        onClick={() => setStaffSubTab('directory')}
                        className={`min-h-[44px] px-4 sm:px-5 py-2 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all touch-manipulation ${staffSubTab === 'directory' ? 'bg-[#01FFFF]/10 text-[#01FFFF] border border-[#01FFFF]/30' : 'text-[#8E939B] hover:text-white'}`}
                    >
                        Staff Directory
                    </button>
                </div>
            </div>

            {/* PAYROLL SUB-TAB */}
            {staffSubTab === 'payroll' && (
                <>
                    <button 
                        onClick={() => setIsAdvanceModalOpen(true)} 
                        className="flex items-center justify-center gap-2 bg-[#0a0a0d] text-white border border-white/15 px-6 py-3.5 rounded-2xl font-bold text-xs uppercase tracking-widest hover:border-[#01FFFF] transition shadow-[4px_4px_10px_#020203,-4px_-4px_10px_#14151a] min-h-[48px] w-full sm:w-auto touch-manipulation"
                    >
                        <PlusCircle className="w-4 h-4 text-[#01FFFF]" /> Add Expense/Advance
                    </button>

                    <div className="bg-[#0a0a0d] border border-emerald-500/30 p-5 sm:p-6 rounded-3xl mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-[4px_4px_12px_#020203,-4px_-4px_12px_#14151a]">
                        <div>
                            <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-1 flex items-center gap-2">
                                <Wallet className="w-4 h-4" /> Total Daily Payout
                            </p>
                            <h2 className="text-3xl sm:text-4xl font-syncopate font-bold text-white tracking-tighter">₹{totalDailyPayout?.toLocaleString() || 0}</h2>
                        </div>
                        <div className="text-left sm:text-right text-[11px] font-mono text-neutral-400">
                            <p>[Base] + [Commission] - [Advances] = Payout</p>
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
                                    onClick={() => openStaffModal(staff)}
                                    className="min-h-[40px] px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-[#01FFFF] hover:bg-white/10 transition-colors active:scale-95 touch-manipulation"
                                >
                                    Edit
                                </button>
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

            {/* SALARY ADVANCE MODAL */}
            {isAdvanceModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center animate-[fadeIn_0.2s_ease-out] px-4">
                    <div className="bg-[#141518] border border-white/10 p-5 sm:p-8 rounded-3xl sm:rounded-[2.5rem] w-full max-w-md max-h-[90vh] overflow-y-auto shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-syncopate font-bold tracking-widest text-[#01FFFF] text-base sm:text-lg">ADD SALARY ADVANCE</h3>
                            <button onClick={() => setIsAdvanceModalOpen(false)} className="text-[#8E939B] hover:text-white transition-colors">
                                <PlusCircle className="w-6 h-6 rotate-45" />
                            </button>
                        </div>

                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="font-grotesk text-[10px] uppercase tracking-[0.2em] text-[#8E939B] font-bold ml-2">Select Staff Member</label>
                                <select
                                    value={advanceForm?.staff_id || ''}
                                    onChange={(e) => setAdvanceForm && setAdvanceForm({ ...advanceForm, staff_id: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 py-3.5 sm:py-4 px-4 sm:px-6 rounded-xl text-white text-base sm:text-sm focus:outline-none focus:border-[#01FFFF] focus:ring-1 focus:ring-[#01FFFF] transition-all mt-2 appearance-none"
                                >
                                    <option value="" className="bg-[#141518]">-- Select Staff --</option>
                                    {staffDirectory.map((staff: any) => (
                                        <option key={staff.id} value={staff.id} className="bg-[#141518]">{staff.name} ({staff.role})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="font-grotesk text-[10px] uppercase tracking-[0.2em] text-[#8E939B] font-bold ml-2">Advance Amount (₹)</label>
                                <input
                                    type="number"
                                    value={advanceForm?.amount || ''}
                                    onChange={(e) => setAdvanceForm && setAdvanceForm({ ...advanceForm, amount: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 py-3.5 sm:py-4 px-4 sm:px-6 rounded-xl text-white text-base sm:text-sm focus:outline-none focus:border-[#01FFFF] focus:ring-1 focus:ring-[#01FFFF] transition-all mt-2"
                                    placeholder="e.g. 500"
                                />
                            </div>

                            <div>
                                <label className="font-grotesk text-[10px] uppercase tracking-[0.2em] text-[#8E939B] font-bold ml-2">Notes / Description</label>
                                <input
                                    type="text"
                                    value={advanceForm?.description || ''}
                                    onChange={(e) => setAdvanceForm && setAdvanceForm({ ...advanceForm, description: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 py-3.5 sm:py-4 px-4 sm:px-6 rounded-xl text-white text-base sm:text-sm focus:outline-none focus:border-[#01FFFF] focus:ring-1 focus:ring-[#01FFFF] transition-all mt-2"
                                    placeholder="e.g. Personal advance"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleAddAdvance}
                            className="w-full bg-[#01FFFF] text-black font-syncopate font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(1,255,255,0.4)] hover:bg-white transition-all flex items-center justify-center gap-2 min-h-[48px] touch-manipulation"
                        >
                            <PlusCircle className="w-5 h-5" /> CONFIRM ADVANCE
                        </button>
                    </div>
                </div>
            )}

            {/* SALARY PAYOUT / PARTIAL PAYMENT MODAL */}
            {selectedWorkerToPay && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center animate-[fadeIn_0.2s_ease-out] p-4">
                    <div className="bg-[#141518] border border-white/10 p-6 sm:p-8 rounded-3xl w-full max-w-lg shadow-[0_0_50px_rgba(0,0,0,0.8)]">
                        <div className="flex justify-between items-center mb-6 pb-3 border-b border-white/10">
                            <div>
                                <h3 className="font-syncopate font-bold tracking-widest text-[#01FFFF] text-base sm:text-lg">
                                    RECORD SALARY PAYOUT
                                </h3>
                                <p className="text-xs text-neutral-400 font-mono mt-0.5">
                                    Worker: <span className="text-white font-bold">{selectedWorkerToPay.name || selectedWorkerToPay.first_name || selectedWorkerToPay.username}</span>
                                </p>
                            </div>
                            <button 
                                onClick={() => setSelectedWorkerToPay(null)} 
                                className="text-[#8E939B] hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
                            >
                                <PlusCircle className="w-6 h-6 rotate-45" />
                            </button>
                        </div>

                        {/* Calculations Card */}
                        <div className="bg-black/50 border border-white/10 p-4 rounded-2xl space-y-2 mb-6">
                            <div className="flex justify-between text-xs font-mono">
                                <span className="text-neutral-400">Total Calculated Owed:</span>
                                <span className="font-bold text-white">₹{(selectedWorkerToPay.final_payout ?? selectedWorkerToPay.pending_balance ?? selectedWorkerToPay.due_amount ?? 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-xs font-mono">
                                <span className="text-neutral-400">Paying Amount Now:</span>
                                <span className="font-bold text-[#01FFFF]">₹{(payForm.customAmount ? parseFloat(payForm.customAmount) : (selectedWorkerToPay.final_payout ?? selectedWorkerToPay.pending_balance ?? 0)).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-xs font-mono pt-2 border-t border-white/10">
                                <span className="text-neutral-400 font-bold uppercase">Pending Balance / Amount Due:</span>
                                {(() => {
                                    const total = parseFloat(selectedWorkerToPay.final_payout ?? selectedWorkerToPay.pending_balance ?? 0);
                                    const paying = payForm.customAmount ? parseFloat(payForm.customAmount) : total;
                                    const remaining = Math.max(total - paying, 0);
                                    return (
                                        <span className={`font-bold font-syncopate text-sm ${remaining > 0 ? 'text-[#FF2A6D]' : 'text-emerald-400'}`}>
                                            ₹{remaining.toLocaleString()} {remaining > 0 ? '(PARTIAL DUE)' : '(SETTLED)'}
                                        </span>
                                    );
                                })()}
                            </div>
                        </div>

                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const total = parseFloat(selectedWorkerToPay.final_payout ?? selectedWorkerToPay.pending_balance ?? 0);
                            const payingAmount = payForm.customAmount !== '' ? parseFloat(payForm.customAmount) : total;
                            settleWorkerPay(selectedWorkerToPay.id, payingAmount, payForm.paymentMethod, payForm.notes);
                            setSelectedWorkerToPay(null);
                            setPayForm({ customAmount: '', paymentMethod: 'CASH', notes: '' });
                        }} className="space-y-4">
                            <div>
                                <label className="font-grotesk text-[10px] uppercase tracking-[0.2em] text-[#8E939B] font-bold block mb-1">
                                    Payout Amount (₹) — Leave blank for full amount
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={payForm.customAmount}
                                    onChange={(e) => setPayForm({ ...payForm, customAmount: e.target.value })}
                                    placeholder={`Full Amount (₹${(selectedWorkerToPay.final_payout ?? selectedWorkerToPay.pending_balance ?? 0)})`}
                                    className="w-full bg-white/5 border border-white/10 py-3 px-4 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-[#01FFFF] transition-all"
                                />
                            </div>

                            <div>
                                <label className="font-grotesk text-[10px] uppercase tracking-[0.2em] text-[#8E939B] font-bold block mb-1">
                                    Payment Method
                                </label>
                                <select
                                    value={payForm.paymentMethod}
                                    onChange={(e) => setPayForm({ ...payForm, paymentMethod: e.target.value })}
                                    className="w-full bg-[#141518] border border-white/10 py-3 px-4 rounded-xl text-white text-sm focus:outline-none focus:border-[#01FFFF] transition-all"
                                >
                                    <option value="CASH">Cash</option>
                                    <option value="UPI">UPI Transfer</option>
                                    <option value="BANK_TRANSFER">Bank Transfer</option>
                                    <option value="CHEQUE">Cheque</option>
                                </select>
                            </div>

                            <div>
                                <label className="font-grotesk text-[10px] uppercase tracking-[0.2em] text-[#8E939B] font-bold block mb-1">
                                    Notes / Reference No.
                                </label>
                                <input
                                    type="text"
                                    value={payForm.notes}
                                    onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                                    placeholder="e.g. Partial weekly payout via UPI"
                                    className="w-full bg-white/5 border border-white/10 py-3 px-4 rounded-xl text-white text-sm focus:outline-none focus:border-[#01FFFF] transition-all"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setSelectedWorkerToPay(null)}
                                    className="flex-1 py-3.5 border border-white/20 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-syncopate font-bold text-xs uppercase tracking-widest rounded-xl hover:opacity-90 transition shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                                >
                                    CONFIRM PAYOUT
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

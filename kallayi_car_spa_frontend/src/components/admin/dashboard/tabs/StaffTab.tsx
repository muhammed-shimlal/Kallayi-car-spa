'use client';

import React from 'react';
import { PlusCircle, Wallet, UserCog, CheckCircle, BadgeDollarSign, Pencil, UserMinus } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';

export default function StaffTab() {
    const { uiState, staffState, financeState } = useDashboard();
    const { staffSubTab, setStaffSubTab, isAdvanceModalOpen, setIsAdvanceModalOpen, openStaffModal } = uiState;
    const { totalDailyPayout } = financeState;
    const { 
        payrollData, staffDirectory, editingStaff, staffForm, advanceForm, setStaffForm, setAdvanceForm,
        saveStaff, terminateStaff, settleWorkerPay, handleAddAdvance
    } = staffState;

    return (
        <div className="animate-[fadeIn_0.5s_ease-out]">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                            <h3 className="font-syncopate font-bold tracking-widest text-xl">STAFF OPERATIONS</h3>
                            <div className="flex items-center gap-2 bg-[#141518]/60 border border-white/10 rounded-full p-1">
                                <button
                                    onClick={() => setStaffSubTab('payroll')}
                                    className={`px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${staffSubTab === 'payroll' ? 'bg-white/10 text-[#01FFFF]' : 'text-[#8E939B] hover:text-white'}`}
                                >
                                    Payroll Ledger
                                </button>
                                <button
                                    onClick={() => setStaffSubTab('directory')}
                                    className={`px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${staffSubTab === 'directory' ? 'bg-white/10 text-[#01FFFF]' : 'text-[#8E939B] hover:text-white'}`}
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
                            className="flex items-center gap-2 bg-white/10 text-white border border-white/20 px-6 py-3 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-white hover:text-black transition mb-6"
                        >
                            <PlusCircle className="w-4 h-4" /> Add Expense/Advance
                        </button>

                        <div className="bg-emerald-900/10 border border-emerald-500/30 p-6 rounded-3xl mb-8 flex justify-between items-center">
                            <div>
                                <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-1 flex items-center gap-2"><Wallet className="w-4 h-4" /> Total Daily Payout</p>
                                <h2 className="text-4xl font-syncopate font-bold text-white tracking-tighter">₹{totalDailyPayout.toLocaleString()}</h2>
                            </div>
                            <div className="text-right hidden sm:block">
                                <p className="text-[#8E939B] text-xs">Calculated via Time-Stamped Rate Locking.</p>
                                <p className="text-[#8E939B] text-xs">[Base] + [Commission] - [Advances] = Payout</p>
                            </div>
                        </div>

                        <div className="bg-[#141518]/60 border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                            <div className="p-6 border-b border-white/5 flex gap-2 items-center">
                                <UserCog className="w-5 h-5 text-[#8E939B]" />
                                <h4 className="font-bold text-sm uppercase tracking-widest text-[#8E939B]">Staff Payroll Ledger (Today)</h4>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-black/40 text-[#8E939B] font-grotesk text-[10px] uppercase tracking-widest">
                                        <tr>
                                            <th className="p-4 pl-6">Worker Info</th>
                                            <th className="p-4 text-center">Jobs Done</th>
                                            <th className="p-4 text-right">Base Salary</th>
                                            <th className="p-4 text-right text-[#01FFFF]">+ Commissions</th>
                                            <th className="p-4 text-right text-[#FF2A6D]">- Advances</th>
                                            <th className="p-4 text-right text-white">Final Payout</th>
                                            <th className="p-4 text-right pr-6">Settle</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {payrollData.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="p-8 text-center text-[#8E939B]">No active staff records today.</td>
                                            </tr>
                                        ) : payrollData.map((worker: any) => (
                                            <tr key={worker.id} className="hover:bg-white/5 transition-colors group">
                                                <td className="p-4 pl-6">
                                                    <p className="font-bold text-white text-base">{worker.name}</p>
                                                    <p className="text-[10px] text-[#8E939B] uppercase tracking-widest mt-1">{worker.role}</p>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className="bg-white/10 text-white px-3 py-1 rounded-full text-xs font-bold font-mono">{worker.jobs_completed}</span>
                                                </td>
                                                <td className="p-4 text-right font-mono text-gray-400">₹{worker.base_salary}</td>
                                                <td className="p-4 text-right font-mono font-bold text-[#01FFFF]">₹{worker.commission_earned}</td>
                                                <td className="p-4 text-right font-mono font-bold text-[#FF2A6D]">₹{worker.advances}</td>
                                                <td className="p-4 text-right font-syncopate font-bold text-lg text-emerald-400 group-hover:scale-110 transition-transform origin-right">
                                                    ₹{worker.final_payout}
                                                </td>
                                                <td className="p-4 text-right pr-6">
                                                    {worker.status === 'Paid' ? (
                                                        <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-sm uppercase tracking-widest font-bold">
                                                            <CheckCircle className="w-3 h-3" /> Settled
                                                        </span>
                                                    ) : (
                                                        <button
                                                            onClick={() => settleWorkerPay(worker.id)}
                                                            className="inline-flex items-center gap-1 text-[10px] bg-[#01FFFF] text-black hover:bg-white transition-colors px-4 py-1.5 rounded-sm uppercase tracking-widest font-bold shadow-[0_0_15px_rgba(1,255,255,0.3)]"
                                                        >
                                                            <BadgeDollarSign className="w-3 h-3" /> Pay Cash
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                            </>
                        )}

                        {/* DIRECTORY SUB-TAB */}
                        {staffSubTab === 'directory' && (
                            <>
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                                    <div>
                                        <h2 className="font-syncopate font-bold text-lg tracking-widest">STAFF DIRECTORY<span className="text-[#01FFFF]">.</span></h2>
                                        <p className="text-[10px] text-[#8E939B] uppercase tracking-[0.25em] font-bold mt-1">Hire, Edit & Manage Workers</p>
                                    </div>
                                    <button
                                        onClick={() => openStaffModal()}
                                        className="bg-[#01FFFF] text-black font-syncopate font-bold text-xs tracking-widest px-6 py-3 rounded-xl flex items-center gap-2 shadow-[0_0_20px_rgba(1,255,255,0.3)] hover:bg-white transition-all active:scale-95"
                                    >
                                        <PlusCircle className="w-4 h-4" /> REGISTER NEW STAFF
                                    </button>
                                </div>

                                <div className="bg-[#141518]/60 backdrop-blur-xl rounded-[2rem] border border-white/5 overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-white/10">
                                                    <th className="text-left px-6 py-4 text-[9px] font-bold uppercase tracking-[0.2em] text-[#8E939B]">Name</th>
                                                    <th className="text-center px-6 py-4 text-[9px] font-bold uppercase tracking-[0.2em] text-[#8E939B]">Role</th>
                                                    <th className="text-left px-6 py-4 text-[9px] font-bold uppercase tracking-[0.2em] text-[#8E939B] hidden md:table-cell">Phone</th>
                                                    <th className="text-right px-6 py-4 text-[9px] font-bold uppercase tracking-[0.2em] text-[#8E939B]">Base Salary (₹)</th>
                                                    <th className="text-right px-6 py-4 text-[9px] font-bold uppercase tracking-[0.2em] text-[#8E939B]">Commission %</th>
                                                    <th className="text-center px-6 py-4 text-[9px] font-bold uppercase tracking-[0.2em] text-[#8E939B]">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {staffDirectory.length === 0 && (
                                                    <tr><td colSpan={5} className="text-center py-12 text-[#8E939B] text-sm">No staff registered yet.</td></tr>
                                                )}
                                                {staffDirectory.map((staff: any) => {
                                                    const roleColors: Record<string, string> = {
                                                        MANAGER: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
                                                        TECHNICIAN: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
                                                        WASHER: 'bg-[#01FFFF]/15 text-[#01FFFF] border-[#01FFFF]/30',
                                                        DRIVER: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
                                                    };
                                                    return (
                                                        <tr key={staff.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                                                            <td className="px-6 py-5">
                                                                <p className="font-bold text-sm text-white">{staff.first_name}</p>
                                                                <p className="text-[10px] text-[#8E939B] mt-0.5">@{staff.username}</p>
                                                            </td>
                                                            <td className="px-6 py-5 text-center">
                                                                <span className={`text-[9px] font-bold uppercase tracking-[0.15em] px-3 py-1 rounded-full border ${roleColors[staff.role] || 'bg-white/10 text-white border-white/20'}`}>
                                                                    {staff.role}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-5 hidden md:table-cell">
                                                                <span className="text-xs text-[#8E939B]">{staff.phone_number || '—'}</span>
                                                            </td>
                                                            <td className="px-6 py-5 text-right">
                                                                <span className="font-syncopate font-bold text-emerald-400">₹{parseFloat(staff.base_salary).toLocaleString()}</span>
                                                            </td>
                                                            <td className="px-6 py-5 text-right">
                                                                <span className="font-mono text-amber-400 font-bold">{parseFloat(staff.commission_rate || 0)}%</span>
                                                            </td>
                                                            <td className="px-6 py-5">
                                                                <div className="flex items-center justify-center gap-2">
                                                                    <button
                                                                        onClick={() => openStaffModal(staff)}
                                                                        className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#8E939B] hover:text-[#01FFFF] hover:border-[#01FFFF]/30 transition-all"
                                                                        title="Edit"
                                                                    >
                                                                        <Pencil className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => terminateStaff(staff.id)}
                                                                        className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#8E939B] hover:text-[#FF2A6D] hover:border-[#FF2A6D]/30 transition-all"
                                                                        title="Terminate"
                                                                    >
                                                                        <UserMinus className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </>
                        )}
                        {/* RECORD CASH ADVANCE MODAL */}
                        {isAdvanceModalOpen && (
                            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center animate-[fadeIn_0.2s_ease-out] px-4">
                                <div className="bg-[#141518] border border-white/10 p-8 rounded-[2.5rem] w-full max-w-md shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="font-syncopate font-bold tracking-widest text-[#01FFFF]">RECORD CASH ADVANCE</h3>
                                        <button onClick={() => setIsAdvanceModalOpen(false)} className="text-[#8E939B] hover:text-white transition-colors">
                                            <PlusCircle className="w-6 h-6 rotate-45" />
                                        </button>
                                    </div>

                                    <div className="space-y-4 mb-8">
                                        <div>
                                            <label className="font-grotesk text-[10px] uppercase tracking-[0.2em] text-[#8E939B] font-bold ml-2">Select Staff Member</label>
                                            <select
                                                value={advanceForm.staff_id}
                                                onChange={(e) => setAdvanceForm({ ...advanceForm, staff_id: e.target.value })}
                                                className="w-full bg-white/5 border border-white/10 py-4 px-6 rounded-xl text-white focus:outline-none focus:border-[#01FFFF] focus:ring-1 focus:ring-[#01FFFF] transition-all mt-2 appearance-none"
                                            >
                                                <option value="" className="bg-[#141518]">-- Select Worker --</option>
                                                {payrollData.map((worker: any) => (
                                                    <option key={worker.id} value={worker.id} className="bg-[#141518]">{worker.name} ({worker.role})</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="font-grotesk text-[10px] uppercase tracking-[0.2em] text-[#8E939B] font-bold ml-2">Amount (₹)</label>
                                                <input
                                                    type="number" value={advanceForm.amount}
                                                    onChange={(e) => setAdvanceForm({ ...advanceForm, amount: e.target.value })}
                                                    className="w-full bg-white/5 border border-white/10 py-4 px-6 rounded-xl text-white font-mono focus:outline-none focus:border-[#01FFFF] focus:ring-1 focus:ring-[#01FFFF] transition-all mt-2"
                                                    placeholder="500"
                                                />
                                            </div>
                                            <div>
                                                <label className="font-grotesk text-[10px] uppercase tracking-[0.2em] text-[#8E939B] font-bold ml-2">Description</label>
                                                <input
                                                    type="text" value={advanceForm.description}
                                                    onChange={(e) => setAdvanceForm({ ...advanceForm, description: e.target.value })}
                                                    className="w-full bg-white/5 border border-white/10 py-4 px-6 rounded-xl text-white focus:outline-none focus:border-[#01FFFF] focus:ring-1 focus:ring-[#01FFFF] transition-all mt-2"
                                                    placeholder="Food/Lunch"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleAddAdvance}
                                        className="w-full bg-[#01FFFF] text-black font-syncopate font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(1,255,255,0.4)] hover:bg-white transition-all flex items-center justify-center gap-2"
                                    >
                                        <BadgeDollarSign className="w-5 h-5" /> CONFIRM ADVANCE
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
    );
}

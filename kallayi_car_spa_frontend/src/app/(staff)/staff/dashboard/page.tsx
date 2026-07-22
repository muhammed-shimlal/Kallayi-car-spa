"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  ShieldCheck, DollarSign, Car, Calendar, CreditCard, Clock, 
  UserCheck, Lock, LogOut, CheckCircle2, ChevronRight, Filter, AlertCircle, RefreshCw, Eye
} from "lucide-react";
import api from "@/lib/api";

export default function StaffDashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [earnings, setEarnings] = useState<any>(null);
  const [workPeriod, setWorkPeriod] = useState<string>("today");
  const [workData, setWorkData] = useState<any>(null);
  const [balance, setBalance] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [jobsData, setJobsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAllJobs, setShowAllJobs] = useState(false);

  // Password Modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");
  const [isChangingPass, setIsChangingPass] = useState(false);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [profileRes, earningsRes, workRes, balanceRes, txRes, jobsRes] = await Promise.all([
        api.get("/staff/dashboard/profile/"),
        api.get("/staff/dashboard/earnings/"),
        api.get(`/staff/dashboard/work/?period=${workPeriod}`),
        api.get("/staff/dashboard/balance/"),
        api.get("/staff/dashboard/transactions/"),
        api.get("/staff/dashboard/jobs/"),
      ]);

      setProfile(profileRes.data);
      setEarnings(earningsRes.data);
      setWorkData(workRes.data);
      setBalance(balanceRes.data);
      setTransactions(txRes.data);
      setJobsData(jobsRes.data);
    } catch (err: any) {
      console.error("Error fetching staff dashboard data:", err);
      if (err.response?.status === 401) {
        router.push("/login");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [workPeriod]);

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    router.push("/login");
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg("");
    setIsChangingPass(true);
    try {
      const res = await api.post("/staff/dashboard/change_password/", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPasswordMsg("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setTimeout(() => setShowPasswordModal(false), 1500);
    } catch (err: any) {
      setPasswordMsg(err.response?.data?.error || "Failed to change password");
    } finally {
      setIsChangingPass(false);
    }
  };

  // Time-based Greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  if (isLoading && !profile) {
    return (
      <div className="bg-obsidian min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-cyan border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-mono text-xs text-cyan tracking-widest uppercase">Loading Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-obsidian min-h-screen text-white p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      
      {/* 1. Header & Greeting */}
      <div className="bg-carbon/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan/10 border border-cyan/30 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-cyan" />
            </div>
            <span className="font-grotesk text-xs uppercase text-cyan tracking-[0.2em] font-semibold">
              STAFF PORTAL // {profile?.role || "WASHER"}
            </span>
          </div>
          <h1 className="font-syncopate text-2xl md:text-3xl font-bold tracking-tight">
            {getGreeting()}, <span className="text-cyan">{profile?.full_name}</span>
          </h1>
          <p className="font-mono text-xs text-tungsten/60">
            Username: @{profile?.username} • Phone: {profile?.phone_number || "N/A"}
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => setShowPasswordModal(true)}
            className="flex-1 md:flex-initial px-4 py-2.5 bg-white/5 border border-white/10 hover:border-cyan/50 rounded-xl font-mono text-xs text-tungsten hover:text-white transition-all flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4 text-cyan" /> Password
          </button>
          <button
            onClick={handleLogout}
            className="flex-1 md:flex-initial px-4 py-2.5 bg-[#E52323]/20 border border-[#E52323]/40 hover:bg-[#E52323] rounded-xl font-mono text-xs text-white transition-all flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </div>

      {/* 2. Today's Earnings Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-syncopate text-lg font-bold text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-cyan" /> TODAY'S EARNINGS
          </h2>
          <span className="font-mono text-xs text-tungsten/60">Auto-calculated from completed jobs</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-carbon/40 border border-cyan/30 rounded-2xl p-4 space-y-1 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-cyan/10 rounded-full blur-xl pointer-events-none" />
            <p className="font-grotesk text-[10px] text-cyan uppercase tracking-widest font-bold">Today</p>
            <p className="font-mono text-2xl md:text-3xl font-bold text-white">₹{earnings?.today || 0}</p>
          </div>

          <div className="bg-carbon/40 border border-white/10 rounded-2xl p-4 space-y-1">
            <p className="font-grotesk text-[10px] text-tungsten/60 uppercase tracking-widest font-bold">This Week</p>
            <p className="font-mono text-xl md:text-2xl font-bold text-white">₹{earnings?.week || 0}</p>
          </div>

          <div className="bg-carbon/40 border border-white/10 rounded-2xl p-4 space-y-1">
            <p className="font-grotesk text-[10px] text-tungsten/60 uppercase tracking-widest font-bold">This Month</p>
            <p className="font-mono text-xl md:text-2xl font-bold text-white">₹{earnings?.month || 0}</p>
          </div>

          <div className="bg-carbon/40 border border-white/10 rounded-2xl p-4 space-y-1">
            <p className="font-grotesk text-[10px] text-tungsten/60 uppercase tracking-widest font-bold">This Year</p>
            <p className="font-mono text-xl md:text-2xl font-bold text-white">₹{earnings?.year || 0}</p>
          </div>

          <div className="col-span-2 md:col-span-1 bg-carbon/40 border border-white/10 rounded-2xl p-4 space-y-1">
            <p className="font-grotesk text-[10px] text-tungsten/60 uppercase tracking-widest font-bold">Lifetime Total</p>
            <p className="font-mono text-xl md:text-2xl font-bold text-cyan">₹{earnings?.lifetime || 0}</p>
          </div>
        </div>
      </div>

      {/* 3. Today's Work (Vehicle Counts ONLY) */}
      <div className="bg-carbon/60 border border-white/10 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-syncopate text-lg font-bold text-white flex items-center gap-2">
              <Car className="w-5 h-5 text-cyan" /> TODAY'S WORK
            </h2>
            <p className="font-mono text-xs text-tungsten/60 mt-1">Completed vehicles count by category</p>
          </div>

          {/* Period selector */}
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
            {["today", "week", "month", "year"].map((p) => (
              <button
                key={p}
                onClick={() => setWorkPeriod(p)}
                className={`px-3 py-1.5 rounded-lg font-grotesk text-xs uppercase tracking-wider font-semibold transition-all ${
                  workPeriod === p ? "bg-cyan text-obsidian font-bold" : "text-tungsten hover:text-white"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center space-y-1">
            <span className="font-grotesk text-[10px] text-tungsten/60 uppercase tracking-widest">Cars</span>
            <p className="font-mono text-2xl font-bold text-white">{workData?.counts?.Cars || 0}</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center space-y-1">
            <span className="font-grotesk text-[10px] text-tungsten/60 uppercase tracking-widest">Bikes</span>
            <p className="font-mono text-2xl font-bold text-white">{workData?.counts?.Bikes || 0}</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center space-y-1">
            <span className="font-grotesk text-[10px] text-tungsten/60 uppercase tracking-widest">Auto</span>
            <p className="font-mono text-2xl font-bold text-white">{workData?.counts?.Auto || 0}</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center space-y-1">
            <span className="font-grotesk text-[10px] text-tungsten/60 uppercase tracking-widest">Van</span>
            <p className="font-mono text-2xl font-bold text-white">{workData?.counts?.Van || 0}</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center space-y-1">
            <span className="font-grotesk text-[10px] text-tungsten/60 uppercase tracking-widest">Truck</span>
            <p className="font-mono text-2xl font-bold text-white">{workData?.counts?.Truck || 0}</p>
          </div>

          <div className="bg-cyan/10 border border-cyan/30 rounded-2xl p-4 text-center space-y-1">
            <span className="font-grotesk text-[10px] text-cyan uppercase tracking-widest font-bold">Total Vehicles</span>
            <p className="font-mono text-2xl font-bold text-cyan">{workData?.total_vehicles || 0}</p>
          </div>
        </div>
      </div>

      {/* 4. My Balance Card */}
      <div className="bg-carbon/60 border border-white/10 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="font-syncopate text-lg font-bold text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-cyan" /> MY BALANCE
          </h2>
          <span className="font-mono text-xs text-cyan font-semibold">Payable Statement</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-1">
            <span className="font-grotesk text-[10px] text-tungsten/60 uppercase tracking-widest">Total Earned</span>
            <p className="font-mono text-xl font-bold text-white">₹{balance?.gross_earned || 0}</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-1">
            <span className="font-grotesk text-[10px] text-tungsten/60 uppercase tracking-widest">Advances Taken</span>
            <p className="font-mono text-xl font-bold text-[#E52323]">₹{balance?.advances || 0}</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-1">
            <span className="font-grotesk text-[10px] text-tungsten/60 uppercase tracking-widest">Salary Paid</span>
            <p className="font-mono text-xl font-bold text-white">₹{balance?.salary_paid || 0}</p>
          </div>

          <div className="bg-cyan/10 border border-cyan/40 rounded-2xl p-4 space-y-1">
            <span className="font-grotesk text-[10px] text-cyan uppercase tracking-widest font-bold">Current Payable Balance</span>
            <p className="font-mono text-2xl font-bold text-cyan">₹{balance?.current_payable || 0}</p>
          </div>
        </div>

        {/* Salary Payment History Log */}
        <div className="space-y-3 pt-4 border-t border-white/5">
          <h3 className="font-grotesk text-xs text-tungsten uppercase tracking-widest font-bold">Salary Payment History</h3>
          {balance?.salary_history && balance.salary_history.length > 0 ? (
            <div className="space-y-2">
              {balance.salary_history.map((sp: any) => (
                <div key={sp.id} className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between text-xs font-mono">
                  <div>
                    <span className="text-white font-bold">₹{sp.paid_amount}</span>
                    <span className="text-tungsten/60 ml-2">via {sp.payment_method}</span>
                    <span className="text-tungsten/40 ml-2">({sp.payment_date})</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">PAID</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="font-mono text-xs text-tungsten/40 italic">No salary payment records found.</p>
          )}
        </div>
      </div>

      {/* 5. My Transactions */}
      <div className="bg-carbon/60 border border-white/10 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="font-syncopate text-lg font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan" /> MY TRANSACTIONS
          </h2>
          <span className="font-mono text-xs text-tungsten/60">Advances, Deductions & Bonuses</span>
        </div>

        {transactions && transactions.length > 0 ? (
          <div className="space-y-3">
            {transactions.map((tx: any) => (
              <div key={tx.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full font-grotesk text-[10px] uppercase font-bold tracking-wider ${
                      tx.transaction_type === 'ADVANCE' ? 'bg-[#E52323]/20 text-[#E52323]' :
                      tx.transaction_type === 'BONUS' ? 'bg-emerald-500/20 text-emerald-400' :
                      'bg-white/10 text-white'
                    }`}>
                      {tx.transaction_type || 'TRANSACTION'}
                    </span>
                    <span className="font-mono text-xs text-tungsten/60">{tx.date}</span>
                    <span className="font-mono text-[10px] text-tungsten/40">[{tx.payment_method}]</span>
                  </div>
                  <p className="font-mono text-xs text-tungsten">{tx.description || "No reason provided"}</p>
                </div>

                <div className="text-right flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto">
                  <p className="font-mono text-lg font-bold text-white">₹{tx.amount}</p>
                  <span className={`font-mono text-[10px] uppercase font-bold ${
                    tx.status === 'APPROVED' ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {tx.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-white/5 border border-dashed border-white/10 rounded-2xl">
            <p className="font-mono text-xs text-tungsten/60">No transaction records logged.</p>
          </div>
        )}
      </div>

      {/* 6. Today's Summary & Jobs Log */}
      <div className="bg-carbon/60 border border-white/10 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="font-syncopate text-lg font-bold text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-cyan" /> TODAY'S SUMMARY & JOBS
          </h2>
          <button
            onClick={() => setShowAllJobs(true)}
            className="font-mono text-xs text-cyan hover:underline flex items-center gap-1"
          >
            View All Jobs <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Summary Card */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white/5 border border-white/10 rounded-2xl p-4">
          <div>
            <span className="font-grotesk text-[10px] text-tungsten/60 uppercase tracking-widest">Completed Jobs</span>
            <p className="font-mono text-xl font-bold text-white">{jobsData?.summary?.completed_jobs || 0}</p>
          </div>

          <div>
            <span className="font-grotesk text-[10px] text-tungsten/60 uppercase tracking-widest">Completed Vehicles</span>
            <p className="font-mono text-xl font-bold text-white">{jobsData?.summary?.completed_vehicles || 0}</p>
          </div>

          <div>
            <span className="font-grotesk text-[10px] text-tungsten/60 uppercase tracking-widest">Working Hours</span>
            <p className="font-mono text-xs font-bold text-cyan mt-1">{jobsData?.summary?.working_hours || 'N/A'}</p>
          </div>

          <div>
            <span className="font-grotesk text-[10px] text-tungsten/60 uppercase tracking-widest">Last Completed</span>
            <p className="font-mono text-xs font-bold text-white mt-1">{jobsData?.summary?.last_completed_time || 'None'}</p>
          </div>
        </div>

        {/* Jobs list preview */}
        <div className="space-y-3">
          {jobsData?.jobs && jobsData.jobs.length > 0 ? (
            jobsData.jobs.slice(0, 5).map((job: any) => (
              <div key={job.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-cyan">{job.timestamp}</span>
                    <span className="font-mono text-xs text-white font-bold">{job.vehicle}</span>
                  </div>
                  <p className="font-mono text-xs text-tungsten/60">Customer: {job.customer_name} • Package: {job.service_package}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-lg font-grotesk text-[10px] uppercase font-bold tracking-wider ${
                  job.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-tungsten'
                }`}>
                  {job.status}
                </span>
              </div>
            ))
          ) : (
            <p className="font-mono text-xs text-tungsten/60 italic text-center py-4">No completed jobs assigned today.</p>
          )}
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-carbon border border-white/10 rounded-3xl p-8 max-w-md w-full space-y-6 shadow-2xl relative">
            <h3 className="font-syncopate text-xl font-bold text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-cyan" /> CHANGE PASSWORD
            </h3>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1">
                <label className="font-grotesk text-xs text-tungsten uppercase tracking-wider">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white font-mono text-sm focus:outline-none focus:border-cyan"
                  placeholder="Enter current password..."
                />
              </div>

              <div className="space-y-1">
                <label className="font-grotesk text-xs text-tungsten uppercase tracking-wider">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white font-mono text-sm focus:outline-none focus:border-cyan"
                  placeholder="Enter new password (min 6 chars)..."
                />
              </div>

              {passwordMsg && (
                <p className={`font-mono text-xs text-center font-semibold ${
                  passwordMsg.includes("successfully") ? "text-emerald-400" : "text-[#E52323]"
                }`}>
                  {passwordMsg}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 py-3 rounded-xl font-grotesk text-xs text-white uppercase tracking-wider font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isChangingPass}
                  className="flex-1 bg-cyan text-obsidian font-syncopate font-bold py-3 rounded-xl hover:bg-cyan/80 transition-all text-xs uppercase"
                >
                  {isChangingPass ? "Updating..." : "Save Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View All Jobs Modal */}
      {showAllJobs && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-carbon border border-white/10 rounded-3xl p-8 max-w-2xl w-full space-y-6 shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-syncopate text-xl font-bold text-white">ALL TODAY'S JOBS</h3>
              <button onClick={() => setShowAllJobs(false)} className="text-tungsten hover:text-white font-mono text-sm">Close ✕</button>
            </div>

            <div className="space-y-3">
              {jobsData?.jobs && jobsData.jobs.length > 0 ? (
                jobsData.jobs.map((job: any) => (
                  <div key={job.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-cyan">{job.timestamp}</span>
                        <span className="font-mono text-xs text-white font-bold">{job.vehicle}</span>
                      </div>
                      <p className="font-mono text-xs text-tungsten/60">Customer: {job.customer_name} • Package: {job.service_package}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg font-grotesk text-[10px] uppercase font-bold tracking-wider ${
                      job.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-tungsten'
                    }`}>
                      {job.status}
                    </span>
                  </div>
                ))
              ) : (
                <p className="font-mono text-xs text-tungsten/60 italic text-center py-4">No jobs found.</p>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

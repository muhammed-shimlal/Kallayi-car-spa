"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Wallet,
  Coins,
  Car,
  TrendingUp,
  Phone,
  Lock,
  LogOut,
  RefreshCw,
  ShoppingBag,
  Layers,
  X,
  Eye,
  EyeOff,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import api, {
  fetchStaffDashboardStats,
  changeUserPassword,
  StaffDashboardStatsResponse,
  CompletedVehicleDossier
} from "@/lib/api";
import { toast } from "sonner";
import { handleSignOut } from "@/lib/authClient";

export default function StaffDashboardPage() {
  const router = useRouter();

  // State
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<StaffDashboardStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Security prompt banner
  const [showSecurityBanner, setShowSecurityBanner] = useState(false);

  // Change Password Modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState("");
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Data Loading
  const loadDashboardData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const [userRes, statsData] = await Promise.all([
        api.get("/auth/me").catch(() => null),
        fetchStaffDashboardStats().catch(() => null),
      ]);

      if (userRes?.data?.user) {
        const userData = userRes.data.user;
        setProfile(userData);

        const meta = userData.user_metadata || {};
        const isDefault =
          meta.is_default_password === true ||
          meta.must_change_password === true ||
          Boolean(meta.default_password) ||
          !meta.password_changed_at;

        setShowSecurityBanner(isDefault);
      }

      if (statsData) {
        setStats(statsData);
      }
    } catch (err: any) {
      console.error("[StaffDashboard] Error loading data:", err);
      if (err.response?.status === 401) {
        router.push("/login");
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    loadDashboardData();

    // Auto-refresh interval (every 30 seconds)
    const interval = setInterval(() => loadDashboardData(true), 30000);
    return () => clearInterval(interval);
  }, [loadDashboardData]);

  // Handle Logout
  const handleLogout = handleSignOut;

  // Handle Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg("");

    if (newPassword.length < 8) {
      const msg = "New password must be at least 8 characters long.";
      setPasswordMsg(msg);
      toast.error(msg);
      return;
    }

    if (newPassword !== confirmPassword) {
      const msg = "New password and confirmation password do not match.";
      setPasswordMsg(msg);
      toast.error(msg);
      return;
    }

    if (newPassword === currentPassword) {
      const msg = "New password cannot be identical to your current password.";
      setPasswordMsg(msg);
      toast.error(msg);
      return;
    }

    setIsChangingPass(true);
    try {
      const res = await changeUserPassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      const successText = res?.message || "Password updated successfully!";
      toast.success(successText);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordModal(false);
      setShowSecurityBanner(false);
    } catch (err: any) {
      const errMsg = err.message || "Failed to update password. Please check your current password.";
      setPasswordMsg(errMsg);
      toast.error(errMsg);
    } finally {
      setIsChangingPass(false);
    }
  };

  // Profile data derivations
  const staffDisplayName =
    profile?.full_name ||
    profile?.first_name ||
    profile?.name ||
    profile?.username ||
    "Staff Member";

  const staffPhone =
    profile?.phone_number ||
    profile?.phone ||
    profile?.user_metadata?.phone ||
    "No phone registered";

  const rawRole = (
    profile?.role ||
    profile?.user_metadata?.role ||
    "TECHNICIAN"
  ).toUpperCase();

  const staffRoleBadge = ["WASHER", "TECHNICIAN", "DETAILER", "DRIVER"].includes(rawRole)
    ? "Technician"
    : "Staff";

  const staffInitials =
    staffDisplayName
      .split(" ")
      .map((part: string) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "ST";

  // Completed vehicles list normalization
  const completedVehicles: CompletedVehicleDossier[] =
    stats?.completed_vehicles ||
    (Array.isArray(stats?.cars_washed_today)
      ? stats.cars_washed_today
      : stats?.cars_washed_today?.list) ||
    [];

  // ─────────────────────────────────────────────────────────────────────────────
  // LOADING SKELETON
  // ─────────────────────────────────────────────────────────────────────────────
  if (isLoading && !profile && !stats) {
    return (
      <div className="bg-[#050507] min-h-screen text-white p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-pulse">
        {/* Header Skeleton */}
        <div className="bg-[#0B0C0E] border border-white/5 rounded-3xl p-6 h-32 flex items-center justify-between" />
        
        {/* Stat Cards Skeleton (2x2 on mobile, 4 in row on desktop) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-[#0B0C0E] border border-white/5 rounded-2xl p-5 h-36" />
          ))}
        </div>

        {/* Buttons Skeleton */}
        <div className="flex gap-3 h-14">
          <div className="flex-1 bg-[#0B0C0E] border border-white/5 rounded-2xl" />
          <div className="flex-1 bg-[#0B0C0E] border border-white/5 rounded-2xl" />
          <div className="w-14 bg-[#0B0C0E] border border-white/5 rounded-2xl" />
        </div>

        {/* Table Skeleton */}
        <div className="bg-[#0B0C0E] border border-white/5 rounded-3xl p-6 h-64" />
      </div>
    );
  }

  return (
    <div className="bg-[#050507] min-h-screen text-white p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto font-sans">
      
      {/* ─────────────────────────────────────────────────────────────────────────────
          1. PROFILE HEADER CARD
      ───────────────────────────────────────────────────────────────────────────── */}
      <div className="bg-[#0B0C0E]/90 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Ambient subtle glow */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-[#01FFFF]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          
          {/* Left: Avatar, Name, Phone, Role, Status */}
          <div className="flex items-center gap-4 sm:gap-5">
            {/* Avatar / Initials */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-[#01FFFF]/20 via-[#01FFFF]/10 to-transparent border border-[#01FFFF]/30 flex items-center justify-center font-mono text-lg sm:text-xl font-black text-[#01FFFF] shadow-[0_0_20px_rgba(1,255,255,0.15)] shrink-0">
              {staffInitials}
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {staffDisplayName}
                </h1>
                
                {/* Role Badge */}
                <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full bg-[#01FFFF]/10 text-[#01FFFF] border border-[#01FFFF]/25">
                  {staffRoleBadge}
                </span>

                {/* Status Indicator */}
                <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                  On Duty
                </span>
              </div>

              {/* Registered Phone */}
              <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
                <Phone className="w-3.5 h-3.5 text-[#01FFFF]" />
                <span>{staffPhone}</span>
              </div>
            </div>
          </div>

          {/* Right: Quick Action Buttons */}
          <div className="flex items-center gap-2.5 w-full md:w-auto">
            {/* Change Password Button */}
            <button
              onClick={() => setShowPasswordModal(true)}
              className="flex-1 md:flex-initial px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#01FFFF]/40 rounded-xl font-mono text-xs text-neutral-200 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <Lock className="w-3.5 h-3.5 text-[#01FFFF]" />
              <span>Change Password</span>
            </button>

            {/* Sign Out Button */}
            <button
              type="button"
              onClick={handleSignOut}
              className="px-3.5 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:border-rose-500/40 rounded-xl font-mono text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>

        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          SECURITY ALERT BANNER (If using default/temporary password)
      ───────────────────────────────────────────────────────────────────────────── */}
      {showSecurityBanner && (
        <div className="bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/40 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[0_0_20px_rgba(245,158,11,0.15)] animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="font-mono text-sm font-bold text-amber-300">
                Action Recommended: Temporary Password in Use
              </p>
              <p className="text-xs text-neutral-300 mt-0.5">
                Please set a personal, secure password for your account.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={() => setShowPasswordModal(true)}
              className="flex-1 sm:flex-initial px-4 py-2 bg-amber-400 hover:bg-amber-300 text-[#050507] rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2"
            >
              <Lock className="w-3.5 h-3.5" />
              Update Now
            </button>
            <button
              onClick={() => setShowSecurityBanner(false)}
              className="p-2 text-neutral-400 hover:text-white transition-colors"
              title="Dismiss warning"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          2. FINANCIAL & PERFORMANCE STAT CARDS (4-CARD GRID)
      ───────────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Cash in Hand (Amber Accent - Staff owes shop) */}
        <div className="bg-gradient-to-br from-[#16130C]/90 via-[#0B0C0E]/90 to-[#050507] border border-amber-500/30 hover:border-amber-400/60 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-3 transition-all duration-300 shadow-[0_0_20px_rgba(245,158,11,0.06)] group">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-wider text-amber-300/90 font-bold">
              Cash in Hand
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="font-mono text-2xl sm:text-3xl font-black text-amber-400 tracking-tight">
              ₹{(stats?.cash_in_hand ?? stats?.payable_by_staff ?? 0).toLocaleString()}
            </div>
            <p className="text-[11px] font-mono text-neutral-400 mt-1">
              Cash collected to hand over
            </p>
          </div>
        </div>

        {/* Card 2: Payout Due (Emerald Accent - Owner owes staff) */}
        <div className="bg-gradient-to-br from-[#0E1512]/90 via-[#0B0C0E]/90 to-[#050507] border border-emerald-500/30 hover:border-emerald-400/60 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-3 transition-all duration-300 shadow-[0_0_20px_rgba(34,197,94,0.06)] group">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-wider text-emerald-400 font-bold">
              Payout Due
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="font-mono text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight">
              ₹{(stats?.receivable_by_staff ?? (stats as any)?.unsettled_commission ?? 0).toLocaleString()}
            </div>
            <p className="text-[11px] font-mono text-neutral-400 mt-1">
              Earnings owed by shop
            </p>
          </div>
        </div>

        {/* Card 3: Cars Washed Today (Blue Accent) */}
        <div className="bg-gradient-to-br from-[#0C1217]/90 via-[#0B0C0E]/90 to-[#050507] border border-[#01FFFF]/30 hover:border-[#01FFFF]/60 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-3 transition-all duration-300 shadow-[0_0_20px_rgba(1,255,255,0.06)] group">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-wider text-[#01FFFF] font-bold">
              Cars Washed Today
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#01FFFF]/10 border border-[#01FFFF]/20 flex items-center justify-center text-[#01FFFF] group-hover:scale-105 transition-transform">
              <Car className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="font-mono text-2xl sm:text-3xl font-black text-white tracking-tight">
              {(Array.isArray(stats?.cars_washed_today)
                ? stats.cars_washed_today.length
                : stats?.cars_washed_today?.count) ??
                stats?.completed_count ??
                0}
            </div>
            <p className="text-[11px] font-mono text-cyan-400/80 mt-1">
              {stats?.in_progress_count || 0} in progress
            </p>
          </div>
        </div>

        {/* Card 4: Today's Commission (Purple Accent) */}
        <div className="bg-gradient-to-br from-[#130E1A]/90 via-[#0B0C0E]/90 to-[#050507] border border-purple-500/30 hover:border-purple-400/60 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-3 transition-all duration-300 shadow-[0_0_20px_rgba(168,85,247,0.06)] group">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-wider text-purple-400 font-bold">
              Today's Commission
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="font-mono text-2xl sm:text-3xl font-black text-purple-400 tracking-tight">
              ₹{(stats?.labor_cost_commission || 0).toLocaleString()}
            </div>
            <p className="text-[11px] font-mono text-neutral-400 mt-1">
              Earned today
            </p>
          </div>
        </div>

      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          3. QUICK ACTION BUTTONS
      ───────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Open POS - Primary Large Button */}
        <button
          onClick={() => router.push("/staff/pos")}
          className="flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#01FFFF] via-[#00E5FF] to-[#00B4D8] text-[#050507] font-mono text-xs sm:text-sm font-black uppercase tracking-wider shadow-[0_0_25px_rgba(1,255,255,0.35)] hover:shadow-[0_0_35px_rgba(1,255,255,0.5)] transition-all duration-300 flex items-center justify-center gap-2.5 active:scale-[0.98]"
        >
          <ShoppingBag className="w-5 h-5 text-[#050507]" />
          <span>Open POS</span>
        </button>

        {/* View Live Queue - Secondary Button */}
        <button
          onClick={() => router.push("/staff/queue")}
          className="flex-1 py-3.5 px-6 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#01FFFF]/40 text-white font-mono text-xs sm:text-sm font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2.5 active:scale-[0.98]"
        >
          <Layers className="w-5 h-5 text-[#01FFFF]" />
          <span>View Live Queue</span>
        </button>

        {/* Refresh Data - Icon Button */}
        <button
          onClick={() => loadDashboardData(true)}
          disabled={isRefreshing}
          className="py-3.5 px-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#01FFFF]/40 text-neutral-300 hover:text-[#01FFFF] font-mono text-xs sm:text-sm transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 shrink-0"
          title="Refresh Data"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-[#01FFFF]" : ""}`} />
          <span className="sm:hidden font-mono text-xs">Refresh Data</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          4. TODAY'S COMPLETED VEHICLES TABLE
      ───────────────────────────────────────────────────────────────────────────── */}
      <div className="bg-[#0B0C0E]/90 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="font-mono text-base font-black uppercase tracking-wider text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              Today's Completed Vehicles
            </h2>
            <p className="text-xs text-neutral-400">
              Summary of all vehicles finished during today's shift
            </p>
          </div>

          <span className="font-mono text-xs font-bold text-neutral-400 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
            {completedVehicles.length} total
          </span>
        </div>

        {completedVehicles.length > 0 ? (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-[11px] font-mono uppercase tracking-wider text-neutral-400">
                    <th className="py-3 px-4">Vehicle Plate</th>
                    <th className="py-3 px-4">Model &amp; Type</th>
                    <th className="py-3 px-4">Service Package</th>
                    <th className="py-3 px-4">Completed Time</th>
                    <th className="py-3 px-4 text-right">Billed Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs font-mono">
                  {completedVehicles.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-white/[0.02] transition-colors group"
                    >
                      {/* Plate Number */}
                      <td className="py-3.5 px-4">
                        <span className="font-black text-white bg-white/10 border border-white/20 px-2.5 py-1 rounded-lg tracking-wider">
                          {item.plate_number || item.vehicle_number}
                        </span>
                      </td>

                      {/* Model & Type */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-neutral-200 font-bold">
                            {item.vehicle_model}
                          </span>
                          <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-white/5 text-neutral-400 border border-white/10">
                            {item.vehicle_type}
                          </span>
                        </div>
                      </td>

                      {/* Package Name */}
                      <td className="py-3.5 px-4 text-neutral-300">
                        {item.service_package}
                      </td>

                      {/* Time Completed */}
                      <td className="py-3.5 px-4 text-neutral-400">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-neutral-500" />
                          <span>{item.time}</span>
                        </div>
                      </td>

                      {/* Billed Amount */}
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-bold text-[#01FFFF] text-sm">
                          ₹{(item.final_price ?? (item as any).price ?? 0).toLocaleString()}
                        </span>
                        {item.commission_earned > 0 && (
                          <span className="ml-2 text-[10px] text-emerald-400 font-semibold">
                            (+₹{item.commission_earned})
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="md:hidden space-y-3">
              {completedVehicles.map((item) => (
                <div
                  key={item.id}
                  className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono font-black text-sm text-white bg-white/10 border border-white/20 px-2.5 py-1 rounded-lg tracking-wider">
                      {item.plate_number || item.vehicle_number}
                    </span>
                    <div className="text-right">
                      <div className="font-mono font-bold text-sm text-[#01FFFF]">
                        ₹{(item.final_price ?? (item as any).price ?? 0).toLocaleString()}
                      </div>
                      {item.commission_earned > 0 && (
                        <div className="text-[10px] font-mono text-emerald-400 font-semibold">
                          +₹{item.commission_earned} earned
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-neutral-300 pt-1 border-t border-white/5">
                    <div>
                      <span className="font-semibold text-white">{item.vehicle_model}</span>
                      <span className="text-neutral-400 text-[11px] ml-1.5">
                        ({item.vehicle_type})
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-neutral-400 font-mono text-[11px]">
                      <Clock className="w-3 h-3 text-neutral-500" />
                      <span>{item.time}</span>
                    </div>
                  </div>

                  <div className="text-[11px] font-mono text-neutral-400">
                    Service: <span className="text-neutral-200">{item.service_package}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          /* Clean Empty State */
          <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.01] space-y-2">
            <Car className="w-10 h-10 text-neutral-500 mx-auto" />
            <p className="font-mono text-sm font-semibold text-neutral-300">
              No vehicles completed yet today
            </p>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              Vehicles marked as completed from the wash bay or queue will appear here.
            </p>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          5. CHANGE PASSWORD MODAL (CLEAN ENGLISH)
      ───────────────────────────────────────────────────────────────────────────── */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0B0C0E] border border-white/15 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="font-mono text-lg font-black uppercase text-white flex items-center gap-2.5">
                <Lock className="w-5 h-5 text-[#01FFFF]" />
                Change Password
              </h3>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              {/* Current Password */}
              <div className="space-y-1.5">
                <label className="font-mono text-xs text-neutral-300 uppercase tracking-wider">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? "text" : "password"}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 pr-10 text-white font-mono text-sm focus:outline-none focus:border-[#01FFFF] transition-colors"
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3 top-3 text-neutral-400 hover:text-white"
                  >
                    {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-mono text-xs text-neutral-300 uppercase tracking-wider">
                    New Password
                  </label>
                  <span className="text-[10px] font-mono text-neutral-500">
                    Minimum 8 characters
                  </span>
                </div>
                <div className="relative">
                  <input
                    type={showNewPass ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 pr-10 text-white font-mono text-sm focus:outline-none focus:border-[#01FFFF] transition-colors"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-3 text-neutral-400 hover:text-white"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div className="space-y-1.5">
                <label className="font-mono text-xs text-neutral-300 uppercase tracking-wider">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white font-mono text-sm focus:outline-none focus:border-[#01FFFF] transition-colors"
                  placeholder="Re-enter new password"
                />
              </div>

              {passwordMsg && (
                <p className="font-mono text-xs text-center font-bold text-rose-400 pt-1">
                  {passwordMsg}
                </p>
              )}

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 py-3 rounded-xl font-mono text-xs text-neutral-300 uppercase tracking-wider font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isChangingPass}
                  className="flex-1 bg-[#01FFFF] hover:bg-[#00C2FF] text-[#050507] font-mono font-black py-3 rounded-xl transition-all text-xs uppercase tracking-wider disabled:opacity-50"
                >
                  {isChangingPass ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

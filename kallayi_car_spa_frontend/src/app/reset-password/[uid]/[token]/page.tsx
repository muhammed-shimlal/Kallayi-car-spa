"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Lock, Eye, EyeOff, ShieldCheck, Loader2, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";

export default function ResetPasswordPage() {
    const params = useParams();
    const router = useRouter();

    const uid = (params?.uid as string) || "";
    const token = (params?.token as string) || "";

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!newPassword) {
            setError("Please enter a new password.");
            return;
        }

        if (newPassword.length < 6) {
            setError("Password must be at least 6 characters long.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setIsLoading(true);

        try {
            const res = await api.post("/password-reset-confirm/", {
                uidb64: uid,
                token: token,
                new_password: newPassword,
            });

            setIsSuccess(true);
            setTimeout(() => {
                router.push("/login");
            }, 3000);
        } catch (err: any) {
            const msg = err.response?.data?.error || err.response?.data?.message || err.message || "Invalid or expired reset token.";
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#070709] text-white flex flex-col lg:flex-row overflow-hidden relative font-sans">
            {/* LEFT COLUMN: FORM */}
            <div className="w-full lg:w-1/2 min-h-screen flex flex-col justify-between p-6 sm:p-12 lg:p-16 relative z-10">
                {/* Top Header & Navigation */}
                <div className="flex items-center justify-between">
                    <Link
                        href="/login"
                        className="inline-flex items-center gap-2 text-xs font-mono text-neutral-400 hover:text-white transition-colors uppercase tracking-widest group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span>Back to Login</span>
                    </Link>

                    <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-500 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
                        PASSWORD CONFIRMATION
                    </div>
                </div>

                {/* Form Container Wrapper */}
                <div className="max-w-md w-full mx-auto my-auto py-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                        className="space-y-8"
                    >
                        {/* Header Text */}
                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-2 text-xs font-mono tracking-[0.3em] text-[#01FFFF] uppercase">
                                <ShieldCheck className="w-4 h-4 text-[#01FFFF]" />
                                <span>AUTHENTICATION RENEWAL</span>
                            </div>
                            <h1 className="font-display text-3xl sm:text-4xl font-light tracking-tight text-white uppercase">
                                SET NEW PASSWORD
                            </h1>
                            <p className="text-sm text-neutral-400 font-light leading-relaxed">
                                Enter your new access key below to restore account access.
                            </p>
                        </div>

                        {/* NEUMORPHIC CARD */}
                        <div className="bg-[#0b0c0f] shadow-[-14px_-14px_30px_rgba(255,255,255,0.02),14px_14px_35px_rgba(0,0,0,0.95)] border border-white/5 rounded-3xl p-8 sm:p-10 space-y-6">
                            {isSuccess ? (
                                <div className="space-y-6 text-center py-4">
                                    <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto text-emerald-400">
                                        <CheckCircle2 className="w-8 h-8" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="font-bold text-lg text-white">Password Updated!</h3>
                                        <p className="text-xs text-neutral-300 leading-relaxed max-w-xs mx-auto">
                                            Your password has been reset successfully. Redirecting you to the login portal...
                                        </p>
                                    </div>
                                    <div className="pt-2">
                                        <Link
                                            href="/login"
                                            className="inline-flex items-center justify-center gap-2 w-full py-3.5 bg-gradient-to-r from-red-600 to-red-700 rounded-xl text-xs font-bold uppercase tracking-widest text-white transition-all shadow-md"
                                        >
                                            Log In Now <ArrowRight className="w-4 h-4" />
                                        </Link>
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {/* New Password */}
                                    <div className="space-y-2">
                                        <label className="block text-xs uppercase tracking-widest text-neutral-300 font-medium">
                                            New Password *
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-500">
                                                <Lock className="w-4 h-4" />
                                            </div>
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                required
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                disabled={isLoading}
                                                placeholder="Minimum 6 characters..."
                                                className="w-full bg-[#08080a] shadow-[inset_3px_3px_6px_rgba(0,0,0,0.95),inset_-2px_-2px_5px_rgba(255,255,255,0.03)] border border-white/5 focus:border-white/30 py-3.5 pl-11 pr-11 rounded-2xl text-white text-sm focus:outline-none focus:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.95),0_0_14px_rgba(255,255,255,0.12)] transition-all placeholder:text-neutral-600"
                                            />
                                            <button
                                                type="button"
                                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-neutral-500 hover:text-white transition-colors"
                                                onClick={() => setShowPassword(!showPassword)}
                                                tabIndex={-1}
                                            >
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Confirm Password */}
                                    <div className="space-y-2">
                                        <label className="block text-xs uppercase tracking-widest text-neutral-300 font-medium">
                                            Confirm New Password *
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-500">
                                                <Lock className="w-4 h-4" />
                                            </div>
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                required
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                disabled={isLoading}
                                                placeholder="Re-enter new password..."
                                                className="w-full bg-[#08080a] shadow-[inset_3px_3px_6px_rgba(0,0,0,0.95),inset_-2px_-2px_5px_rgba(255,255,255,0.03)] border border-white/5 focus:border-white/30 py-3.5 pl-11 pr-4 rounded-2xl text-white text-sm focus:outline-none focus:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.95),0_0_14px_rgba(255,255,255,0.12)] transition-all placeholder:text-neutral-600"
                                            />
                                        </div>
                                    </div>

                                    <AnimatePresence>
                                        {error && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -6 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -6 }}
                                                className="bg-red-950/30 border border-red-500/30 p-3.5 rounded-xl text-xs text-red-400 flex items-center gap-2"
                                            >
                                                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                                                <span>{error}</span>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <button
                                        type="submit"
                                        disabled={isLoading || !newPassword || !confirmPassword}
                                        className="w-full relative overflow-hidden bg-gradient-to-r from-red-600 to-red-700 shadow-[-6px_-6px_14px_rgba(255,255,255,0.03),6px_6px_18px_rgba(0,0,0,0.9)] hover:shadow-[-2px_-2px_8px_rgba(255,255,255,0.05),2px_2px_14px_rgba(229,35,35,0.4)] active:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.9)] text-white font-bold text-xs uppercase tracking-[0.2em] py-4 rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:pointer-events-none group"
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin text-white" />
                                                <span>UPDATING PASSWORD...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>UPDATE PASSWORD</span>
                                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </button>
                                </form>
                            )}

                            <div className="pt-2 text-center border-t border-white/5">
                                <Link
                                    href="/forgot-password"
                                    className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors tracking-wider uppercase group"
                                >
                                    <span>Token expired? <strong className="text-[#01FFFF] underline underline-offset-4">Request new link</strong></span>
                                </Link>
                            </div>
                        </div>
                    </motion.div>
                </div>

                <div className="text-center text-[10px] text-neutral-500 uppercase tracking-widest">
                    KALLAYI CAR SPA // MANJERI
                </div>
            </div>

            {/* RIGHT COLUMN: CINEMATIC VISUAL */}
            <div className="hidden lg:block lg:w-1/2 relative overflow-hidden bg-black border-l border-white/10">
                <div
                    className="absolute inset-0 bg-cover bg-center filter grayscale brightness-75 contrast-125 transition-transform duration-1000 scale-105 hover:scale-100"
                    style={{
                        backgroundImage: `url('https://i.pinimg.com/736x/7b/97/f1/7b97f1a701559036275799affa544dc6.jpg')`
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#070709] via-black/40 to-black/70" />

                <div className="relative z-10 h-full p-16 flex flex-col justify-between">
                    <div className="flex justify-end">
                        <div className="bg-black/70 backdrop-blur-md border border-white/10 px-4 py-1.5 rounded-full font-mono text-xs tracking-widest text-neutral-300 uppercase flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            <span>ENCRYPTED RECOVERY // SECURE RESET</span>
                        </div>
                    </div>

                    <div className="space-y-6 max-w-lg">
                        <div className="space-y-2">
                            <span className="font-mono text-xs text-neutral-400 tracking-[0.3em] uppercase block">
                                SECURITY MANAGEMENT
                            </span>
                            <h2 className="font-display text-4xl font-light tracking-tight text-white uppercase leading-tight">
                                Establish New Access Credentials
                            </h2>
                        </div>
                        <p className="text-sm text-neutral-300 font-light leading-relaxed">
                            Once your password is renewed, you can immediately log in to your account across all detailing portals.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

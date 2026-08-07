"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Mail, Phone, KeyRound, Loader2, CheckCircle2, AlertCircle, Sparkles, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";

import { GmailInput } from "@/components/ui/GmailInput";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedEmail = email.trim().toLowerCase();
        const trimmedPhone = phone.trim();

        if (!trimmedEmail) {
            setStatusMessage({ type: "error", text: "Please enter your registered Gmail address." });
            return;
        }

        // Front-end Gmail Domain Check
        if (!trimmedEmail.endsWith("@gmail.com")) {
            setStatusMessage({
                type: "error",
                text: "Please use a valid Gmail address (@gmail.com). Temp mails are not allowed."
            });
            return;
        }

        if (!trimmedPhone) {
            setStatusMessage({ type: "error", text: "Please enter your registered phone number." });
            return;
        }

        setIsLoading(true);
        setStatusMessage(null);

        console.log("🔒 [FORGOT PASSWORD DUAL VERIFICATION] Submitting request:", { email: trimmedEmail, phone_number: trimmedPhone });

        try {
            const res = await api.post("/password-reset/", {
                email: trimmedEmail,
                phone_number: trimmedPhone
            });
            console.log("✅ [FORGOT PASSWORD SUCCESS] Server response:", res.data);
            setStatusMessage({
                type: "success",
                text: res.data.message || "Dual verification successful! A password reset link has been dispatched to your email inbox."
            });
        } catch (err: any) {
            console.error("❌ [FORGOT PASSWORD ERROR] Request failed:", err);
            
            let msg = "An error occurred while requesting password reset.";
            if (err.response) {
                console.error("Response data:", err.response.data);
                console.error("Response status:", err.response.status);
                msg = err.response.data?.error || err.response.data?.message || err.response.data?.detail || `Server returned error status ${err.response.status}`;
            } else if (err.request) {
                console.error("No response received from backend server. Network or CORS error.");
                msg = "Unable to connect to the backend server. Please verify the backend server is running.";
            } else if (err.message) {
                msg = err.message;
            }

            setStatusMessage({ type: "error", text: msg });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#070709] text-white flex flex-col lg:flex-row overflow-hidden relative font-sans">
            {/* LEFT COLUMN: FORM (50% Desktop Width) */}
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
                        DUAL VERIFICATION SECURITY
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
                                <span>RECOVERY PORTAL</span>
                            </div>
                            <h1 className="font-display text-3xl sm:text-4xl font-light tracking-tight text-white uppercase">
                                FORGOT PASSWORD?
                            </h1>
                            <p className="text-sm text-neutral-400 font-light leading-relaxed">
                                Enter your registered Gmail address and phone number for dual identity verification.
                            </p>
                        </div>

                        {/* NEUMORPHIC CARD */}
                        <div className="bg-[#0b0c0f] shadow-[-14px_-14px_30px_rgba(255,255,255,0.02),14px_14px_35px_rgba(0,0,0,0.95)] border border-white/5 rounded-3xl p-8 sm:p-10 space-y-6">
                            {statusMessage?.type === "success" ? (
                                <div className="space-y-6 text-center py-4">
                                    <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto text-emerald-400">
                                        <CheckCircle2 className="w-8 h-8" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="font-bold text-lg text-white">Verification Successful</h3>
                                        <p className="text-xs text-neutral-300 leading-relaxed max-w-xs mx-auto">
                                            {statusMessage.text}
                                        </p>
                                    </div>
                                    <div className="pt-4 border-t border-white/5 space-y-3">
                                        <button
                                            onClick={() => setStatusMessage(null)}
                                            className="text-xs text-neutral-400 hover:text-[#01FFFF] transition-colors font-mono uppercase tracking-wider underline underline-offset-4"
                                        >
                                            Try another verification
                                        </button>
                                        <div className="pt-2">
                                            <Link
                                                href="/login"
                                                className="inline-flex items-center justify-center gap-2 w-full py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-widest text-white transition-all"
                                            >
                                                Return to Login <ArrowRight className="w-4 h-4" />
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-5">
                                    {/* 1. Gmail Input */}
                                    <GmailInput
                                        value={email}
                                        onChange={setEmail}
                                        disabled={isLoading}
                                        label="Registered Gmail Address *"
                                        placeholder="yourname@gmail.com"
                                    />

                                    {/* 2. Registered Phone Input */}
                                    <div className="space-y-1.5 group">
                                        <label className="block text-xs uppercase tracking-widest text-neutral-300 font-medium">
                                            Registered Phone Number *
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-500 group-focus-within:text-[#01FFFF] transition-colors">
                                                <Phone className="w-4 h-4" />
                                            </div>
                                            <input
                                                type="tel"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                disabled={isLoading}
                                                placeholder="e.g. 9876543210 or +919876543210"
                                                className="w-full bg-[#08080a] shadow-[inset_3px_3px_6px_rgba(0,0,0,0.95),inset_-2px_-2px_5px_rgba(255,255,255,0.03)] border border-white/5 focus:border-[#01FFFF]/50 py-3.5 pl-11 pr-4 rounded-2xl text-white text-sm focus:outline-none focus:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.95),0_0_14px_rgba(1,255,255,0.15)] transition-all placeholder:text-neutral-600"
                                            />
                                        </div>
                                    </div>

                                    <AnimatePresence>
                                        {statusMessage?.type === "error" && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -6 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -6 }}
                                                className="bg-red-950/30 border border-red-500/30 p-3.5 rounded-xl text-xs text-red-400 flex items-center gap-2"
                                            >
                                                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                                                <span>{statusMessage.text}</span>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <button
                                        type="submit"
                                        disabled={isLoading || !email.trim() || !phone.trim()}
                                        className="w-full relative overflow-hidden bg-gradient-to-r from-red-600 to-red-700 shadow-[-6px_-6px_14px_rgba(255,255,255,0.03),6px_6px_18px_rgba(0,0,0,0.9)] hover:shadow-[-2px_-2px_8px_rgba(255,255,255,0.05),2px_2px_14px_rgba(229,35,35,0.4)] active:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.9)] text-white font-bold text-xs uppercase tracking-[0.2em] py-4 rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:pointer-events-none group"
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin text-white" />
                                                <span>VERIFYING ACCOUNT...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>SEND RESET LINK</span>
                                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </button>
                                </form>
                            )}

                            {/* Back to Login Link */}
                            <div className="pt-2 text-center border-t border-white/5">
                                <Link
                                    href="/login"
                                    className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors tracking-wider uppercase group"
                                >
                                    <span>Remember your password? <strong className="text-[#01FFFF] underline underline-offset-4">Log In</strong></span>
                                </Link>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Footer Notice */}
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
                            <span>DUAL IDENTITY VERIFICATION // 256-BIT TOKEN</span>
                        </div>
                    </div>

                    <div className="space-y-6 max-w-lg">
                        <div className="space-y-2">
                            <span className="font-mono text-xs text-neutral-400 tracking-[0.3em] uppercase block">
                                SECURITY MANAGEMENT
                            </span>
                            <h2 className="font-display text-4xl font-light tracking-tight text-white uppercase leading-tight">
                                Secure Access Key Renewal
                            </h2>
                        </div>
                        <p className="text-sm text-neutral-300 font-light leading-relaxed">
                            Dual verification ensures password reset requests match both your registered email and phone number before issuing encrypted access links.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}


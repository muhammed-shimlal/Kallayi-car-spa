"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Mail, KeyRound, Loader2, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";

import { GmailInput } from "@/components/ui/GmailInput";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;

        // Front-end Gmail Domain Check
        const trimmed = email.trim().toLowerCase();
        if (!trimmed.endsWith("@gmail.com")) {
            setStatusMessage({
                type: "error",
                text: "Please use a valid Gmail address (@gmail.com). Temp mails are not allowed."
            });
            return;
        }

        setIsLoading(true);
        setStatusMessage(null);

        try {
            const res = await api.post("/password-reset/", { email: trimmed });
            setStatusMessage({
                type: "success",
                text: res.data.message || "If an account matches that email, a password reset link has been dispatched to your inbox."
            });
        } catch (err: any) {
            const msg = err.response?.data?.error || err.response?.data?.message || err.message || "An error occurred while requesting password reset.";
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
                        ACCOUNT SECURITY
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
                                <KeyRound className="w-4 h-4 text-[#01FFFF]" />
                                <span>RECOVERY PORTAL</span>
                            </div>
                            <h1 className="font-display text-3xl sm:text-4xl font-light tracking-tight text-white uppercase">
                                FORGOT PASSWORD?
                            </h1>
                            <p className="text-sm text-neutral-400 font-light leading-relaxed">
                                Enter your registered email address below. We'll send you an encrypted link to reset your access key.
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
                                        <h3 className="font-bold text-lg text-white">Check Your Inbox</h3>
                                        <p className="text-xs text-neutral-300 leading-relaxed max-w-xs mx-auto">
                                            {statusMessage.text}
                                        </p>
                                    </div>
                                    <div className="pt-4 border-t border-white/5 space-y-3">
                                        <button
                                            onClick={() => setStatusMessage(null)}
                                            className="text-xs text-neutral-400 hover:text-[#01FFFF] transition-colors font-mono uppercase tracking-wider underline underline-offset-4"
                                        >
                                            Try another email address
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
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <GmailInput
                                        value={email}
                                        onChange={setEmail}
                                        disabled={isLoading}
                                        label="Registered Gmail Address *"
                                        placeholder="yourname@gmail.com"
                                    />

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
                                        disabled={isLoading || !email.trim()}
                                        className="w-full relative overflow-hidden bg-gradient-to-r from-red-600 to-red-700 shadow-[-6px_-6px_14px_rgba(255,255,255,0.03),6px_6px_18px_rgba(0,0,0,0.9)] hover:shadow-[-2px_-2px_8px_rgba(255,255,255,0.05),2px_2px_14px_rgba(229,35,35,0.4)] active:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.9)] text-white font-bold text-xs uppercase tracking-[0.2em] py-4 rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:pointer-events-none group"
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin text-white" />
                                                <span>DISPATCHING LINK...</span>
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
                            <span>ENCRYPTED RECOVERY // 256-BIT TOKEN</span>
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
                            Reset links expire automatically to protect your account. Ensure you use the link delivered to your primary inbox.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

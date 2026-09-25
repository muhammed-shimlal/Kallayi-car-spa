'use client';

import React, { useEffect } from 'react';
import { AlertOctagon, RotateCcw, Home, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function CustomerDashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to console or error monitoring service
    console.error('[CustomerDashboard] Uncaught route error boundary:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6 selection:bg-[#01FFFF] selection:text-black">
      <div className="w-full max-w-lg bg-gradient-to-br from-[#0e0f14] via-[#090a0d] to-black border border-white/10 rounded-[2.5rem] p-8 sm:p-10 shadow-2xl relative overflow-hidden text-center space-y-6">
        {/* Glow Accent */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#01FFFF]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Icon Header */}
        <div className="relative inline-flex items-center justify-center">
          <div className="w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.2)]">
            <AlertOctagon className="w-10 h-10" />
          </div>
          <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-[#01FFFF] text-black">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Text Content */}
        <div className="space-y-2">
          <div className="inline-block px-3 py-1 rounded-full bg-white/5 border border-white/10 text-neutral-400 text-[10px] font-mono uppercase tracking-widest font-bold">
            SAFE RECOVERY SHIELD
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Dashboard View Stalled
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed max-w-md mx-auto">
            A temporary render glitch occurred while assembling your dashboard view. Your account and booking data are completely safe.
          </p>
        </div>

        {/* Error Details (Safe preview) */}
        {process.env.NODE_ENV !== 'production' && error?.message && (
          <div className="bg-black/60 border border-white/5 rounded-2xl p-3 text-left">
            <span className="text-[10px] uppercase font-mono text-neutral-500 block mb-1">
              Error Telemetry:
            </span>
            <p className="text-xs font-mono text-red-400/90 break-words">
              {error.message}
            </p>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-[#01FFFF] hover:bg-[#00e6e6] text-black font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(1,255,255,0.3)] hover:shadow-[0_0_30px_rgba(1,255,255,0.5)] cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Try Again</span>
          </button>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Reload Portal</span>
          </button>

          <Link
            href="/"
            className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-transparent hover:bg-white/5 text-neutral-400 hover:text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

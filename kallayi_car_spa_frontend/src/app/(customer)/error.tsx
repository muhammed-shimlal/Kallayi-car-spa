'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function CustomerRouteError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('[CustomerLayout] Uncaught exception:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6 selection:bg-[#01FFFF] selection:text-black">
      <div className="w-full max-w-md bg-[#0c0d12] border border-white/10 rounded-3xl p-8 shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(239,68,68,0.2)]">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-white tracking-wide">
            Something went wrong
          </h1>
          <p className="text-xs text-neutral-400 leading-relaxed">
            The customer portal encountered an unexpected error. Please retry or return to the main page.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="px-5 py-3 rounded-xl bg-[#01FFFF] hover:bg-[#00e6e6] text-black font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(1,255,255,0.3)]"
          >
            <RotateCcw className="w-4 h-4" /> Try Again
          </button>
          <Link
            href="/"
            className="px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" /> Home
          </Link>
        </div>
      </div>
    </div>
  );
}

import React from 'react';

export default function CustomerLoading() {
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-3 border-[#01FFFF]/20 border-t-[#01FFFF] rounded-full animate-spin shadow-[0_0_25px_rgba(1,255,255,0.3)]" />
        <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-neutral-400">
          Loading Kallayi Car Spa...
        </span>
      </div>
    </div>
  );
}

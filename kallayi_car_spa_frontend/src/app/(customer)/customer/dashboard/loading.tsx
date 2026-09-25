import React from 'react';

export default function CustomerDashboardLoading() {
  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col md:flex-row font-sans">
      {/* Sidebar Skeleton (Desktop) */}
      <div className="hidden md:flex w-64 border-r border-white/5 bg-[#08090b] p-6 flex-col justify-between shrink-0">
        <div className="space-y-8">
          <div className="h-8 w-36 bg-white/10 rounded-xl animate-pulse" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 w-full bg-white/5 rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
        <div className="h-14 w-full bg-white/5 rounded-2xl animate-pulse" />
      </div>

      {/* Main Content Area Skeleton */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto space-y-8">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-2">
            <div className="h-3 w-28 bg-white/10 rounded-full animate-pulse" />
            <div className="h-9 w-64 bg-white/10 rounded-xl animate-pulse" />
          </div>
          <div className="h-11 w-36 bg-white/10 rounded-full animate-pulse" />
        </div>

        {/* Hero Card Skeleton */}
        <div className="h-44 w-full rounded-[2.5rem] bg-gradient-to-br from-white/5 to-transparent border border-white/5 animate-pulse" />

        {/* Content Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-72 rounded-3xl bg-[#0a0b0e] border border-white/5 p-6 flex flex-col justify-between animate-pulse">
              <div className="space-y-3">
                <div className="h-4 w-24 bg-white/10 rounded-full" />
                <div className="h-6 w-40 bg-white/10 rounded-xl" />
                <div className="h-3 w-full bg-white/5 rounded" />
                <div className="h-3 w-4/5 bg-white/5 rounded" />
              </div>
              <div className="h-11 w-full bg-white/10 rounded-2xl" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

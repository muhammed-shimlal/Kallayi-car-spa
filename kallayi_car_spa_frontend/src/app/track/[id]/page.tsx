'use client';

import React, { useEffect, useState, use } from 'react';
import { 
  CheckCircle2, Clock, Droplets, Sparkles, Car, 
  RefreshCw, ShieldCheck, MapPin, IndianRupee, QrCode
} from 'lucide-react';

interface TrackingData {
  id: number;
  status: string;
  bay_assignment: string;
  start_time: string | null;
  end_time: string | null;
  time_slot: string | null;
  created_at: string;
  final_price: number;
  plate_number: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_type: string;
  service_name: string;
  duration_minutes: number;
}

export default function PublicLiveTrackingPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const unwrappedParams = use(Promise.resolve(params));
  const bookingId = unwrappedParams.id;

  const [booking, setBooking] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchTracking = async () => {
    try {
      const res = await fetch(`/api/track/${bookingId}`);
      if (!res.ok) {
        throw new Error('Booking not found or completed.');
      }
      const data = await res.json();
      if (data.success && data.booking) {
        setBooking(data.booking);
        setLastRefreshed(new Date());
        setError(null);
      } else {
        throw new Error(data.error || 'Failed to load tracking data.');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to load live status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracking();
    const interval = setInterval(fetchTracking, 8000);
    return () => clearInterval(interval);
  }, [bookingId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07080a] text-white flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 rounded-full border-2 border-[#01FFFF]/20 border-t-[#01FFFF] animate-spin mb-4" />
        <p className="font-mono text-xs uppercase tracking-widest text-[#01FFFF]">Loading Live Wash Tracker...</p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-[#07080a] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
          <Car className="w-8 h-8" />
        </div>
        <h1 className="font-mono text-lg font-bold uppercase tracking-wider mb-2">Wash Tracking Unavailable</h1>
        <p className="text-zinc-400 text-xs font-mono max-w-sm mb-6">
          {error || 'Unable to locate live tracking record. Please verify your job token number.'}
        </p>
        <button
          onClick={fetchTracking}
          className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  const rawStatus = (booking.status || '').toUpperCase();
  const isBay = ['IN_BAY_1', 'IN_BAY_2', 'IN_PROGRESS', 'DETAILING'].includes(rawStatus);
  const isReady = rawStatus === 'READY';
  const isCompleted = rawStatus === 'COMPLETED';

  // Step definitions
  const steps = [
    {
      id: 'WAITING',
      title: 'In Queue',
      subtitle: 'Vehicle received & parked in waiting pool',
      icon: Clock,
      active: true,
      done: isBay || isReady || isCompleted,
    },
    {
      id: 'WASHING',
      title: booking.bay_assignment || 'Washing Bay',
      subtitle: 'Active foam wash, rinse & detailing',
      icon: Droplets,
      active: isBay || isReady || isCompleted,
      done: isReady || isCompleted,
      pulsing: isBay,
    },
    {
      id: 'READY',
      title: 'Ready for Pickup',
      subtitle: 'Wash completed, dried & ready for collection',
      icon: CheckCircle2,
      active: isReady || isCompleted,
      done: isCompleted,
      pulsing: isReady,
    },
    {
      id: 'COMPLETED',
      title: 'Delivered',
      subtitle: 'Vehicle handed over & payment settled',
      icon: Sparkles,
      active: isCompleted,
      done: isCompleted,
    },
  ];

  return (
    <div className="min-h-screen bg-[#07080a] text-white flex flex-col font-sans selection:bg-[#01FFFF] selection:text-black">
      
      {/* Top Header */}
      <header className="p-4 sm:p-6 bg-[#0e1015] border-b border-white/10 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md bg-opacity-90">
        <div>
          <h1 className="font-mono text-sm sm:text-base font-black tracking-widest uppercase text-white flex items-center gap-2">
            KALLAYI CAR SPA<span className="text-[#01FFFF]">.</span>
          </h1>
          <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-mono">
            Live Wash Progress Tracker
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-mono text-[10px] text-emerald-400 uppercase font-bold tracking-wider">
            Live Updates
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-lg w-full mx-auto p-4 sm:p-6 space-y-5">
        
        {/* Vehicle License Plate Banner */}
        <div className="p-6 rounded-3xl bg-gradient-to-b from-[#12141a] to-[#0a0c10] border-2 border-[#01FFFF]/40 shadow-[0_0_40px_rgba(1,255,255,0.15)] text-center relative overflow-hidden">
          <div className="absolute top-3 left-4 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
            Job Token #{booking.id}
          </div>
          <div className="inline-block px-3 py-1 rounded-full bg-black/60 border border-white/15 text-[10px] uppercase font-bold tracking-[0.25em] text-[#01FFFF] mb-2 mt-4">
            License Plate
          </div>
          <div className="font-mono font-black text-3xl sm:text-4xl tracking-widest text-white drop-shadow-md">
            {booking.plate_number}
          </div>
          <div className="text-xs font-mono font-bold text-zinc-400 mt-2 flex items-center justify-center gap-2">
            <span>{booking.vehicle_make} {booking.vehicle_model}</span>
            <span>•</span>
            <span className="text-[#01FFFF]">{booking.service_name}</span>
          </div>
        </div>

        {/* Current Stage Highlight Card */}
        <div className={`p-4 rounded-2xl border text-center transition-all ${
          isReady 
            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.2)]'
            : isBay 
              ? 'bg-[#01FFFF]/10 border-[#01FFFF]/40 text-[#01FFFF] shadow-[0_0_25px_rgba(1,255,255,0.2)]'
              : isCompleted
                ? 'bg-purple-500/10 border-purple-500/40 text-purple-300'
                : 'bg-amber-500/10 border-amber-500/40 text-amber-300'
        }`}>
          <div className="text-[10px] uppercase font-mono font-bold tracking-widest mb-1 opacity-75">
            Current Status
          </div>
          <div className="font-mono text-lg font-black uppercase tracking-wider flex items-center justify-center gap-2">
            {isReady && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
            {isBay && <Droplets className="w-5 h-5 text-[#01FFFF] animate-bounce" />}
            {!isReady && !isBay && <Clock className="w-5 h-5" />}
            <span>
              {isReady 
                ? 'Ready for Collection!' 
                : isBay 
                  ? `Washing in ${booking.bay_assignment}` 
                  : isCompleted 
                    ? 'Delivered & Completed' 
                    : 'Waiting in Queue'}
            </span>
          </div>
          <p className="text-[11px] font-mono mt-1 opacity-90">
            {isReady 
              ? 'Your vehicle wash is finished! Please collect at the counter.' 
              : isBay 
                ? 'Our wash technicians are currently detailing your vehicle.' 
                : isCompleted 
                  ? 'Thank you for choosing Kallayi Car Spa!' 
                  : 'Your car is queued. Washing will begin shortly.'}
          </p>
        </div>

        {/* Interactive Lifecycle Timeline */}
        <div className="p-5 rounded-3xl bg-[#0e1015] border border-white/10 space-y-4">
          <div className="text-[11px] font-mono uppercase font-bold tracking-widest text-zinc-400">
            Wash Progress Milestones
          </div>

          <div className="space-y-4 relative pl-6 before:content-[''] before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-white/10">
            {steps.map((st) => {
              const Icon = st.icon;
              return (
                <div key={st.id} className="relative flex items-start gap-3 text-xs">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center absolute -left-6 z-10 transition-all ${
                    st.done
                      ? 'bg-emerald-400 text-black shadow-[0_0_10px_rgba(52,211,153,0.5)]'
                      : st.pulsing
                        ? 'bg-[#01FFFF] text-black animate-pulse shadow-[0_0_15px_rgba(1,255,255,0.8)]'
                        : st.active
                          ? 'bg-white/20 text-white'
                          : 'bg-white/5 text-zinc-600 border border-white/10'
                  }`}>
                    {st.done ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <Icon className="w-3 h-3" />
                    )}
                  </div>
                  <div>
                    <h2 className={`font-mono font-bold tracking-wider uppercase ${
                      st.active ? 'text-white' : 'text-zinc-600'
                    }`}>
                      {st.title}
                    </h2>
                    <p className={`font-mono text-[11px] ${
                      st.active ? 'text-zinc-400' : 'text-zinc-700'
                    }`}>
                      {st.subtitle}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Spa Information & Refresh Notice */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-[11px] font-mono text-zinc-400">
          <span className="flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5 text-[#01FFFF] animate-spin" />
            Auto-refreshes every 8s
          </span>
          <span>Last sync: {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
        </div>

      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-[10px] font-mono text-zinc-500 border-t border-white/5">
        Kallayi Car Spa & Auto Care • Calicut, Kerala
      </footer>
    </div>
  );
}

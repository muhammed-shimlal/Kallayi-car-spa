'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Crown, Sparkles, CheckCircle2, ShieldCheck, Zap, Loader2 } from 'lucide-react';
import { fetchSubscriptionPlans } from '@/lib/api';
import { toast } from 'sonner';

interface SubscriptionPlan {
  id: number;
  name: string;
  price: number;
  interval_days: number;
  description: string;
  created_at?: string;
}

export function VipTab() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);

  useEffect(() => {
    async function loadPlans() {
      try {
        const data = await fetchSubscriptionPlans();
        setPlans(data || []);
      } catch (err) {
        console.error('Failed to load subscription plans', err);
        toast.error('Unable to fetch live membership plans.');
      } finally {
        setIsLoading(false);
      }
    }
    loadPlans();
  }, []);

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    toast.success(`Selected ${plan.name}. Contact reception or proceed to POS for instant activation!`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="space-y-8"
    >
      <div>
        <div className="flex items-center gap-2">
          <span className="text-yellow-500 text-[10px] font-bold tracking-[0.3em] uppercase">Memberships</span>
          <span className="bg-yellow-500/10 text-yellow-400 text-[10px] font-mono px-2 py-0.5 rounded-full border border-yellow-500/30">
            VIP SYNDICATE
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tighter mt-2 text-white">
          Exclusive VIP Membership Passes
        </h1>
        <p className="text-zinc-400 text-sm mt-1">
          Lock in unlimited luxury car washes, zero wait time queueing, and elite car care privileges.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-96 rounded-[2.5rem] bg-zinc-900/40 border border-white/5 animate-pulse" />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="p-12 text-center bg-zinc-900/40 border border-white/5 rounded-[2.5rem]">
          <Crown className="w-12 h-12 text-yellow-500/40 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-1">No Active VIP Passes</h3>
          <p className="text-xs text-zinc-400">Check back soon for upcoming season pass launches.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, idx) => {
            const isFeatured = idx === 1 || plan.name.toLowerCase().includes('gold') || plan.name.toLowerCase().includes('unlimited');
            const isAnnual = plan.interval_days >= 300 || plan.name.toLowerCase().includes('annual');

            return (
              <motion.div
                key={plan.id}
                whileHover={{ y: -6, scale: 1.02 }}
                transition={{ duration: 0.2 }}
                className={`relative rounded-[2.5rem] p-8 flex flex-col justify-between overflow-hidden shadow-2xl transition-all ${
                  isFeatured
                    ? 'bg-gradient-to-br from-yellow-950/60 via-zinc-900/80 to-black border-2 border-yellow-500/50 shadow-[0_0_40px_rgba(234,179,8,0.15)]'
                    : isAnnual
                    ? 'bg-gradient-to-br from-purple-950/60 via-zinc-900/80 to-black border-2 border-purple-500/40 shadow-[0_0_40px_rgba(168,85,247,0.15)]'
                    : 'bg-gradient-to-br from-zinc-900/90 to-black border border-white/10'
                }`}
              >
                {/* Ambient Decorative Crown */}
                <Crown
                  className={`absolute -right-6 -top-6 w-32 h-32 pointer-events-none ${
                    isFeatured ? 'text-yellow-500/10' : isAnnual ? 'text-purple-500/10' : 'text-white/5'
                  }`}
                />

                <div>
                  {/* Top Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-full border ${
                        isFeatured
                          ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40'
                          : isAnnual
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                          : 'bg-white/5 text-zinc-300 border-white/10'
                      }`}
                    >
                      {plan.interval_days} Days Pass
                    </span>
                    {isFeatured && (
                      <span className="flex items-center gap-1 text-[10px] text-yellow-400 font-bold uppercase tracking-wider">
                        <Sparkles className="w-3 h-3" /> Popular
                      </span>
                    )}
                  </div>

                  <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span
                      className={`text-4xl sm:text-5xl font-black ${
                        isFeatured ? 'text-yellow-400' : isAnnual ? 'text-purple-400' : 'text-[#01FFFF]'
                      }`}
                    >
                      ₹{Number(plan.price).toLocaleString()}
                    </span>
                    <span className="text-xs text-zinc-400 font-medium">
                      / {plan.interval_days >= 360 ? 'yr' : `${plan.interval_days}d`}
                    </span>
                  </div>

                  {/* Description / Perks */}
                  <p className="text-zinc-300 text-xs leading-relaxed mb-6 font-medium">
                    {plan.description || 'Full access to premium spa bays with priority scheduling.'}
                  </p>

                  <div className="space-y-3 pt-4 border-t border-white/10">
                    <div className="flex items-center gap-2 text-xs text-zinc-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Zero Wait Priority Queue</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-300">
                      <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>Free Microfiber Polish Coating</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-300">
                      <Zap className="w-4 h-4 text-yellow-400 shrink-0" />
                      <span>Double Loyalty Reward Points</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6">
                  <button
                    type="button"
                    onClick={() => handleSelectPlan(plan)}
                    className={`w-full py-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all duration-300 active:scale-95 cursor-pointer ${
                      isFeatured
                        ? 'bg-yellow-400 text-black hover:bg-yellow-300 shadow-[0_0_20px_rgba(234,179,8,0.4)]'
                        : isAnnual
                        ? 'bg-purple-500 text-white hover:bg-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.4)]'
                        : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                    }`}
                  >
                    Authorize VIP Pass
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

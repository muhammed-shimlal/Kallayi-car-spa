'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Plus, Edit2, Trash2, Crown, Tag,
  Clock, IndianRupee, Layers, CheckCircle2,
  AlertCircle, RefreshCw, X, Shield, Wrench
} from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchServicePackages,
  fetchSubscriptionPlans,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
  fetchCategories,
  createCategory,
  deleteCategory,
} from '@/lib/api';
import api from '@/lib/api';
import { BODY_TYPE_OPTIONS } from '@/lib/vehicleCatalog';

const ALL_BODY_TYPES = [
  { key: 'HATCHBACK', label: 'Hatchback', icon: '🚗' },
  { key: 'SEDAN', label: 'Sedan', icon: '🚘' },
  { key: 'COMPACT_SUV', label: 'Compact SUV', icon: '🚙' },
  { key: 'SUV', label: 'Full SUV', icon: '🏔️' },
  { key: 'MUV', label: 'MUV', icon: '🚐' },
  { key: 'VAN', label: 'Van', icon: '🚐' },
  { key: 'LUXURY', label: 'Luxury', icon: '✨' },
  { key: 'BIKE', label: 'Bike / Scooter', icon: '🏍️' },
  { key: 'AUTO', label: 'Auto Rickshaw', icon: '🛺' },
  { key: 'TRUCK', label: 'Truck / Commercial', icon: '🚚' },
];

export default function ServicesTab() {
  const [subTab, setSubTab] = useState<'packages' | 'subscriptions' | 'categories'>('packages');

  // ============================================================================
  // 1. SERVICE PACKAGES STATE & CRUD
  // ============================================================================
  const [packages, setPackages] = useState<any[]>([]);
  const [isLoadingPackages, setIsLoadingPackages] = useState(true);
  const [isPkgModalOpen, setIsPkgModalOpen] = useState(false);
  const [editingPkg, setEditingPkg] = useState<any | null>(null);
  const [isSavingPkg, setIsSavingPkg] = useState(false);

  const [pkgForm, setPkgForm] = useState({
    name: '',
    price: '',
    duration_minutes: '45',
    description: '',
    tiered_prices: {
      HATCHBACK: '',
      SEDAN: '',
      COMPACT_SUV: '',
      SUV: '',
      MUV: '',
      VAN: '',
      LUXURY: '',
      BIKE: '',
      AUTO: '',
      TRUCK: '',
    } as Record<string, string>,
  });

  const loadPackages = useCallback(async () => {
    setIsLoadingPackages(true);
    try {
      const res = await api.get('/services');
      const data = res.data;
      const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
      setPackages(list);
    } catch (err: any) {
      console.error('Failed to load services', err);
      toast.error('Failed to load service packages.');
    } finally {
      setIsLoadingPackages(false);
    }
  }, []);

  useEffect(() => {
    loadPackages();
  }, [loadPackages]);

  const openPkgModal = (pkg: any | null = null) => {
    if (pkg) {
      setEditingPkg(pkg);
      const tierMap: Record<string, string> = {
        HATCHBACK: '',
        SEDAN: '',
        COMPACT_SUV: '',
        SUV: '',
        MUV: '',
        VAN: '',
        LUXURY: '',
        BIKE: '',
        AUTO: '',
        TRUCK: '',
      };

      if (pkg.tier_prices && typeof pkg.tier_prices === 'object') {
        Object.entries(pkg.tier_prices).forEach(([k, v]) => {
          tierMap[k.toUpperCase()] = String(v || '');
        });
      } else if (Array.isArray(pkg.tiered_prices)) {
        pkg.tiered_prices.forEach((tp: any) => {
          if (tp.vehicle_type) {
            tierMap[tp.vehicle_type.toUpperCase()] = String(tp.price);
          }
        });
      } else if (Array.isArray(pkg.service_package_prices)) {
        pkg.service_package_prices.forEach((tp: any) => {
          if (tp.vehicle_type) {
            tierMap[tp.vehicle_type.toUpperCase()] = String(tp.price);
          }
        });
      }

      // Default empty to base price
      Object.keys(tierMap).forEach((k) => {
        if (!tierMap[k]) tierMap[k] = String(pkg.price || pkg.base_price || '');
      });

      setPkgForm({
        name: pkg.name,
        price: String(pkg.price || pkg.base_price || ''),
        duration_minutes: String(pkg.duration_minutes || '45'),
        description: pkg.description || '',
        tiered_prices: tierMap,
      });
    } else {
      setEditingPkg(null);
      setPkgForm({
        name: '',
        price: '',
        duration_minutes: '45',
        description: '',
        tiered_prices: {
          HATCHBACK: '',
          SEDAN: '',
          COMPACT_SUV: '',
          SUV: '',
          MUV: '',
          VAN: '',
          LUXURY: '',
          BIKE: '',
          AUTO: '',
          TRUCK: '',
        },
      });
    }
    setIsPkgModalOpen(true);
  };

  const handleApplyBaseToAllTiers = () => {
    const val = pkgForm.price;
    if (!val) {
      toast.error('Please enter a Base Catalog Price first.');
      return;
    }
    const updated: Record<string, string> = {};
    ALL_BODY_TYPES.forEach((t) => {
      updated[t.key] = val;
    });
    setPkgForm((prev) => ({ ...prev, tiered_prices: updated }));
    toast.success('Applied base price to all 10 vehicle body tiers!');
  };

  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pkgForm.name.trim()) {
      toast.error('Please enter package name.');
      return;
    }
    const basePriceNum = parseFloat(pkgForm.price) || 0;
    if (basePriceNum <= 0) {
      toast.error('Please enter a valid base price.');
      return;
    }

    setIsSavingPkg(true);
    const tieredArray = ALL_BODY_TYPES.map((bt) => ({
      vehicle_type: bt.key,
      price: parseFloat(pkgForm.tiered_prices[bt.key]) || basePriceNum,
    }));

    const payload = {
      name: pkgForm.name.trim(),
      price: basePriceNum,
      duration_minutes: parseInt(pkgForm.duration_minutes, 10) || 45,
      description: pkgForm.description.trim(),
      vehicle_type: 'ALL',
      tiered_prices: tieredArray,
      tier_prices: pkgForm.tiered_prices,
    };

    try {
      if (editingPkg) {
        await api.patch(`/services/${editingPkg.id}`, payload);
        toast.success(`Service package "${pkgForm.name}" updated successfully!`);
      } else {
        await api.post('/services', payload);
        toast.success(`Service package "${pkgForm.name}" created successfully!`);
      }
      setIsPkgModalOpen(false);
      loadPackages();
    } catch (err: any) {
      console.error('Save package error:', err);
      const msg = err.response?.data?.error || err.message || 'Failed to save service package.';
      toast.error(msg);
    } finally {
      setIsSavingPkg(false);
    }
  };

  const handleDeletePackage = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${name}"?`)) return;
    try {
      await api.delete(`/services/${id}`);
      toast.success(`Package "${name}" deleted.`);
      setPackages((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      console.error('Delete package error:', err);
      toast.error('Failed to delete package.');
    }
  };

  // ============================================================================
  // 2. SUBSCRIPTION PLANS STATE & CRUD
  // ============================================================================
  const [plans, setPlans] = useState<any[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [isSavingPlan, setIsSavingPlan] = useState(false);

  const [planForm, setPlanForm] = useState({
    name: '',
    price: '',
    interval_days: '30',
    description: '',
  });

  const loadPlans = useCallback(async () => {
    setIsLoadingPlans(true);
    try {
      const data = await fetchSubscriptionPlans();
      setPlans(data || []);
    } catch (err) {
      console.error('Failed to load plans', err);
      toast.error('Failed to load subscription plans.');
    } finally {
      setIsLoadingPlans(false);
    }
  }, []);

  useEffect(() => {
    if (subTab === 'subscriptions') {
      loadPlans();
    }
  }, [subTab, loadPlans]);

  const openPlanModal = (plan: any | null = null) => {
    if (plan) {
      setEditingPlan(plan);
      setPlanForm({
        name: plan.name,
        price: String(plan.price || ''),
        interval_days: String(plan.interval_days || '30'),
        description: plan.description || '',
      });
    } else {
      setEditingPlan(null);
      setPlanForm({
        name: '',
        price: '',
        interval_days: '30',
        description: '',
      });
    }
    setIsPlanModalOpen(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planForm.name.trim() || !planForm.price) {
      toast.error('Please enter plan name and price.');
      return;
    }

    setIsSavingPlan(true);
    const payload = {
      name: planForm.name.trim(),
      price: parseFloat(planForm.price) || 0,
      interval_days: parseInt(planForm.interval_days, 10) || 30,
      description: planForm.description.trim(),
    };

    try {
      if (editingPlan) {
        await updateSubscriptionPlan(editingPlan.id, payload);
        toast.success(`Plan "${planForm.name}" updated!`);
      } else {
        await createSubscriptionPlan(payload);
        toast.success(`Plan "${planForm.name}" created!`);
      }
      setIsPlanModalOpen(false);
      loadPlans();
    } catch (err: any) {
      console.error('Save plan error:', err);
      toast.error('Failed to save subscription plan.');
    } finally {
      setIsSavingPlan(false);
    }
  };

  const handleDeletePlan = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to delete VIP Pass "${name}"?`)) return;
    try {
      await deleteSubscriptionPlan(id);
      toast.success(`Plan "${name}" removed.`);
      setPlans((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      console.error('Delete plan error:', err);
      toast.error('Failed to delete plan.');
    }
  };

  // ============================================================================
  // 3. REVENUE & EXPENSE CATEGORIES STATE & CRUD
  // ============================================================================
  const [categories, setCategories] = useState<{
    revenue_categories: any[];
    expense_categories: any[];
  }>({ revenue_categories: [], expense_categories: [] });
  const [isLoadingCats, setIsLoadingCats] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [catForm, setCatForm] = useState({
    type: 'revenue' as 'revenue' | 'expense',
    name: '',
    description: '',
  });
  const [isSavingCat, setIsSavingCat] = useState(false);

  const loadCategories = useCallback(async () => {
    setIsLoadingCats(true);
    try {
      const data = await fetchCategories();
      setCategories({
        revenue_categories: data?.revenue_categories || [],
        expense_categories: data?.expense_categories || [],
      });
    } catch (err) {
      console.error('Failed to load categories', err);
      toast.error('Failed to load categories.');
    } finally {
      setIsLoadingCats(false);
    }
  }, []);

  useEffect(() => {
    if (subTab === 'categories') {
      loadCategories();
    }
  }, [subTab, loadCategories]);

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catForm.name.trim()) {
      toast.error('Please enter category name.');
      return;
    }

    setIsSavingCat(true);
    try {
      await createCategory(catForm);
      toast.success(`${catForm.type === 'revenue' ? 'Revenue' : 'Expense'} Category "${catForm.name}" created!`);
      setIsCatModalOpen(false);
      setCatForm({ type: 'revenue', name: '', description: '' });
      loadCategories();
    } catch (err) {
      console.error('Create category error:', err);
      toast.error('Failed to create category.');
    } finally {
      setIsSavingCat(false);
    }
  };

  const handleDeleteCategory = async (id: number, name: string, type: 'revenue' | 'expense') => {
    if (!window.confirm(`Delete ${type} category "${name}"?`)) return;
    try {
      await deleteCategory(id, type);
      toast.success(`Category "${name}" deleted.`);
      loadCategories();
    } catch (err) {
      console.error('Delete category error:', err);
      toast.error('Failed to delete category.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header & Sub-Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[#01FFFF] text-[10px] font-bold tracking-[0.2em] uppercase font-mono">
              SYSTEM CATALOG MASTER
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-syncopate tracking-tight text-white">
            Services & Pricing Management
          </h1>
          <p className="text-zinc-400 text-xs mt-1">
            Configure dynamic service packages, 10-body-type price tiers, VIP passes, and financial categories.
          </p>
        </div>

        {/* Sub-tab pills */}
        <div className="flex items-center bg-[#141518] p-1.5 rounded-2xl border border-white/10 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setSubTab('packages')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              subTab === 'packages'
                ? 'bg-[#01FFFF] text-black shadow-[0_0_15px_rgba(1,255,255,0.3)]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Service Packages
          </button>
          <button
            type="button"
            onClick={() => setSubTab('subscriptions')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              subTab === 'subscriptions'
                ? 'bg-yellow-400 text-black shadow-[0_0_15px_rgba(234,179,8,0.3)]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            VIP Passes
          </button>
          <button
            type="button"
            onClick={() => setSubTab('categories')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              subTab === 'categories'
                ? 'bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Categories
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. SERVICE PACKAGES TAB VIEW */}
      {/* ========================================================================= */}
      {subTab === 'packages' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Layers className="w-5 h-5 text-[#01FFFF]" />
              <h2 className="text-lg font-bold font-syncopate text-white">Active Service Packages</h2>
              <span className="bg-[#01FFFF]/10 text-[#01FFFF] text-xs font-mono px-2.5 py-0.5 rounded-full border border-[#01FFFF]/20">
                {packages.length} Packages
              </span>
            </div>
            <button
              type="button"
              onClick={() => openPkgModal(null)}
              className="flex items-center gap-2 bg-[#01FFFF] text-black font-bold text-xs px-5 py-2.5 rounded-xl hover:bg-[#00e6e6] shadow-[0_0_20px_rgba(1,255,255,0.2)] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Service Package
            </button>
          </div>

          {isLoadingPackages ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 rounded-3xl bg-zinc-900/40 border border-white/5 animate-pulse" />
              ))}
            </div>
          ) : packages.length === 0 ? (
            <div className="p-12 text-center bg-[#141518]/60 border border-white/10 rounded-3xl">
              <Layers className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-400 text-sm font-semibold">No service packages registered in PostgreSQL.</p>
              <button
                type="button"
                onClick={() => openPkgModal(null)}
                className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[#01FFFF] bg-[#01FFFF]/10 px-4 py-2 rounded-xl border border-[#01FFFF]/30 hover:bg-[#01FFFF]/20 transition"
              >
                <Plus className="w-4 h-4" /> Create First Package
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {packages.map((pkg) => {
                const tierCount = Array.isArray(pkg.tiered_prices) ? pkg.tiered_prices.length : (pkg.tier_prices ? Object.keys(pkg.tier_prices).length : 0);
                return (
                  <div
                    key={pkg.id}
                    className="bg-[#141518]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex flex-col justify-between hover:border-[#01FFFF]/40 transition-all shadow-xl group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <h3 className="font-syncopate font-bold text-base text-white group-hover:text-[#01FFFF] transition">
                          {pkg.name}
                        </h3>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => openPkgModal(pkg)}
                            className="p-2 rounded-lg bg-white/5 hover:bg-[#01FFFF]/20 text-zinc-400 hover:text-[#01FFFF] transition"
                            title="Edit Package"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePackage(pkg.id, pkg.name)}
                            className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition"
                            title="Delete Package"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-zinc-400 text-xs line-clamp-2 mb-4 leading-relaxed">
                        {pkg.description || 'Standard high quality car wash & care.'}
                      </p>

                      <div className="grid grid-cols-2 gap-2 bg-black/40 p-3 rounded-2xl border border-white/5 mb-4 text-xs font-mono">
                        <div>
                          <span className="text-zinc-500 block text-[10px] uppercase">Base Price</span>
                          <span className="text-white font-bold text-sm">₹{Number(pkg.price || pkg.base_price || 0).toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block text-[10px] uppercase">Est. Duration</span>
                          <span className="text-zinc-300 font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#01FFFF]" /> {pkg.duration_minutes || 45}m
                          </span>
                        </div>
                      </div>

                      {/* Tiered Price Summary Pills */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                          Tier Pricing Matrix ({tierCount} Tiers):
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {ALL_BODY_TYPES.slice(0, 5).map((t) => {
                            const pVal = pkg.tier_prices?.[t.key] || (pkg.tiered_prices?.find((p: any) => p.vehicle_type === t.key)?.price) || pkg.price;
                            return (
                              <span
                                key={t.key}
                                className="text-[10px] font-mono bg-white/5 px-2 py-0.5 rounded border border-white/10 text-zinc-300"
                              >
                                {t.label.split(' ')[0]}: <strong className="text-[#01FFFF]">₹{pVal}</strong>
                              </span>
                            );
                          })}
                          {ALL_BODY_TYPES.length > 5 && (
                            <span className="text-[10px] font-mono bg-white/5 px-2 py-0.5 rounded border border-white/10 text-zinc-400">
                              +{ALL_BODY_TYPES.length - 5} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/5 mt-4 flex items-center justify-between text-xs text-zinc-500">
                      <span>ID #{pkg.id}</span>
                      <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Active in POS & Wizard
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SUBSCRIPTION PLANS TAB VIEW */}
      {/* ========================================================================= */}
      {subTab === 'subscriptions' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Crown className="w-5 h-5 text-yellow-400" />
              <h2 className="text-lg font-bold font-syncopate text-white">VIP Passes & Memberships</h2>
              <span className="bg-yellow-400/10 text-yellow-400 text-xs font-mono px-2.5 py-0.5 rounded-full border border-yellow-400/20">
                {plans.length} Plans
              </span>
            </div>
            <button
              type="button"
              onClick={() => openPlanModal(null)}
              className="flex items-center gap-2 bg-yellow-400 text-black font-bold text-xs px-5 py-2.5 rounded-xl hover:bg-yellow-300 shadow-[0_0_20px_rgba(234,179,8,0.2)] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add VIP Pass
            </button>
          </div>

          {isLoadingPlans ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 rounded-3xl bg-zinc-900/40 border border-white/5 animate-pulse" />
              ))}
            </div>
          ) : plans.length === 0 ? (
            <div className="p-12 text-center bg-[#141518]/60 border border-white/10 rounded-3xl">
              <Crown className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-400 text-sm font-semibold">No VIP passes created yet.</p>
              <button
                type="button"
                onClick={() => openPlanModal(null)}
                className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-yellow-400 bg-yellow-400/10 px-4 py-2 rounded-xl border border-yellow-400/30 hover:bg-yellow-400/20 transition"
              >
                <Plus className="w-4 h-4" /> Create First Pass
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className="bg-gradient-to-br from-yellow-950/20 via-[#141518] to-black border border-yellow-500/20 rounded-3xl p-6 flex flex-col justify-between hover:border-yellow-500/50 transition-all shadow-xl"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <span className="text-[10px] font-bold text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20 uppercase">
                          {plan.interval_days} Days
                        </span>
                        <h3 className="font-syncopate font-bold text-lg text-white mt-2">{plan.name}</h3>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openPlanModal(plan)}
                          className="p-2 rounded-lg bg-white/5 hover:bg-yellow-400/20 text-zinc-400 hover:text-yellow-400 transition"
                          title="Edit Plan"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePlan(plan.id, plan.name)}
                          className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition"
                          title="Delete Plan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="my-4">
                      <span className="text-3xl font-black text-yellow-400 font-mono">
                        ₹{Number(plan.price).toLocaleString()}
                      </span>
                      <span className="text-zinc-500 text-xs"> / {plan.interval_days >= 360 ? 'year' : `${plan.interval_days} days`}</span>
                    </div>

                    <p className="text-zinc-300 text-xs leading-relaxed font-medium">
                      {plan.description || 'All-inclusive premium bay pass with priority booking.'}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-white/5 mt-6 flex items-center justify-between text-xs text-zinc-500">
                    <span>ID #{plan.id}</span>
                    <span className="text-yellow-400/80 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> VIP Syndicate Pass
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. REVENUE & EXPENSE CATEGORIES TAB VIEW */}
      {/* ========================================================================= */}
      {subTab === 'categories' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Tag className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-bold font-syncopate text-white">Revenue & Expense Categories</h2>
            </div>
            <button
              type="button"
              onClick={() => setIsCatModalOpen(true)}
              className="flex items-center gap-2 bg-purple-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl hover:bg-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.2)] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Category
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Revenue Categories */}
            <div className="bg-[#141518]/60 border border-white/10 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                <h3 className="font-syncopate font-bold text-sm text-emerald-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Revenue Streams
                </h3>
                <span className="text-xs font-mono text-zinc-400">{categories.revenue_categories.length} Categories</span>
              </div>
              <div className="space-y-3">
                {categories.revenue_categories.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-3.5 bg-black/40 rounded-2xl border border-white/5">
                    <div>
                      <h4 className="text-xs font-bold text-white">{c.name}</h4>
                      <p className="text-[11px] text-zinc-400">{c.description || 'No description'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(c.id, c.name, 'revenue')}
                      className="p-1.5 text-zinc-500 hover:text-red-400 rounded-lg transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Expense Categories */}
            <div className="bg-[#141518]/60 border border-white/10 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                <h3 className="font-syncopate font-bold text-sm text-red-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-400"></span> Expense Classifications
                </h3>
                <span className="text-xs font-mono text-zinc-400">{categories.expense_categories.length} Categories</span>
              </div>
              <div className="space-y-3">
                {categories.expense_categories.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-3.5 bg-black/40 rounded-2xl border border-white/5">
                    <div>
                      <h4 className="text-xs font-bold text-white">{c.name}</h4>
                      <p className="text-[11px] text-zinc-400">{c.description || 'No description'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(c.id, c.name, 'expense')}
                      className="p-1.5 text-zinc-500 hover:text-red-400 rounded-lg transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: SERVICE PACKAGE ADD / EDIT (WITH FULL 10-TIER MATRIX) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isPkgModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#141518] border border-[#01FFFF]/30 rounded-[2.5rem] p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-6 my-8"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div>
                  <h3 className="text-xl font-bold font-syncopate text-white">
                    {editingPkg ? 'Edit Service Package' : 'Create New Service Package'}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">Configure base details and vehicle body-type tiered pricing.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPkgModalOpen(false)}
                  className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSavePackage} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-zinc-400 uppercase block mb-1.5">Package Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Signature Exterior Wash"
                      value={pkgForm.name}
                      onChange={(e) => setPkgForm({ ...pkgForm, name: e.target.value })}
                      className="w-full bg-black/50 border border-white/10 focus:border-[#01FFFF] rounded-xl px-4 py-3 text-sm text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-zinc-400 uppercase block mb-1.5">Base Catalog Price (₹)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      placeholder="350.00"
                      value={pkgForm.price}
                      onChange={(e) => setPkgForm({ ...pkgForm, price: e.target.value })}
                      className="w-full bg-black/50 border border-white/10 focus:border-[#01FFFF] rounded-xl px-4 py-3 text-sm text-white font-mono outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-zinc-400 uppercase block mb-1.5">Duration (Minutes)</label>
                    <input
                      type="number"
                      required
                      min="5"
                      step="5"
                      placeholder="45"
                      value={pkgForm.duration_minutes}
                      onChange={(e) => setPkgForm({ ...pkgForm, duration_minutes: e.target.value })}
                      className="w-full bg-black/50 border border-white/10 focus:border-[#01FFFF] rounded-xl px-4 py-3 text-sm text-white font-mono outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-zinc-400 uppercase block mb-1.5">Description</label>
                    <textarea
                      rows={2}
                      placeholder="Brief customer-facing description of treatments..."
                      value={pkgForm.description}
                      onChange={(e) => setPkgForm({ ...pkgForm, description: e.target.value })}
                      className="w-full bg-black/50 border border-white/10 focus:border-[#01FFFF] rounded-xl px-4 py-3 text-sm text-white outline-none resize-none"
                    />
                  </div>
                </div>

                {/* 10-Body-Type Tiered Pricing Grid */}
                <div className="bg-black/40 border border-white/10 rounded-2xl p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#01FFFF]">
                        Vehicle Body-Type Tiered Prices (₹)
                      </h4>
                      <p className="text-[10px] text-zinc-400">Custom prices charged per vehicle class at checkout.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleApplyBaseToAllTiers}
                      className="text-[11px] font-bold text-black bg-[#01FFFF] hover:bg-[#00e6e6] px-3 py-1.5 rounded-lg transition self-start sm:self-auto cursor-pointer"
                    >
                      Apply Base to All Tiers
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {ALL_BODY_TYPES.map((bt) => (
                      <div key={bt.key} className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase flex items-center gap-1">
                          <span>{bt.icon}</span> {bt.label}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder={pkgForm.price || '0'}
                          value={pkgForm.tiered_prices[bt.key] || ''}
                          onChange={(e) =>
                            setPkgForm({
                              ...pkgForm,
                              tiered_prices: {
                                ...pkgForm.tiered_prices,
                                [bt.key]: e.target.value,
                              },
                            })
                          }
                          className="w-full bg-black/60 border border-white/10 focus:border-[#01FFFF] rounded-lg px-2.5 py-2 text-xs font-mono text-white outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsPkgModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl border border-white/10 text-xs font-bold text-zinc-400 hover:text-white transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingPkg}
                    className="px-6 py-2.5 rounded-xl bg-[#01FFFF] text-black font-bold text-xs hover:bg-[#00e6e6] shadow-[0_0_20px_rgba(1,255,255,0.3)] transition disabled:opacity-50 cursor-pointer"
                  >
                    {isSavingPkg ? 'Saving...' : editingPkg ? 'Update Package' : 'Create Package'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 2: SUBSCRIPTION PLAN ADD / EDIT */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isPlanModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#141518] border border-yellow-500/30 rounded-[2.5rem] p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div>
                  <h3 className="text-xl font-bold font-syncopate text-white">
                    {editingPlan ? 'Edit VIP Pass' : 'Create VIP Pass'}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">Configure subscription duration, pricing, and benefits.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSavePlan} className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase block mb-1.5">Pass Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Gold Unlimited Monthly Pass"
                    value={planForm.name}
                    onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                    className="w-full bg-black/50 border border-white/10 focus:border-yellow-400 rounded-xl px-4 py-3 text-sm text-white outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-zinc-400 uppercase block mb-1.5">Price (₹)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      placeholder="1999"
                      value={planForm.price}
                      onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })}
                      className="w-full bg-black/50 border border-white/10 focus:border-yellow-400 rounded-xl px-4 py-3 text-sm text-white font-mono outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-zinc-400 uppercase block mb-1.5">Interval Days</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="30"
                      value={planForm.interval_days}
                      onChange={(e) => setPlanForm({ ...planForm, interval_days: e.target.value })}
                      className="w-full bg-black/50 border border-white/10 focus:border-yellow-400 rounded-xl px-4 py-3 text-sm text-white font-mono outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase block mb-1.5">Benefits Description</label>
                  <textarea
                    rows={3}
                    placeholder="List included washes, priority access, discounts..."
                    value={planForm.description}
                    onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                    className="w-full bg-black/50 border border-white/10 focus:border-yellow-400 rounded-xl px-4 py-3 text-sm text-white outline-none resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsPlanModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl border border-white/10 text-xs font-bold text-zinc-400 hover:text-white transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingPlan}
                    className="px-6 py-2.5 rounded-xl bg-yellow-400 text-black font-bold text-xs hover:bg-yellow-300 shadow-[0_0_20px_rgba(234,179,8,0.3)] transition disabled:opacity-50 cursor-pointer"
                  >
                    {isSavingPlan ? 'Saving...' : editingPlan ? 'Update Pass' : 'Create Pass'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 3: CATEGORY ADD */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isCatModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#141518] border border-purple-500/30 rounded-[2.5rem] p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div>
                  <h3 className="text-xl font-bold font-syncopate text-white">Add Financial Category</h3>
                  <p className="text-xs text-zinc-400 mt-1">Classification for invoices or expenses.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCatModalOpen(false)}
                  className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveCategory} className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase block mb-1.5">Category Type</label>
                  <select
                    value={catForm.type}
                    onChange={(e) => setCatForm({ ...catForm, type: e.target.value as 'revenue' | 'expense' })}
                    className="w-full bg-black/50 border border-white/10 focus:border-purple-400 rounded-xl px-4 py-3 text-sm text-white outline-none"
                  >
                    <option value="revenue">Revenue Stream (Invoices)</option>
                    <option value="expense">Expense Category (Operational Costs)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase block mb-1.5">Category Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ceramic Coatings / Water Bill"
                    value={catForm.name}
                    onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                    className="w-full bg-black/50 border border-white/10 focus:border-purple-400 rounded-xl px-4 py-3 text-sm text-white outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase block mb-1.5">Description</label>
                  <input
                    type="text"
                    placeholder="Optional notes..."
                    value={catForm.description}
                    onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                    className="w-full bg-black/50 border border-white/10 focus:border-purple-400 rounded-xl px-4 py-3 text-sm text-white outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsCatModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl border border-white/10 text-xs font-bold text-zinc-400 hover:text-white transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingCat}
                    className="px-6 py-2.5 rounded-xl bg-purple-500 text-white font-bold text-xs hover:bg-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.3)] transition disabled:opacity-50 cursor-pointer"
                  >
                    {isSavingCat ? 'Saving...' : 'Create Category'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

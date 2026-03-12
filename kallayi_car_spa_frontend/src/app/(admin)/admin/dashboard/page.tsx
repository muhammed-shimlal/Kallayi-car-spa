"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  Wallet, 
  Users, 
  Receipt, 
  TrendingUp, 
  LogOut,
  Activity,
  AlertCircle
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";

// Helper to get cookie
function getCookie(name: string) {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
  return null;
}

export default function AdminDashboard() {
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);
  
  const [kpiData, setKpiData] = useState({
    net_profit: 0,
    total_revenue: 0,
    general_expenses: 0,
    labor_cost: 0
  });
  
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentJobs, setRecentJobs] = useState<any[]>([]);

  useEffect(() => {
    const initializeDashboard = async () => {
      const token = getCookie("auth_token");
      
      if (!token) {
        router.push("/login");
        return;
      }

      const headers = {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json"
      };

      try {
        // Fetch User
        const meRes = await fetch("http://127.0.0.1:8001/api/core/users/me/", { headers });
        if (!meRes.ok) throw new Error("Auth failed");
        const meData = await meRes.json();
        setUser(meData);

        // If not admin/manager, perhaps kick them out (optional logic here)

        // Fetch KPIs
        const kpiRes = await fetch("http://127.0.0.1:8001/api/finance/dashboard/kpi_summary/", { headers });
        if (kpiRes.ok) {
          const kpi = await kpiRes.json();
          setKpiData(kpi);
        }

        // Fetch Chart Data
        const chartRes = await fetch("http://127.0.0.1:8001/api/finance/dashboard/revenue_chart/", { headers });
        if (chartRes.ok) {
          const chart = await chartRes.json();
          // Assuming chart returns [{ date: '2023-10-01', revenue: 1200 }, ...]
          setChartData(chart);
        }

        // Fetch Recent Bookings / Jobs
        const jobsRes = await fetch("http://127.0.0.1:8001/api/bookings/", { headers });
        if (jobsRes.ok) {
          const jobsData = await jobsRes.json();
          // Only show top 5 recent jobs
          setRecentJobs(jobsData.results?.slice(0, 5) || jobsData.slice(0, 5) || []);
        }

      } catch (err) {
        console.error("Dashboard fetch error:", err);
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    };

    initializeDashboard();
  }, [router]);

  const handleLogout = () => {
    document.cookie = "auth_token=; path=/; max-age=0";
    router.push("/login");
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);
  };

  // Badge Color logic based on generic status strings
  const getStatusBadge = (status: string) => {
    const s = status?.toUpperCase() || "";
    if (s.includes("PROGRESS") || s.includes("ONGOING")) {
      return "bg-magenta/20 text-magenta border-[0.5px] border-magenta/50";
    }
    if (s.includes("PENDING")) {
      return "bg-orange-500/20 text-orange-400 border-[0.5px] border-orange-500/50";
    }
    if (s.includes("COMPLETED") || s.includes("DONE")) {
      return "bg-cyan/20 text-cyan border-[0.5px] border-cyan/50";
    }
    return "bg-white/10 text-tungsten border-[0.5px] border-white/20";
  };

  return (
    <div className="bg-obsidian min-h-screen text-white font-jakarta relative z-0">
      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 opacity-10 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-magenta/20 via-obsidian to-obsidian" />
      <div className="fixed inset-0 z-0 opacity-10 pointer-events-none bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-cyan/20 via-transparent to-transparent" />

      {/* Top Navigation (Glass HUD) */}
      <nav className="sticky top-0 bg-carbon/60 backdrop-blur-xl border-b border-white/10 px-8 py-4 z-50 flex justify-between items-center shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="font-syncopate font-bold text-lg tracking-widest text-white flex items-center gap-3">
          <Activity className="text-cyan w-5 h-5" />
          KALLAYI <span className="text-magenta text-xs font-grotesk tracking-widest">ADMIN</span>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="font-grotesk text-[10px] text-tungsten uppercase tracking-widest">Logged In As</span>
            <span className="font-syncopate text-sm font-bold text-white">
              {isLoading ? "..." : user?.username || "ADMIN"}
            </span>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <button 
            onClick={handleLogout}
            className="group flex items-center gap-2 text-tungsten hover:text-white transition-colors"
          >
            <span className="font-grotesk text-xs uppercase tracking-widest font-bold group-hover:text-magenta transition-colors">LogOut</span>
            <LogOut className="w-5 h-5 group-hover:text-magenta transition-colors" />
          </button>
        </div>
      </nav>

      <main className="p-8 max-w-[1600px] mx-auto relative z-10 space-y-8">
        
        {/* Header */}
        <header>
          <h1 className="font-syncopate text-3xl md:text-4xl font-bold tracking-widest text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
            COMMAND CENTER
          </h1>
          <p className="font-grotesk text-xs tracking-[0.2em] text-cyan uppercase mt-2 font-semibold">
            System Overview & analytics
          </p>
        </header>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Net Profit */}
          <div className="bg-carbon/40 backdrop-blur-md border border-white/5 rounded-3xl p-6 relative overflow-hidden group hover:bg-white/5 hover:border-cyan/30 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan/10 blur-[50px] rounded-full group-hover:bg-cyan/20 transition-all" />
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-grotesk text-xs tracking-[0.2em] text-tungsten uppercase font-bold relative z-10">Net Profit</h3>
              <div className="bg-cyan/10 p-2 rounded-xl text-cyan relative z-10 border border-cyan/20">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            {isLoading ? <div className="h-10 w-32 bg-white/5 animate-pulse rounded-lg" /> : (
              <div className="font-syncopate text-3xl font-bold text-white relative z-10">{formatCurrency(kpiData.net_profit)}</div>
            )}
          </div>

          {/* Revenue */}
          <div className="bg-carbon/40 backdrop-blur-md border border-white/5 rounded-3xl p-6 relative overflow-hidden group hover:bg-white/5 hover:border-magenta/30 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-magenta/10 blur-[50px] rounded-full group-hover:bg-magenta/20 transition-all" />
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-grotesk text-xs tracking-[0.2em] text-tungsten uppercase font-bold relative z-10">Revenue</h3>
              <div className="bg-magenta/10 p-2 rounded-xl text-magenta relative z-10 border border-magenta/20">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
            {isLoading ? <div className="h-10 w-32 bg-white/5 animate-pulse rounded-lg" /> : (
              <div className="font-syncopate text-3xl font-bold text-white relative z-10">{formatCurrency(kpiData.total_revenue)}</div>
            )}
          </div>

          {/* General Expenses */}
          <div className="bg-carbon/40 backdrop-blur-md border border-white/5 rounded-3xl p-6 relative overflow-hidden group hover:bg-white/5 hover:border-white/20 transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-grotesk text-xs tracking-[0.2em] text-tungsten uppercase font-bold relative z-10">General Expenses</h3>
              <div className="bg-white/5 p-2 rounded-xl text-tungsten relative z-10 border border-white/10">
                <Receipt className="w-5 h-5" />
              </div>
            </div>
            {isLoading ? <div className="h-10 w-32 bg-white/5 animate-pulse rounded-lg" /> : (
              <div className="font-syncopate text-3xl font-bold text-white relative z-10">{formatCurrency(kpiData.general_expenses)}</div>
            )}
          </div>

          {/* Labor Cost */}
          <div className="bg-carbon/40 backdrop-blur-md border border-white/5 rounded-3xl p-6 relative overflow-hidden group hover:bg-white/5 hover:border-white/20 transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-grotesk text-xs tracking-[0.2em] text-tungsten uppercase font-bold relative z-10">Labor Cost</h3>
              <div className="bg-white/5 p-2 rounded-xl text-tungsten relative z-10 border border-white/10">
                <Users className="w-5 h-5" />
              </div>
            </div>
            {isLoading ? <div className="h-10 w-32 bg-white/5 animate-pulse rounded-lg" /> : (
              <div className="font-syncopate text-3xl font-bold text-white relative z-10">{formatCurrency(kpiData.labor_cost)}</div>
            )}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* Left Column (Spans 2/3) */}
          <div className="xl:col-span-2 space-y-8">
            
            {/* Revenue Chart */}
            <div className="bg-carbon/40 backdrop-blur-md border border-white/5 rounded-3xl p-6 relative">
              <h3 className="font-grotesk text-xs tracking-[0.2em] text-tungsten uppercase font-bold mb-6">Revenue Trajectory</h3>
              <div className="h-[300px] w-full">
                {isLoading ? (
                  <div className="w-full h-full bg-white/5 animate-pulse rounded-xl" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      {/* Removing grid lines for clean look */}
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#141518', borderColor: '#333', borderRadius: '12px', color: '#fff', fontFamily: 'var(--font-jakarta)' }}
                        itemStyle={{ color: '#01FFFF', fontWeight: 'bold' }}
                      />
                      <XAxis 
                        dataKey="date" 
                        stroke="#8E939B" 
                        tick={{ fill: '#8E939B', fontSize: 12, fontFamily: 'var(--font-jakarta)' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        stroke="#8E939B" 
                        tick={{ fill: '#8E939B', fontSize: 12, fontFamily: 'var(--font-jakarta)' }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => `₹${val}`}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#01FFFF" 
                        strokeWidth={3}
                        dot={{ fill: '#01FFFF', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, fill: '#FF2A6D', stroke: '#FF2A6D' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Recent Bookings Table */}
            <div className="bg-carbon/40 backdrop-blur-md border border-white/5 rounded-3xl p-6 overflow-hidden relative">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-grotesk text-xs tracking-[0.2em] text-tungsten uppercase font-bold">Live Operations Hub</h3>
                <button className="text-[10px] uppercase tracking-widest text-cyan border border-cyan/20 px-3 py-1.5 rounded-lg hover:bg-cyan/10 transition-colors font-bold">
                  View All
                </button>
              </div>
              
              <div className="overflow-x-auto">
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-12 w-full bg-white/5 animate-pulse rounded-lg" />)}
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="py-3 px-4 font-grotesk text-[10px] tracking-widest text-tungsten uppercase">Job ID</th>
                        <th className="py-3 px-4 font-grotesk text-[10px] tracking-widest text-tungsten uppercase">Vehicle / Reg</th>
                        <th className="py-3 px-4 font-grotesk text-[10px] tracking-widest text-tungsten uppercase">Package</th>
                        <th className="py-3 px-4 font-grotesk text-[10px] tracking-widest text-tungsten uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentJobs.length > 0 ? recentJobs.map((job, idx) => (
                        <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                          <td className="py-4 px-4 font-mono text-sm text-cyan">#{job.id || 'N/A'}</td>
                          <td className="py-4 px-4">
                            <div className="font-syncopate text-xs font-bold text-white">{job.vehicle?.model || 'Unknown Vehicle'}</div>
                            <div className="text-[10px] text-tungsten uppercase mt-1">{job.vehicle?.license_plate || 'No Plate'}</div>
                          </td>
                          <td className="py-4 px-4 font-jakarta text-sm text-white">{job.package?.name || 'Standard Spa'}</td>
                          <td className="py-4 px-4">
                            <span className={`text-[10px] px-2.5 py-1 rounded-md font-bold uppercase tracking-widest font-grotesk ${getStatusBadge(job.status)}`}>
                              {job.status || 'PENDING'}
                            </span>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-tungsten font-jakarta text-sm">
                            No active operations found in the database.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

          </div>

          {/* Right Column (Spans 1/3) */}
          <div className="space-y-8">
            {/* Top Staff / System Alerts */}
            <div className="bg-carbon/40 backdrop-blur-md border border-white/5 rounded-3xl p-6 relative">
              <h3 className="font-grotesk text-xs tracking-[0.2em] text-tungsten uppercase font-bold mb-6 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-magenta" />
                System Alerts
              </h3>
              
              <div className="space-y-4">
                {isLoading ? (
                  <div className="space-y-3">
                    <div className="h-16 w-full bg-white/5 animate-pulse rounded-xl" />
                    <div className="h-16 w-full bg-white/5 animate-pulse rounded-xl" />
                  </div>
                ) : (
                  <>
                    <div className="bg-obsidian border border-white/5 rounded-2xl p-4 flex gap-4 items-start relative overflow-hidden group cursor-pointer hover:border-white/20 transition-colors">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-magenta/50" />
                      <div className="w-10 h-10 rounded-full bg-magenta/10 flex items-center justify-center text-magenta font-syncopate font-bold text-xs flex-shrink-0">
                        OP
                      </div>
                      <div>
                        <div className="font-syncopate text-xs font-bold text-white mb-1">Queue Bottleneck</div>
                        <div className="font-jakarta text-[11px] text-tungsten leading-relaxed">Washing bay 2 is experiencing delays. 3 jobs pending beyond estimated time.</div>
                      </div>
                    </div>

                    <div className="bg-obsidian border border-white/5 rounded-2xl p-4 flex gap-4 items-start relative overflow-hidden group cursor-pointer hover:border-white/20 transition-colors">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan/50" />
                      <div className="w-10 h-10 rounded-full bg-cyan/10 flex items-center justify-center text-cyan font-syncopate font-bold text-xs flex-shrink-0">
                        FI
                      </div>
                      <div>
                        <div className="font-syncopate text-xs font-bold text-white mb-1">Target Reached</div>
                        <div className="font-jakarta text-[11px] text-tungsten leading-relaxed">Daily revenue target of ₹50,000 exceeded by 12%.</div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

             {/* System Status */}
             <div className="bg-gradient-to-br from-carbon to-obsidian border border-white/10 rounded-3xl p-6 relative overflow-hidden">
                <h3 className="font-grotesk text-xs tracking-[0.2em] text-tungsten uppercase font-bold mb-4">Core Integrity</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-[10px] font-grotesk uppercase tracking-widest text-cyan mb-1 font-bold">
                      <span>Server Status</span>
                      <span>99.9%</span>
                    </div>
                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan w-[99.9%] rounded-full shadow-[0_0_10px_rgba(1,255,255,0.8)]" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-grotesk uppercase tracking-widest text-magenta mb-1 font-bold">
                      <span>API Latency</span>
                      <span>42ms</span>
                    </div>
                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-magenta w-[15%] rounded-full shadow-[0_0_10px_rgba(255,42,109,0.8)]" />
                    </div>
                  </div>
                </div>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
}

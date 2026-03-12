"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  CarFront,
  User,
  LogOut,
  Search,
  Filter,
  ArrowUpRight,
  Wallet,
  Receipt,
  Users,
  MoreHorizontal
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
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
  const [user, setUser] = useState<{ first_name?: string; username: string; role: string } | null>(null);
  
  const [kpiData, setKpiData] = useState({
    net_profit_today: 0,
    revenue_today: 0,
    general_expenses_today: 0,
    labor_cost_today: 0,
    chemical_cost_today: 0
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

        // Fetch KPIs
        const kpiRes = await fetch("http://127.0.0.1:8001/api/finance/dashboard/kpi_summary/", { headers });
        if (kpiRes.ok) {
          const kpi = await kpiRes.json();
          // Fallback to older keys if API hasn't been updated to match the HTML script yet
          setKpiData({
            net_profit_today: kpi.net_profit_today || kpi.net_profit || 0,
            revenue_today: kpi.revenue_today || kpi.total_revenue || 0,
            general_expenses_today: kpi.general_expenses_today || kpi.general_expenses || 0,
            labor_cost_today: kpi.labor_cost_today || kpi.labor_cost || 0,
            chemical_cost_today: kpi.chemical_cost_today || 0
          });
        }

        // Fetch Chart Data
        const chartRes = await fetch("http://127.0.0.1:8001/api/finance/dashboard/revenue_chart/", { headers });
        if (chartRes.ok) {
          const chart = await chartRes.json();
          // Format dates for display
          const formattedChart = chart.map((d: any) => {
             const dateObj = new Date(d.date);
             return {
                 ...d,
                 displayDate: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
             };
          });
          setChartData(formattedChart);
        }

        // Fetch Recent Bookings / Jobs
        const jobsRes = await fetch("http://127.0.0.1:8001/api/bookings/", { headers });
        if (jobsRes.ok) {
          const jobsData = await jobsRes.json();
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

  const getStatusBadge = (status: string) => {
    const s = status?.toUpperCase() || "";
    if (s.includes("COMPLETED") || s.includes("DONE")) {
      return <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">Success</span>;
    }
    if (s.includes("PROGRESS") || s.includes("ONGOING")) {
      return <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">In Progress</span>;
    }
    return <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold">Pending</span>;
  };

  return (
    <div className="bg-gray-50 min-h-screen text-gray-800 font-sans">
      
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 text-xl font-black tracking-tight text-gray-900">
            <div className="bg-gray-900 text-white p-1.5 rounded-lg">
              <CarFront className="w-5 h-5" />
            </div>
            Kallayi<span className="font-normal text-gray-500">Admin</span>
          </div>
          
          <div className="hidden lg:flex items-center gap-6 text-sm font-semibold text-gray-500 ml-8">
            <a href="#" className="text-black">Overview</a>
            <a href="#" className="hover:text-black transition">Finance</a>
            <a href="#" className="hover:text-black transition">Bookings</a>
            <a href="#" className="hover:text-black transition">Fleet</a>
            <a href="#" className="hover:text-black transition">Staff</a>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-3 pr-4 border-r border-gray-200">
            <div className="text-right">
              <p className="text-sm font-bold text-gray-900">
                {isLoading ? "Loading..." : (user?.first_name || user?.username || "Admin")}
              </p>
              <p className="text-xs text-gray-500">Administrator</p>
            </div>
            <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center text-gray-500">
              <User className="w-5 h-5" />
            </div>
          </div>
          <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 transition">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </nav>

      <main className="max-w-[1400px] mx-auto p-6 md:p-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
            <p className="text-gray-500 text-sm mt-1">Monitor daily activities and financial health of your spa.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search now..." 
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black w-64 transition"
              />
            </div>
            <button className="bg-black text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-gray-800 transition">
              <Filter className="w-4 h-4" /> Filter By
            </button>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
            <p className="text-gray-500 text-sm font-semibold mb-2">Net Profit Today</p>
            <div className="flex items-baseline gap-3">
              <h2 className="text-3xl font-black text-gray-900">
                {isLoading ? "..." : formatCurrency(kpiData.net_profit_today)}
              </h2>
              <span className="text-xs font-bold text-green-500 bg-green-50 px-2 py-1 rounded-md flex items-center">
                <ArrowUpRight className="w-3 h-3 mr-1" /> Today
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex justify-between items-center">
            <div>
              <p className="text-gray-500 text-sm font-semibold mb-1">Total Revenue</p>
              <h3 className="text-2xl font-bold text-gray-900">
                {isLoading ? "..." : formatCurrency(kpiData.revenue_today)}
              </h3>
            </div>
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center border border-gray-100">
              <Wallet className="w-5 h-5 text-gray-600" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex justify-between items-center">
            <div>
              <p className="text-gray-500 text-sm font-semibold mb-1">General Expenses</p>
              <h3 className="text-2xl font-bold text-gray-900">
                {isLoading ? "..." : formatCurrency(kpiData.general_expenses_today)}
              </h3>
            </div>
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center border border-gray-100">
              <Receipt className="w-5 h-5 text-gray-600" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex justify-between items-center">
            <div>
              <p className="text-gray-500 text-sm font-semibold mb-1">Labor Cost</p>
              <h3 className="text-2xl font-bold text-gray-900">
                {isLoading ? "..." : formatCurrency(kpiData.labor_cost_today)}
              </h3>
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center border border-green-100">
              <Users className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>

        {/* Main Content Areas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-8">
            
            {/* Chart Section */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-gray-900 text-lg">Transaction Activity</h3>
                <div className="flex items-center gap-4 text-sm font-medium text-gray-500">
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-black"></div> Revenue
                  </span>
                </div>
              </div>
              <div className="h-64 w-full">
                {isLoading ? (
                  <div className="w-full h-full bg-gray-100 animate-pulse rounded-xl" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#000000" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#000000" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="displayDate" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#9CA3AF', fontSize: 12 }} 
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#9CA3AF', fontSize: 12 }} 
                        tickFormatter={(val) => `₹${val}`}
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ color: '#000', fontWeight: 'bold' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="value" // Adjust if your api uses "revenue" instead of "value"
                        stroke="#000000" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorRevenue)" 
                        activeDot={{ r: 6, fill: '#000', stroke: '#fff', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Recent Bookings Table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-bold text-gray-900 text-lg">Recent Bookings</h3>
                <button className="text-gray-400 hover:text-black transition">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
                    <tr>
                      <th className="py-3 px-6">ID</th>
                      <th className="py-3 px-6">Vehicle / Package</th>
                      <th className="py-3 px-6">Status</th>
                      <th className="py-3 px-6">Tech</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700 font-medium">
                    {isLoading ? (
                      <tr><td colSpan={4} className="py-8 px-6 text-center text-gray-400 animate-pulse">Loading bookings...</td></tr>
                    ) : recentJobs.length === 0 ? (
                      <tr><td colSpan={4} className="py-8 px-6 text-center text-gray-400">No recent bookings found.</td></tr>
                    ) : (
                      recentJobs.map((b, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 transition border-b border-gray-50 last:border-0">
                          <td className="py-4 px-6 text-gray-500">#{b.id}</td>
                          <td className="py-4 px-6">
                            <p className="font-bold text-gray-900">{b.service_package_details?.name || b.package?.name || 'Wash'}</p>
                            <p className="text-xs text-gray-500">{b.vehicle_info || b.vehicle?.model || 'Unknown'}</p>
                          </td>
                          <td className="py-4 px-6">
                            {getStatusBadge(b.status)}
                          </td>
                          <td className="py-4 px-6 text-sm">
                            {b.technician_name ? b.technician_name : <span className="text-gray-400">Unassigned</span>}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            
            {/* Chemical Cost Target */}
            <div className="bg-[#1C1C1E] text-white rounded-2xl shadow-lg p-8 relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-40 h-40 border-[20px] border-white/5 rounded-full"></div>
              
              <p className="text-gray-400 font-semibold text-sm mb-1 z-10 relative">Total Chemical Cost Today</p>
              <h2 className="text-4xl font-black z-10 relative">
                {isLoading ? "..." : formatCurrency(kpiData.chemical_cost_today)}
              </h2>
              
              <div className="mt-8 z-10 relative">
                <div className="flex justify-between text-xs font-bold text-gray-400 mb-2">
                  <span>Usage Target</span>
                  <span>Safe</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div className="bg-green-400 h-2 rounded-full" style={{ width: '35%' }}></div>
                </div>
              </div>
            </div>

            {/* Top Staff Leaderboard */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-gray-900 text-lg">Top Staff</h3>
                <button className="text-gray-400 hover:text-black transition">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">AM</div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">Alexander Munle</p>
                      <p className="text-xs text-gray-500">Sr. Detailer</p>
                    </div>
                  </div>
                  <span className="font-bold text-sm">₹2,386</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-sm">DR</div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">Dianne Russell</p>
                      <p className="text-xs text-gray-500">Washer</p>
                    </div>
                  </div>
                  <span className="font-bold text-sm">₹2,142</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center font-bold text-sm">BS</div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">Brooklyn Simmons</p>
                      <p className="text-xs text-gray-500">Driver</p>
                    </div>
                  </div>
                  <span className="font-bold text-sm">₹1,494</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
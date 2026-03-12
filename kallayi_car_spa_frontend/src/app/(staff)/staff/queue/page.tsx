"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import api from "@/lib/api";
import { LogOut, RefreshCw, Car, CheckCircle2, PlayCircle, Loader2 } from "lucide-react";

export default function StaffQueue() {
  const router = useRouter();
  
  const [userName, setUserName] = useState("Staff");
  const [userId, setUserId] = useState<number | null>(null);
  const [todayEarnings, setTodayEarnings] = useState(0);
  
  const [jobs, setJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<number | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);

      // 1. Get User Profile
      const userRes = await api.get("core/users/me/");
      setUserName(userRes.data.first_name || userRes.data.username);
      setUserId(userRes.data.id);
      
      const currentUserId = userRes.data.id;

      // 2. Get Daily Stats
      try {
        const statsRes = await api.get("staff/dashboard/my_stats/");
        setTodayEarnings(statsRes.data.today_earnings || 0);
      } catch (e) {
        console.error("Could not fetch stats:", e);
      }

      // 3. Get Active Jobs
      // Based on the ERP spec, jobs for a technician can be filtered via technician_id
      try {
        const jobsRes = await api.get(`driver-jobs/?technician_id=${currentUserId}`);
        setJobs(jobsRes.data);
      } catch (e) {
        console.error("Could not fetch jobs:", e);
      }

    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 401) {
        router.push("/login");
      }
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const token = Cookies.get("auth_token");
    if (!token) {
      router.push("/login");
      return;
    }

    fetchDashboardData();
    
    // Auto refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboardData, router]);

  const updateJobStatus = async (jobId: number, newStatus: string) => {
    try {
      setIsUpdating(jobId);
      await api.post(`driver-jobs/${jobId}/update_status/`, { status: newStatus });
      await fetchDashboardData();
    } catch (err) {
      console.error("Failed to update status", err);
      // In a real app we'd show a toast here
      alert("Failed to update status. Please try again.");
    } finally {
      setIsUpdating(null);
    }
  };

  const handleLogout = () => {
    Cookies.remove("auth_token");
    router.push("/login");
  };

  if (isLoading && jobs.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
        <p className="text-xl font-bold text-gray-600">Loading your queue...</p>
      </div>
    );
  }

  const activeJob = jobs.find(j => j.status === "IN_PROGRESS");
  const pendingJobs = jobs.filter(j => j.status === "PENDING");

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col pb-24 font-sans text-gray-900">
      
      {/* Header Area */}
      <div className="bg-black text-white p-6 rounded-b-[2rem] shadow-lg mb-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-1">Floor Operations</p>
            <h1 className="text-3xl font-extrabold truncate">Hey, {userName}</h1>
          </div>
          <button 
            onClick={handleLogout}
            className="p-4 bg-gray-800 rounded-2xl hover:bg-red-600 transition-colors"
          >
            <LogOut size={28} />
          </button>
        </div>

        <div className="bg-gray-800 p-6 rounded-3xl flex justify-between items-center">
          <div>
            <p className="text-gray-400 font-medium mb-1">Today's Earnings</p>
            <p className="text-4xl font-black text-green-400">₹{todayEarnings}</p>
          </div>
          <button 
            onClick={() => fetchDashboardData()} 
            className="p-4 bg-black rounded-2xl border border-gray-700 active:scale-95 transition-transform"
          >
            <RefreshCw size={28} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="px-4 space-y-8 flex-1">
        
        {/* Current Active Job Section */}
        {activeJob && (
          <section>
            <h2 className="text-xl font-black uppercase text-gray-500 tracking-wider mb-4 ml-2 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span>
              Currently Working On
            </h2>
            
            <div className="bg-white rounded-[2rem] p-6 shadow-xl border-4 border-blue-500">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="bg-blue-100 text-blue-800 font-black text-xl px-4 py-2 rounded-xl inline-block mb-3">
                    {activeJob.vehicle_plate}
                  </div>
                  <h3 className="text-3xl font-black leading-tight">{activeJob.vehicle_model}</h3>
                  <p className="text-gray-500 font-medium text-lg mt-1">{activeJob.service_package_name}</p>
                </div>
                <div className="bg-gray-100 p-4 rounded-2xl">
                  <Car size={36} className="text-gray-400" />
                </div>
              </div>

              <button
                onClick={() => updateJobStatus(activeJob.id, "COMPLETED")}
                disabled={isUpdating === activeJob.id}
                className="w-full bg-[#3b8a54] active:bg-[#2c683f] text-white py-8 rounded-[2rem] text-2xl font-black shadow-lg shadow-green-500/30 flex items-center justify-center gap-4 transition-transform active:scale-95"
              >
                {isUpdating === activeJob.id ? (
                  <Loader2 className="animate-spin" size={32} />
                ) : (
                  <>
                    <CheckCircle2 size={36} />
                    MARK AS READY
                  </>
                )}
              </button>
            </div>
          </section>
        )}

        {/* Up Next Queue Section */}
        <section>
          <h2 className="text-xl font-black uppercase text-gray-500 tracking-wider mb-4 ml-2">
            Up Next In Queue ({pendingJobs.length})
          </h2>

          {pendingJobs.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center shadow-sm border border-gray-200">
              <div className="bg-gray-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4">
                <Car size={40} className="text-gray-300" />
              </div>
              <p className="text-xl font-bold text-gray-400">Queue is empty!</p>
              <p className="text-gray-400 font-medium mt-2">Time for a break or check back soon.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingJobs.map(job => (
                <div key={job.id} className="bg-white rounded-[2rem] p-5 shadow-sm border border-gray-200 flex flex-col gap-5">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-2xl font-black">{job.vehicle_plate}</h3>
                      <p className="text-gray-500 font-bold">{job.service_package_name}</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => updateJobStatus(job.id, "IN_PROGRESS")}
                    disabled={isUpdating === job.id || activeJob !== undefined}
                    className="w-full bg-blue-600 active:bg-blue-800 disabled:bg-gray-300 disabled:text-gray-500 text-white py-6 rounded-2xl text-xl font-black flex items-center justify-center gap-3 transition-transform active:scale-95"
                  >
                    {isUpdating === job.id ? (
                      <Loader2 className="animate-spin" size={28} />
                    ) : (
                      <>
                        <PlayCircle size={28} />
                        START WASHING
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}

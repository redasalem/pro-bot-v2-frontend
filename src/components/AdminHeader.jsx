import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { NavLink, useNavigate } from "react-router-dom";
import { Activity, ClipboardList, LogOut, RefreshCw, Shield } from "lucide-react";
import { clearToken } from "../lib/auth";
import { getTelemetryStatus, refreshTelemetry } from "../api/applications";

export default function AdminHeader({ user }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const logout = () => {
    clearToken();
    queryClient.clear();
    navigate("/login", { replace: true });
  };

  const { data: telemetry } = useQuery({
    queryKey: ["telemetry-status"],
    queryFn: getTelemetryStatus,
    refetchInterval: 15000,
    retry: false,
  });

  const refresh = useMutation({
    mutationFn: refreshTelemetry,
    onSuccess: (data) => {
      queryClient.setQueryData(["telemetry-status"], data);
    },
  });

  const poolCount = telemetry?.usable ?? null;
  const isRefilling = telemetry?.refilling ?? false;

  let poolTheme = { wrapper: "bg-gray-50 text-gray-500", dot: "bg-gray-400" };
  if (poolCount !== null) {
    if (poolCount >= 3) poolTheme = { wrapper: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20", dot: "bg-emerald-500 text-emerald-500" };
    else if (poolCount >= 1) poolTheme = { wrapper: "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20", dot: "bg-amber-500 text-amber-500" };
    else poolTheme = { wrapper: "bg-red-50 text-red-700 ring-1 ring-red-600/20", dot: "bg-red-500 text-red-500" };
  }

  return (
    <header className="max-w-7xl mx-auto mt-4 px-5 py-4 bg-white border border-gray-200 rounded-3xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-6" dir="rtl">
      
      {/* Brand */}
      <div className="flex items-center gap-3 font-bold whitespace-nowrap">
        <span className="flex items-center justify-center w-10 h-10 bg-ink text-cyan rounded-xl text-lg shadow-sm">K</span>
        <div className="flex flex-col">
          <span className="text-ink leading-tight">Khaleeji Bot</span>
          <small className="text-orange text-[10px] tracking-widest uppercase font-bold mt-0.5">Admin Controller</small>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex items-center gap-2" aria-label="التنقل الرئيسي">
        <NavLink 
          to="/dashboard" 
          className={({ isActive }) => `flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${isActive ? "bg-ink text-cyan shadow-md" : "text-gray-500 hover:bg-gray-50 hover:text-ink"}`}
        >
          <ClipboardList size={18} />
          الطلبات
        </NavLink>
        <NavLink 
          to="/prometric-events" 
          className={({ isActive }) => `flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${isActive ? "bg-ink text-cyan shadow-md" : "text-gray-500 hover:bg-gray-50 hover:text-ink"}`}
        >
          <Activity size={18} />
          سجل Prometric
        </NavLink>
      </nav>

      {/* Session & Actions */}
      <div className="flex items-center gap-4 text-sm text-gray-500 font-semibold w-full md:w-auto justify-between md:justify-end">
        {poolCount !== null && (
          <button
            onClick={() => !refresh.isPending && refresh.mutate()}
            disabled={refresh.isPending}
            title={`Telemetry Pool: ${poolCount} payload(s)${isRefilling ? " — refilling…" : ""}\nTotal issued: ${telemetry?.issuedTotal ?? 0}`}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-extrabold transition-all hover-scale disabled:opacity-50 disabled:pointer-events-none ${poolTheme.wrapper}`}
          >
            <Shield size={14} />
            <span className={`w-2 h-2 rounded-full telemetry-dot ${poolTheme.dot} ${isRefilling ? 'animate-pulse' : ''}`} />
            {poolCount}
            {isRefilling && <RefreshCw size={12} className="animate-spin" />}
          </button>
        )}

        <span className="truncate max-w-[120px]">{user?.name || user?.email}</span>
        
        <button 
          onClick={logout} 
          className="flex items-center gap-2 px-4 py-2 bg-orange-dark/10 text-orange-dark hover:bg-orange hover:text-white rounded-xl font-bold transition-all"
        >
          <LogOut size={16} />
          خروج
        </button>
      </div>

    </header>
  );
}

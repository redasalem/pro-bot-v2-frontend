import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { NavLink, useNavigate } from "react-router-dom";
import { Activity, ClipboardList, LogOut, RefreshCw, Shield, Search } from "lucide-react";
import { clearToken } from "../lib/auth";
import { getTelemetryStatus, refreshTelemetry } from "../api/applications";

export default function AdminHeader({ user, searchQuery, onSearchChange }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const searchRef = useRef(null);

  const logout = () => {
    clearToken();
    queryClient.clear();
    navigate("/login", { replace: true });
  };

  // ── Global Ctrl+K / ⌘K shortcut ─────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── Telemetry pool query ─────────────────────────────────────────
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

  // ── Telemetry theme (green / amber / red / gray) ─────────────────
  let poolTheme = { wrapper: "bg-gray-50 text-gray-500 ring-1 ring-gray-200", dot: "bg-gray-400", label: "Telemetry Pool" };
  if (poolCount !== null) {
    if (poolCount >= 3) poolTheme = { wrapper: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20", dot: "bg-emerald-500", label: "Active" };
    else if (poolCount >= 1) poolTheme = { wrapper: "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20", dot: "bg-amber-500", label: "Low" };
    else poolTheme = { wrapper: "bg-red-50 text-red-700 ring-1 ring-red-600/20", dot: "bg-red-500", label: "Depleted" };
  }
  if (isRefilling) poolTheme.label = "Warming…";

  const isMac = typeof navigator !== "undefined" && /Mac/i.test(navigator.userAgent);

  return (
    <header className="max-w-7xl mx-auto mt-4 px-5 py-4 bg-white border border-gray-200 rounded-3xl shadow-sm flex flex-col gap-5" dir="rtl">

      {/* ── Top row: Brand + Nav + Session ──────────────────────────── */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">

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
        <div className="flex items-center gap-3 text-sm text-gray-500 font-semibold w-full md:w-auto justify-between md:justify-end">

          {/* Live Telemetry Status */}
          {poolCount !== null && (
            <button
              onClick={() => !refresh.isPending && refresh.mutate()}
              disabled={refresh.isPending}
              title={`Telemetry Pool: ${poolCount} payload(s)${isRefilling ? " — refilling…" : ""}\nTotal issued: ${telemetry?.issuedTotal ?? 0}`}
              className={`flex items-center gap-2.5 px-3.5 py-2 rounded-full text-xs font-extrabold transition-all hover-scale disabled:opacity-50 disabled:pointer-events-none ${poolTheme.wrapper}`}
            >
              <Shield size={14} />
              {/* Animated ping dot */}
              <span className="relative flex h-2.5 w-2.5">
                <span className={`status-pulse absolute inset-0 rounded-full ${poolTheme.dot}`} />
                <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${poolTheme.dot}`} />
              </span>
              <span className="hidden sm:inline">Akamai:</span>
              <span>{poolTheme.label}</span>
              <span className="font-mono tabular-nums">({poolCount})</span>
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
      </div>

      {/* ── Search & Command Bar ────────────────────────────────────── */}
      <div className="relative w-full">
        <label className="relative flex items-center bg-paper border border-gray-200 rounded-2xl px-4 py-2.5 gap-3 focus-within:ring-4 focus-within:ring-cyan/15 focus-within:border-cyan-dark transition-all">
          <Search size={18} className="text-gray-400 shrink-0" />
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="بحث بالاسم، الإيميل، رقم الأحقية، رقم التأكيد، كود الاختبار..."
            className="flex-1 bg-transparent border-none outline-none text-sm font-semibold text-ink placeholder:text-gray-400"
            dir="rtl"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="text-gray-400 hover:text-ink transition-colors text-xs font-bold px-1.5"
              aria-label="مسح البحث"
            >
              ✕
            </button>
          )}
          <div className="hidden sm:flex items-center gap-1 shrink-0 mr-1">
            <kbd className="kbd">{isMac ? "⌘" : "Ctrl"}</kbd>
            <kbd className="kbd">K</kbd>
          </div>
        </label>
      </div>

    </header>
  );
}

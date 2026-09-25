import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { NavLink, useNavigate } from "react-router-dom";
import { Activity, ClipboardList, LogOut, RefreshCw, Shield, Search } from "lucide-react";
import { clearToken } from "../lib/auth";
import { logoutRequest } from "../api/auth";
import { getTelemetryStatus, refreshTelemetry } from "../api/applications";

export default function AdminHeader({ user, searchQuery, onSearchChange }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const searchRef = useRef(null);

  const logout = async () => {
    try {
      await logoutRequest();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      clearToken();
      queryClient.clear();
      navigate("/login", { replace: true });
    }
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
    <header className="sticky top-4 z-50 max-w-7xl mx-auto px-5 py-4 glass-panel rounded-3xl flex flex-col gap-5 transition-all duration-300" dir="rtl">

      {/* ── Top row: Brand + Nav + Session ──────────────────────────── */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">

        {/* Brand */}
        <div className="flex items-center gap-3 font-bold whitespace-nowrap group">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-ink-soft to-ink text-cyan shadow-md hover-scale overflow-hidden">
            <span className="relative z-10 text-xl font-black">K</span>
            <div className="absolute inset-0 bg-cyan opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-md"></div>
          </div>
          <div className="flex flex-col">
            <span className="text-ink leading-tight">Khaleeji Bot</span>
            <small className="bg-gradient-to-r from-orange to-orange-dark bg-clip-text text-transparent text-[10px] tracking-widest uppercase font-black mt-0.5">Admin Controller</small>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-2 bg-gray-100/50 p-1 rounded-2xl border border-gray-200/60" aria-label="التنقل الرئيسي">
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${isActive ? "bg-white text-ink shadow-[0_2px_10px_rgb(0,0,0,0.06)]" : "text-gray-500 hover:text-ink hover:bg-white/50"}`}
          >
            <ClipboardList size={18} />
            الطلبات
          </NavLink>
          <NavLink
            to="/prometric-events"
            className={({ isActive }) => `flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${isActive ? "bg-white text-ink shadow-[0_2px_10px_rgb(0,0,0,0.06)]" : "text-gray-500 hover:text-ink hover:bg-white/50"}`}
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
              className={`flex items-center gap-2.5 px-3.5 py-2 rounded-full text-xs font-extrabold transition-all hover-scale disabled:opacity-50 disabled:pointer-events-none shadow-sm ${poolTheme.wrapper}`}
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

          <span className="truncate max-w-[120px] ml-2 text-ink-soft">{user?.name || user?.email}</span>

          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-dark hover:bg-orange hover:text-white rounded-xl font-bold transition-all shadow-sm"
          >
            <LogOut size={16} />
            خروج
          </button>
        </div>
      </div>

      {/* ── Search & Command Bar ────────────────────────────────────── */}
      <div className="relative w-full group">
        <label className="relative flex items-center bg-gray-50/50 backdrop-blur-md border border-gray-200/80 rounded-2xl px-4 py-2.5 gap-3 focus-within:bg-white focus-within:ring-4 focus-within:ring-cyan/15 focus-within:border-cyan transition-all duration-300 shadow-sm focus-within:shadow-md">
          <Search size={18} className="text-gray-400 shrink-0 group-focus-within:text-cyan transition-colors" />
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

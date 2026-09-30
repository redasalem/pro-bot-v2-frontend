import { CHECKOUT_FLOW_AVAILABLE } from "../lib/checkoutReadiness";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  RefreshCw,
  Inbox,
  LoaderCircle,
  SearchX,
  LayoutGrid,
  AlertTriangle,
  CircleCheck,
  XCircle,
  Activity,
  Zap,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { getMe } from "../api/auth";
import { getAllApplications, getAdminSummary, triggerImmediateScan, getActiveStatus } from "../api/applications";
import {
  ACTIVE_AUTOMATION_STATES,
  RETRYABLE_SEARCH_CODES,
  STATE_FILTER_GROUPS,
} from "../lib/constants";
import Applicationcard from "../components/Applicationcard";
import AdminHeader from "../components/AdminHeader";

// ── Helpers ────────────────────────────────────────────────────────────
const isRunning = (app) => {
  const automation = app.automation || {};
  if (automation.nextAttemptAt) return true;
  if (automation.activeJobId) return true;
  if (automation.lastError?.code && !RETRYABLE_SEARCH_CODES.includes(automation.lastError.code) && automation.lastError?.code !== "PROMETRIC_TELEMETRY_UNAVAILABLE") return false;
  if (ACTIVE_AUTOMATION_STATES.includes(automation.state)) return true;
  return CHECKOUT_FLOW_AVAILABLE && automation.state === "manual_payment_required" && !automation.prometricCheckoutUrl;
};

const FILTER_TAB_ICONS = {
  grid: LayoutGrid,
  alert: AlertTriangle,
  loader: LoaderCircle,
  check: CircleCheck,
  x: XCircle,
};

// ── Skeleton Card ──────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="flex flex-col gap-6 p-7 bg-white border border-gray-200 rounded-3xl border-r-[6px] border-r-gray-200">
      {/* Header skeleton */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
        <div className="flex flex-col gap-3 flex-1">
          <div className="flex gap-2">
            <div className="skeleton h-6 w-20 rounded-full" />
            <div className="skeleton h-6 w-24 rounded-full" />
          </div>
          <div className="skeleton h-6 w-72 max-w-full" />
          <div className="skeleton h-4 w-56 max-w-full" />
        </div>
        <div className="skeleton h-7 w-28 rounded-full" />
      </div>
      {/* Status skeleton */}
      <div className="flex items-start gap-4 p-5 rounded-2xl bg-gray-50 border border-gray-100">
        <div className="skeleton h-11 w-11 rounded-xl shrink-0" />
        <div className="flex flex-col gap-2 flex-1">
          <div className="skeleton h-4 w-48 max-w-full" />
          <div className="skeleton h-3 w-64 max-w-full" />
        </div>
      </div>
      {/* Workflow skeleton */}
      <div className="flex flex-col gap-4 p-5 border border-gray-100 rounded-2xl">
        <div className="flex justify-between">
          <div className="skeleton h-3 w-24" />
          <div className="skeleton h-3 w-14" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-gray-50">
              <div className="skeleton h-7 w-7 rounded-full" />
              <div className="skeleton h-3 w-12" />
            </div>
          ))}
        </div>
      </div>
      {/* Facts skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2 p-3.5 rounded-xl bg-gray-50">
            <div className="skeleton h-3 w-16" />
            <div className="skeleton h-5 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonStat() {
  return (
    <div className="flex flex-col justify-center bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
      <div className="skeleton h-8 w-12 mb-2" />
      <div className="skeleton h-3 w-20" />
    </div>
  );
}

// ── Bot Status Bar ───────────────────────────────────────────────────────
function BotStatusBar({ applications, isFetching, refetch }) {
  const isBotActive = applications.some(isRunning);
  
  // Get most recent check time across all apps
  const lastChecked = applications.reduce((latest, app) => {
    if (app.automation?.lastCheckedAt) {
      const d = new Date(app.automation.lastCheckedAt).getTime();
      if (d > latest) return d;
    }
    return latest;
  }, 0);

  const handleImmediateScan = () => {
    const promise = triggerImmediateScan().then(() => refetch());
    toast.promise(promise, {
      loading: "جارٍ إرسال أمر فحص فوري...",
      success: "تم تحفيز الفحص الفوري بنجاح، البوت سيبحث الآن",
      error: "حدث خطأ أثناء تشغيل الفحص",
    });
  };

  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-5 mb-2 bg-white border border-gray-200 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
      <div className="flex items-center gap-4 w-full md:w-auto">
        <div className={`flex items-center justify-center w-12 h-12 rounded-full transition-colors duration-500 ${isBotActive ? "bg-cyan/10 text-cyan-700 ring-2 ring-cyan/20 ring-offset-2" : "bg-gray-100 text-gray-500"}`}>
          {isBotActive ? <LoaderCircle size={24} className="animate-spin" /> : <Activity size={24} />}
        </div>
        <div className="flex flex-col gap-1">
          <strong className="text-base text-ink flex items-center gap-2">
            {isBotActive ? "البوت يبحث الآن عن مواعيد" : "البوت في وضع الاستعداد"}
            {isBotActive && <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan"></span></span>}
          </strong>
          <span className="text-xs font-bold text-gray-500 flex items-center gap-1.5">
            <Clock size={12} />
            آخر فحص: {lastChecked > 0 ? new Date(lastChecked).toLocaleTimeString('ar-SA', { hour: '2-digit', minute:'2-digit' }) : "غير محدد"}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3 w-full md:w-auto">
        <button
          onClick={handleImmediateScan}
          disabled={isFetching}
          className="flex items-center justify-center gap-2 w-full md:w-auto px-6 py-3 rounded-xl bg-ink text-white font-bold text-sm hover-scale shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <Zap size={16} className={isFetching ? "animate-pulse text-cyan" : "text-yellow-400"} />
          {isFetching ? "جارٍ التحديث..." : "تشغيل فحص فوري الآن"}
        </button>
      </div>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────
export default function Dashboard() {
  const [activeFilterKey, setActiveFilterKey] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");

  const { data: user } = useQuery({ queryKey: ["me"], queryFn: getMe });

  const queryClient = useQueryClient();

  const {
    data: applications = [],
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ["applications"],
    queryFn: getAllApplications,
    refetchInterval: 30000,
  });

  const pollInterval = useMemo(() => {
    if (applications.some(isRunning)) return 10000;
    if (applications.some((app) => app.automation?.state === "manual_payment_required")) return 30000;
    return 30000;
  }, [applications]);

  const { data: activeStatuses } = useQuery({
    queryKey: ["active-status"],
    queryFn: getActiveStatus,
    refetchInterval: pollInterval,
  });

  useEffect(() => {
    if (activeStatuses) {
      let needsFullRefetch = false;
      queryClient.setQueryData(["applications"], (oldApps) => {
        if (!oldApps) return oldApps;
        let changed = false;
        const oldAppsMap = new Map(oldApps.map(app => [app._id, app]));
        const newApps = oldApps.map(app => {
          const update = activeStatuses.find(a => a._id === app._id);
          if (update) {
            const newAutomation = { ...(app.automation || {}), ...(update.automation || {}) };
            const isDifferent = 
                app.updatedAt !== update.updatedAt ||
                app.automation?.activeJobId !== update.automation?.activeJobId ||
                JSON.stringify(app.prometricPayment) !== JSON.stringify(update.prometricPayment) ||
                app.automation?.state !== update.automation?.state ||
                app.automation?.nextAttemptAt !== update.automation?.nextAttemptAt ||
                app.paymentStatus !== update.paymentStatus ||
                app.automation?.lastError?.code !== update.automation?.lastError?.code ||
                app.automation?.prometricCheckoutUrl !== update.automation?.prometricCheckoutUrl;

            if (isDifferent) {
                changed = true;
                return { ...app, ...update, automation: newAutomation };
            }
          } else if (isRunning(app)) {
             needsFullRefetch = true;
          }
          return app;
        });

        for (const status of activeStatuses) {
           if (!oldAppsMap.has(status._id)) {
              needsFullRefetch = true;
           }
        }
        return changed ? newApps : oldApps;
      });

      if (needsFullRefetch) {
         refetch();
      }
    }
  }, [activeStatuses, queryClient, refetch]);

  const { data: summary = {}, isFetching: isFetchingSummary } = useQuery({
    queryKey: ["admin-summary"],
    queryFn: getAdminSummary,
    refetchInterval: 30000,
  });

  // ── Derived data ──────────────────────────────────────────────────
  const stats = [
    ["أحقية صحيحة", applications.filter((app) => Boolean(app.automation?.eligibilityId)).length],
    ["البوت يعمل الآن", applications.filter(isRunning).length],
    ["رابط دفع جاهز", applications.filter((app) => {
      const automation = app.automation || {};
      if (!CHECKOUT_FLOW_AVAILABLE || automation.state !== "manual_payment_required" || !automation.prometricCheckoutUrl) return false;
      const selectedStartsAt = Date.parse(automation.selectedSlot?.startsAt);
      if (Number.isFinite(selectedStartsAt) && selectedStartsAt <= dataUpdatedAt) return false;
      if (!automation.checkoutSessionExpirationUtc) return true;
      return Date.parse(automation.checkoutSessionExpirationUtc) > dataUpdatedAt;
    }).length],
    ["مؤكد", applications.filter((app) => ["confirmed", "rescheduled"].includes(app.automation?.state)).length],
    ["فشل", summary.failed || 0],
    ["ملغي", summary.cancelled || 0],
  ];

  // ── Search + filter logic ─────────────────────────────────────────
  const visible = useMemo(() => {
    let filtered = applications;

    // Group filter
    const group = STATE_FILTER_GROUPS.find((g) => g.key === activeFilterKey);
    if (group && group.states.length > 0) {
      filtered = filtered.filter((app) => group.states.includes(app.automation?.state));
    }

    // City filter
    if (selectedCity) {
      filtered = filtered.filter(app => 
        app.preferredCities?.some(c => c.name === selectedCity)
      );
    }

    // Month filter
    if (selectedMonth) {
      filtered = filtered.filter(app => {
        const from = app.preferredDateRange?.from;
        if (!from) return false;
        const d = new Date(from);
        if (isNaN(d.getTime())) return false;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return key === selectedMonth;
      });
    }

    // Search filter
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter((app) => {
        const haystack = [
          app.fullName,
          app.email,
          app.phone,
          app.nationalId,
          app._id,
          app.automation?.eligibilityId,
          app.currentAppointment?.confirmationNumber,
          app.externalOrder?.orderId,
          app.examCode,
          app.examId?.title,
          ...(app.preferredCities?.map((c) => c.name) || []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    // Sort recently updated first
    filtered.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

    return filtered;
  }, [applications, activeFilterKey, searchQuery, selectedCity, selectedMonth]);

  // ── Filter tab counts ─────────────────────────────────────────────
  const groupCounts = useMemo(() => {
    const counts = {};
    for (const group of STATE_FILTER_GROUPS) {
      if (group.states.length === 0) {
        counts[group.key] = applications.length;
      } else {
        counts[group.key] = applications.filter((app) =>
          group.states.includes(app.automation?.state)
        ).length;
      }
    }
    return counts;
  }, [applications]);

  // ── Extract Filters Data ──────────────────────────────────────────
  const uniqueCities = useMemo(() => {
    const cities = new Set();
    applications.forEach(app => {
      app.preferredCities?.forEach(c => c.name && cities.add(c.name));
    });
    return Array.from(cities).sort();
  }, [applications]);

  const uniqueMonths = useMemo(() => {
    const months = new Set();
    applications.forEach(app => {
      const from = app.preferredDateRange?.from;
      if (from) {
        const d = new Date(from);
        if (!isNaN(d.getTime())) {
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          months.add(key);
        }
      }
    });
    return Array.from(months).sort().reverse();
  }, [applications]);

  const formatMonth = (key) => {
    const [y, m] = key.split('-');
    const date = new Date(y, m - 1);
    return date.toLocaleString('ar-SA', { month: 'long', year: 'numeric' });
  };

  const clearFilters = () => {
    setActiveFilterKey("all");
    setSearchQuery("");
    setSelectedCity("");
    setSelectedMonth("");
  };

  const hasActiveFilters = activeFilterKey !== "all" || searchQuery.trim() !== "" || selectedCity !== "" || selectedMonth !== "";

  return (
    <div className="min-h-screen bg-paper pb-20 px-4 md:px-8">
      <AdminHeader user={user} searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      <main className="max-w-7xl mx-auto mt-8 flex flex-col gap-8">
        
        {/* ── Header & Refresh ──────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 border-b border-gray-200 pb-5">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-extrabold text-ink tracking-tight m-0">لوحة إدارة الحجوزات</h1>
            <p className="text-gray-500 m-0">مراقبة ومعالجة جميع طلبات Khaleeji Bot</p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-ink font-bold shadow-sm hover:bg-gray-50 transition-all hover-scale disabled:opacity-50"
          >
            <RefreshCw size={16} className={isFetching ? "animate-spin" : ""} />
            تحديث
          </button>
        </div>

        {/* ── Bot Status & Controls ──────────────────────────────────── */}
        <BotStatusBar applications={applications} isFetching={isFetching} refetch={refetch} />

        {/* ── Stats Grid (with skeleton) ────────────────────────────── */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonStat key={i} />
            ))}
          </div>
        ) : (
          <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 transition-opacity duration-300 ${isFetchingSummary ? "opacity-50" : "opacity-100"}`}>
            {stats.map(([label, count]) => (
              <article key={label} className="relative flex flex-col justify-center bg-white border border-gray-200/60 rounded-2xl p-5 shadow-sm hover-scale group overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-gray-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <strong className="relative z-10 text-3xl font-black text-ink leading-none mb-2 bg-gradient-to-br from-ink to-ink-soft bg-clip-text text-transparent">{count}</strong>
                <span className="relative z-10 text-xs font-bold text-gray-500">{label}</span>
              </article>
            ))}
          </div>
        )}

        {/* ── Quick Filter Tabs & Dropdowns ─────────────────────────────── */}
        <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center pb-2 -mb-2">
          
          <div className="flex overflow-x-auto filter-tabs w-full xl:w-auto">
            <div className="inline-flex gap-1 p-1 bg-gray-100/70 rounded-xl border border-gray-200/50 shadow-inner w-max">
              {STATE_FILTER_GROUPS.map((group) => {
                const Icon = FILTER_TAB_ICONS[group.icon] || LayoutGrid;
                const isActive = activeFilterKey === group.key;
                const count = groupCounts[group.key] ?? 0;
                return (
                  <button
                    key={group.key}
                    onClick={() => setActiveFilterKey(group.key)}
                    className={`relative z-10 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all duration-300 shrink-0 ${
                      isActive
                        ? "bg-white text-ink shadow-[0_2px_8px_rgb(0,0,0,0.08)] ring-1 ring-black/5"
                        : "text-gray-500 hover:text-ink hover:bg-gray-50/50"
                    }`}
                  >
                    <Icon size={15} className={isActive ? "text-cyan" : "opacity-60"} />
                    {group.label}
                    <span className={`tabular-nums text-[11px] font-black px-1.5 py-0.5 rounded-md transition-colors ${
                      isActive ? "bg-cyan/10 text-cyan-dark" : "bg-gray-200/50 text-gray-500 group-hover:bg-gray-200"
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-700 outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20 transition-all cursor-pointer"
            >
              <option value="">كل المدن</option>
              {uniqueCities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
            
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-700 outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20 transition-all cursor-pointer"
            >
              <option value="">كل الفترات</option>
              {uniqueMonths.map(month => (
                <option key={month} value={month}>{formatMonth(month)}</option>
              ))}
            </select>
          </div>

        </div>

        {/* ── Application List ──────────────────────────────────────── */}
        <div className="flex flex-col gap-5 mt-2">

          {/* Skeleton loading */}
          {isLoading && (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          )}

          {/* Error state */}
          {isError && (
            <div className="flex flex-col items-center justify-center p-16 bg-red-50 border border-red-200 rounded-3xl text-red-600">
              <p className="font-bold text-lg">{error.friendlyMessage}</p>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !isError && visible.length === 0 && (
            <div className="flex flex-col items-center justify-center p-20 bg-gray-50/30 border-2 border-dashed border-gray-200/80 rounded-[2rem]">
              <div className="flex items-center justify-center w-24 h-24 rounded-full bg-white shadow-sm mb-6 border border-gray-100">
                {hasActiveFilters ? (
                  <SearchX size={40} className="text-gray-300" />
                ) : (
                  <Inbox size={40} className="text-gray-300" />
                )}
              </div>
              <p className="font-bold text-xl text-ink mb-2">
                {hasActiveFilters
                  ? "لا توجد طلبات تطابق معايير البحث الحالية"
                  : "لا توجد طلبات في هذا الطابور"}
              </p>
              <p className="text-sm text-gray-400 mb-8 font-medium">
                {hasActiveFilters
                  ? "جرّب تغيير كلمة البحث أو اختيار تصنيف مختلف."
                  : "لم يتم العثور على طلبات مطابقة للفلتر الحالي."}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-ink text-white font-bold text-sm hover-scale shadow-[0_8px_20px_rgb(15,23,42,0.15)]"
                >
                  إعادة ضبط الفلاتر
                </button>
              )}
            </div>
          )}

          {/* Application cards */}
          {!isLoading && !isError && visible.map((app) => (
            <div key={app._id} className="transition-all duration-300 transform-gpu animate-in fade-in slide-in-from-bottom-2">
               <Applicationcard application={app} currentTime={dataUpdatedAt} />
            </div>
          ))}
        </div>

      </main>
    </div>
  );
}


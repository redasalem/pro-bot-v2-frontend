import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  RefreshCw,
  Inbox,
  LoaderCircle,
  SearchX,
  LayoutGrid,
  AlertTriangle,
  CircleCheck,
  XCircle,
} from "lucide-react";
import { getMe } from "../api/auth";
import { getAllApplications, getAdminSummary } from "../api/applications";
import { clearToken } from "../lib/auth";
import {
  ACTIVE_AUTOMATION_STATES,
  RETRYABLE_SEARCH_CODES,
  STATE_LABELS,
  STATE_FILTER_GROUPS,
} from "../lib/constants";
import Applicationcard from "../components/Applicationcard";
import AdminHeader from "../components/AdminHeader";

// ── Helpers ────────────────────────────────────────────────────────────
const isRunning = (app) => {
  const automation = app.automation || {};
  if (automation.lastError?.code && !RETRYABLE_SEARCH_CODES.includes(automation.lastError.code)) return false;
  if (ACTIVE_AUTOMATION_STATES.includes(automation.state)) return true;
  return automation.state === "manual_payment_required" && !automation.prometricCheckoutUrl;
};

const pollWhileActive = (query) => {
  const applications = query.state.data || [];
  if (applications.some(isRunning)) return 3000;
  if (applications.some((app) => app.automation?.state === "manual_payment_required")) return 30000;
  return false;
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

// ── Main Dashboard ─────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeFilterKey, setActiveFilterKey] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: user } = useQuery({ queryKey: ["me"], queryFn: getMe });

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
    refetchInterval: pollWhileActive,
  });

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
      if (!automation.prometricCheckoutUrl) return false;
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

    // Search filter
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter((app) => {
        const haystack = [
          app.fullName,
          app.email,
          app._id,
          app.automation?.eligibilityId,
          app.currentAppointment?.confirmationNumber,
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

    return filtered;
  }, [applications, activeFilterKey, searchQuery]);

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

  const clearFilters = () => {
    setActiveFilterKey("all");
    setSearchQuery("");
  };

  const hasActiveFilters = activeFilterKey !== "all" || searchQuery.trim() !== "";

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

        {/* ── Quick Filter Tabs (Segmented Control Style) ─────────────────────────────── */}
        <div className="flex overflow-x-auto filter-tabs pb-2 -mb-2">
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

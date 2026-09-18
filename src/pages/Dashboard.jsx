import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Filter, Inbox, LoaderCircle } from "lucide-react";
import { getMe } from "../api/auth";
import { getAllApplications, getAdminSummary } from "../api/applications";
import { clearToken } from "../lib/auth";
import { ACTIVE_AUTOMATION_STATES, RETRYABLE_SEARCH_CODES, STATE_LABELS } from "../lib/constants";
import Applicationcard from "../components/Applicationcard";
import AdminHeader from "../components/AdminHeader";

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

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [stateFilter, setStateFilter] = useState("");

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

  const visible = stateFilter ? applications.filter((app) => app.automation?.state === stateFilter) : applications;

  return (
    <div className="min-h-screen bg-paper pb-20 px-4 md:px-8">
      <AdminHeader user={user} />

      <main className="max-w-7xl mx-auto mt-8 flex flex-col gap-8">
        
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 border-b border-gray-200 pb-5">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-extrabold text-ink tracking-tight m-0">لوحة إدارة الحجوزات</h1>
            <p className="text-gray-500 m-0">مراقبة ومعالجة جميع طلبات Khaleeji Bot</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="relative flex items-center bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm focus-within:ring-4 focus-within:ring-cyan/10 focus-within:border-cyan transition-all">
              <Filter size={16} className="text-gray-400 ml-2" />
              <select 
                value={stateFilter} 
                onChange={(e) => setStateFilter(e.target.value)}
                className="bg-transparent border-none text-sm font-bold text-ink outline-none cursor-pointer pr-1"
                dir="rtl"
              >
                <option value="">كل الطلبات</option>
                {Object.entries(STATE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </label>

            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-ink font-bold shadow-sm hover:bg-gray-50 transition-all hover-scale disabled:opacity-50"
            >
              <RefreshCw size={16} className={isFetching ? "animate-spin" : ""} />
              تحديث
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 transition-opacity duration-300 ${isFetchingSummary ? "opacity-50" : "opacity-100"}`}>
          {stats.map(([label, count]) => (
            <article key={label} className="flex flex-col justify-center bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover-scale hover:border-cyan-100 transition-all">
              <strong className="text-3xl font-extrabold text-ink leading-none mb-2">{count}</strong>
              <span className="text-xs font-bold text-gray-500">{label}</span>
            </article>
          ))}
        </div>

        {/* Application List */}
        <div className="flex flex-col gap-5 mt-2">
          {isLoading && (
            <div className="flex flex-col items-center justify-center p-16 bg-white border border-gray-200 rounded-3xl text-gray-400">
              <LoaderCircle size={40} className="animate-spin mb-4 text-cyan" />
              <p className="font-bold text-lg">جاري التحميل…</p>
            </div>
          )}

          {isError && (
            <div className="flex flex-col items-center justify-center p-16 bg-red-50 border border-red-200 rounded-3xl text-red-600">
              <p className="font-bold text-lg">{error.friendlyMessage}</p>
            </div>
          )}

          {!isLoading && !isError && visible.length === 0 && (
            <div className="flex flex-col items-center justify-center p-20 bg-white border border-dashed border-gray-300 rounded-3xl text-gray-400">
              <Inbox size={48} className="mb-4 opacity-50" />
              <p className="font-bold text-lg text-ink">لا توجد طلبات في هذا الطابور</p>
              <p className="text-sm">لم يتم العثور على طلبات مطابقة للفلتر الحالي.</p>
            </div>
          )}

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

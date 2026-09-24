import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock3,
  RefreshCw,
  RotateCcw,
  XCircle,
  Settings,
  CalendarClock,
  Search
} from "lucide-react";
import { getMe } from "../api/auth";
import {
  getPrometricEvents,
  getPrometricSearchSettings,
  updatePrometricSearchSettings,
} from "../api/prometricEvents";
import AdminHeader from "../components/AdminHeader";
import { STATE_LABELS } from "../lib/constants";

const STEP_INFO = {
  scheduling_session: { label: "بدء جلسة Prometric", success: "تم إنشاء جلسة اتصال صالحة مع Prometric." },
  eligibility_workflow: { label: "مسار التحقق من الأهلية", success: "اكتمل مسار التحقق من الأهلية." },
  eligibility_check: { label: "التحقق من الأهلية", success: "أكد Prometric أن بيانات الأهلية صحيحة." },
  exam_lookup: { label: "قراءة بيانات الاختبار", success: "تم العثور على الاختبار في Prometric." },
  fees_lookup: { label: "البحث عن الرسوم", success: "تم استرجاع رسوم الاختبار من Prometric." },
  fee_details: { label: "تفاصيل الرسوم", success: "تم تحميل تفاصيل الرسوم." },
  availability_search: { label: "البحث عن المراكز والمواعيد", success: "رد Prometric بنتيجة البحث عن المراكز." },
  slot_discovery_workflow: { label: "مسار البحث عن المواعيد", success: "اكتمل مسار اكتشاف المواعيد." },
  slot_search: { label: "البحث عن الساعات المتاحة", success: "رد Prometric بالساعات المتاحة." },
  payment_workflow: { label: "مسار إنشاء رابط الدفع", success: "اكتمل إعداد الدفع." },
  payment_session: { label: "إنشاء جلسة الدفع", success: "تم إنشاء جلسة الدفع في Prometric." },
  hold_validation: { label: "التحقق من حجز الموعد", success: "تم التحقق من حجز الموعد." },
  candidate_creation: { label: "إنشاء المتقدم", success: "تم إنشاء بيانات المتقدم في Prometric." },
  automatic_appointment_workflow: { label: "الاختيار التلقائي للموعد", success: "اكتمل البحث والاختيار التلقائي." },
  salla_automatic_workflow: { label: "التنفيذ التلقائي لطلب سلة", success: "اكتمل التشغيل التلقائي لطلب سلة." },
  scheduled_search_cycle: { label: "دورة البحث الدورية", success: "اكتملت دورة البحث الدورية." },
  scheduled_application_search: { label: "بحث دوري للطلب", success: "اكتملت محاولة البحث الدورية لهذا الطلب." },
  prometric_request: { label: "طلب إلى Prometric", success: "تم تنفيذ الطلب بنجاح." },
};

const STEPS = Object.fromEntries(Object.entries(STEP_INFO).map(([key, value]) => [key, value.label]));
const PHASES = { started: "جارٍ التنفيذ", succeeded: "نجحت", failed: "فشلت", retry: "إعادة محاولة" };
const ICONS = { started: Clock3, succeeded: CheckCircle2, failed: XCircle, retry: RotateCcw };
const RUN_LABELS = { running: "تعمل الآن", succeeded: "مكتملة", failed: "تحتاج تدخل", retry: "إعادة محاولة" };
const WORKFLOW_CONTAINER_STEPS = new Set(["eligibility_workflow", "slot_discovery_workflow", "payment_workflow", "automatic_appointment_workflow", "salla_automatic_workflow", "scheduled_application_search", "scheduled_search_cycle"]);

const ERROR_HELP = {
  PROMETRIC_TIMEOUT: { title: "انتهت مهلة انتظار Prometric", action: "أعد المحاولة. إذا تكرر الخطأ راجع اتصال السيرفر." },
  PROMETRIC_UNAVAILABLE: { title: "تعذر الاتصال بخوادم Prometric", action: "تأكد من الإنترنت وعناوين Prometric ثم أعد المحاولة." },
  PROMETRIC_API_AUTH_REJECTED: { title: "Prometric رفض بيانات الاتصال", action: "راجع Session ID وX-Request-ID." },
  PROMETRIC_AVAILABILITY_AUTH_REJECTED: { title: "Prometric رفض صلاحية البحث عن المراكز", action: "حدّث Akamai telemetry." },
  PROMETRIC_SLOTS_AUTH_REJECTED: { title: "Prometric رفض صلاحية البحث عن الساعات", action: "حدّث Akamai telemetry." },
  PROMETRIC_ELIGIBILITY_NOT_FOUND: { title: "بيانات الأهلية غير موجودة", action: "راجع رقم الأهلية وأول 4 حروف من اسم العائلة." },
  PROMETRIC_SESSION_START_FAILED: { title: "فشل بدء جلسة Prometric", action: "راجع وصول السيرفر إلى صفحة Prometric." },
  PROMETRIC_SESSION_RESPONSE_UNRECOGNIZED: { title: "Prometric لم يرجع Session ID", action: "راجع استخراج Session ID في الباك إند." },
  PROMETRIC_SEARCH_HEADER_MISSING: { title: "بيانات حماية البحث ناقصة", action: "أضيف Akamai telemetry المطلوبة." },
  PROMETRIC_SLOTS_PREFLIGHT_FAILED: { title: "فشل تجهيز طلب الساعات", action: "راجع رد OPTIONS." },
  PROMETRIC_UPSTREAM_ERROR: { title: "Prometric رفض الطلب", action: "راجع HTTP ورسالة Prometric." },
  WORKFLOW_ERROR: { title: "توقفت عملية الحجز", action: "راجع أول خطوة فاشلة في المسار." },
};

const formatTime = (value) => new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "medium" }).format(new Date(value));
const formatDuration = (value) => {
  if (value == null) return null;
  if (value < 1000) return `${value} ms`;
  return `${(value / 1000).toFixed(value < 10000 ? 1 : 0)} ثانية`;
};

const endpointKey = (event) => [event.step, event.endpoint || "", event.method || "", event.attempt || 1].join("|");

const collapseEvents = (events) => {
  const records = [];
  for (const event of [...events].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))) {
    if (event.phase === "started") {
      records.push({ ...event, completedAt: null });
      continue;
    }
    const key = endpointKey(event);
    const startedRecord = [...records].reverse().find((record) => record.phase === "started" && endpointKey(record) === key);
    if (startedRecord) {
      Object.assign(startedRecord, {
        phase: event.phase,
        completedAt: event.createdAt,
        durationMs: event.durationMs,
        upstreamStatus: event.upstreamStatus,
        errorCode: event.errorCode,
        message: event.message,
        metadata: { ...(startedRecord.metadata || {}), ...(event.metadata || {}) },
      });
    } else {
      records.push({ ...event, completedAt: event.createdAt });
    }
  }
  return records;
};

const getUpstreamMessage = (record) => {
  const value = record.metadata?.upstreamMessage || record.metadata?.errorDetails?.upstreamMessage;
  if (!value) return null;
  return typeof value === "string" ? value : JSON.stringify(value);
};

const diagnose = (record) => {
  const known = ERROR_HELP[record.errorCode];
  if (known) return { ...known, reason: getUpstreamMessage(record) || record.message };
  if ([401, 403].includes(record.upstreamStatus)) return { title: "Prometric رفض التصريح بالطلب", reason: getUpstreamMessage(record) || record.message, action: "راجع Session ID وX-Request-ID." };
  if (record.upstreamStatus === 404) return { title: "البيانات غير موجودة في Prometric", reason: getUpstreamMessage(record) || record.message, action: "راجع رقم الأهلية وكود الاختبار." };
  if (record.upstreamStatus === 429) return { title: "Prometric أوقف الطلبات لكثرتها", reason: getUpstreamMessage(record) || record.message, action: "انتظر قبل المحاولة." };
  if (record.upstreamStatus >= 500) return { title: "عطل مؤقت من جهة Prometric", reason: getUpstreamMessage(record) || record.message, action: "أعيد المحاولة لاحقًا." };
  return { title: "توقفت هذه الخطوة", reason: getUpstreamMessage(record) || record.message || "لم يسجل Prometric سببًا.", action: "افتح التفاصيل التقنية." };
};

const recordMessage = (record) => {
  if (record.phase === "failed") return diagnose(record).title;
  if (record.phase === "retry") return record.message || "سيتم إرسال الطلب مرة أخرى.";
  if (record.phase === "started") return "بدأت الخطوة ولم يصل رد نهائي حتى الآن.";
  const count = record.metadata?.resultCount;
  if (record.step === "availability_search" && count === 0) return "رد Prometric بنجاح، لكن لم يرجع مراكز متاحة.";
  if (record.step === "slot_search" && count === 0) return "رد Prometric بنجاح، لكن لم يرجع ساعات متاحة.";
  const suffix = typeof count === "number" ? ` عدد النتائج: ${count}.` : "";
  return `${STEP_INFO[record.step]?.success || "تمت الخطوة بنجاح."}${suffix}`;
};

const buildJourneys = (events) => {
  const grouped = new Map();
  for (const event of events) {
    if (!grouped.has(event.correlationId)) grouped.set(event.correlationId, []);
    grouped.get(event.correlationId).push(event);
  }

  return [...grouped.entries()].map(([id, runEvents]) => {
    const collapsedTimeline = collapseEvents(runEvents);
    const retryAwareTimeline = collapsedTimeline.map((record) => {
      const isFailedSlotsAttempt = record.phase === "failed" && String(record.endpoint || "").startsWith("slots/");
      const hasScheduledRetry = isFailedSlotsAttempt && collapsedTimeline.some(candidate => String(candidate.endpoint || "").startsWith("slots/") && Number(candidate.attempt || 1) > Number(record.attempt || 1));
      return hasScheduledRetry ? { ...record, phase: "retry" } : record;
    }).filter((record) => !(record.phase === "retry" && record.metadata?.previousAttempt));
    
    const hasPrometricRequests = retryAwareTimeline.some((record) => Boolean(record.endpoint));
    const meaningfulTimeline = hasPrometricRequests ? retryAwareTimeline.filter((record) => record.endpoint || !WORKFLOW_CONTAINER_STEPS.has(record.step)) : retryAwareTimeline;
    const firstFailureIndex = meaningfulTimeline.findIndex((record) => record.phase === "failed");
    const timeline = firstFailureIndex >= 0 ? meaningfulTimeline.slice(0, firstFailureIndex + 1) : meaningfulTimeline;
    const failedAt = timeline.find((record) => record.phase === "failed") || null;
    const runningAt = [...timeline].reverse().find((record) => record.phase === "started") || null;
    const retryAt = timeline[timeline.length - 1]?.phase === "retry" ? timeline[timeline.length - 1] : null;
    const completedPrometricStep = [...timeline].reverse().find((record) => record.phase === "succeeded" && record.endpoint);
    const application = runEvents.find((event) => event.application)?.application || null;
    const startedAt = timeline[0]?.createdAt;
    const lastAt = timeline[timeline.length - 1]?.completedAt || timeline[timeline.length - 1]?.createdAt;
    const status = failedAt ? "failed" : runningAt ? "running" : retryAt ? "retry" : "succeeded";
    const reached = failedAt || runningAt || completedPrometricStep || timeline[timeline.length - 1];
    const reachedLabel = STEP_INFO[reached?.step]?.label || reached?.step || "بدء العملية";
    const resultCount = completedPrometricStep?.metadata?.resultCount;
    
    let summary;
    if (failedAt) summary = `توقف البوت عند «${reachedLabel}»: ${diagnose(failedAt).title}`;
    else if (runningAt) summary = `البوت يعمل الآن على «${reachedLabel}» وينتظر النتيجة.`;
    else if (completedPrometricStep?.step === "eligibility_check") summary = "نجح Prometric في التحقق من أهلية العميل.";
    else if (completedPrometricStep?.step === "availability_search") summary = resultCount === 0 ? "لم تظهر مراكز متاحة." : `ظهرت ${resultCount} نتيجة بحث.`;
    else if (completedPrometricStep?.step === "slot_search") summary = resultCount === 0 ? "لم تظهر ساعات متاحة." : `عُثر على ${resultCount} مواعيد.`;
    else if (completedPrometricStep?.step === "payment_session") summary = "تم اختيار الموعد وإنشاء جلسة الدفع.";
    else if (completedPrometricStep?.step === "candidate_creation") summary = "تم إنشاء بيانات العميل بنجاح.";
    else if (completedPrometricStep) summary = `نجحت آخر عملية: «${reachedLabel}».`;
    else summary = "لم يبدأ اتصال فعلي مع Prometric.";
    
    const scheduledAttempt = runEvents.find((record) => record.step === "scheduled_application_search")?.metadata?.attempt || null;

    return {
      id, timeline, application, applicationId: runEvents.find((event) => event.applicationId)?.applicationId || null,
      status, failedAt, startedAt, lastAt, summary, scheduledAttempt, completedCount: timeline.filter((record) => record.phase === "succeeded").length,
    };
  }).sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt));
};

export default function PrometricEvents() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ search: "", step: "", phase: "" });
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [schedulerDraft, setSchedulerDraft] = useState(null);
  
  const { data: user } = useQuery({ queryKey: ["me"], queryFn: getMe });
  const query = useQuery({
    queryKey: ["prometric-events", filters],
    queryFn: () => getPrometricEvents({ ...filters, limit: 500 }),
    refetchInterval: autoRefresh ? 5000 : false,
  });
  
  const settingsQuery = useQuery({
    queryKey: ["prometric-search-settings"],
    queryFn: getPrometricSearchSettings,
    refetchInterval: 15000,
  });

  const saveSettings = useMutation({
    mutationFn: updatePrometricSearchSettings,
    onSuccess: (settings) => {
      queryClient.setQueryData(["prometric-search-settings"], settings);
      setSchedulerDraft(null);
    },
  });

  const schedulerForm = schedulerDraft || { enabled: settingsQuery.data?.enabled ?? true, intervalMinutes: settingsQuery.data?.intervalMinutes ?? 60 };
  const events = useMemo(() => query.data || [], [query.data]);
  const allJourneys = useMemo(() => buildJourneys(events), [events]);
  const journeys = useMemo(() => allJourneys.filter((journey) => journey.applicationId), [allJourneys]);
  const systemJourneyCount = allJourneys.length - journeys.length;
  
  const stats = useMemo(() => ({
    succeeded: journeys.filter((item) => item.status === "succeeded").length,
    running: journeys.filter((item) => item.status === "running" || item.status === "retry").length,
    failed: journeys.filter((item) => item.status === "failed").length,
  }), [journeys]);

  const change = (key) => (event) => setFilters((value) => ({ ...value, [key]: event.target.value }));

  return (
    <div className="min-h-screen bg-paper pb-20 px-4 md:px-8" dir="rtl">
      <AdminHeader user={user} />
      
      <main className="max-w-7xl mx-auto mt-8 flex flex-col gap-8">
        
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 border-b border-gray-200 pb-5">
          <div className="flex flex-col gap-1">
            <span className="text-orange text-xs tracking-widest font-bold uppercase mb-1">مراقبة التكامل</span>
            <h1 className="text-3xl font-extrabold text-ink tracking-tight m-0">سجل Prometric</h1>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm font-bold text-gray-600 cursor-pointer">
              <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="w-4 h-4 accent-cyan" />
              تحديث تلقائي
            </label>
            <button
              onClick={() => query.refetch()}
              disabled={query.isFetching}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-ink font-bold shadow-sm hover:bg-gray-50 transition-all hover-scale disabled:opacity-50"
            >
              <RefreshCw size={16} className={query.isFetching ? "animate-spin" : ""} />
              تحديث
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <article className="flex flex-col justify-center bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <strong className="text-3xl font-extrabold text-ink leading-none mb-2">{journeys.length}</strong>
            <span className="text-xs font-bold text-gray-500">رحلة ظاهرة</span>
          </article>
          <article className="flex flex-col justify-center bg-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-sm">
            <strong className="text-3xl font-extrabold text-emerald-700 leading-none mb-2">{stats.succeeded}</strong>
            <span className="text-xs font-bold text-emerald-600">مكتملة</span>
          </article>
          <article className="flex flex-col justify-center bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm">
            <strong className="text-3xl font-extrabold text-amber-700 leading-none mb-2">{stats.running}</strong>
            <span className="text-xs font-bold text-amber-600">تعمل أو تعيد المحاولة</span>
          </article>
          <article className="flex flex-col justify-center bg-red-50 border border-red-200 rounded-2xl p-5 shadow-sm">
            <strong className="text-3xl font-extrabold text-red-700 leading-none mb-2">{stats.failed}</strong>
            <span className="text-xs font-bold text-red-600">تحتاج تدخل</span>
          </article>
        </div>

        {/* Search Scheduler Panel */}
        <section className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-start gap-8">
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex items-center gap-3 text-cyan-700 mb-1">
              <CalendarClock size={20} />
              <strong className="font-extrabold">البحث الدوري التلقائي</strong>
            </div>
            <p className="text-sm text-gray-600 m-0 leading-relaxed">
              يعالج الطلبات المؤهلة بالترتيب ويسجل كل محاولة كرحلة مستقلة أدناه.
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-4 text-xs font-bold text-gray-500">
              <span className="bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">آخر دورة: <span className="text-ink">{settingsQuery.data?.lastRunCompletedAt ? formatTime(settingsQuery.data.lastRunCompletedAt) : "لم تبدأ بعد"}</span></span>
              <span className="bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">الدورة القادمة: <span className="text-ink">{settingsQuery.data?.enabled && settingsQuery.data?.nextRunAt ? formatTime(settingsQuery.data.nextRunAt) : "متوقفة"}</span></span>
              <span className="bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">الطلبات المعالجة: <span className="text-ink">{settingsQuery.data?.lastProcessedCount ?? 0}</span></span>
            </div>
          </div>
          <div className="flex flex-col gap-4 bg-gray-50 p-5 rounded-2xl border border-gray-100 min-w-[300px]">
            <label className="flex items-center justify-between font-bold text-ink cursor-pointer">
              تشغيل البحث الدوري
              <div className={`w-12 h-6 flex items-center bg-gray-300 rounded-full p-1 cursor-pointer transition-colors duration-300 ${schedulerForm.enabled ? 'bg-cyan' : ''}`}>
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${schedulerForm.enabled ? '-translate-x-6' : ''}`}></div>
                <input type="checkbox" className="hidden" checked={schedulerForm.enabled} onChange={(e) => setSchedulerDraft({ ...schedulerForm, enabled: e.target.checked })} />
              </div>
            </label>
            <label className="flex flex-col gap-2 text-sm font-bold text-gray-600">
              التكرار بالدقائق
              <input type="number" min="1" max="10080" value={schedulerForm.intervalMinutes} onChange={(e) => setSchedulerDraft({ ...schedulerForm, intervalMinutes: Number(e.target.value) })} className="px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-cyan focus:ring-4 focus:ring-cyan/10 transition-all bg-white" />
            </label>
            <button disabled={saveSettings.isPending || schedulerForm.intervalMinutes < 1} onClick={() => saveSettings.mutate(schedulerForm)} className="mt-2 w-full px-4 py-2.5 rounded-xl bg-ink text-cyan font-bold hover:bg-cyan hover:text-ink transition-colors hover-scale disabled:opacity-50">
              {saveSettings.isPending ? "جارٍ الحفظ…" : "حفظ الجدولة"}
            </button>
            {saveSettings.isSuccess && <span className="text-xs text-emerald-600 font-bold text-center">تم حفظ الإعدادات بنجاح.</span>}
          </div>
        </section>

        {/* Filters Panel */}
        <section className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-end">
          <label className="flex flex-col gap-1.5 w-full md:w-1/3 text-xs font-bold text-gray-600">
            البحث عن الطلب
            <div className="relative">
              <Search size={16} className="absolute right-3 top-3 text-gray-400" />
              <input value={filters.search} onChange={change("search")} placeholder="رقم سلة، العميل..." className="w-full pl-3 pr-9 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-cyan transition-all bg-gray-50 focus:bg-white" />
            </div>
          </label>
          <label className="flex flex-col gap-1.5 w-full md:w-1/4 text-xs font-bold text-gray-600">
            الخطوة
            <select value={filters.step} onChange={change("step")} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-cyan transition-all bg-gray-50 focus:bg-white cursor-pointer">
              <option value="">كل الخطوات</option>
              {Object.entries(STEPS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 w-full md:w-1/4 text-xs font-bold text-gray-600">
            النتيجة
            <select value={filters.phase} onChange={change("phase")} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-cyan transition-all bg-gray-50 focus:bg-white cursor-pointer">
              <option value="">كل النتائج</option>
              {Object.entries(PHASES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
          <button onClick={() => setFilters({ search: "", step: "", phase: "" })} className="w-full md:w-auto px-6 py-2.5 rounded-xl text-gray-500 font-bold bg-gray-100 hover:bg-gray-200 transition-colors text-sm">
            مسح
          </button>
        </section>

        {/* Journeys List */}
        <div className="flex flex-col gap-5">
          {query.isLoading && <div className="p-12 text-center text-gray-400 font-bold bg-white rounded-3xl border border-gray-200">جاري تحميل الرحلات…</div>}
          {query.isError && <div className="p-12 text-center text-red-600 font-bold bg-red-50 rounded-3xl border border-red-200">{query.error.friendlyMessage}</div>}
          
          {!query.isLoading && !query.isError && !journeys.length && (
            <div className="flex flex-col items-center justify-center p-16 bg-white border border-dashed border-gray-300 rounded-3xl text-gray-500">
              <Activity size={48} className="mb-4 opacity-20" />
              <strong className="text-lg text-ink mb-2">لا توجد رحلات خاصة بعملاء حاليًا</strong>
              <p className="text-sm m-0">{systemJourneyCount ? `المجدول اشتغل ${systemJourneyCount} مرة، ولم يجد طلبات مؤهلة.` : "لم يبدأ البوت معالجة أي طلب."}</p>
            </div>
          )}

          {!query.isLoading && !query.isError && journeys.map((journey, index) => {
            const StatusIcon = journey.status === "failed" ? AlertTriangle : ICONS[journey.status === "running" ? "started" : journey.status] || Activity;
            const diagnosis = journey.failedAt ? diagnose(journey.failedAt) : null;
            const orderNumber = journey.application?.externalOrder?.orderId;
            const state = journey.application?.automation?.state;
            const customerName = journey.application?.fullName || `غير معروف (${String(journey.applicationId).slice(-6)})`;
            
            const themeColors = {
              succeeded: "bg-emerald-50 border-emerald-200 text-emerald-700 icon-emerald-600",
              failed: "bg-red-50 border-red-200 text-red-700 icon-red-600",
              running: "bg-cyan-50 border-cyan-200 text-cyan-700 icon-cyan-600",
              retry: "bg-amber-50 border-amber-200 text-amber-700 icon-amber-600",
            }[journey.status];

            return (
              <details key={journey.id} className="group bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden" open={index === 0}>
                
                <summary className={`flex flex-col md:flex-row gap-5 p-5 cursor-pointer select-none transition-colors hover:bg-gray-50 list-none [&::-webkit-details-marker]:hidden border-b border-transparent group-open:border-gray-200 group-open:bg-gray-50/50`}>
                  <div className={`flex items-center justify-center w-12 h-12 rounded-2xl shrink-0 ${themeColors.split(' ')[0]} ${themeColors.split(' ')[2]}`}>
                    <StatusIcon size={24} className={journey.status === "running" ? "animate-pulse" : ""} />
                  </div>
                  
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold ${themeColors.split(' ')[0]} ${themeColors.split(' ')[2]} border ${themeColors.split(' ')[1]}`}>
                        {RUN_LABELS[journey.status]}
                      </span>
                      {journey.application?.examCode && <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-md text-[10px] font-bold">{journey.application.examCode}</span>}
                      {orderNumber && <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-md text-[10px] font-bold">سلة #{orderNumber}</span>}
                      {journey.scheduledAttempt && <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-md text-[10px] font-bold">المحاولة #{journey.scheduledAttempt}</span>}
                    </div>
                    <h3 className="text-lg font-bold text-ink m-0 leading-tight">{customerName}</h3>
                    <p className="text-sm text-gray-600 m-0 leading-snug">{journey.summary}</p>
                  </div>

                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-2 shrink-0 border-t md:border-t-0 md:border-r border-gray-100 pt-3 md:pt-0 md:pr-5 mt-2 md:mt-0">
                    <time className="text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">{formatTime(journey.lastAt)}</time>
                    <span className="text-[11px] font-bold text-gray-400">{journey.completedCount} خطوة ناجحة</span>
                    <ChevronDown size={18} className="text-gray-400 transition-transform duration-300 group-open:rotate-180 hidden md:block mt-1" />
                  </div>
                </summary>

                <div className="p-6 bg-paper flex flex-col gap-6">
                  
                  {/* Context Bar */}
                  <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-gray-600 bg-white border border-gray-200 p-3.5 rounded-xl">
                    {state && <span>الحالة: <strong className="text-ink">{STATE_LABELS[state] || state}</strong></span>}
                    {journey.applicationId && <span className="border-r border-gray-200 pr-4">ID: <code className="font-mono text-[10px] bg-gray-100 px-1 rounded">{journey.applicationId}</code></span>}
                    <span className="border-r border-gray-200 pr-4 mr-auto text-gray-400">بدأت: {formatTime(journey.startedAt)}</span>
                  </div>

                  {/* Diagnosis */}
                  {diagnosis && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex flex-col gap-3 relative overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>
                      <strong className="flex items-center gap-2 text-red-800 text-sm"><AlertTriangle size={18} /> {diagnosis.title}</strong>
                      {diagnosis.reason && <p className="text-sm text-red-700 m-0"><span className="font-bold">السبب:</span> {diagnosis.reason}</p>}
                      <p className="text-sm text-red-700 m-0"><span className="font-bold">الإجراء:</span> {diagnosis.action}</p>
                    </div>
                  )}

                  {/* Timeline */}
                  <div className="relative pr-4 border-r-2 border-gray-200 flex flex-col gap-6 my-2">
                    {journey.timeline.map((record, i) => {
                      const PhaseIcon = ICONS[record.phase] || Activity;
                      const phaseColor = {
                        succeeded: "text-emerald-500 bg-emerald-50 ring-emerald-200",
                        started: "text-cyan-500 bg-cyan-50 ring-cyan-200",
                        failed: "text-red-500 bg-red-50 ring-red-200",
                        retry: "text-amber-500 bg-amber-50 ring-amber-200",
                      }[record.phase];

                      return (
                        <div key={i} className="relative flex flex-col gap-2 pl-4">
                          <span className={`absolute -right-[27px] flex items-center justify-center w-6 h-6 rounded-full bg-white ring-2 z-10 ${phaseColor}`}>
                            <PhaseIcon size={12} strokeWidth={3} className={record.phase === "started" ? "animate-spin" : ""} />
                          </span>
                          
                          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="text-sm font-bold text-ink m-0">{STEPS[record.step] || record.step}</h4>
                              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${phaseColor.split(' ')[0]} ${phaseColor.split(' ')[1]}`}>{PHASES[record.phase]}</span>
                            </div>
                            <p className="text-sm text-gray-600 m-0 leading-relaxed mb-3">{recordMessage(record)}</p>
                            
                            <div className="flex flex-wrap gap-2 text-[11px] font-bold text-gray-500">
                              {record.endpoint && <span className="bg-gray-50 px-2 py-1 rounded border border-gray-100 font-mono text-ink"><code>{record.method} {record.endpoint}</code></span>}
                              {record.upstreamStatus != null && <span className="bg-gray-50 px-2 py-1 rounded border border-gray-100">HTTP: <strong className={record.upstreamStatus >= 400 ? "text-red-600" : "text-emerald-600"}>{record.upstreamStatus}</strong></span>}
                              {record.durationMs != null && <span className="bg-gray-50 px-2 py-1 rounded border border-gray-100">{formatDuration(record.durationMs)}</span>}
                            </div>

                            {(record.errorCode || Object.keys(record.metadata || {}).length > 0) && (
                              <details className="mt-3 group/tech">
                                <summary className="text-[11px] font-bold text-gray-400 cursor-pointer hover:text-cyan list-none flex items-center gap-1 transition-colors w-fit">
                                  <Settings size={12} /> التفاصيل التقنية <ChevronDown size={10} className="transition-transform group-open/tech:rotate-180" />
                                </summary>
                                <div className="mt-2 p-3 bg-ink text-gray-300 rounded-xl text-[11px] font-mono overflow-x-auto">
                                  {record.errorCode && <div className="mb-1 text-red-400">Error Code: {record.errorCode}</div>}
                                  {record.message && <div className="mb-2">Message: {record.message}</div>}
                                  {Object.keys(record.metadata || {}).length > 0 && <pre className="text-cyan-300">{JSON.stringify(record.metadata, null, 2)}</pre>}
                                </div>
                              </details>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                </div>
              </details>
            );
          })}
        </div>

      </main>
    </div>
  );
}

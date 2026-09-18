import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    AlertTriangle,
    CalendarCheck2,
    Check,
    ChevronDown,
    ClipboardEdit,
    Circle,
    Copy,
    CreditCard,
    Link2,
    LoaderCircle,
    MapPin,
    ShieldCheck,
    RefreshCw,
    XCircle,
    ArrowRight,
    Settings,
    Clock,
    ExternalLink,
} from "lucide-react";
import { 
    createPaymentSession,
    triggerEligibilityCheck,
    restartSearch,
    cancelApplication,
    confirmBooking,
    forceTransitionState,
    updatePaymentStatus,
} from "../api/applications";
import {
    STATE_LABELS,
    API_ERROR_MESSAGES,
    RETRYABLE_SEARCH_CODES,
    formatDate,
    formatDateRange,
} from "../lib/constants";

// ── Payment labels ─────────────────────────────────────────────────────
const PAYMENT_LABELS = {
    pending: "غير مدفوع",
    paid: "مدفوع",
    failed: "فشل",
    refunded: "مسترد",
};

// ── State badge colors ─────────────────────────────────────────────────
const STATE_BADGE = {
    draft: "bg-gray-50 text-gray-700 ring-gray-600/20",
    awaiting_service_payment: "bg-amber-50 text-amber-700 ring-amber-600/20",
    ready: "bg-blue-50 text-blue-700 ring-blue-600/20",
    validating_eligibility: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
    eligibility_verified: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    searching: "bg-cyan-50 text-cyan-700 ring-cyan-600/20",
    awaiting_admin_slot_lookup: "bg-cyan-50 text-cyan-700 ring-cyan-600/20",
    fetching_slots: "bg-cyan-50 text-cyan-700 ring-cyan-600/20",
    awaiting_admin_slot_selection: "bg-cyan-50 text-cyan-700 ring-cyan-600/20",
    slot_selected: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    manual_payment_required: "bg-amber-50 text-amber-700 ring-amber-600/20",
    booking: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
    confirmed: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    reschedule_searching: "bg-cyan-50 text-cyan-700 ring-cyan-600/20",
    rescheduled: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    manual_review: "bg-orange-50 text-orange-700 ring-orange-600/20",
    failed: "bg-red-50 text-red-700 ring-red-600/20",
    cancelled: "bg-gray-100 text-gray-500 ring-gray-600/10",
    expired: "bg-red-50 text-red-700 ring-red-600/20",
};

// ── Tone style mapping ─────────────────────────────────────────────────
const TONE_STYLES = {
    neutral: { border: "border-r-gray-400", bg: "bg-gray-50", iconBg: "bg-gray-200", iconText: "text-gray-600", text: "text-gray-900" },
    running: { border: "border-r-cyan-500", bg: "bg-cyan-50/50", iconBg: "bg-cyan-100", iconText: "text-cyan-700", text: "text-cyan-900" },
    success: { border: "border-r-emerald-500", bg: "bg-emerald-50/50", iconBg: "bg-emerald-100", iconText: "text-emerald-700", text: "text-emerald-900" },
    warning: { border: "border-r-amber-500", bg: "bg-amber-50/50", iconBg: "bg-amber-100", iconText: "text-amber-700", text: "text-amber-900" },
    error: { border: "border-r-red-500", bg: "bg-red-50/50", iconBg: "bg-red-100", iconText: "text-red-700", text: "text-red-900" },
    payment: { border: "border-r-indigo-500", bg: "bg-indigo-50/50", iconBg: "bg-indigo-100", iconText: "text-indigo-700", text: "text-indigo-900" },
};

const SEARCH_STATES = [
    "searching",
    "reschedule_searching",
    "awaiting_admin_slot_lookup",
    "fetching_slots",
    "awaiting_admin_slot_selection",
];

const hasReachedEligibility = (automation, state) => Boolean(automation.eligibilityId)
    || [
        "eligibility_verified",
        ...SEARCH_STATES,
        "slot_selected",
        "manual_payment_required",
        "booking",
        "confirmed",
        "rescheduled",
    ].includes(state);

// ── Operational status resolver ────────────────────────────────────────
const operationalStatus = ({
    state,
    automation,
    hasActiveLink,
    checkoutExpired,
    selectedSlotPassed,
    errorMessage,
}) => {
    if (state === "expired") {
        const submittedExpired = automation.lastError?.code === "SALLA_SEARCH_PERIOD_EXPIRED";
        return {
            tone: submittedExpired ? "error" : "warning",
            title: submittedExpired ? "العميل أدخل فترة بحث منتهية" : "انتهت فترة البحث",
            description: submittedExpired
                ? "لم يرسل البوت أي طلب إلى Prometric لأن تاريخ نهاية الفترة كان في الماضي عند استلام الطلب."
                : "أوقف البوت البحث لأن آخر يوم في الفترة المطلوبة أصبح في الماضي.",
            next: "حدّث فترة البحث إلى تاريخ حالي أو مستقبلي ثم أعد تفعيل الطلب.",
        };
    }
    if (selectedSlotPassed) {
        return { tone: "warning", title: "انتهى الموعد المختار", description: "لن يجدد البوت رابط الدفع لموعد أصبح في الماضي.", next: "سيحذف الموعد القديم ويبدأ البحث تلقائيًا." };
    }
    if (RETRYABLE_SEARCH_CODES.includes(automation.lastError?.code)) {
        const genderRestricted = automation.lastError.code === "NO_GENDER_COMPATIBLE_SITES";
        return {
            tone: "running",
            title: "لا يوجد موعد متاح حاليًا",
            description: genderRestricted ? "المراكز المتاحة مخصصة لجنس مختلف." : "انتهت جولة البحث بدون العثور على موعد.",
            next: "سيعيد البوت البحث تلقائيًا في الجولة التالية.",
        };
    }
    if (automation.lastError?.code) {
        return {
            tone: "error",
            title: "المحاولة الحالية متوقفة مؤقتًا",
            description: errorMessage,
            next: automation.nextAttemptAt ? "سيحاول البوت مجددًا في " + formatDate(automation.nextAttemptAt) : "تحتاج مراجعة سبب الخطأ قبل استكمال الطلب.",
        };
    }
    if (["confirmed", "rescheduled"].includes(state)) {
        return { tone: "success", title: state === "rescheduled" ? "تمت إعادة الجدولة" : "تم الحجز بنجاح", description: "اكتملت العملية وسجلت بيانات التأكيد.", next: "لا توجد خطوة مطلوبة حاليًا." };
    }
    if (state === "booking") {
        return { tone: "running", title: "جارٍ تأكيد الحجز", description: "أرسل البوت طلب تأكيد الحجز وينتظر الرد.", next: "لا يلزم تدخل طالما لا توجد رسالة خطأ." };
    }
    if (hasActiveLink) {
        return { tone: "payment", title: "رابط دفع Prometric جاهز", description: "تم إنشاء جلسة الدفع بنجاح.", next: "افتح الرابط وأكمل الرسوم قبل الانتهاء." };
    }
    if (checkoutExpired) {
        return { tone: "warning", title: "رابط دفع Prometric منتهي", description: "تم إنشاء الرابط وانتهت صلاحيته.", next: "أنشئ رابط جديد من الزر أدناه." };
    }
    if (state === "manual_payment_required") {
        return { tone: "warning", title: "الموعد محفوظ بلا رابط دفع", description: "لا يوجد Checkout URL صالح حتى الآن.", next: "انتظر التشغيل التلقائي أو أنشئه يدويًا." };
    }
    if (state === "slot_selected") {
        return { tone: "success", title: "تم اختيار الموعد", description: "اختار البوت أقرب موعد وينتقل لإعداد الدفع.", next: "سيبدأ إنشاء رابط الدفع تلقائيًا." };
    }
    if (state === "awaiting_admin_slot_selection") {
        return { tone: "running", title: "تم العثور على مواعيد", description: "يختار البوت أقرب موعد مطابق.", next: "لا يلزم تدخل طالما لا توجد رسالة خطأ." };
    }
    if (state === "fetching_slots") {
        return { tone: "running", title: "جارٍ فحص ساعات المواعيد", description: "البوت يطلب الساعات المتاحة من Prometric.", next: "لا يلزم تدخل طالما لا توجد رسالة خطأ." };
    }
    if (state === "awaiting_admin_slot_lookup") {
        return { tone: "running", title: "تم العثور على مراكز متاحة", description: "البوت يفحص الأيام والساعات.", next: "لا يلزم تدخل طالما لا توجد رسالة خطأ." };
    }
    if (["searching", "reschedule_searching"].includes(state)) {
        return { tone: "running", title: "البوت يبحث الآن في Prometric", description: "الأهلية صحيحة ويجري البحث عن موعد مطابق." };
    }
    if (state === "eligibility_verified") {
        return { tone: "success", title: "نجح التحقق من الأهلية", description: "الطلب جاهز للبحث التلقائي عن موعد.", next: "سيبدأ البحث تلقائيًا." };
    }
    if (state === "validating_eligibility") {
        return { tone: "running", title: "جارٍ التحقق من الأهلية", description: "أرسل البوت البيانات إلى Prometric.", next: "لا يلزم تدخل الآن." };
    }
    if (state === "ready") {
        return { tone: "running", title: "الطلب جاهز لبدء Prometric", description: "تم دفع الخدمة وسيبدأ التحقق من الأهلية.", next: "لا يلزم تدخل الآن." };
    }
    if (state === "manual_review") {
        return { tone: "warning", title: "الطلب يحتاج مراجعة يدوية", description: errorMessage || "توقفت خطوة سابقة ولم يستطع البوت استكمالها تلقائيًا.", next: "راجع بيانات الأهلية." };
    }
    if (state === "failed") {
        return { tone: "error", title: "تعذر تنفيذ الطلب", description: errorMessage || "توقف الطلب بسبب خطأ غير قابل للمعالجة التلقائية.", next: "راجع سبب الخطأ وأعد المحاولة." };
    }
    if (state === "cancelled") {
        return { tone: "neutral", title: "تم إلغاء الطلب", description: "ألغي هذا الطلب ولن يستكمل البوت العمل عليه.", next: "لا توجد خطوة مطلوبة." };
    }
    if (state === "draft") {
        return { tone: "neutral", title: "الطلب مسودة", description: "تم إنشاء الطلب ولم يُرسل للمعالجة بعد.", next: "يلزم سداد رسوم الخدمة لبدء التشغيل." };
    }
    if (state === "awaiting_service_payment") {
        return { tone: "warning", title: "بانتظار سداد رسوم الخدمة", description: "تم استلام الطلب وينتظر سداد رسوم الخدمة.", next: "سيبدأ التشغيل التلقائي فور تأكيد الدفع." };
    }
    return { tone: "neutral", title: STATE_LABELS[state] || "الطلب مسجل", description: "لم يبدأ التنفيذ التلقائي لهذا الطلب بعد.", next: "راجع دفع الخدمة وحالة الطلب." };
};

// ── CopyButton micro-interaction ───────────────────────────────────────
function CopyButton({ text }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async () => {
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // fallback silently
        }
    }, [text]);

    if (!text) return null;

    return (
        <span className="relative inline-flex">
            <button
                onClick={handleCopy}
                className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-0.5 rounded hover:bg-gray-200 text-gray-400 hover:text-ink"
                aria-label="نسخ"
            >
                <Copy size={13} />
            </button>
            {copied && (
                <span className="copy-tooltip absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg bg-ink text-cyan text-[10px] font-bold whitespace-nowrap shadow-lg z-10">
                    تم النسخ!
                </span>
            )}
        </span>
    );
}

// ── Main Card ──────────────────────────────────────────────────────────
export default function Applicationcard({ application, currentTime }) {
    const queryClient = useQueryClient();
    const [showConfirmForm, setShowConfirmForm] = useState(false);
    const [adminOptionsOpen, setAdminOptionsOpen] = useState(false);
    const [timelineOpen, setTimelineOpen] = useState(false);
    const [selectedTransitionState, setSelectedTransitionState] = useState("");
    const [confirmFields, setConfirmFields] = useState({ confirmationNumber: "", appointmentId: "", scheduledAt: "", siteId: "" });
    const automation = application.automation || {};
    const state = automation.state || application.applicationStatus;
    const selected = automation.selectedSlot || {};
    const appointment = application.currentAppointment || {};
    const availableSitesCount = automation.availableSites?.length || 0;
    const availableSlotsCount = automation.availableSlots?.filter((slot) => slot.active !== false).length || 0;

    const checkoutUrl = automation.prometricCheckoutUrl;
    const checkoutExpiresAt = automation.checkoutSessionExpirationUtc;
    const selectedStartsAt = selected.startsAt ? new Date(selected.startsAt).getTime() : NaN;
    const selectedSlotPassed = Number.isFinite(selectedStartsAt)
        && Number.isFinite(currentTime)
        && selectedStartsAt <= currentTime;
    const checkoutExpired = Boolean(checkoutUrl && checkoutExpiresAt && currentTime && new Date(checkoutExpiresAt).getTime() <= currentTime);
    const hasActiveLink = Boolean(checkoutUrl) && !checkoutExpired && !selectedSlotPassed;

    const feeAmount = Number(automation.prometricFeeAmount);
    const feeCurrency = automation.prometricFeeCurrency;
    const hasFee = Number.isFinite(feeAmount) && Boolean(feeCurrency);
    const errorCode = automation.lastError?.code;
    const errorMessage = errorCode
        ? API_ERROR_MESSAGES[errorCode] || automation.lastError.message
        : automation.lastError?.message || null;

    // ── Mutations ───────────────────────────────────────────────────
    const invalidateAll = () => {
        queryClient.invalidateQueries({ queryKey: ["applications"] });
        queryClient.invalidateQueries({ queryKey: ["admin-summary"] });
    };

    const paymentSession = useMutation({
        mutationFn: () => createPaymentSession(application._id),
        onSuccess: invalidateAll,
    });

    const eligibilityCheck = useMutation({
        mutationFn: () => triggerEligibilityCheck(application._id),
        onSuccess: invalidateAll,
    });

    const searchRestart = useMutation({
        mutationFn: () => restartSearch(application._id),
        onSuccess: invalidateAll,
    });

    const appCancel = useMutation({
        mutationFn: () => cancelApplication(application._id),
        onSuccess: invalidateAll,
    });

    const manualConfirm = useMutation({
        mutationFn: (body) => confirmBooking(application._id, body),
        onSuccess: () => {
            invalidateAll();
            setShowConfirmForm(false);
            setConfirmFields({ confirmationNumber: "", appointmentId: "", scheduledAt: "", siteId: "" });
        },
    });

    const forceTransition = useMutation({
        mutationFn: (targetState) => forceTransitionState(application._id, targetState),
        onSuccess: invalidateAll,
    });

    const payStatus = useMutation({
        mutationFn: (targetStatus) => updatePaymentStatus(application._id, targetStatus),
        onSuccess: invalidateAll,
    });

    // ── Derived display state ───────────────────────────────────────
    const status = operationalStatus({ state, automation, hasActiveLink, checkoutExpired, selectedSlotPassed, errorMessage });
    const theme = TONE_STYLES[status.tone] || TONE_STYLES.neutral;
    const badgeClass = STATE_BADGE[state] || STATE_BADGE.draft;
    
    const eligibilityDone = hasReachedEligibility(automation, state);
    const centersDone = availableSitesCount > 0 || ["fetching_slots", "awaiting_admin_slot_selection", "slot_selected", "manual_payment_required", "booking", "confirmed", "rescheduled"].includes(state);
    const slotDone = Boolean(selected.slotId);
    const paymentLinkDone = hasActiveLink;
    const confirmationDone = ["confirmed", "rescheduled"].includes(state);
    
    const workflowSteps = [
        { label: "دفع الخدمة", done: application.paymentStatus === "paid", Icon: CreditCard },
        { label: "الأهلية", done: eligibilityDone, Icon: ShieldCheck },
        { label: "المراكز", done: centersDone, Icon: MapPin },
        { label: "الموعد", done: slotDone, Icon: CalendarCheck2 },
        { label: "الدفع", done: paymentLinkDone, warning: checkoutExpired, Icon: Link2 },
        { label: "التأكيد", done: confirmationDone, Icon: Check },
    ];
    const firstPendingIndex = workflowSteps.findIndex((step) => !step.done);
    const showPaymentButton = state === "manual_payment_required" && !hasActiveLink && !selectedSlotPassed;
    const orderNumber = application.externalOrder?.orderId;
    const cities = application.preferredCities?.map((city) => city.name).filter(Boolean) || [];

    // ── Audit trail events ──────────────────────────────────────────
    const timelineEvents = [
        application.createdAt && { label: "تم إنشاء الطلب", time: application.createdAt, done: true },
        application.paymentStatus === "paid" && { label: "تم دفع الخدمة", time: application.updatedAt, done: true },
        eligibilityDone && { label: "تم فحص الأحقية", time: automation.lastCheckedAt || application.updatedAt, done: true },
        centersDone && availableSitesCount > 0 && { label: `تم العثور على ${availableSitesCount} مركز`, time: application.updatedAt, done: true },
        slotDone && { label: `اختيار موعد: ${selected.siteName || "—"}`, time: application.updatedAt, done: true },
        hasActiveLink && { label: "تم إنشاء رابط الدفع", time: application.updatedAt, done: true },
        confirmationDone && { label: `تأكيد الحجز: ${appointment.confirmationNumber || "—"}`, time: appointment.scheduledAt || application.updatedAt, done: true },
    ].filter(Boolean);

    // ── Shared action button style ──────────────────────────────────
    const actionBtn = "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none";

    return (
        <article className={`flex flex-col gap-6 p-7 bg-white border border-gray-200 shadow-sm rounded-3xl border-r-[6px] transition-all duration-300 hover:shadow-md ${theme.border}`}>
            
            {/* ── Header ────────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
                <div className="flex flex-col gap-2 group">
                    <div className="flex flex-wrap items-center gap-2">
                        {application.examCode && <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-extrabold">{application.examCode}</span>}
                        {orderNumber && <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-extrabold">سلة #{orderNumber}</span>}
                        <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-extrabold">{application.bookingType === "reschedule" ? "إعادة جدولة" : "حجز جديد"}</span>
                    </div>
                    <h3 className="text-xl font-bold text-ink m-0 leading-tight flex items-center gap-1.5 flex-wrap">
                        {application.fullName}
                        <CopyButton text={application.fullName} />
                        <span className="text-gray-400 font-normal">—</span>
                        {application.examId?.title || application.examCode}
                    </h3>
                    <p className="text-sm text-gray-500 m-0 flex items-center gap-1.5 flex-wrap">
                        {application.email}
                        <span className="mx-1 text-gray-300">·</span>
                        <code className="font-mono text-xs text-gray-400">{application._id}</code>
                        <CopyButton text={application._id} />
                    </p>
                </div>
                <span className={`px-4 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap ring-1 ring-inset ${badgeClass}`}>
                    {STATE_LABELS[state] || state}
                </span>
            </div>

            {/* ── Operational Summary ───────────────────────────────── */}
            <section className={`flex items-start gap-4 p-5 rounded-2xl border ${theme.bg} ${theme.border.replace('border-r-', 'border-')}`}>
                <div className={`flex items-center justify-center shrink-0 w-11 h-11 rounded-xl ${theme.iconBg} ${theme.iconText}`}>
                    {status.tone === "error" || status.tone === "warning" ? <AlertTriangle size={20} /> :
                     status.tone === "running" ? <LoaderCircle size={20} className="animate-spin" /> :
                     status.tone === "payment" ? <Link2 size={20} /> :
                     status.tone === "success" ? <Check size={20} /> : <Circle size={20} />}
                </div>
                <div className="flex flex-col gap-1">
                    <strong className={`text-[15px] font-bold ${theme.text}`}>{status.title}</strong>
                    <p className="text-sm text-gray-600 leading-relaxed m-0">{status.description}</p>
                    {status.next && <small className="text-xs text-gray-700 mt-1 font-semibold">{status.next}</small>}
                </div>
            </section>

            {/* ── Workflow Progress ─────────────────────────────────── */}
            <section className="flex flex-col gap-4 p-5 border border-gray-200 rounded-2xl">
                <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
                    <span className="tracking-wide">مسار التنفيذ</span>
                    <span>{workflowSteps.filter(s => s.done).length} من {workflowSteps.length}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                    {workflowSteps.map((step, index) => {
                        const StepIcon = step.Icon || Circle;
                        const current = !errorCode && index === firstPendingIndex;
                        const stepStyle = step.done 
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" 
                            : step.warning 
                                ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200" 
                                : current 
                                    ? "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200" 
                                    : "bg-gray-50 text-gray-400";
                        const iconStyle = step.done ? "bg-emerald-500 text-white border-emerald-500" : current ? "border-cyan-500 text-cyan-600" : "border-gray-300 text-gray-400 bg-white";

                        return (
                            <div key={step.label} className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all ${stepStyle}`}>
                                <span className={`flex items-center justify-center w-7 h-7 rounded-full border-2 ${iconStyle}`}>
                                    {step.done ? <Check size={14} strokeWidth={3} /> : current ? <LoaderCircle size={14} className="animate-spin" /> : <StepIcon size={14} />}
                                </span>
                                <small className="font-bold text-[11px]">{step.label}</small>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* ── Facts Grid ───────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="flex flex-col gap-1 p-3.5 rounded-xl bg-gray-50 text-xs text-gray-500">دفع الخدمة<strong className="text-ink text-sm">{PAYMENT_LABELS[application.paymentStatus] || application.paymentStatus}</strong></div>
                <div className="flex flex-col gap-1 p-3.5 rounded-xl bg-gray-50 text-xs text-gray-500">المراكز المتاحة<strong className="text-ink text-sm">{availableSitesCount}</strong></div>
                <div className="flex flex-col gap-1 p-3.5 rounded-xl bg-gray-50 text-xs text-gray-500">المواعيد المتاحة<strong className="text-ink text-sm">{availableSlotsCount}</strong></div>
                <div className="flex flex-col gap-1 p-3.5 rounded-xl bg-gray-50 text-xs text-gray-500">الفترة<strong className="text-ink text-sm">{formatDateRange(application.preferredDateRange)}</strong></div>
                {cities.length > 0 && <div className="flex flex-col gap-1 p-3.5 rounded-xl bg-gray-50 text-xs text-gray-500 md:col-span-2">المدن<strong className="text-ink text-sm">{cities.join("، ")}</strong></div>}
                {automation.attemptCount > 0 && <div className="flex flex-col gap-1 p-3.5 rounded-xl bg-gray-50 text-xs text-gray-500">محاولات<strong className="text-ink text-sm">{automation.attemptCount}</strong></div>}
                {application.updatedAt && <div className="flex flex-col gap-1 p-3.5 rounded-xl bg-gray-50 text-xs text-gray-500">آخر تحديث<strong className="text-ink text-sm">{formatDate(application.updatedAt)}</strong></div>}
            </div>

            {/* ── Selected Slot info ───────────────────────────────── */}
            {(selected.startsAt || selected.siteName) && (
                <section className="flex flex-col gap-3 p-5 rounded-2xl bg-cyan-50/50 border border-cyan-100">
                    <strong className="text-sm text-cyan-900">الموعد المبدئي الذي اختاره البوت</strong>
                    <div className="flex flex-wrap gap-4 text-xs text-cyan-800">
                        {selected.startsAt && <span>التاريخ: <b className="font-bold">{formatDate(selected.startsAt)}</b></span>}
                        {selected.siteName && <span>المركز: <b className="font-bold">{selected.siteName}</b></span>}
                        {selected.slotId && <span>Slot: <code className="font-mono bg-white px-1 py-0.5 rounded text-cyan-900">{selected.slotId}</code></span>}
                    </div>
                </section>
            )}

            {/* ── Confirmed Appointment ────────────────────────────── */}
            {appointment.confirmationNumber && (
                <section className="flex flex-col md:flex-row items-start md:items-center gap-4 p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 group">
                    <strong className="text-sm flex-shrink-0">تم تأكيد الحجز</strong>
                    <div className="flex flex-wrap gap-6 text-sm">
                        <span className="flex items-center gap-1.5">
                            رقم التأكيد: <b className="font-bold text-emerald-900">{appointment.confirmationNumber}</b>
                            <CopyButton text={appointment.confirmationNumber} />
                        </span>
                        {appointment.scheduledAt && <span>الموعد: <b className="font-bold text-emerald-900">{formatDate(appointment.scheduledAt)}</b></span>}
                    </div>
                </section>
            )}

            {/* ── Payment Action ───────────────────────────────────── */}
            {!selectedSlotPassed && (hasActiveLink || checkoutExpired || showPaymentButton) && (
                <section className={`flex flex-col md:flex-row items-center justify-between gap-5 p-5 rounded-2xl border ${hasActiveLink ? "bg-indigo-50 border-indigo-200" : "bg-amber-50 border-amber-200"}`}>
                    <div className="flex flex-col gap-1 w-full">
                        <strong className={`text-sm ${hasActiveLink ? "text-indigo-900" : "text-amber-900"}`}>
                            {hasActiveLink ? "رابط دفع Prometric جاهز" : checkoutExpired ? "رابط الدفع منتهي" : "رابط الدفع لم يُنشأ بعد"}
                        </strong>
                        <p className={`text-xs m-0 ${hasActiveLink ? "text-indigo-700" : "text-amber-700"}`}>
                            {hasFee && "الرسوم: " + feeAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " " + feeCurrency}
                            {checkoutExpiresAt && " · الصلاحية حتى " + formatDate(checkoutExpiresAt)}
                        </p>
                    </div>
                    {hasActiveLink ? (
                        <a
                            href={checkoutUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full md:w-auto text-center inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover-scale whitespace-nowrap"
                        >
                            فتح الدفع
                            <ExternalLink size={14} />
                        </a>
                    ) : showPaymentButton && (
                        <button 
                            disabled={paymentSession.isPending} 
                            onClick={() => paymentSession.mutate()}
                            className="w-full md:w-auto px-6 py-2.5 rounded-xl bg-orange text-white font-bold text-sm hover-scale disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none whitespace-nowrap"
                        >
                            {paymentSession.isPending ? <span className="flex items-center gap-2"><LoaderCircle size={14} className="animate-spin" /> جارٍ الإنشاء…</span> : checkoutExpired ? "تجديد الرابط" : "إنشاء رابط الدفع"}
                        </button>
                    )}
                </section>
            )}

            {/* ── Collapsible Audit Trail ──────────────────────────── */}
            {timelineEvents.length > 1 && (
                <>
                    <button
                        onClick={() => setTimelineOpen((v) => !v)}
                        className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-ink transition-colors self-start"
                    >
                        <Clock size={14} />
                        {timelineOpen ? "إخفاء السجل" : "سجل التنفيذ"}
                        <ChevronDown size={14} className={`transition-transform duration-300 ${timelineOpen ? "rotate-180" : ""}`} />
                    </button>
                    <div className={`grid-expand ${timelineOpen ? "open" : ""}`}>
                        <div className="grid-expand-inner">
                            <section className="pr-3 pt-1 pb-2">
                                <div className="relative border-r-2 border-gray-200 pr-6 flex flex-col gap-0">
                                    {timelineEvents.map((event, i) => (
                                        <div key={i} className="relative flex items-start gap-3 pb-5 last:pb-0">
                                            {/* Dot on the vertical line */}
                                            <span className={`absolute -right-[9px] top-0.5 w-4 h-4 rounded-full border-2 shrink-0 ${
                                                event.done ? "bg-emerald-500 border-emerald-500" : "bg-white border-gray-300"
                                            }`}>
                                                {event.done && <Check size={10} className="text-white absolute top-0.5 right-0.5" strokeWidth={3} />}
                                            </span>
                                            <div className="flex flex-col gap-0.5 min-w-0">
                                                <span className="text-xs font-bold text-ink">{event.label}</span>
                                                <span className="text-[11px] text-gray-400 font-semibold">{formatDate(event.time)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>
                    </div>
                </>
            )}

            {/* ── Admin Toolbar ────────────────────────────────────── */}
            <section className="flex flex-wrap gap-3 pt-5 border-t border-dashed border-gray-200 mt-2">
                {["ready", "manual_review"].includes(state) && (
                    <button disabled={eligibilityCheck.isPending} onClick={() => eligibilityCheck.mutate()} className={`${actionBtn} bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-ink`}>
                        {eligibilityCheck.isPending ? <LoaderCircle size={16} className="animate-spin" /> : <ShieldCheck size={16} />} فحص الأحقية
                    </button>
                )}
                
                {["failed", "expired", "manual_review"].includes(state) && (
                    <button disabled={searchRestart.isPending} onClick={() => searchRestart.mutate()} className={`${actionBtn} bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-ink`}>
                        {searchRestart.isPending ? <LoaderCircle size={16} className="animate-spin" /> : <RefreshCw size={16} />} إعادة البحث
                    </button>
                )}

                {["manual_review", "failed"].includes(state) && (
                    <button disabled={forceTransition.isPending} onClick={() => forceTransition.mutate("ready")} className={`${actionBtn} bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-ink`}>
                        {forceTransition.isPending ? <LoaderCircle size={16} className="animate-spin" /> : <ArrowRight size={16} />} إرجاع إلى جاهز
                    </button>
                )}

                {state === "manual_review" && (
                    <button onClick={() => setShowConfirmForm((v) => !v)} className={`${actionBtn} ${showConfirmForm ? "bg-orange/10 text-orange-dark" : "bg-gray-50 text-gray-700 hover:bg-gray-100"}`}>
                        <ClipboardEdit size={16} /> {showConfirmForm ? "إغلاق النموذج" : "تأكيد يدوي"}
                    </button>
                )}

                <button onClick={() => setAdminOptionsOpen((v) => !v)} className={`${actionBtn} ${adminOptionsOpen ? "bg-cyan-50 text-cyan-700" : "bg-gray-50 text-gray-700 hover:bg-gray-100"}`}>
                    <Settings size={16} /> خيارات متقدمة
                </button>

                {!["cancelled", "confirmed", "rescheduled", "failed"].includes(state) && (
                    <button disabled={appCancel.isPending} onClick={() => window.confirm("إلغاء الطلب نهائياً؟") && appCancel.mutate()} className={`${actionBtn} bg-red-50 text-red-600 hover:bg-red-100 mr-auto`}>
                        {appCancel.isPending ? <LoaderCircle size={16} className="animate-spin" /> : <XCircle size={16} />} إلغاء الطلب
                    </button>
                )}
            </section>

            {/* ── Manual Confirm Form (Zero-CLS) ──────────────────── */}
            <div className={`grid-expand ${showConfirmForm && state === "manual_review" ? "open" : ""}`}>
                <div className="grid-expand-inner">
                    <section className="mt-4 p-6 rounded-2xl bg-orange/5 border border-orange/20 flex flex-col gap-5">
                        <strong className="text-sm text-orange-dark">تأكيد الحجز يدويًا</strong>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <label className="flex flex-col gap-1.5 text-xs font-bold text-gray-700">
                                رقم التأكيد *
                                <input type="text" value={confirmFields.confirmationNumber} onChange={(e) => setConfirmFields((f) => ({ ...f, confirmationNumber: e.target.value }))} className="px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:border-orange focus:ring-4 focus:ring-orange/10 outline-none transition-all" />
                            </label>
                            <label className="flex flex-col gap-1.5 text-xs font-bold text-gray-700">
                                Appointment ID *
                                <input type="text" value={confirmFields.appointmentId} onChange={(e) => setConfirmFields((f) => ({ ...f, appointmentId: e.target.value }))} className="px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:border-orange focus:ring-4 focus:ring-orange/10 outline-none transition-all" />
                            </label>
                            <label className="flex flex-col gap-1.5 text-xs font-bold text-gray-700">
                                تاريخ الموعد
                                <input type="datetime-local" value={confirmFields.scheduledAt} onChange={(e) => setConfirmFields((f) => ({ ...f, scheduledAt: e.target.value }))} className="px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:border-orange focus:ring-4 focus:ring-orange/10 outline-none transition-all" />
                            </label>
                            <label className="flex flex-col gap-1.5 text-xs font-bold text-gray-700">
                                Site ID
                                <input type="text" value={confirmFields.siteId} onChange={(e) => setConfirmFields((f) => ({ ...f, siteId: e.target.value }))} className="px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:border-orange focus:ring-4 focus:ring-orange/10 outline-none transition-all" />
                            </label>
                        </div>
                        <div className="flex justify-end pt-2">
                            <button
                                disabled={manualConfirm.isPending || !confirmFields.confirmationNumber.trim() || !confirmFields.appointmentId.trim()}
                                onClick={() => {
                                    const body = { confirmationNumber: confirmFields.confirmationNumber.trim(), appointmentId: confirmFields.appointmentId.trim() };
                                    if (confirmFields.scheduledAt) body.scheduledAt = new Date(confirmFields.scheduledAt).toISOString();
                                    if (confirmFields.siteId.trim()) body.siteId = confirmFields.siteId.trim();
                                    manualConfirm.mutate(body);
                                }}
                                className="px-6 py-2.5 rounded-xl bg-orange text-white font-bold text-sm hover-scale disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
                            >
                                {manualConfirm.isPending ? <span className="flex items-center gap-2"><LoaderCircle size={14} className="animate-spin" /> جارٍ التأكيد…</span> : "تأكيد الحجز"}
                            </button>
                        </div>
                    </section>
                </div>
            </div>

            {/* ── Advanced Admin Options (Zero-CLS) ────────────────── */}
            <div className={`grid-expand ${adminOptionsOpen ? "open" : ""}`}>
                <div className="grid-expand-inner">
                    <section className="mt-4 p-5 rounded-2xl bg-cyan-50/50 border border-cyan-100 flex flex-col gap-5">
                        <strong className="text-sm text-cyan-900">خيارات مطور النظام (Advanced Admin)</strong>
                        
                        {/* Payment Toggle */}
                        {application.paymentStatus !== "paid" && (
                            <div className="flex flex-col gap-2">
                                <span className="text-xs font-bold text-gray-700">التحكم في دفع الخدمة:</span>
                                <button 
                                    disabled={payStatus.isPending} 
                                    onClick={() => window.confirm("هل أنت متأكد من تغيير الدفع إلى 'مدفوع' يدويًا؟") && payStatus.mutate("paid")} 
                                    className="w-fit px-4 py-2.5 rounded-xl text-xs font-bold bg-white border border-gray-200 text-gray-800 hover:border-emerald-500 hover:text-emerald-700 hover-scale transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
                                >
                                    {payStatus.isPending ? <span className="flex items-center gap-2"><LoaderCircle size={14} className="animate-spin" /> جارٍ التحديث…</span> : "تأكيد الدفع يدويًا"}
                                </button>
                            </div>
                        )}

                        {/* State Transition */}
                        <div className="flex flex-col gap-2">
                            <span className="text-xs font-bold text-gray-700">تغيير حالة الطلب إجبارياً (Force Transition):</span>
                            <div className="flex flex-wrap gap-2 items-center">
                                <select 
                                    value={selectedTransitionState} 
                                    onChange={(e) => setSelectedTransitionState(e.target.value)} 
                                    className="px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-xs text-ink outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition-all"
                                >
                                    <option value="">-- اختر الحالة --</option>
                                    {Object.entries(STATE_LABELS).map(([k, v]) => (
                                        <option key={k} value={k}>{v} ({k})</option>
                                    ))}
                                </select>
                                <button 
                                    disabled={forceTransition.isPending || !selectedTransitionState || selectedTransitionState === state}
                                    onClick={() => window.confirm(`تغيير الحالة إلى ${STATE_LABELS[selectedTransitionState]}؟`) && forceTransition.mutate(selectedTransitionState)}
                                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-cyan-600 text-white hover:bg-cyan-700 hover-scale disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none transition-all"
                                >
                                    {forceTransition.isPending ? <span className="flex items-center gap-2"><LoaderCircle size={14} className="animate-spin" /> جارٍ التغيير…</span> : "تنفيذ التغيير"}
                                </button>
                            </div>
                        </div>
                    </section>
                </div>
            </div>

        </article>
    );
}

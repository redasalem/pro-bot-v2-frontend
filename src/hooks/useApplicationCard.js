import { CHECKOUT_FLOW_AVAILABLE, hasPaymentEvidence } from "../lib/checkoutReadiness";
import { acknowledgeUnpaidCheckout, getWorkflowMetadata, reconcilePayment } from "../api/applications";
import { useState, useMemo } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    createPaymentSession,
    triggerEligibilityCheck,
    restartSearch,
    cancelApplication,
    confirmBooking,
    forceTransitionState,
    updatePaymentStatus,
    deleteApplication,
    pauseApplicationAutomation,
    resumeApplicationAutomation,
} from "../api/applications";
import {
    STATE_LABELS,
    API_ERROR_MESSAGES,
    RETRYABLE_SEARCH_CODES,
    formatDate,
} from "../lib/constants";
import { CreditCard, ShieldCheck, MapPin, CalendarCheck2, Link2, Check } from "lucide-react";

// ── Payment labels ─────────────────────────────────────────────────────
export const PAYMENT_LABELS = {
    pending: "غير مدفوع",
    paid: "مدفوع",
    failed: "فشل",
    refunded: "مسترد",
};

// ── State badge colors ─────────────────────────────────────────────────
export const STATE_BADGE = {
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
export const TONE_STYLES = {
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
const getOperationalStatus = ({
    state,
    automation,
    hasActiveLink,
    checkoutExpired,
    selectedSlotPassed,
    errorMessage,
}) => {
    if (state === "cancelled") {
        return { tone: "neutral", title: "تم إلغاء الطلب", description: "ألغي هذا الطلب ولن يستكمل البوت العمل عليه.", next: "لا توجد خطوة مطلوبة." };
    }
    if (state === "failed") {
        return { tone: "error", title: "تعذر تنفيذ الطلب", description: errorMessage || "توقف الطلب بسبب خطأ غير قابل للمعالجة التلقائية.", next: "راجع سبب الخطأ وأعد المحاولة." };
    }
    if (state === "manual_review") {
        return { tone: "warning", title: "الطلب يحتاج مراجعة يدوية", description: errorMessage || "توقفت خطوة سابقة ولم يستطع البوت استكمالها تلقائيًا.", next: automation.paymentOrchestratorId ? "تحقق من نتيجة الدفع والحجز لدى برومترك قبل أي محاولة جديدة." : "راجع سبب التوقف." };
    }
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
    if (automation.lastError?.code === "PROMETRIC_TELEMETRY_UNAVAILABLE") {
        return {
            tone: "running",
            title: "تجهيز الاتصال بـ Prometric",
            description: "البوت يجهز متطلبات الحماية والـ Telemetry للاتصال.",
            next: automation.nextAttemptAt ? "ستبدأ المحاولة القادمة في " + formatDate(automation.nextAttemptAt) : "لا يلزم تدخل الآن.",
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
        return { tone: "warning", title: "رابط دفع Prometric منتهي", description: "تم إنشاء الرابط وانتهت صلاحيته.", next: "تحقق من نتيجة الدفع قبل أي محاولة جديدة." };
    }
    if (state === "manual_payment_required") {
        return { tone: "warning", title: "موعد مبدئي؛ الحجز لم يكتمل", description: "اختيار الموعد لا يحجز المقعد. الدفع التلقائي متوقف لحين اكتمال مسار الحجز.", next: "راجع الموعد والحجز في Prometric." };
    }
    if (state === "slot_selected") {
        return { tone: "success", title: "تم اختيار موعد مبدئي", description: "المقعد غير مؤكد لدى Prometric.", next: "الدفع التلقائي غير متاح حاليًا." };
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
        if (automation.activeJobId) {
            return { tone: "running", title: "جارٍ التحقق من الأهلية", description: "بدأ العامل في فحص البيانات مع Prometric.", next: "لا يلزم تدخل الآن." };
        } else if (automation.nextAttemptAt) {
            return { tone: "running", title: "في الطابور لفحص الأهلية", description: "المحاولة القادمة مجدولة.", next: "ستبدأ المحاولة في " + formatDate(automation.nextAttemptAt) };
        } else {
            return { tone: "running", title: "في الطابور لفحص الأهلية", description: "الطلب مسجل وينتظر دور التنفيذ.", next: "سيبدأ العامل قريباً." };
        }
    }
    if (state === "ready") {
        return { tone: "running", title: "الطلب جاهز لبدء Prometric", description: "تم دفع الخدمة وسيبدأ التحقق من الأهلية.", next: "لا يلزم تدخل الآن." };
    }

    if (state === "draft") {
        return { tone: "neutral", title: "الطلب مسودة", description: "تم إنشاء الطلب ولم يُرسل للمعالجة بعد.", next: "يلزم سداد رسوم الخدمة لبدء التشغيل." };
    }
    if (state === "awaiting_service_payment") {
        return { tone: "warning", title: "بانتظار سداد رسوم الخدمة", description: "تم استلام الطلب وينتظر سداد رسوم الخدمة.", next: "سيبدأ التشغيل التلقائي فور تأكيد الدفع." };
    }
    return { tone: "neutral", title: STATE_LABELS[state] || "الطلب مسجل", description: "لم يبدأ التنفيذ التلقائي لهذا الطلب بعد.", next: "راجع دفع الخدمة وحالة الطلب." };
};

export function useApplicationCard(application, currentTime) {
    const queryClient = useQueryClient();
    const { data: metadata } = useQuery({ queryKey: ["workflow-metadata"], queryFn: getWorkflowMetadata, staleTime: 60000 });
    const canCheckout = CHECKOUT_FLOW_AVAILABLE && metadata?.checkout?.canCreateCheckout === true;

    // Local UI states (moved from component to hook)
    const [showConfirmForm, setShowConfirmForm] = useState(false);
    const [adminOptionsOpen, setAdminOptionsOpen] = useState(false);
    const [timelineOpen, setTimelineOpen] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: "", message: "", action: null, type: "" });
    const [selectedTransitionState, setSelectedTransitionState] = useState("");
    const [confirmFields, setConfirmFields] = useState({ confirmationNumber: "", appointmentId: "", scheduledAt: "", siteId: "" });

    // Derived states
    const derivedData = useMemo(() => {
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
        const hasActiveLink = canCheckout && state === "manual_payment_required" && Boolean(checkoutUrl) && !checkoutExpired && !selectedSlotPassed;

        const feeAmount = Number(automation.prometricFeeAmount);
        const feeCurrency = automation.prometricFeeCurrency;
        const hasFee = automation.prometricFeeAmount != null && Number.isFinite(feeAmount) && Boolean(feeCurrency);
        const errorCode = automation.lastError?.code;
        const errorMessage = errorCode
            ? API_ERROR_MESSAGES[errorCode] || automation.lastError?.message
            : automation.lastError?.message || null;

        const paymentReview = hasPaymentEvidence(application);
        const status = paymentReview && !["confirmed", "rescheduled"].includes(state)
            ? { tone: "warning", title: application.prometricPayment?.status === "paid" ? "تم رصد الدفع والحجز يحتاج تحقق" : "نتيجة العملية تحتاج مراجعة",
                description: "الموعد المختار ورابط الدفع لا يثبتان اكتمال الحجز في Prometric.", next: "لا تدفع مرة أخرى. افحص نتيجة العملية وطابق رقم التأكيد." }
            : getOperationalStatus({ state, automation, hasActiveLink, checkoutExpired, selectedSlotPassed, errorMessage });
        const theme = TONE_STYLES[status.tone] || TONE_STYLES.neutral;
        const badgeClass = STATE_BADGE[state] || STATE_BADGE.draft;

        const eligibilityDone = hasReachedEligibility(automation, state);
        const centersDone = availableSitesCount > 0 || ["fetching_slots", "awaiting_admin_slot_selection", "slot_selected", "manual_payment_required", "booking", "confirmed", "rescheduled"].includes(state);
        const slotDone = Boolean(selected.slotId);
        const paymentLinkDone = application.prometricPayment?.status === "paid";
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
        const showPaymentButton = canCheckout && state === "manual_payment_required" && !hasActiveLink && !selectedSlotPassed;
        const orderNumber = application.externalOrder?.orderId;
        const cities = application.preferredCities?.map((city) => city.name).filter(Boolean) || [];

        const timelineEvents = [
            application.createdAt && { label: "تم إنشاء الطلب", time: application.createdAt, done: true },
            application.paymentStatus === "paid" && { label: "تم دفع الخدمة", time: application.updatedAt, done: true },
            eligibilityDone && { label: "تم فحص الأحقية", time: automation.lastCheckedAt || application.updatedAt, done: true },
            centersDone && availableSitesCount > 0 && { label: `تم العثور على ${availableSitesCount} مركز`, time: application.updatedAt, done: true },
            slotDone && { label: `اختيار موعد: ${selected.siteName || "—"}`, time: application.updatedAt, done: true },
            hasActiveLink && { label: "تم إنشاء رابط الدفع", time: application.updatedAt, done: true },
            confirmationDone && { label: `تأكيد الحجز: ${appointment.confirmationNumber || "—"}`, time: appointment.scheduledAt || application.updatedAt, done: true },
        ].filter(Boolean);

        return {
            paymentReview,
            allowedTransitions: (metadata?.transitions?.[state] || []).filter(next => !["booking", "confirmed", "rescheduled"].includes(next)),
            automation,
            state,
            selected,
            appointment,
            availableSitesCount,
            availableSlotsCount,
            checkoutUrl,
            checkoutExpiresAt,
            selectedSlotPassed,
            checkoutExpired,
            hasActiveLink,
            feeAmount,
            feeCurrency,
            hasFee,
            errorCode,
            errorMessage,
            status,
            theme,
            badgeClass,
            workflowSteps,
            firstPendingIndex,
            showPaymentButton,
            orderNumber,
            cities,
            timelineEvents,
        };
    }, [application, currentTime, canCheckout, metadata]);

    // Mutations
    const invalidateAll = () => {
        queryClient.invalidateQueries({ queryKey: ["applications"] });
        queryClient.invalidateQueries({ queryKey: ["admin-summary"] });
    };

    const paymentSession = useMutation({
        mutationFn: () => createPaymentSession(application._id),
        onSuccess: invalidateAll,
    });

    const paymentReconcile = useMutation({ mutationFn: () => reconcilePayment(application._id), onSuccess: invalidateAll });
    const acknowledgeUnpaid = useMutation({ mutationFn: () => acknowledgeUnpaidCheckout(application._id), onSuccess: invalidateAll });

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

    const appDelete = useMutation({
        mutationFn: () => deleteApplication(application._id),
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

    const pauseBot = useMutation({
        mutationFn: () => pauseApplicationAutomation(application._id),
        onSuccess: () => {
            invalidateAll();
            toast.success("تم إيقاف البوت مؤقتاً لهذا الطلب");
        },
    });

    const resumeBot = useMutation({
        mutationFn: () => resumeApplicationAutomation(application._id),
        onSuccess: () => {
            invalidateAll();
            toast.success("تم تفعيل البوت وسيستأنف العمل");
        },
    });

    const uiState = useMemo(() => ({
        showConfirmForm,
        setShowConfirmForm,
        adminOptionsOpen,
        setAdminOptionsOpen,
        timelineOpen,
        setTimelineOpen,
        confirmDialog,
        setConfirmDialog,
        selectedTransitionState,
        setSelectedTransitionState,
        confirmFields,
        setConfirmFields,
    }), [
        showConfirmForm,
        adminOptionsOpen,
        timelineOpen,
        confirmDialog,
        selectedTransitionState,
        confirmFields
    ]);

    const mutations = useMemo(() => ({
        paymentSession,
        acknowledgeUnpaid,
        paymentReconcile,
        eligibilityCheck,
        searchRestart,
        appCancel,
        appDelete,
        manualConfirm,
        forceTransition,
        payStatus,
        pauseBot,
        resumeBot,
    }), [
        paymentSession, acknowledgeUnpaid, paymentReconcile, eligibilityCheck, searchRestart, appCancel,
        appDelete, manualConfirm, forceTransition, payStatus, pauseBot, resumeBot
    ]);

    return {
        data: derivedData,
        uiState,
        mutations,
    };
}

export const TOKEN_KEY = "token";

export const STATE_LABELS = {
  draft: "مسودة",
  awaiting_service_payment: "بانتظار دفع الخدمة",
  ready: "جاهز لفحص الأحقية",
  validating_eligibility: "جارٍ فحص الأحقية",
  eligibility_verified: "الأحقية صحيحة",
  searching: "جارٍ البحث عن أقرب موعد",
  awaiting_admin_slot_lookup: "جارٍ تحديد أقرب يوم",
  fetching_slots: "جارٍ تحديد أقرب ساعة",
  awaiting_admin_slot_selection: "جارٍ اختيار أقرب موعد",
  slot_selected: "تم اختيار الموعد",
  manual_payment_required: "بانتظار دفع Prometric",
  booking: "جارٍ تأكيد الحجز",
  confirmed: "تم الحجز",
  reschedule_searching: "جارٍ اختيار أقرب موعد بديل",
  rescheduled: "تمت إعادة الجدولة",
  manual_review: "مراجعة يدوية",
  failed: "تعذر التنفيذ",
  cancelled: "ملغي",
  expired: "انتهت فترة البحث",
};

export const API_ERROR_MESSAGES = {
  PROMETRIC_ELIGIBILITY_NOT_FOUND:
    "لم يتم العثور على أحقية مطابقة. راجع الرقم وأول 4 أحرف من اسم العائلة.",
  PROMETRIC_ELIGIBILITY_EXAM_MISMATCH:
    "رقم الأحقية صحيح، لكنه يخص اختبارًا مختلفًا عن الاختبار المختار. اختر الاختبار المطابق للأحقية.",
  PROMETRIC_AVAILABILITY_CONTEXT_NOT_FOUND:
    "Prometric لم يجد تطابقًا بين الأحقية والاختبار المختار. أعد فحص الأحقية وتأكد من اختيار الاختبار الصحيح.",
  PROMETRIC_API_AUTH_REJECTED:
    "Prometric رفض بيانات مصادقة الـ API الحالية. يلزم تحديث بيانات المصادقة الرسمية ثم إعادة المحاولة.",
  PROMETRIC_AVAILABILITY_AUTH_REJECTED:
    "Prometric رفض توكن المصادقة الخاص بجلب المراكز المتاحة.",
  PROMETRIC_SLOTS_AUTH_REJECTED:
    "تم جلب المراكز بنجاح، لكن Prometric رفض توكن المصادقة الخاص بجلب أوقات المواعيد (slots). يلزم توكن دائم صالح لهذا الـ API.",
  PROMETRIC_SESSION_START_FAILED: "تعذر بدء جلسة Prometric الخاصة بهذا الحجز.",
  PROMETRIC_SESSION_RESPONSE_UNRECOGNIZED:
    "لم تُرجع صفحة Prometric رقم Session صالحًا لبدء الحجز.",
  PROMETRIC_BOOKING_SESSION_MISSING:
    "هذا طلب قديم لا يحتوي على Session الحجز الأصلية، لذلك لن يتم إنشاء رابط دفع بجلسة مختلفة.",
  PROMETRIC_PAYMENT_PRICING_MISSING: "تكلفة Prometric غير مضبوطة لهذا الاختبار.",
  PROMETRIC_PAYMENT_SESSION_INVALID: "أعاد Prometric رابط دفع غير مكتمل أو غير صالح.",
  PROMETRIC_PAYMENT_SESSION_FAILED:
    "تعذر إنشاء رابط دفع Prometric. أعد المحاولة من زر إنشاء الرابط.",
  PROMETRIC_PAYMENT_SLOT_TIME_MISSING:
    "لا يمكن إنشاء رابط الدفع لأن وقت الموعد المختار غير صالح. أعد البحث عن موعد جديد.",
  SALLA_SEARCH_PERIOD_EXPIRED:
    "العميل أدخل فترة بحث انتهت بالكامل قبل وصول الطلب، لذلك لم يُرسل البوت أي طلب إلى Prometric.",
  SEARCH_PERIOD_EXPIRED:
    "انتهت الفترة المطلوبة، لذلك أوقف البوت البحث ولم يرسل طلبات جديدة إلى Prometric.",
  PROMETRIC_FEE_RESPONSE_INVALID: "Prometric لم يُرجع قيمة الرسوم والعملة بالشكل المتوقع.",
  SLOT_NOT_AVAILABLE: "هذا الموعد لم يعد متاحًا. حدّث الصفحة واختر موعدًا آخر.",
  PROMETRIC_BROWSER_SESSION_REQUIRED:
    "رفض Prometric الطلب المحمي. يلزم تكامل رسمي بدل الاعتماد على جلسة متصفح يدوية.",
  NO_SLOTS_FOUND:
    "اتصال Prometric نجح، لكن لا توجد مواعيد متاحة حاليًا داخل الفترة والمدينة المحددتين.",
  NO_GENDER_COMPATIBLE_SITES:
    "المراكز المتاحة حاليًا مخصصة لجنس مختلف عن جنس العميل، لذلك لم يختر البوت أي موعد وسيواصل البحث.",
  PROMETRIC_SITE_GENDER_MISMATCH:
    "المركز المختار مخصص لجنس مختلف عن جنس العميل؛ ألغى البوت الاختيار وأعاد البحث عن مركز مناسب.",
  RATE_LIMIT_EXCEEDED:
    "تم إرسال عدد كبير من الطلبات. يرجى الانتظار قليلاً ثم المحاولة مرة أخرى.",
  WEBHOOK_RATE_LIMIT:
    "تم تجاوز الحد الأقصى لطلبات Webhook. يرجى المحاولة لاحقًا.",
  QUEUE_UNAVAILABLE:
    "تعذر معالجة الطلب حاليًا بسبب مشكلة في قائمة الانتظار. سيتم إعادة المحاولة تلقائيًا.",
  BOOKING_TRANSITION_NOT_ALLOWED:
    "لا يمكن الانتقال إلى هذه الحالة من الحالة الحالية للطلب.",
  BOOKING_STATE_INVALID:
    "حالة الحجز المحددة غير معروفة.",
  PROMETRIC_AUTOMATION_DISABLED:
    "تكامل Prometric معطّل في هذه البيئة.",
  PROMETRIC_TELEMETRY_UNAVAILABLE:
    "بيانات الحماية (Telemetry) غير متاحة حاليًا. جارٍ إعادة التوليد.",
};

export const RETRYABLE_SEARCH_CODES = [
  "NO_SLOTS_FOUND",
  "NO_GENDER_COMPATIBLE_SITES",
];

export const ACTIVE_AUTOMATION_STATES = [
  "searching",
  "reschedule_searching",
  "awaiting_admin_slot_lookup",
  "fetching_slots",
  "awaiting_admin_slot_selection",
];

export const STATE_FILTER_GROUPS = [
  { key: "all",       label: "الكل",          icon: "grid",    states: [] },
  { key: "attention", label: "بحاجة لتدخل",   icon: "alert",   states: ["manual_review", "manual_payment_required", "awaiting_service_payment"] },
  { key: "active",    label: "قيد المعالجة",   icon: "loader",  states: ["ready", "validating_eligibility", "eligibility_verified", "searching", "reschedule_searching", "awaiting_admin_slot_lookup", "fetching_slots", "awaiting_admin_slot_selection", "slot_selected", "booking"] },
  { key: "done",      label: "مكتملة",         icon: "check",   states: ["confirmed", "rescheduled"] },
  { key: "stopped",   label: "متوقفة",         icon: "x",       states: ["failed", "cancelled", "expired"] },
];

export const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(value)
      )
    : "—";

export const formatDateOnly = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
};

export const formatDateRange = (range) => {
  const from = formatDateOnly(range?.from);
  const to = formatDateOnly(range?.to);
  if (from === "—" && to === "—") return "—";
  if (from === to || to === "—") return from;
  if (from === "—") return to;
  return `${from} — ${to}`;
};

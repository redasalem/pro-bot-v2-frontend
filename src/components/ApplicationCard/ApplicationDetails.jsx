import { CHECKOUT_FLOW_AVAILABLE } from "../../lib/checkoutReadiness";
import React from "react";
import { CopyButton } from "./CopyButton";
import { PAYMENT_LABELS } from "../../hooks/useApplicationCard";
import { formatDate, formatDateRange } from "../../lib/constants";
import { Clock, ChevronDown, Check, ExternalLink, LoaderCircle } from "lucide-react";

export const ApplicationDetails = React.memo(({ 
    application, 
    data, 
    timelineOpen, 
    setTimelineOpen, 
    paymentSession 
}) => {
    const {
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
        showPaymentButton,
        cities,
        timelineEvents
    } = data;

    return (
        <>
            {/* ── Candidate Details ────────────────────────────────── */}
            {(application.nationalId || application.phone || automation.prometricCandidateId || automation.eligibilityId) && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {application.nationalId && <div className="flex flex-col gap-1 p-3.5 rounded-xl bg-gray-50/50 ring-1 ring-gray-900/5 text-xs text-gray-500 group">الهوية الوطنية<strong className="text-ink text-sm font-mono flex items-center gap-1.5">{application.nationalId} <CopyButton text={application.nationalId} /></strong></div>}
                    {application.phone && <div className="flex flex-col gap-1 p-3.5 rounded-xl bg-gray-50/50 ring-1 ring-gray-900/5 text-xs text-gray-500 group">الجوال<strong className="text-ink text-sm font-mono flex items-center gap-1.5" dir="ltr">{application.phone} <CopyButton text={application.phone} /></strong></div>}
                    {application.candidateProfile?.gender && <div className="flex flex-col gap-1 p-3.5 rounded-xl bg-gray-50/50 ring-1 ring-gray-900/5 text-xs text-gray-500 group">الجنس<strong className="text-ink text-sm font-bold flex items-center gap-1.5">{application.candidateProfile.gender}</strong></div>}
                    {automation.prometricCandidateId && <div className="flex flex-col gap-1 p-3.5 rounded-xl bg-gray-50/50 ring-1 ring-gray-900/5 text-xs text-gray-500 group">Prometric ID<strong className="text-ink text-sm font-mono flex items-center gap-1.5">{automation.prometricCandidateId} <CopyButton text={automation.prometricCandidateId} /></strong></div>}
                    {automation.eligibilityId && <div className="flex flex-col gap-1 p-3.5 rounded-xl bg-gray-50/50 ring-1 ring-gray-900/5 text-xs text-gray-500 group">رقم الأحقية<strong className="text-ink text-sm font-mono flex items-center gap-1.5">{automation.eligibilityId} <CopyButton text={automation.eligibilityId} /></strong></div>}
                </div>
            )}

            {/* ── Facts Grid ───────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="flex flex-col gap-1 p-3.5 rounded-xl bg-gray-50/50 ring-1 ring-gray-900/5 text-xs text-gray-500 hover:bg-white hover:shadow-sm transition-all">دفع الخدمة<strong className="text-ink text-sm">{PAYMENT_LABELS[application.paymentStatus] || application.paymentStatus}</strong></div>
                <div className="flex flex-col gap-1 p-3.5 rounded-xl bg-gray-50/50 ring-1 ring-gray-900/5 text-xs text-gray-500 hover:bg-white hover:shadow-sm transition-all">المراكز المتاحة<strong className="text-ink text-sm">{availableSitesCount}</strong></div>
                <div className="flex flex-col gap-1 p-3.5 rounded-xl bg-gray-50/50 ring-1 ring-gray-900/5 text-xs text-gray-500 hover:bg-white hover:shadow-sm transition-all">المواعيد المتاحة<strong className="text-ink text-sm">{availableSlotsCount}</strong></div>
                <div className="flex flex-col gap-1 p-3.5 rounded-xl bg-gray-50/50 ring-1 ring-gray-900/5 text-xs text-gray-500 hover:bg-white hover:shadow-sm transition-all">الفترة<strong className="text-ink text-sm">{formatDateRange(application.preferredDateRange)}</strong></div>
                {cities.length > 0 && <div className="flex flex-col gap-1 p-3.5 rounded-xl bg-gray-50/50 ring-1 ring-gray-900/5 text-xs text-gray-500 md:col-span-2 hover:bg-white hover:shadow-sm transition-all">المدن<strong className="text-ink text-sm truncate" title={cities.join("، ")}>{cities.join("، ")}</strong></div>}
                {hasFee && <div className="flex flex-col gap-1 p-3.5 rounded-xl bg-gray-50/50 ring-1 ring-gray-900/5 text-xs text-gray-500 hover:bg-white hover:shadow-sm transition-all">رسوم Prometric<strong className="text-ink text-sm">{feeAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {feeCurrency}</strong></div>}
                {automation.attemptCount > 0 && <div className="flex flex-col gap-1 p-3.5 rounded-xl bg-gray-50/50 ring-1 ring-gray-900/5 text-xs text-gray-500 hover:bg-white hover:shadow-sm transition-all">محاولات<strong className="text-ink text-sm">{automation.attemptCount}</strong></div>}
                {automation.nextAttemptAt && !["cancelled", "confirmed", "rescheduled", "failed"].includes(state) && <div className="flex flex-col gap-1 p-3.5 rounded-xl bg-gray-50/50 ring-1 ring-gray-900/5 text-xs text-gray-500 hover:bg-white hover:shadow-sm transition-all">المحاولة القادمة<strong className="text-ink text-sm">{formatDate(automation.nextAttemptAt)}</strong></div>}
                {application.updatedAt && <div className="flex flex-col gap-1 p-3.5 rounded-xl bg-gray-50/50 ring-1 ring-gray-900/5 text-xs text-gray-500 hover:bg-white hover:shadow-sm transition-all">آخر تحديث<strong className="text-ink text-sm">{formatDate(application.updatedAt)}</strong></div>}
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
            {!CHECKOUT_FLOW_AVAILABLE && ["manual_payment_required", "manual_review"].includes(data.state) && (
                <section role="status" className="p-5 rounded-2xl border border-amber-200 bg-amber-50 text-amber-900">
                    <strong>الدفع الآلي متوقف مؤقتًا حتى اكتمال ربطه بالحجز</strong>
                    <p className="text-sm mt-2">إذا دفعت أو ظهر مبلغ محجوز، فلا تكرر الدفع. احتفظ بمرجع العملية وتحقق من برومترك. لا يُؤكَّد الحجز إلا برقم تأكيد صادر من برومترك.</p>
                </section>
            )}

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
        </>
    );
});


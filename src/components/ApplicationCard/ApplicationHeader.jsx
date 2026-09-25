import React from "react";
import { STATE_LABELS } from "../../lib/constants";
import { CopyButton } from "./CopyButton";
import { AlertTriangle, LoaderCircle, Link2, Check, Circle } from "lucide-react";

export const ApplicationHeader = React.memo(({ application, state, badgeClass, orderNumber, status, theme }) => {
    return (
        <>
            {/* ── Header ────────────────────────────────────────────────────── */}
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
                        {application.examId?.title || (orderNumber ? `سلة #${orderNumber}` : application.examCode)}
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

            {/* ── Operational Status Banner ─────────────────────────────── */}
            <section className={`flex items-start gap-4 p-5 rounded-2xl border ${theme.border.replace('border-r-', 'border-')} ${theme.bg} backdrop-blur-md relative overflow-hidden`}>
                <div className={`flex items-center justify-center w-12 h-12 rounded-xl shrink-0 ${theme.iconBg} ${theme.iconText} shadow-sm`}>
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
        </>
    );
});

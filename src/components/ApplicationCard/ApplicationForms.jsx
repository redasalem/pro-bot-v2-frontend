import React from "react";
import { STATE_LABELS } from "../../lib/constants";
import { LoaderCircle } from "lucide-react";

export const ApplicationForms = React.memo(({ 
    application,
    allowedTransitions = [],
    locked = false,
    state,
    showConfirmForm,
    adminOptionsOpen,
    selectedTransitionState,
    setSelectedTransitionState,
    confirmFields,
    setConfirmFields,
    setConfirmDialog,
    manualConfirm,
    forceTransition,
    payStatus
}) => {
    return (
        <>
            {/* ── Manual Confirm Form (Zero-CLS) ──────────────────── */}
            <div className={`grid-expand ${showConfirmForm && ["manual_payment_required", "manual_review", "searching", "reschedule_searching"].includes(state) ? "open" : ""}`}>
                <div className="grid-expand-inner">
                    <section className="mt-4 p-6 rounded-2xl bg-orange/5 border border-orange/20 flex flex-col gap-5">
                        <strong className="text-sm text-orange-dark">التحقق من الحجز لدى Prometric</strong>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <label className="flex flex-col gap-1.5 text-xs font-bold text-gray-700">
                                رقم التأكيد *
                                <input type="text" value={confirmFields.confirmationNumber} onChange={(e) => setConfirmFields((f) => ({ ...f, confirmationNumber: e.target.value }))} className="px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:border-orange focus:ring-4 focus:ring-orange/10 outline-none transition-all" />
                            </label>
                            <label className="flex flex-col gap-1.5 text-xs font-bold text-gray-700">
                                Appointment ID
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
                                disabled={manualConfirm.isPending || !confirmFields.confirmationNumber.trim()}
                                onClick={() => {
                                    const body = { confirmationNumber: confirmFields.confirmationNumber.trim() };
                                    if (confirmFields.appointmentId.trim()) body.appointmentId = confirmFields.appointmentId.trim();
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
                                    onClick={() => setConfirmDialog({ isOpen: true, title: "تأكيد الدفع", message: "هل أنت متأكد من تغيير الدفع إلى 'مدفوع' يدويًا؟", type: "warning", action: () => payStatus.mutate("paid") })} 
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
                                    {Object.entries(STATE_LABELS).filter(([key]) => allowedTransitions.includes(key)).map(([k, v]) => (
                                        <option key={k} value={k}>{v} ({k})</option>
                                    ))}
                                </select>
                                <button 
                                    disabled={locked || forceTransition.isPending || !selectedTransitionState || selectedTransitionState === state}
                                    onClick={() => setConfirmDialog({ isOpen: true, title: "تغيير إجباري", message: `هل أنت متأكد من تغيير الحالة إجبارياً إلى ${STATE_LABELS[selectedTransitionState] || selectedTransitionState}؟`, type: "danger", action: () => forceTransition.mutate(selectedTransitionState) })}
                                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-cyan-600 text-white hover:bg-cyan-700 hover-scale disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none transition-all"
                                >
                                    {forceTransition.isPending ? <span className="flex items-center gap-2"><LoaderCircle size={14} className="animate-spin" /> جارٍ التغيير…</span> : "تنفيذ التغيير"}
                                </button>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </>
    );
});

export const ConfirmDialog = React.memo(({ confirmDialog, setConfirmDialog }) => {
    if (!confirmDialog.isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
                <div className={`p-5 ${confirmDialog.type === "danger" ? "bg-red-50 text-red-900" : "bg-orange/10 text-orange-dark"}`}>
                    <h3 className="font-bold text-lg m-0">{confirmDialog.title}</h3>
                </div>
                <div className="p-5 text-gray-600 text-sm leading-relaxed">
                    {confirmDialog.message}
                </div>
                <div className="p-4 bg-gray-50 flex justify-end gap-3 border-t border-gray-100">
                    <button onClick={() => setConfirmDialog({ isOpen: false, title: "", message: "", action: null, type: "" })} className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-200 transition-colors">إلغاء</button>
                    <button onClick={() => { confirmDialog.action(); setConfirmDialog({ isOpen: false, title: "", message: "", action: null, type: "" }); }} className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-colors ${confirmDialog.type === "danger" ? "bg-red-600 hover:bg-red-700" : "bg-orange hover:bg-orange/90"}`}>تأكيد</button>
                </div>
            </div>
        </div>
    );
});

import React from "react";
import { 
    ShieldCheck, 
    RefreshCw, 
    Play, 
    Pause, 
    ArrowRight, 
    ClipboardEdit, 
    Settings, 
    Trash2, 
    LoaderCircle,
    XCircle
} from "lucide-react";

const actionBtn = "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none";

export const ApplicationActions = React.memo(({ 
    state,
    showConfirmForm,
    setShowConfirmForm,
    adminOptionsOpen,
    setAdminOptionsOpen,
    setConfirmDialog,
    eligibilityCheck,
    searchRestart,
    resumeBot,
    pauseBot,
    forceTransition,
    appCancel,
    appDelete
}) => {
    return (
        <section className="flex flex-wrap gap-3 pt-5 border-t border-dashed border-gray-200 mt-2">
            {!["draft", "awaiting_service_payment", "booking", "confirmed", "rescheduled", "cancelled"].includes(state) && (
                <button disabled={eligibilityCheck.isPending} onClick={() => eligibilityCheck.mutate()} className={`${actionBtn} bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-ink`}>
                    {eligibilityCheck.isPending ? <LoaderCircle size={16} className="animate-spin" /> : <ShieldCheck size={16} />} فحص الأحقية
                </button>
            )}
            
            {!["draft", "awaiting_service_payment", "ready", "validating_eligibility", "booking", "confirmed", "rescheduled", "cancelled"].includes(state) && (
                <button disabled={searchRestart.isPending} onClick={() => searchRestart.mutate()} className={`${actionBtn} bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-ink`}>
                    {searchRestart.isPending ? <LoaderCircle size={16} className="animate-spin" /> : <RefreshCw size={16} />} إعادة البحث
                </button>
            )}

            {state === "manual_review" || state === "failed" ? (
                <button disabled={resumeBot.isPending} onClick={() => resumeBot.mutate()} className={`${actionBtn} bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-900`}>
                    {resumeBot.isPending ? <LoaderCircle size={16} className="animate-spin" /> : <Play size={16} />} تشغيل البوت
                </button>
            ) : !["draft", "awaiting_service_payment", "booking", "confirmed", "rescheduled", "cancelled", "failed", "manual_review"].includes(state) ? (
                <button disabled={pauseBot.isPending} onClick={() => pauseBot.mutate()} className={`${actionBtn} bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-900`}>
                    {pauseBot.isPending ? <LoaderCircle size={16} className="animate-spin" /> : <Pause size={16} />} إيقاف مؤقت
                </button>
            ) : null}

            {!["draft", "awaiting_service_payment", "ready", "confirmed", "rescheduled", "cancelled"].includes(state) && (
                <button disabled={forceTransition.isPending} onClick={() => forceTransition.mutate("ready")} className={`${actionBtn} bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-ink`}>
                    {forceTransition.isPending ? <LoaderCircle size={16} className="animate-spin" /> : <ArrowRight size={16} />} إرجاع إلى جاهز
                </button>
            )}

            {!["draft", "awaiting_service_payment", "cancelled", "confirmed", "rescheduled"].includes(state) && (
                <button onClick={() => setShowConfirmForm((v) => !v)} className={`${actionBtn} ${showConfirmForm ? "bg-orange/10 text-orange-dark" : "bg-gray-50 text-gray-700 hover:bg-gray-100"}`}>
                    <ClipboardEdit size={16} /> {showConfirmForm ? "إغلاق النموذج" : "تأكيد الدفع اليدوي"}
                </button>
            )}

            <button onClick={() => setAdminOptionsOpen((v) => !v)} className={`${actionBtn} ${adminOptionsOpen ? "bg-cyan-50 text-cyan-700" : "bg-gray-50 text-gray-700 hover:bg-gray-100"}`}>
                <Settings size={16} /> خيارات متقدمة
            </button>

            {!["cancelled", "confirmed", "rescheduled"].includes(state) && (
                <button disabled={appCancel.isPending} onClick={() => setConfirmDialog({ isOpen: true, title: "إلغاء الطلب", message: "هل أنت متأكد من إلغاء الطلب؟ (لن يستكمل البوت العمل عليه)", type: "warning", action: () => appCancel.mutate() })} className={`${actionBtn} bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-ink mr-auto`}>
                    {appCancel.isPending ? <LoaderCircle size={16} className="animate-spin" /> : <XCircle size={16} />} إلغاء الطلب
                </button>
            )}
            
            <button disabled={appDelete.isPending} onClick={() => setConfirmDialog({ isOpen: true, title: "حذف نهائي", message: "هل أنت متأكد من حذف الطلب بجميع بياناته؟ لا يمكن التراجع عن هذا الإجراء وسوف يختفي من اللوحة.", type: "danger", action: () => appDelete.mutate() })} className={`${actionBtn} bg-red-600 text-white hover:bg-red-700 ${["cancelled", "confirmed", "rescheduled"].includes(state) ? "mr-auto" : ""}`}>
                {appDelete.isPending ? <LoaderCircle size={16} className="animate-spin" /> : <Trash2 size={16} />} حذف نهائي
            </button>
        </section>
    );
});

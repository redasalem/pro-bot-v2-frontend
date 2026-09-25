import React from "react";
import { Circle, Check, LoaderCircle } from "lucide-react";

export const ApplicationTimeline = React.memo(({ workflowSteps, firstPendingIndex, errorCode }) => {
    return (
        <section className="flex flex-col gap-4 p-5 border border-gray-100 rounded-2xl bg-gray-50/30 overflow-hidden">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
                <span className="tracking-wide">مسار التنفيذ</span>
                <span>{workflowSteps.filter(s => s.done).length} من {workflowSteps.length}</span>
            </div>
            <div className="overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
                <div className="relative flex justify-between items-start w-full min-w-[500px]">
                    {/* Glowing connecting line background */}
                    <div className="absolute top-4 left-6 right-6 h-1 bg-gray-200 rounded-full z-0"></div>
                    {/* Active glowing line */}
                    <div 
                        className="absolute top-4 right-6 h-1 bg-gradient-to-l from-cyan to-cyan-dark rounded-full z-0 transition-all duration-700 ease-in-out shadow-[0_0_8px_rgba(20,184,166,0.6)]"
                        style={{ width: `${Math.max(0, (workflowSteps.filter(s => s.done).length - 1) / (workflowSteps.length - 1) * 100)}%` }}
                    ></div>
                    
                    {workflowSteps.map((step, index) => {
                        const StepIcon = step.Icon || Circle;
                        const current = !errorCode && index === firstPendingIndex;
                        const stepStyle = step.done 
                            ? "text-emerald-700" 
                            : step.warning 
                                ? "text-amber-700" 
                                : current 
                                    ? "text-cyan-700" 
                                    : "text-gray-400";
                        
                        const iconWrapperStyle = step.done 
                            ? "bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.4)] border-transparent" 
                            : current 
                                ? "bg-white border-2 border-cyan text-cyan-600 shadow-[0_0_12px_rgba(20,184,166,0.4)]" 
                                : "bg-white border-2 border-gray-200 text-gray-300";

                        return (
                            <div key={step.label} className={`relative z-10 flex flex-col items-center gap-2 transition-all flex-1 ${stepStyle}`}>
                                <span className={`flex items-center justify-center w-9 h-9 rounded-full transition-all duration-500 ${iconWrapperStyle}`}>
                                    {step.done ? <Check size={16} strokeWidth={3} /> : current ? <LoaderCircle size={16} className="animate-spin" /> : <StepIcon size={16} />}
                                </span>
                                <small className="font-bold text-[11px] whitespace-nowrap">{step.label}</small>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
});

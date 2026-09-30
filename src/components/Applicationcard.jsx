import { useApplicationCard } from "../hooks/useApplicationCard";
import { ApplicationHeader } from "./ApplicationCard/ApplicationHeader";
import { ApplicationTimeline } from "./ApplicationCard/ApplicationTimeline";
import { ApplicationDetails } from "./ApplicationCard/ApplicationDetails";
import { ApplicationActions } from "./ApplicationCard/ApplicationActions";
import { ApplicationForms, ConfirmDialog } from "./ApplicationCard/ApplicationForms";

export default function Applicationcard({ application, currentTime }) {
    const { data, uiState, mutations } = useApplicationCard(application, currentTime);

    return (
        <article className="group flex flex-col gap-6 p-7 bg-white border border-gray-100 rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-400 relative overflow-hidden">

            {/* Subtle left accent border instead of heavy right border */}
            <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${data.theme.border.replace('border-r-', 'bg-')} opacity-70 group-hover:opacity-100 transition-opacity duration-300`} />

            <ApplicationHeader
                application={application}
                state={data.state}
                badgeClass={data.badgeClass}
                orderNumber={data.orderNumber}
                status={data.status}
                theme={data.theme}
            />

            <ApplicationTimeline
                workflowSteps={data.workflowSteps}
                firstPendingIndex={data.firstPendingIndex}
                errorCode={data.errorCode}
            />

            <ApplicationDetails
                application={application}
                data={data}
                timelineOpen={uiState.timelineOpen}
                setTimelineOpen={uiState.setTimelineOpen}
                paymentSession={mutations.paymentSession}
            />

            <ApplicationActions
                    locked={Boolean(application.automation?.activeJobId)}
                    paymentReview={data.paymentReview}
                    reconciliationStatus={data.automation.paymentReconciliation?.status}
                    paymentReconcile={mutations.paymentReconcile}
                    acknowledgeUnpaid={mutations.acknowledgeUnpaid}
                state={data.state}
                showConfirmForm={uiState.showConfirmForm}
                setShowConfirmForm={uiState.setShowConfirmForm}
                adminOptionsOpen={uiState.adminOptionsOpen}
                setAdminOptionsOpen={uiState.setAdminOptionsOpen}
                setConfirmDialog={uiState.setConfirmDialog}
                eligibilityCheck={mutations.eligibilityCheck}
                searchRestart={mutations.searchRestart}
                resumeBot={mutations.resumeBot}
                pauseBot={mutations.pauseBot}
                forceTransition={mutations.forceTransition}
                appCancel={mutations.appCancel}
                appDelete={mutations.appDelete}
            />

            <ApplicationForms
                allowedTransitions={data.allowedTransitions}
                locked={Boolean(data.automation.activeJobId) || data.paymentReview}
                application={application}
                state={data.state}
                showConfirmForm={uiState.showConfirmForm}
                adminOptionsOpen={uiState.adminOptionsOpen}
                selectedTransitionState={uiState.selectedTransitionState}
                setSelectedTransitionState={uiState.setSelectedTransitionState}
                confirmFields={uiState.confirmFields}
                setConfirmFields={uiState.setConfirmFields}
                setConfirmDialog={uiState.setConfirmDialog}
                manualConfirm={mutations.manualConfirm}
                forceTransition={mutations.forceTransition}
                payStatus={mutations.payStatus}
            />

            <ConfirmDialog
                confirmDialog={uiState.confirmDialog}
                setConfirmDialog={uiState.setConfirmDialog}
            />
        </article>
    );
}

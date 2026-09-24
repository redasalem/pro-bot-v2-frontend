import api from "./api";

export const getAllApplications = async () => {
    const { data } = await api.get("api/v1/applications");
    return data.data || [];
};

export const getActiveStatus = async () => {
    const { data } = await api.get("api/v1/applications/active-status");
    return data.data || [];
};

export const getAdminSummary = async () => {
    const { data } = await api.get("api/v1/admin-operations/summary");
    return data.data?.counts || {};
};

export const createPaymentSession = async (id) => {
    const { data } = await api.post(`api/v1/booking-workflow/${id}/create-payment-session`, {});
    return data;
};

export const triggerEligibilityCheck = async (id) => {
    const { data } = await api.post(`api/v1/booking-workflow/${id}/check-eligibility`, {});
    return data;
};

export const restartSearch = async (id) => {
    const { data } = await api.post(`api/v1/booking-workflow/${id}/start-search`, {});
    return data;
};

export const cancelApplication = async (id) => {
    const { data } = await api.post(`api/v1/booking-workflow/${id}/cancel`, {});
    return data;
};

export const forceTransitionState = async (id, targetState) => {
    const { data } = await api.post(`api/v1/booking-workflow/${id}/transition`, { state: targetState });
    return data;
};

export const confirmBooking = async (id, body) => {
    const { data } = await api.post(`api/v1/booking-workflow/${id}/confirm-booking`, body);
    return data;
};

export const updatePaymentStatus = async (id, paymentStatus) => {
    const { data } = await api.patch(`api/v1/applications/${id}/payment`, { paymentStatus });
    return data;
};

export const getTelemetryStatus = async () => {
    const { data } = await api.get("api/v1/prometric/telemetry");
    return data.data;
};

export const refreshTelemetry = async () => {
    const { data } = await api.post("api/v1/prometric/telemetry/refresh", {});
    return data.data;
};

export const deleteApplication = async (id) => {
    const { data } = await api.delete(`api/v1/applications/${id}`);
    return data;
};

// Trigger an immediate slot scan without waiting for the polling interval
export const triggerImmediateScan = async () => {
    const { data } = await api.post("api/v1/prometric/scan/trigger", {});
    return data;
};

// Pause automation for a single application (force to a manual_review state)
export const pauseApplicationAutomation = async (id) => {
    const { data } = await api.post(`api/v1/booking-workflow/${id}/transition`, { state: "manual_review" });
    return data;
};

// Resume automation for a single application (force back to searching)
export const resumeApplicationAutomation = async (id) => {
    const { data } = await api.post(`api/v1/booking-workflow/${id}/start-search`, {});
    return data;
};
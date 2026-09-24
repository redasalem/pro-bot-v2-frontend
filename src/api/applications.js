import api from "./api";

export const getAllApplications = async () => {
    const { data } = await api.get("api/v1/applications");
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
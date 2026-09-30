// Fail closed locally and require backend capabilities before exposing payment.
export const CHECKOUT_FLOW_AVAILABLE = false;

export const hasPaymentEvidence = (app) => Boolean(
    app.automation?.paymentAttemptStartedAt || app.automation?.bookingCommitStartedAt
    || app.automation?.paymentOrchestratorId || app.automation?.prometricCheckoutUrl
    || app.automation?.prometricPaymentUrl || app.automation?.paymentIntentId
    || app.prometricPayment?.reference || ["paid", "refunded"].includes(app.prometricPayment?.status)
    || ["TIMEOUT", "JOB_TIMEOUT_EXCEEDED", "BOOKING_LOCK_LOST", "PROMETRIC_RESCHEDULE_COMMIT_FAILED", "PAYMENT_RECONCILIATION_REQUIRED"].includes(app.automation?.lastError?.code)
);

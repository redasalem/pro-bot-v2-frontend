import axios from "axios";
import { getToken, clearToken } from "../lib/auth";
import { API_ERROR_MESSAGES } from "../lib/constants";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ,
  withCredentials: true,
  timeout: 20000, // 20s — covers Render cold-start spin-up
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Retry interceptor (cold-start resilience) ─────────────────────────
// Automatically retries once after a 3 s delay on network errors or
// timeouts, which are common when the Render backend wakes from sleep.
api.interceptors.response.use(null, async (error) => {
  const config = error.config;

  // Only retry on network errors or timeouts, and only once
  const isRetryable = !error.response && (error.code === "ECONNABORTED" || error.code === "ERR_NETWORK" || !error.code);
  if (isRetryable && !config.__retried) {
    config.__retried = true;
    await new Promise((r) => setTimeout(r, 3000));
    return api(config);
  }

  return Promise.reject(error);
});

// ── Error normalizer ──────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const payload = error.response?.data;
    const code = payload?.error?.code;

    error.code = code || error.code;

    // Network errors (offline, DNS failure, CORS block) have no response at all
    if (!error.response) {
      error.friendlyMessage = error.code === "ECONNABORTED"
        ? "انتهت مهلة الاتصال بالخادم. تأكد من اتصالك بالإنترنت وأعد المحاولة."
        : "تعذر الاتصال بالخادم. تحقق من اتصالك بالإنترنت وأعد المحاولة.";
      return Promise.reject(error);
    }

    error.friendlyMessage =
      API_ERROR_MESSAGES[code] ||
      payload?.error?.message ||
      payload?.message ||
      "تعذر تنفيذ الطلب";

    if (status === 401 && window.location.pathname !== "/login") {
      clearToken();
      window.location.href = "/login";
    }

    if (status === 403) {
      error.friendlyMessage =
        API_ERROR_MESSAGES[code] ||
        "ليس لديك صلاحية لتنفيذ هذا الإجراء.";
    }

    if (status === 429) {
      error.friendlyMessage =
        API_ERROR_MESSAGES[code] ||
        "تم إرسال عدد كبير من الطلبات. يرجى الانتظار قليلاً ثم المحاولة مرة أخرى.";
    }

    return Promise.reject(error);
  }
);


export default api;
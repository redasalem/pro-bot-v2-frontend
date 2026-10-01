import api from './api';
import { setToken, clearToken } from '../lib/auth';

export const loginRequest = async ({email, password}) => {
    const {data} = await api.post('api/v1/auth/login', {email, password});

    // ── P0-2: Store the fallback token returned by the backend ──────
    // Safari and non-CHIPS browsers may silently drop the HttpOnly cookie.
    // The backend now returns the token in the response body as a fallback.
    if (data.token) {
        setToken(data.token);
    }

    try {
        const {data: session} = await api.get('api/v1/auth/me');
        return { ...data, user: session.user };
    } catch (error) {
        if (error.response?.status === 401) {
            error.friendlyMessage = 'تعذر حفظ جلسة الدخول في المتصفح. أعد المحاولة أو تواصل مع مسؤول النظام.';
        }
        throw error;
    }
};

export const logoutRequest = async () => {
    const {data} = await api.post('api/v1/auth/logout');
    clearToken();
    return data;
};

export const getMe = async () => {
    const {data} = await api.get('api/v1/auth/me');
    return data;
};

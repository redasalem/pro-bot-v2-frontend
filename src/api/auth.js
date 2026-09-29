import api from './api';

export const loginRequest = async ({email, password}) => {
    const {data} = await api.post('api/v1/auth/login', {email, password});
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
    return data;
};

export const getMe = async () => {
    const {data} = await api.get('api/v1/auth/me');
    return data;
};

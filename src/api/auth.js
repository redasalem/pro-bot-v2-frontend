import api from './api';

export const loginRequest = async ({email, password}) => {
    const {data} = await api.post('api/v1/auth/login', {email, password});
    return data;
};

export const getMe = async () => {
    const {data} = await api.get('api/v1/auth/me');
    return data;
};

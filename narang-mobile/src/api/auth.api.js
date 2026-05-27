import api from './axios';

export const login = (data) => api.post('/api/v1/auth/login', data);
export const register = (data) => api.post('/api/v1/auth/register', data);
export const getMe = () => api.get('/api/v1/auth/me');

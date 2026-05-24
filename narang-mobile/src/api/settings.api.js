import api from './axios';

export const getSettings = () => api.get('/api/v1/settings');
export const updateSettings = (data) => api.put('/api/v1/settings', data);

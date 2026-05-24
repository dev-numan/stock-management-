import api from './axios';

export const getPurchases = (params) => api.get('/api/v1/purchases', { params });
export const getPurchase = (id) => api.get(`/api/v1/purchases/${id}`);
export const createPurchase = (data) => api.post('/api/v1/purchases', data);

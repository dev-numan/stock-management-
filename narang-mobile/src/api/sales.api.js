import api from './axios';

export const getSales = (params) => api.get('/api/v1/sales', { params });
export const getSale = (id) => api.get(`/api/v1/sales/${id}`);
export const createSale = (data) => api.post('/api/v1/sales', data);
export const deleteSale = (id) => api.delete(`/api/v1/sales/${id}`);

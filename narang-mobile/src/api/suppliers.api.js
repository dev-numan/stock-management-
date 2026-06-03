import api from './axios';

export const getSuppliers = (params) => api.get('/api/v1/suppliers', { params });
export const getSupplier = (id) => api.get(`/api/v1/suppliers/${id}`);
export const getSupplierLedger = (id, params) => api.get(`/api/v1/suppliers/${id}/ledger`, { params });
export const addSupplierPayment = (id, data) => api.post(`/api/v1/suppliers/${id}/payments`, data);
export const addSupplierPurchase = (id, data) => api.post(`/api/v1/suppliers/${id}/purchases`, data);
export const deleteSupplierPayment = (supplierId, paymentId) =>
  api.delete(`/api/v1/suppliers/${supplierId}/payments/${paymentId}`);
export const createSupplier = (data) => api.post('/api/v1/suppliers', data);
export const updateSupplier = (id, data) => api.put(`/api/v1/suppliers/${id}`, data);
export const deleteSupplier = (id) => api.delete(`/api/v1/suppliers/${id}`);

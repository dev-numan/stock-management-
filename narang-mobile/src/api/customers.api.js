import api from './axios';

export const getCustomers = (params) => api.get('/api/v1/customers', { params });
export const getCustomer = (id) => api.get(`/api/v1/customers/${encodeURIComponent(id)}`);
export const createCustomer = (data) => api.post('/api/v1/customers', data);
export const updateCustomer = (id, data) => api.put(`/api/v1/customers/${id}`, data);
export const deleteCustomer = (id) => api.delete(`/api/v1/customers/${id}`);
export const getCustomerDeletionBlockers = (id) =>
  api.get(`/api/v1/customers/${encodeURIComponent(id)}/deletion-blockers`);
export const getCustomerAdvanceEntries = (id) =>
  api.get(`/api/v1/customers/${encodeURIComponent(id)}/advance`);
export const addCustomerAdvance = (id, data) =>
  api.post(`/api/v1/customers/${encodeURIComponent(id)}/advance`, data);
export const addCustomerCreditCharge = (id, data) =>
  api.post(`/api/v1/customers/${encodeURIComponent(id)}/credit-charge`, data);
export const deleteCustomerAdvanceEntry = (customerId, entryId) =>
  api.delete(
    `/api/v1/customers/${encodeURIComponent(customerId)}/advance/${encodeURIComponent(entryId)}`
  );

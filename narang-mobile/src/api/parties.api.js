import api from './axios';

export const getParties = (params) => api.get('/api/v1/parties', { params });
export const getParty = (id) => api.get(`/api/v1/parties/${encodeURIComponent(id)}`);
export const createParty = (data) => api.post('/api/v1/parties', data);
export const updateParty = (id, data) => api.put(`/api/v1/parties/${id}`, data);
export const deleteParty = (id) => api.delete(`/api/v1/parties/${id}`);
export const convertParty = (id, partyType) =>
  api.post(`/api/v1/parties/${encodeURIComponent(id)}/convert`, { partyType });
export const getPartyDeletionBlockers = (id) =>
  api.get(`/api/v1/parties/${encodeURIComponent(id)}/deletion-blockers`);
export const getPartyAdvanceEntries = (id) =>
  api.get(`/api/v1/parties/${encodeURIComponent(id)}/advance`);
export const addPartyAdvance = (id, data) =>
  api.post(`/api/v1/parties/${encodeURIComponent(id)}/advance`, data);
export const addPartyCreditCharge = (id, data) =>
  api.post(`/api/v1/parties/${encodeURIComponent(id)}/credit-charge`, data);
export const deletePartyAdvanceEntry = (partyId, entryId) =>
  api.delete(
    `/api/v1/parties/${encodeURIComponent(partyId)}/advance/${encodeURIComponent(entryId)}`
  );
export const getPartySupplierLedger = (id, params) =>
  api.get(`/api/v1/parties/${encodeURIComponent(id)}/supplier-ledger`, { params });
export const addPartyPayment = (id, data) =>
  api.post(`/api/v1/parties/${encodeURIComponent(id)}/payments`, data);
export const addPartyPurchase = (id, data) =>
  api.post(`/api/v1/parties/${encodeURIComponent(id)}/purchases`, data);
export const deletePartyPayment = (partyId, paymentId) =>
  api.delete(
    `/api/v1/parties/${encodeURIComponent(partyId)}/payments/${encodeURIComponent(paymentId)}`
  );

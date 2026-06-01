import api from './axios';

export const getProducts = (params) => api.get('/api/v1/products', { params });
const productPath = (id) => `/api/v1/products/${encodeURIComponent(id)}`;

export const getProduct = (id) => api.get(productPath(id));
export const createProduct = (data) => api.post('/api/v1/products', data);
export const updateProduct = (id, data) => api.put(productPath(id), data);
export const deleteProduct = (id) => api.delete(productPath(id));
export const addProductStock = (id, data) => api.post(`${productPath(id)}/stock`, data);

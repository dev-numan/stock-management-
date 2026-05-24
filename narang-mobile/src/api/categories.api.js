import api from './axios';

export const getCategories = () => api.get('/api/v1/categories');
export const createCategory = (data) => api.post('/api/v1/categories', data);
export const deleteCategory = (id) => api.delete(`/api/v1/categories/${id}`);

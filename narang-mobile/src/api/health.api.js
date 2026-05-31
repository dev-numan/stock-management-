import api from './axios';

export const pingHealth = () => api.get('/health', { timeout: 8000 });

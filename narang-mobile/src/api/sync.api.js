import api from './axios';

export const getBootstrap = () => api.get('/api/v1/sync/bootstrap');

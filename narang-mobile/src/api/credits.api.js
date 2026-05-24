import api from './axios';

export const getCredits = () => api.get('/api/v1/credits');

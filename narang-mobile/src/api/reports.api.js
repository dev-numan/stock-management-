import api from './axios';

export const getDashboard = () => api.get('/api/v1/reports/dashboard');
export const getSalesTrend = (params) => api.get('/api/v1/reports/sales-trend', { params });
export const getSalesSummary = (params) => api.get('/api/v1/reports/sales-summary', { params });
export const getProfitLoss = (params) => api.get('/api/v1/reports/profit-loss', { params });
export const getProfitReport = (params) => api.get('/api/v1/reports/profit-report', { params });
export const getStockValuation = () => api.get('/api/v1/reports/stock-valuation');

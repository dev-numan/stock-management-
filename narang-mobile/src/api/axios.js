import axios from 'axios';
import { getToken } from '../utils/storage';
import { handleSessionExpired } from '../utils/authSession';
import { API_BASE_URL } from '../config/api';

const AUTH_SKIP_PATHS = ['/auth/login', '/auth/register'];

const isNgrok = /ngrok/i.test(API_BASE_URL || '');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    ...(isNgrok ? { 'ngrok-skip-browser-warning': 'true' } : {}),
  },
  timeout: 30000,
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    const isAuthAttempt = AUTH_SKIP_PATHS.some((p) => url.includes(p));

    if (status === 401 && !isAuthAttempt) {
      await handleSessionExpired();
    }

    if (!error.response) {
      const tunnelHint =
        'Cannot reach the API. Start backend with: cd narang-backend && npm run dev:tunnel (needs NGROK_AUTHTOKEN), then restart Expo: npx expo start --tunnel --clear';
      const lanHint =
        'Cannot reach the server. Use same Wi‑Fi or run backend with npm run dev:tunnel for ngrok.';
      const hint = isNgrok || API_BASE_URL?.startsWith('https://') ? tunnelHint : lanHint;
      error.message = error.code === 'ECONNABORTED' ? 'Request timed out' : hint;
    }
    return Promise.reject(error);
  }
);

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (isNgrok) {
    config.headers['ngrok-skip-browser-warning'] = 'true';
  }
  if (__DEV__) {
    const method = (config.method || 'get').toUpperCase();
    const url = `${config.baseURL || API_BASE_URL}${config.url || ''}`;
    // eslint-disable-next-line no-console
    console.log(`[API] → ${method} ${url}`);
  }
  return config;
});

if (__DEV__) {
  api.interceptors.response.use(
    (response) => {
      const method = (response.config.method || 'get').toUpperCase();
      const url = `${response.config.baseURL}${response.config.url}`;
      // eslint-disable-next-line no-console
      console.log(`[API] ← ${response.status} ${method} ${url}`);
      return response;
    },
    (error) => {
      const cfg = error.config;
      if (cfg) {
        const method = (cfg.method || 'get').toUpperCase();
        const url = `${cfg.baseURL}${cfg.url}`;
        // eslint-disable-next-line no-console
        console.log(`[API] ← FAIL ${method} ${url}`, error.message);
      }
      return Promise.reject(error);
    }
  );
}

export default api;

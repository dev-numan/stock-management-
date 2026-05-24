import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_PORT = 5001;

/** IPv4 from Expo Metro debugger host (e.g. 192.168.100.19:8081). */
function getMetroLanHost() {
  const raw =
    Constants.expoGoConfig?.debuggerHost ??
    Constants.expoConfig?.hostUri ??
    Constants.manifest2?.extra?.expoGo?.debuggerHost;

  if (!raw) return null;

  const host = String(raw).split(':')[0];
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host) ? host : null;
}

/**
 * Resolves API base URL for dev:
 * 1. EXPO_PUBLIC_API_URL from .env
 * 2. Same LAN IP as Metro (when using `expo start --lan`)
 * 3. Simulator / emulator loopback aliases
 */
export function getApiBaseUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
  if (fromEnv) return fromEnv;

  const metroHost = getMetroLanHost();
  if (metroHost) return `http://${metroHost}:${API_PORT}`;

  if (Platform.OS === 'android' && !Constants.isDevice) {
    return `http://10.0.2.2:${API_PORT}`;
  }
  if (Platform.OS === 'ios' && !Constants.isDevice) {
    return `http://127.0.0.1:${API_PORT}`;
  }

  return `http://127.0.0.1:${API_PORT}`;
}

export const API_BASE_URL = getApiBaseUrl();

if (__DEV__) {
  // eslint-disable-next-line no-console
  console.log('[API] base URL:', API_BASE_URL);
}

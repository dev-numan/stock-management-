import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// SecureStore keys must be alphanumeric / '.', '-', '_' (no '@'), so these
// differ from the old AsyncStorage keys, which we migrate from once.
const TOKEN_KEY = 'narang_token';
const USER_KEY = 'narang_user';
const LEGACY_TOKEN_KEY = '@narang_token';
const LEGACY_USER_KEY = '@narang_user';

export const getToken = async () => SecureStore.getItemAsync(TOKEN_KEY);
export const setToken = async (token) => SecureStore.setItemAsync(TOKEN_KEY, token);
export const removeToken = async () => SecureStore.deleteItemAsync(TOKEN_KEY);

export const getUser = async () => {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  return raw ? JSON.parse(raw) : null;
};
export const setUser = async (user) =>
  SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
export const removeUser = async () => SecureStore.deleteItemAsync(USER_KEY);

export const clearAuth = async () => {
  await removeToken();
  await removeUser();
};

/**
 * One-time migration of the auth token + user from the old (unencrypted)
 * AsyncStorage into the OS keychain/keystore via SecureStore. Safe to call on
 * every launch — it no-ops once the legacy keys are gone. Best-effort: any
 * failure just falls back to requiring a fresh login.
 */
export const migrateLegacyAuth = async () => {
  try {
    const [legacyToken, legacyUser] = await Promise.all([
      AsyncStorage.getItem(LEGACY_TOKEN_KEY),
      AsyncStorage.getItem(LEGACY_USER_KEY),
    ]);
    if (legacyToken) {
      await SecureStore.setItemAsync(TOKEN_KEY, legacyToken);
      await AsyncStorage.removeItem(LEGACY_TOKEN_KEY);
    }
    if (legacyUser) {
      await SecureStore.setItemAsync(USER_KEY, legacyUser);
      await AsyncStorage.removeItem(LEGACY_USER_KEY);
    }
  } catch {
    // ignore — fall back to fresh login
  }
};

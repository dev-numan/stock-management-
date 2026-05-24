import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@narang_token';
const USER_KEY = '@narang_user';

export const getToken = async () => AsyncStorage.getItem(TOKEN_KEY);
export const setToken = async (token) => AsyncStorage.setItem(TOKEN_KEY, token);
export const removeToken = async () => AsyncStorage.removeItem(TOKEN_KEY);

export const getUser = async () => {
  const raw = await AsyncStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
};
export const setUser = async (user) => AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
export const removeUser = async () => AsyncStorage.removeItem(USER_KEY);

export const clearAuth = async () => {
  await removeToken();
  await removeUser();
};

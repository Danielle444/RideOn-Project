import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "../../../shared/auth/constants/storageKeys";

// ---------- TOKEN ----------
export async function saveToken(token) {
  if (!token) return;
  await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
}

export async function getToken() {
  return await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
}

// ---------- USER ----------
export async function saveUser(user) {
  if (!user) return;
  await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
}

export async function getUser() {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.USER);
  return data ? JSON.parse(data) : null;
}

// ---------- ACTIVE ROLE ----------
export async function saveActiveRole(role) {
  if (!role) return;
  await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_ROLE, JSON.stringify(role));
}

export async function getActiveRole() {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_ROLE);
  return data ? JSON.parse(data) : null;
}

export async function clearActiveRole() {
  await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_ROLE);
}

// ---------- CLEAR ALL ----------
export async function clearAuthStorage() {
  await AsyncStorage.multiRemove([
    STORAGE_KEYS.TOKEN,
    STORAGE_KEYS.USER,
    STORAGE_KEYS.ACTIVE_ROLE,
  ]);
}
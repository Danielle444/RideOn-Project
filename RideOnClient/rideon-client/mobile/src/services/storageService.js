import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "rideon_token";
const USER_KEY = "rideon_user";
const ACTIVE_ROLE_KEY = "rideon_active_role";

async function saveToken(token) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

async function getToken() {
  return await AsyncStorage.getItem(TOKEN_KEY);
}

async function saveUser(user) {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

async function getUser() {
  const value = await AsyncStorage.getItem(USER_KEY);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function saveActiveRole(activeRole) {
  await AsyncStorage.setItem(ACTIVE_ROLE_KEY, JSON.stringify(activeRole));
}

async function getActiveRole() {
  const value = await AsyncStorage.getItem(ACTIVE_ROLE_KEY);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function removeActiveRole() {
  await AsyncStorage.removeItem(ACTIVE_ROLE_KEY);
}

async function clearAuthStorage() {
  await AsyncStorage.removeItem(TOKEN_KEY);
  await AsyncStorage.removeItem(USER_KEY);
  await AsyncStorage.removeItem(ACTIVE_ROLE_KEY);
}

export {
  saveToken,
  getToken,
  saveUser,
  getUser,
  saveActiveRole,
  getActiveRole,
  removeActiveRole,
  clearAuthStorage,
};

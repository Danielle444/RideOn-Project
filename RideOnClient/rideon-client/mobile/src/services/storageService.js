import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "rideon_token";
const USER_KEY = "rideon_user";

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

async function clearAuthStorage() {
  await AsyncStorage.removeItem(TOKEN_KEY);
  await AsyncStorage.removeItem(USER_KEY);
}

export {
  saveToken,
  getToken,
  saveUser,
  getUser,
  clearAuthStorage,
};
import { STORAGE_KEYS } from "../../../shared/auth/constants/storageKeys";

const REMEMBER_ME_KEY = "rideon_remember_me";

function getStorage(rememberMe) {
  return rememberMe ? localStorage : sessionStorage;
}

// ---------- REMEMBER ME ----------
function saveRememberMe(rememberMe) {
  localStorage.setItem(REMEMBER_ME_KEY, JSON.stringify(rememberMe));
}

function getRememberMe() {
  const value = localStorage.getItem(REMEMBER_ME_KEY);

  if (!value) {
    return false;
  }

  try {
    return JSON.parse(value);
  } catch {
    return false;
  }
}

function removeRememberMe() {
  localStorage.removeItem(REMEMBER_ME_KEY);
}

// ---------- TOKEN ----------
function saveToken(token, rememberMe) {
  const storage = getStorage(rememberMe);
  storage.setItem(STORAGE_KEYS.TOKEN, token);
}

function getToken() {
  return (
    localStorage.getItem(STORAGE_KEYS.TOKEN) ||
    sessionStorage.getItem(STORAGE_KEYS.TOKEN)
  );
}

function removeToken() {
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
  sessionStorage.removeItem(STORAGE_KEYS.TOKEN);
}

// ---------- USER ----------
function saveUser(user, rememberMe) {
  const storage = getStorage(rememberMe);
  storage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
}

function getUser() {
  const user =
    localStorage.getItem(STORAGE_KEYS.USER) ||
    sessionStorage.getItem(STORAGE_KEYS.USER);

  if (!user) {
    return null;
  }

  try {
    return JSON.parse(user);
  } catch {
    return null;
  }
}

function removeUser() {
  localStorage.removeItem(STORAGE_KEYS.USER);
  sessionStorage.removeItem(STORAGE_KEYS.USER);
}

// ---------- ACTIVE ROLE ----------
function saveActiveRole(activeRole, rememberMe) {
  const storage = getStorage(rememberMe);
  storage.setItem(STORAGE_KEYS.ACTIVE_ROLE, JSON.stringify(activeRole));
}

function getActiveRole() {
  const activeRole =
    localStorage.getItem(STORAGE_KEYS.ACTIVE_ROLE) ||
    sessionStorage.getItem(STORAGE_KEYS.ACTIVE_ROLE);

  if (!activeRole) {
    return null;
  }

  try {
    return JSON.parse(activeRole);
  } catch {
    return null;
  }
}

function removeActiveRole() {
  localStorage.removeItem(STORAGE_KEYS.ACTIVE_ROLE);
  sessionStorage.removeItem(STORAGE_KEYS.ACTIVE_ROLE);
}

// ---------- CLEAR ALL ----------
function clearAuthStorage() {
  removeToken();
  removeUser();
  removeActiveRole();
  removeRememberMe();
}

export {
  saveRememberMe,
  getRememberMe,
  removeRememberMe,
  saveToken,
  getToken,
  removeToken,
  saveUser,
  getUser,
  removeUser,
  saveActiveRole,
  getActiveRole,
  removeActiveRole,
  clearAuthStorage,
};
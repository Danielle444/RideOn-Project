const TOKEN_KEY = 'rideon_token';
const USER_KEY = 'rideon_user';
const ACTIVE_ROLE_KEY = 'rideon_active_role';
const REMEMBER_ME_KEY = 'rideon_remember_me';

function getStorage(rememberMe) {
  return rememberMe ? localStorage : sessionStorage;
}

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

function saveToken(token, rememberMe) {
  const storage = getStorage(rememberMe);
  storage.setItem(TOKEN_KEY, token);
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}

function saveUser(user, rememberMe) {
  const storage = getStorage(rememberMe);
  storage.setItem(USER_KEY, JSON.stringify(user));
}

function getUser() {
  const user =
    localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);

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
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(USER_KEY);
}

function saveActiveRole(activeRole, rememberMe) {
  const storage = getStorage(rememberMe);
  storage.setItem(ACTIVE_ROLE_KEY, JSON.stringify(activeRole));
}

function getActiveRole() {
  const activeRole =
    localStorage.getItem(ACTIVE_ROLE_KEY) ||
    sessionStorage.getItem(ACTIVE_ROLE_KEY);

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
  localStorage.removeItem(ACTIVE_ROLE_KEY);
  sessionStorage.removeItem(ACTIVE_ROLE_KEY);
}

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
  clearAuthStorage
};
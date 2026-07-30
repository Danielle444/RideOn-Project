import axios from "./axiosInstance";
import { API_BASE_URL } from "../config/apiBaseUrl";
import { normalizeIdentifier } from "../../../shared/auth/utils/normalizeIdentifier";


// ההתחברות היא הבקשה היחידה שעלולה לפגוש שרת מצונן (Render מרדים מופע לא
// פעיל, וההשכמה ארוכה בהרבה מ-8 שניות). פסק זמן קצר מדי גרם לכך שהשרת סיים
// את ההתחברות בהצלחה בזמן שהלקוח כבר ויתר, והמשתמשת נשארה במסך ההתחברות.
// שאר הבקשות יוצאות אחרי שהשרת כבר ער ולכן נשארות על פסק הזמן הגלובלי.
const LOGIN_TIMEOUT_MS = 30000;

function login(username, password) {
  return axios.post(
    `${API_BASE_URL}/SystemUsers/login`,
    {
      username: normalizeIdentifier(username),
      password: password,
    },
    {
      timeout: LOGIN_TIMEOUT_MS,
    }
  );
}

function register(data) {
  return axios.post(
    `${API_BASE_URL}/SystemUsers/register`,
    {
      ...data,
      username: normalizeIdentifier(data.username),
      email: normalizeIdentifier(data.email),
    },
    {
      timeout: 8000,
    }
  );
}

function getRanchesForRegistration() {
  return axios.get(`${API_BASE_URL}/Ranches/for-registration`, {
    timeout: 8000,
  });
}

function createRanchRequest(data) {
  return axios.post(`${API_BASE_URL}/SystemUsers/ranch-request`, data, {
    timeout: 8000,
  });
}

function getRoles() {
  return axios.get(`${API_BASE_URL}/Roles`, {
    timeout: 8000,
  });
}

function checkUsername(username) {
  return axios.get(`${API_BASE_URL}/SystemUsers/check-username`, {
    params: { username: normalizeIdentifier(username) },
    timeout: 8000,
  });
}

function getPersonByNationalIdForRegistration(nationalId) {
  return axios.get(`${API_BASE_URL}/Persons/by-national-id`, {
    params: { nationalId: nationalId },
    timeout: 8000,
  });
}

function changePassword(personId, currentPassword, newPassword) {
  return axios.put(
    `${API_BASE_URL}/SystemUsers/change-password`,
    {
      personId: personId,
      currentPassword: currentPassword,
      newPassword: newPassword,
    },
    {
      timeout: 8000,
    }
  );
}

export {
  login,
  register,
  getRanchesForRegistration,
  createRanchRequest,
  getRoles,
  checkUsername,
  getPersonByNationalIdForRegistration,
  changePassword,
};
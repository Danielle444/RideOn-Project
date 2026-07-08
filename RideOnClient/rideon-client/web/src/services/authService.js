import axios from "./axiosInstance";
import { normalizeIdentifier } from "../../../shared/auth/utils/normalizeIdentifier";


const API = import.meta.env.VITE_API_BASE_URL;

function login(username, password) {
  return axios.post(`${API}/SystemUsers/login`, {
    username: normalizeIdentifier(username),
    password: password,
  });
}

function loginSuperUser(email, password) {
  return axios.post(`${API}/SuperUsers/login`, {
    email: normalizeIdentifier(email),
    password: password,
  });
}

function register(data) {
  return axios.post(`${API}/SystemUsers/register`, {
    ...data,
    username: normalizeIdentifier(data.username),
    email: normalizeIdentifier(data.email),
  });
}

function createRanchRequest(data) {
  return axios.post(`${API}/SystemUsers/ranch-request`, data);
}

function getRanches() {
  return axios.get(`${API}/Ranches/for-registration`);
}

function getRoles() {
  return axios.get(`${API}/Roles`);
}

function changePassword(personId, currentPassword, newPassword) {
  const token =
    localStorage.getItem("rideon_token") ||
    sessionStorage.getItem("rideon_token");

  return axios.put(
    `${API}/SystemUsers/change-password`,
    {
      personId: personId,
      currentPassword: currentPassword,
      newPassword: newPassword,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
}

function changeSuperUserPassword(currentPassword, newPassword) {
  const token =
    localStorage.getItem("rideon_token") ||
    sessionStorage.getItem("rideon_token");

  return axios.put(
    `${API}/SuperUsers/change-password`,
    {
      currentPassword: currentPassword,
      newPassword: newPassword,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
}

function checkUsername(username) {
  return axios.get(`${API}/SystemUsers/check-username`, {
    params: { username: normalizeIdentifier(username) },
  });
}

function getPersonByNationalIdForRegistration(nationalId) {
  return axios.get(`${API}/Persons/by-national-id`, {
    params: { nationalId: nationalId },
  });
}

function sendOtp(email) {
  return axios.post(`${API}/SystemUsers/send-otp`, { email: normalizeIdentifier(email) });
}

function forgotPassword(email) {
  return axios.post(`${API}/SystemUsers/forgot-password`, { email: normalizeIdentifier(email) });
}

function resetPassword(token, newPassword) {
  return axios.post(`${API}/SystemUsers/reset-password`, { token, newPassword });
}

function superUserForgotPassword(email) {
  return axios.post(`${API}/SuperUsers/forgot-password`, { email: normalizeIdentifier(email) });
}

function superUserResetPassword(email, otpCode, newPassword) {
  return axios.post(`${API}/SuperUsers/reset-password`, {
    email: normalizeIdentifier(email),
    otpCode,
    newPassword,
  });
}

export {
  login,
  loginSuperUser,
  register,
  createRanchRequest,
  getRanches,
  getRoles,
  changePassword,
  changeSuperUserPassword,
  checkUsername,
  getPersonByNationalIdForRegistration,
  sendOtp,
  forgotPassword,
  resetPassword,
  superUserForgotPassword,
  superUserResetPassword,
};
import axios from "axios";

const API = import.meta.env.VITE_API_BASE_URL;

function login(username, password) {
  return axios.post(`${API}/SystemUsers/login`, {
    username: username,
    password: password,
  });
}

function loginSuperUser(email, password) {
  return axios.post(`${API}/SuperUsers/login`, {
    email: email,
    password: password,
  });
}

function register(data) {
  return axios.post(`${API}/SystemUsers/register`, data);
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

function changePassword(username, currentPassword, newPassword) {
  return axios.put(`${API}/SystemUsers/change-password`, {
    username: username,
    currentPassword: currentPassword,
    newPassword: newPassword,
  });
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
    params: { username: username },
  });
}

function getPersonByNationalIdForRegistration(nationalId) {
  return axios.get(`${API}/Persons/by-national-id`, {
    params: { nationalId: nationalId },
  });
}

function sendOtp(email) {
  return axios.post(`${API}/SystemUsers/send-otp`, { email });
}

function forgotPassword(email) {
  return axios.post(`${API}/SystemUsers/forgot-password`, { email });
}

function resetPassword(token, newPassword) {
  return axios.post(`${API}/SystemUsers/reset-password`, { token, newPassword });
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
};
import axios from "./axiosInstance";
import { API_BASE_URL } from "../../../shared/config/apiBaseUrl";

function login(username, password) {
  return axios.post(
    `${API_BASE_URL}/SystemUsers/login`,
    {
      username: username,
      password: password,
    },
    {
      timeout: 8000,
    }
  );
}

function register(data) {
  return axios.post(`${API_BASE_URL}/SystemUsers/register`, data, {
    timeout: 8000,
  });
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
    params: { username: username },
    timeout: 8000,
  });
}

function getPersonByNationalIdForRegistration(nationalId) {
  return axios.get(`${API_BASE_URL}/Persons/by-national-id`, {
    params: { nationalId: nationalId },
    timeout: 8000,
  });
}

function changePassword(username, currentPassword, newPassword) {
  return axios.put(
    `${API_BASE_URL}/SystemUsers/change-password`,
    {
      username: username,
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
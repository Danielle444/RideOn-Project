import axios from "axios";
import { API_BASE_URL } from "../../config/apiBaseUrl";

const API = API_BASE_URL;

function login(username, password) {
  return axios.post(`${API}/SystemUsers/login`, {
    username: username,
    password: password
  });
}

function register(data) {
  return axios.post(`${API}/SystemUsers/register`, data);
}

function getRanches() {
  return axios.get(`${API}/Ranches`);
}

function getRoles() {
  return axios.get(`${API}/Roles`);
}

function changePassword(username, currentPassword, newPassword) {
  return axios.put(`${API}/SystemUsers/change-password`, {
    username: username,
    currentPassword: currentPassword,
    newPassword: newPassword
  });
}

function checkUsername(username) {
  return axios.get(`${API}/SystemUsers/check-username`, {
    params: { username: username }
  });
}

function getPersonByNationalIdForRegistration(nationalId) {
  return axios.get(`${API}/Persons/by-national-id`, {
    params: { nationalId: nationalId }
  });
}

export {
  login,
  register,
  getRanches,
  getRoles,
  changePassword,
  checkUsername,
  getPersonByNationalIdForRegistration
};
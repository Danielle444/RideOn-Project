import axios from "axios";
import { getToken } from "./storageService";

const API = import.meta.env.VITE_API_BASE_URL;

function getAuthHeaders() {
  const token = getToken();

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
}

// ROLE REQUESTS
function getRoleRequests(roleId, status, search) {
  return axios.get(`${API}/SuperUsers/role-requests`, {
    params: {
      roleId,
      status: status || null,
      search: search || null,
    },
    ...getAuthHeaders(),
  });
}

function updateRoleRequestStatus(data) {
  return axios.put(
    `${API}/SuperUsers/role-requests/status`,
    data,
    getAuthHeaders(),
  );
}

// RANCH REQUESTS
function getRanchRequests(status, search) {
  return axios.get(`${API}/SuperUsers/ranch-requests`, {
    params: {
      status: status || null,
      search: search || null,
    },
    ...getAuthHeaders(),
  });
}

function updateRanchRequestStatus(data) {
  return axios.put(
    `${API}/SuperUsers/ranch-requests/status`,
    data,
    getAuthHeaders(),
  );
}

// SUPER USERS MANAGEMENT
function getAllSuperUsers() {
  return axios.get(`${API}/SuperUsers`, getAuthHeaders());
}

function createSuperUser(data) {
  return axios.post(`${API}/SuperUsers`, data, getAuthHeaders());
}

// FIELDS
function getAllFields() {
  return axios.get(`${API}/Fields`, getAuthHeaders());
}

function createField(data) {
  return axios.post(`${API}/Fields`, data, getAuthHeaders());
}

function updateField(data) {
  return axios.put(`${API}/Fields`, data, getAuthHeaders());
}

function deleteField(id) {
  return axios.delete(`${API}/Fields/${id}`, getAuthHeaders());
}

// JUDGES
function getAllJudges(fieldId) {
  return axios.get(`${API}/Judges`, {
    params: {
      fieldId: fieldId || null,
    },
    ...getAuthHeaders(),
  });
}

function createJudge(data) {
  return axios.post(`${API}/Judges`, data, getAuthHeaders());
}

function updateJudge(data) {
  return axios.put(`${API}/Judges`, data, getAuthHeaders());
}

function deleteJudge(id) {
  return axios.delete(`${API}/Judges/${id}`, getAuthHeaders());
}

export {
  getRoleRequests,
  updateRoleRequestStatus,
  getRanchRequests,
  updateRanchRequestStatus,
  getAllSuperUsers,
  createSuperUser,
  getAllFields,
  createField,
  updateField,
  deleteField,
  getAllJudges,
  createJudge,
  updateJudge,
  deleteJudge,
};

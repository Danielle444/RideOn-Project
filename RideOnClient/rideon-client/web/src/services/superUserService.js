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

// REQUESTS SUMMARY
async function getPendingRequestsSummary() {
  const [adminRes, secretaryRes, ranchRes] = await Promise.all([
    getRoleRequests(2, "Pending", null),
    getRoleRequests(3, "Pending", null),
    getRanchRequests("Pending", null),
  ]);

  const adminCount = Array.isArray(adminRes.data) ? adminRes.data.length : 0;
  const secretaryCount = Array.isArray(secretaryRes.data) ? secretaryRes.data.length : 0;
  const ranchCount = Array.isArray(ranchRes.data) ? ranchRes.data.length : 0;

  return {
    admin: adminCount,
    secretary: secretaryCount,
    ranch: ranchCount,
    total: adminCount + secretaryCount + ranchCount,
  };
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

// PRIZE TYPES
function getAllPrizeTypes() {
  return axios.get(`${API}/PrizeTypes`, getAuthHeaders());
}

function createPrizeType(data) {
  return axios.post(`${API}/PrizeTypes`, data, getAuthHeaders());
}

function updatePrizeType(data) {
  return axios.put(`${API}/PrizeTypes`, data, getAuthHeaders());
}

function deletePrizeType(id) {
  return axios.delete(`${API}/PrizeTypes/${id}`, getAuthHeaders());
}

// CLASS TYPES
function getAllClassTypes(fieldId) {
  return axios.get(`${API}/ClassTypes`, {
    params: {
      fieldId: fieldId || null,
    },
    ...getAuthHeaders(),
  });
}

function createClassType(data) {
  return axios.post(`${API}/ClassTypes`, data, getAuthHeaders());
}

function updateClassType(data) {
  return axios.put(`${API}/ClassTypes`, data, getAuthHeaders());
}

function deleteClassType(id) {
  return axios.delete(`${API}/ClassTypes/${id}`, getAuthHeaders());
}

// FINES
function getAllFines() {
  return axios.get(`${API}/Fines`, getAuthHeaders());
}

function createFine(data) {
  return axios.post(`${API}/Fines`, data, getAuthHeaders());
}

function updateFine(data) {
  return axios.put(`${API}/Fines`, data, getAuthHeaders());
}

function deleteFine(id) {
  return axios.delete(`${API}/Fines/${id}`, getAuthHeaders());
}

export {
  getRoleRequests,
  updateRoleRequestStatus,
  getRanchRequests,
  updateRanchRequestStatus,
  getPendingRequestsSummary,
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
  getAllPrizeTypes,
  createPrizeType,
  updatePrizeType,
  deletePrizeType,
  getAllClassTypes,
  createClassType,
  updateClassType,
  deleteClassType,
  getAllFines,
  createFine,
  updateFine,
  deleteFine,
};
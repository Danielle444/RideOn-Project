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

function getWorkersByRanch(filters) {
  return axios.get(`${API}/Workers`, {
    params: {
      ranchId: filters.ranchId,
      status: filters.status || null,
      search: filters.search || null,
    },
    ...getAuthHeaders(),
  });
}

function getWorkerById(personId, ranchId) {
  return axios.get(`${API}/Workers/${personId}`, {
    params: {
      ranchId: ranchId,
    },
    ...getAuthHeaders(),
  });
}

function updateWorker(personId, data) {
  return axios.put(`${API}/Workers/${personId}`, data, getAuthHeaders());
}

function updateWorkerRoleStatus(data) {
  return axios.put(`${API}/Workers/role-status`, data, getAuthHeaders());
}

function removeWorkerAssignment(data) {
  return axios.delete(`${API}/Workers/assignment`, {
    data: data,
    ...getAuthHeaders(),
  });
}

export {
  getWorkersByRanch,
  getWorkerById,
  updateWorker,
  updateWorkerRoleStatus,
  removeWorkerAssignment,
};
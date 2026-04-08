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

function getArenasByRanchId(ranchId) {
  return axios.get(`${API}/Arenas`, {
    params: { ranchId },
    ...getAuthHeaders(),
  });
}

function createArena(data) {
  return axios.post(`${API}/Arenas`, data, getAuthHeaders());
}

function updateArena(data) {
  return axios.put(`${API}/Arenas`, data, getAuthHeaders());
}

function deleteArena(ranchId, arenaId) {
  return axios.delete(`${API}/Arenas`, {
    params: { ranchId, arenaId },
    ...getAuthHeaders(),
  });
}

function getCompoundsByRanchId(ranchId) {
  return axios.get(`${API}/StallCompounds`, {
    params: { ranchId },
    ...getAuthHeaders(),
  });
}

function createCompound(data) {
  return axios.post(`${API}/StallCompounds`, data, getAuthHeaders());
}

function updateCompoundName(ranchId, compoundId, compoundName) {
  return axios.put(
    `${API}/StallCompounds`,
    null,
    {
      params: { ranchId, compoundId, compoundName },
      ...getAuthHeaders(),
    },
  );
}

function deleteCompound(ranchId, compoundId) {
  return axios.delete(`${API}/StallCompounds`, {
    params: { ranchId, compoundId },
    ...getAuthHeaders(),
  });
}

export {
  getArenasByRanchId,
  createArena,
  updateArena,
  deleteArena,
  getCompoundsByRanchId,
  createCompound,
  updateCompoundName,
  deleteCompound,
};
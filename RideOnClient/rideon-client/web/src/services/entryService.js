import axios from "./axiosInstance";
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

function getSecretaryCompetitionEntries(competitionId, ranchId) {
  return axios.get(`${API}/Entries/secretary-competition`, {
    params: {
      competitionId: competitionId,
      ranchId: ranchId,
    },
    ...getAuthHeaders(),
  });
}

function updateGroupEntriesDrawOrder(data) {
  return axios.put(`${API}/Entries/group-draw-order`, data, getAuthHeaders());
}

function previewGroupEntriesDrawOrder(data) {
  return axios.post(
    `${API}/Entries/group-draw-order-preview`,
    data,
    getAuthHeaders(),
  );
}

function clearGroupEntriesDrawOrder(data) {
  return axios.put(
    `${API}/Entries/group-draw-order/clear`,
    data,
    getAuthHeaders(),
  );
}

export {
  getSecretaryCompetitionEntries,
  updateGroupEntriesDrawOrder,
  previewGroupEntriesDrawOrder,
  clearGroupEntriesDrawOrder,
};
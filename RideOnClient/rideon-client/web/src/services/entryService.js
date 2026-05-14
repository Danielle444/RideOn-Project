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

export { getSecretaryCompetitionEntries, updateGroupEntriesDrawOrder };
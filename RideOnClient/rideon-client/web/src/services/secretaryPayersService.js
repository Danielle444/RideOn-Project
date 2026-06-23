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

function getCompetitionPayersForSecretary(competitionId, ranchId) {
  return axios.get(`${API}/Payers/secretary/competition-payers`, {
    params: {
      competitionId: competitionId,
      ranchId: ranchId,
    },
    ...getAuthHeaders(),
  });
}

export {
  getCompetitionPayersForSecretary,
};

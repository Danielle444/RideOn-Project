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

function getCompetitionsByHostRanch(filters) {
  return axios.get(`${API}/Competitions/by-host-ranch`, {
    params: {
      ranchId: filters.ranchId,
      searchText: filters.searchText || null,
      status: filters.status || null,
      fieldId: filters.fieldId || null,
      dateFrom: filters.dateFrom || null,
      dateTo: filters.dateTo || null,
    },
    ...getAuthHeaders(),
  });
}

function getCompetitionById(competitionId, ranchId) {
  return axios.get(`${API}/Competitions/${competitionId}`, {
    params: {
      ranchId: ranchId,
    },
    ...getAuthHeaders(),
  });
}

function createCompetition(data) {
  return axios.post(`${API}/Competitions`, data, getAuthHeaders());
}

function updateCompetition(competitionId, data) {
  return axios.put(`${API}/Competitions/${competitionId}`, data, getAuthHeaders());
}

export {
  getCompetitionsByHostRanch,
  getCompetitionById,
  createCompetition,
  updateCompetition,
};
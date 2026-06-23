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

function getCompetitionChangeRequests(competitionId, ranchId, status) {
  return axios.get(`${API}/ChangeTracking/competition`, {
    params: {
      competitionId: competitionId,
      ranchId: ranchId,
      status: status,
    },
    ...getAuthHeaders(),
  });
}

function getPendingChangeRequestsCount(ranchId) {
  return axios.get(`${API}/ChangeTracking/pending-count`, {
    params: {
      ranchId: ranchId,
    },
    ...getAuthHeaders(),
  });
}

function getPendingChangeRequestsByCompetition(ranchId) {
  return axios.get(`${API}/ChangeTracking/pending-by-competition`, {
    params: {
      ranchId: ranchId,
    },
    ...getAuthHeaders(),
  });
}

function answerChangeRequest(data) {
  return axios.post(`${API}/ChangeTracking/answer`, data, getAuthHeaders());
}

export {
  getCompetitionChangeRequests,
  getPendingChangeRequestsCount,
  getPendingChangeRequestsByCompetition,
  answerChangeRequest,
};

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

function getClassesByCompetitionId(competitionId, ranchId) {
  return axios.get(`${API}/ClassesInCompetition/${competitionId}`, {
    params: {
      ranchId: ranchId,
    },
    ...getAuthHeaders(),
  });
}

function getPredictionsByCompetitionId(competitionId, ranchId) {
  return axios.get(`${API}/ClassesInCompetition/${competitionId}/predictions`, {
    params: {
      ranchId: ranchId,
    },
    ...getAuthHeaders(),
  });
}

function getClassById(classInCompId, competitionId, ranchId) {
  return axios.get(`${API}/ClassesInCompetition/class/${classInCompId}`, {
    params: {
      competitionId: competitionId,
      ranchId: ranchId,
    },
    ...getAuthHeaders(),
  });
}

function createClassInCompetition(data) {
  return axios.post(`${API}/ClassesInCompetition`, data, getAuthHeaders());
}

function updateClassInCompetition(classInCompId, data) {
  return axios.put(
    `${API}/ClassesInCompetition/${classInCompId}`,
    data,
    getAuthHeaders(),
  );
}

function deleteClassInCompetition(classInCompId, competitionId, ranchId) {
  return axios.delete(`${API}/ClassesInCompetition/${classInCompId}`, {
    params: {
      competitionId: competitionId,
      ranchId: ranchId,
    },
    ...getAuthHeaders(),
  });
}

export {
  getClassesByCompetitionId,
  getPredictionsByCompetitionId,
  getClassById,
  createClassInCompetition,
  updateClassInCompetition,
  deleteClassInCompetition,
};
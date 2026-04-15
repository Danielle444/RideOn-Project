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

function getCompounds(ranchId) {
  return axios.get(`${API}/StallAssignments/compounds`, {
    params: { ranchId },
    ...getAuthHeaders(),
  });
}

function saveLayout(ranchId, compoundId, layoutJson) {
  return axios.post(
    `${API}/StallCompounds/layout`,
    { ranchId, compoundId, layoutJson },
    getAuthHeaders()
  );
}

function getHorses(competitionId) {
  return axios.get(`${API}/StallAssignments/horses`, {
    params: { competitionId },
    ...getAuthHeaders(),
  });
}

function getAssignments(competitionId) {
  return axios.get(`${API}/StallAssignments`, {
    params: { competitionId },
    ...getAuthHeaders(),
  });
}

function assignHorse(competitionId, ranchId, compoundId, stallId, horseId) {
  return axios.post(
    `${API}/StallAssignments`,
    { competitionId, ranchId, compoundId, stallId, horseId },
    getAuthHeaders()
  );
}

function unassignHorse(competitionId, ranchId, compoundId, stallId) {
  return axios.delete(`${API}/StallAssignments`, {
    data: { competitionId, ranchId, compoundId, stallId },
    ...getAuthHeaders(),
  });
}

export {
  getCompounds,
  saveLayout,
  getHorses,
  getAssignments,
  assignHorse,
  unassignHorse,
};

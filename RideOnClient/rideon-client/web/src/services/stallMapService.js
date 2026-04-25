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
    params: { ranchId: ranchId },
    ...getAuthHeaders(),
  });
}

function saveLayout(ranchId, compoundId, layoutJson) {
  return axios.post(
    `${API}/StallCompounds/layout`,
    { ranchId: ranchId, compoundId: compoundId, layoutJson: layoutJson },
    getAuthHeaders(),
  );
}

function getHorses(competitionId, ranchId) {
  return axios.get(`${API}/StallAssignments/horses`, {
    params: { competitionId: competitionId, ranchId: ranchId },
    ...getAuthHeaders(),
  });
}

function getAssignments(competitionId, ranchId) {
  return axios.get(`${API}/StallAssignments`, {
    params: { competitionId: competitionId, ranchId: ranchId },
    ...getAuthHeaders(),
  });
}

function assignHorse(competitionId, ranchId, compoundId, stallId, horseId) {
  return axios.post(
    `${API}/StallAssignments`,
    {
      competitionId: competitionId,
      ranchId: ranchId,
      compoundId: compoundId,
      stallId: stallId,
      horseId: horseId,
    },
    getAuthHeaders(),
  );
}

function unassignHorse(competitionId, ranchId, compoundId, stallId) {
  return axios.delete(`${API}/StallAssignments`, {
    data: {
      competitionId: competitionId,
      ranchId: ranchId,
      compoundId: compoundId,
      stallId: stallId,
    },
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

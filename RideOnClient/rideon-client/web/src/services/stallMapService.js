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
    {
      ranchId: ranchId,
      compoundId: compoundId,
      layoutJson: layoutJson,
    },
    getAuthHeaders(),
  );
}

function getAssignmentOverview(competitionId, ranchId) {
  return axios.get(`${API}/StallAssignments/overview`, {
    params: {
      competitionId: competitionId,
      ranchId: ranchId,
    },
    ...getAuthHeaders(),
  });
}

function getAssignments(competitionId, ranchId) {
  return axios.get(`${API}/StallAssignments`, {
    params: {
      competitionId: competitionId,
      ranchId: ranchId,
    },
    ...getAuthHeaders(),
  });
}

function assignStallBooking(competitionId, ranchId, compoundId, stallId, stallBookingId) {
  return axios.post(
    `${API}/StallAssignments/booking`,
    {
      competitionId: competitionId,
      ranchId: ranchId,
      compoundId: compoundId,
      stallId: stallId,
      stallBookingId: stallBookingId,
    },
    getAuthHeaders(),
  );
}

function unassignStallBooking(competitionId, ranchId, compoundId, stallId) {
  return axios.delete(`${API}/StallAssignments/booking`, {
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
  getAssignmentOverview,
  getAssignments,
  assignStallBooking,
  unassignStallBooking,
};
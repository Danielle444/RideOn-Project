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

function assignStallBooking(
  competitionId,
  ranchId,
  compoundId,
  stallId,
  stallBookingId,
) {
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

function getPublishStatus(competitionId, ranchId) {
  return axios.get(`${API}/StallAssignments/publish-status`, {
    params: {
      competitionId: competitionId,
      ranchId: ranchId,
    },
    ...getAuthHeaders(),
  });
}

function publishStallMap(competitionId, ranchId, systemUserId) {
  return axios.post(
    `${API}/StallAssignments/publish`,
    {
      competitionId: competitionId,
      ranchId: ranchId,
      systemUserId: systemUserId,
    },
    getAuthHeaders(),
  );
}

function unpublishStallMap(competitionId, ranchId) {
  return axios.post(
    `${API}/StallAssignments/unpublish`,
    {
      competitionId: competitionId,
      ranchId: ranchId,
    },
    getAuthHeaders(),
  );
}

export {
  getCompounds,
  saveLayout,
  getAssignmentOverview,
  getAssignments,
  assignStallBooking,
  unassignStallBooking,
  getPublishStatus,
  publishStallMap,
  unpublishStallMap,
};

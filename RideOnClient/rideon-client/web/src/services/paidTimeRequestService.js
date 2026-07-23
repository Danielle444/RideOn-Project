import axios from "./axiosInstance";

const API = import.meta.env.VITE_API_BASE_URL;

function getPaidTimeRequestsForAssignment(
  competitionId,
  ranchId,
  selectedCompSlotIds,
  includeAllPending = false
) {
  var params = new URLSearchParams();

  params.append("competitionId", competitionId);
  params.append("ranchId", ranchId);
  params.append("includeAllPending", includeAllPending);

  selectedCompSlotIds.forEach(function (slotId) {
    params.append("selectedCompSlotIds", slotId);
  });

  return axios.get(`${API}/PaidTimeRequests/assignment?${params.toString()}`);
}

function assignPaidTimeRequest(data) {
  return axios.post(`${API}/PaidTimeRequests/assign`, data);
}

function unassignPaidTimeRequest(data) {
  return axios.post(`${API}/PaidTimeRequests/unassign`, data);
}

function getPaidTimeSlotRegistrations(slotInCompId, ranchId) {
  return axios.get(`${API}/PaidTimeRequests/slot-registrations`, {
    params: { slotInCompId: slotInCompId, ranchId: ranchId },
  });
}

function transferPaidTimeRequestToSlot(payload) {
  return axios.post(`${API}/PaidTimeRequests/transfer-to-slot`, payload);
}

// Read-only auto-scheduling Preview (Stage A/B/C). POST with query params and
// NO request body - the server computes a proposal and persists nothing. The
// JWT is attached by axiosInstance, like every other function in this file.
function previewAutoSchedule(competitionId, ranchId) {
  return axios.post(`${API}/PaidTimeRequests/auto-schedule/preview`, null, {
    params: {
      competitionId: competitionId,
      ranchId: ranchId,
    },
  });
}

export {
  getPaidTimeRequestsForAssignment,
  assignPaidTimeRequest,
  unassignPaidTimeRequest,
  getPaidTimeSlotRegistrations,
  transferPaidTimeRequestToSlot,
  previewAutoSchedule,
};
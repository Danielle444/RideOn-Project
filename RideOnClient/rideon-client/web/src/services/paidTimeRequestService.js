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

export {
  getPaidTimeRequestsForAssignment,
  assignPaidTimeRequest,
  unassignPaidTimeRequest,
};
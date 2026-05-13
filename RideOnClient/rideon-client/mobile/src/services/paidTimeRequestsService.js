import axios from "./axiosInstance";

function createPaidTimeRequest(payload) {
  return axios.post("/PaidTimeRequests", payload);
}

function bulkCreatePaidTimeRequests(payload) {
  return axios.post("/PaidTimeRequests/bulk", payload);
}

function getMyCompetitionPaidTimeRequests(competitionId, ranchId) {
  return axios.get("/PaidTimeRequests/my-competition", {
    params: {
      competitionId: competitionId,
      ranchId: ranchId,
    },
  });
}

function cancelPaidTimeRequest(payload) {
  return axios.post("/PaidTimeRequests/cancel", payload);
}

function updatePaidTimeRequestNotes(payload) {
  return axios.post("/PaidTimeRequests/update-notes", payload);
}

export {
  createPaidTimeRequest,
  bulkCreatePaidTimeRequests,
  getMyCompetitionPaidTimeRequests,
  cancelPaidTimeRequest,
  updatePaidTimeRequestNotes,
};

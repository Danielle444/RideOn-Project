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

export {
  createPaidTimeRequest,
  bulkCreatePaidTimeRequests,
  getMyCompetitionPaidTimeRequests,
};

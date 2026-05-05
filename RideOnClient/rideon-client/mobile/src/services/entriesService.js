import axios from "./axiosInstance";

function createEntry(payload) {
  return axios.post("/Entries", payload);
}

function getPaidTimeCandidatesByRanch(competitionId, ranchId) {
  return axios.get("/Entries/paid-time-candidates", {
    params: {
      competitionId: competitionId,
      ranchId: ranchId,
    },
  });
}

export { createEntry, getPaidTimeCandidatesByRanch };
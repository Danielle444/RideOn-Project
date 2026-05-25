import axios from "./axiosInstance";

function createEntry(payload) {
  return axios.post("/Entries", payload);
}

function getPaidTimeCandidatesByRanch(
  competitionId,
  ranchId
) {
  return axios.get("/Entries/paid-time-candidates", {
    params: {
      competitionId: competitionId,
      ranchId: ranchId,
    },
  });
}

function getMyCompetitionEntries(
  competitionId,
  ranchId
) {
  return axios.get("/Entries/my-competition", {
    params: {
      competitionId: competitionId,
      ranchId: ranchId,
    },
  });
}

function getCompetitionEntriesView(
  competitionId,
  ranchId
) {
  return axios.get("/Entries/competition-view", {
    params: {
      competitionId: competitionId,
      ranchId: ranchId,
    },
  });
}

function createChangeEntryRequest(payload) {
  return axios.post(
    "/ChangeEntryRequests",
    payload,
  );
}

export {
  createEntry,
  getPaidTimeCandidatesByRanch,
  getMyCompetitionEntries,
  getCompetitionEntriesView,
  createChangeEntryRequest,
};
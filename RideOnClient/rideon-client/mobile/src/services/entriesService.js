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

function getMyPastCompetitionsWithEntries(excludeCompetitionId, ranchId) {
  return axios.get("/Entries/my-past-competitions", {
    params: {
      excludeCompetitionId: excludeCompetitionId,
      ranchId: ranchId,
    },
  });
}

function getDuplicatableEntriesFromCompetition(
  sourceCompetitionId,
  targetCompetitionId,
  ranchId,
) {
  return axios.get("/Entries/duplicatable-from-competition", {
    params: {
      sourceCompetitionId: sourceCompetitionId,
      targetCompetitionId: targetCompetitionId,
      ranchId: ranchId,
    },
  });
}

function bulkDuplicateEntries(payload) {
  return axios.post("/Entries/bulk-duplicate", payload);
}

export {
  createEntry,
  getPaidTimeCandidatesByRanch,
  getMyCompetitionEntries,
  getCompetitionEntriesView,
  createChangeEntryRequest,
  getMyPastCompetitionsWithEntries,
  getDuplicatableEntriesFromCompetition,
  bulkDuplicateEntries,
};
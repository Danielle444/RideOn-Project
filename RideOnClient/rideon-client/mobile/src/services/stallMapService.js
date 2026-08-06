import apiClient from "./axiosInstance";

function getCompounds(ranchId, competitionId) {
  var params = { ranchId: ranchId };

  // Ranch-model fix (Bug 2): passing competitionId lets the server resolve
  // the competition's host/venue ranch instead of using ranchId (the
  // caller's own active ranch) for physical compound data. Callers that
  // don't have a competition in scope (ranch-level compound setup) simply
  // omit it and keep the pre-fix ranch-scoped behavior.
  if (competitionId != null) {
    params.competitionId = competitionId;
  }

  return apiClient.get("/StallAssignments/compounds", {
    params: params,
  });
}

function getAssignments(competitionId, ranchId) {
  return apiClient.get("/StallAssignments", {
    params: { competitionId: competitionId, ranchId: ranchId },
  });
}

function getHorses(competitionId, ranchId) {
  return apiClient.get("/StallAssignments/horses", {
    params: { competitionId: competitionId, ranchId: ranchId },
  });
}

function getAssignedStallPrices(competitionId, ranchId) {
  return apiClient.get("/StallAssignments/assigned-prices", {
    params: { competitionId: competitionId, ranchId: ranchId },
  });
}

function getStallMapPublishStatus(competitionId, ranchId) {
  return apiClient.get("/StallAssignments/publish-status", {
    params: { competitionId: competitionId, ranchId: ranchId },
  });
}

export {
  getCompounds,
  getAssignments,
  getHorses,
  getAssignedStallPrices,
  getStallMapPublishStatus,
};

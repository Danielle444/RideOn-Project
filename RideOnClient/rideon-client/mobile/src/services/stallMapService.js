import apiClient from "./axiosInstance";

function getCompounds(ranchId) {
  return apiClient.get("/StallAssignments/compounds", {
    params: { ranchId: ranchId },
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

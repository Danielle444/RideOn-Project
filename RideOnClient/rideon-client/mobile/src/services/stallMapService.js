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

export { getCompounds, getAssignments, getHorses };

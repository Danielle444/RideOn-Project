import apiClient from "./axiosInstance";

function getCompounds(ranchId) {
  return apiClient.get("/StallAssignments/compounds", { params: { ranchId } });
}

function getAssignments(competitionId) {
  return apiClient.get("/StallAssignments", { params: { competitionId } });
}

function getHorses(competitionId) {
  return apiClient.get("/StallAssignments/horses", { params: { competitionId } });
}

export { getCompounds, getAssignments, getHorses };

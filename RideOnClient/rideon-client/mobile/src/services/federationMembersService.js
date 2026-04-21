import axios from "./axiosInstance";

function getCompetitionRiders(ranchId, competitionId, searchText) {
  return axios.get("/FederationMembers/competition/riders", {
    params: {
      ranchId: ranchId,
      competitionId: competitionId,
      search: searchText || null,
    },
  });
}

function getCompetitionTrainers(ranchId, competitionId, searchText) {
  return axios.get("/FederationMembers/competition/trainers", {
    params: {
      ranchId: ranchId,
      competitionId: competitionId,
      search: searchText || null,
    },
  });
}

function getRidersByRanch(ranchId, searchText) {
  return axios.get("/FederationMembers/ranch/riders", {
    params: {
      ranchId: ranchId,
      search: searchText || null,
    },
  });
}

function getTrainersByRanch(ranchId, searchText) {
  return axios.get("/FederationMembers/ranch/trainers", {
    params: {
      ranchId: ranchId,
      search: searchText || null,
    },
  });
}

export {
  getCompetitionRiders,
  getCompetitionTrainers,
  getRidersByRanch,
  getTrainersByRanch,
};
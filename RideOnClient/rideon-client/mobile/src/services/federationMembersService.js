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

export {
  getCompetitionRiders,
  getCompetitionTrainers,
};
import axios from "./axiosInstance";

const API = "/FederationMembers";

function getCompetitionRiders(ranchId, competitionId, search) {
  return axios.get(`${API}/competition/riders`, {
    params: {
      ranchId: ranchId,
      competitionId: competitionId,
      search: search || null,
    },
  });
}

function getCompetitionTrainers(ranchId, competitionId, search) {
  return axios.get(`${API}/competition/trainers`, {
    params: {
      ranchId: ranchId,
      competitionId: competitionId,
      search: search || null,
    },
  });
}

function getRidersByRanch(ranchId, search) {
  return axios.get(`${API}/ranch/riders`, {
    params: {
      ranchId: ranchId,
      search: search || null,
    },
  });
}

function getTrainersByRanch(ranchId, search) {
  return axios.get(`${API}/ranch/trainers`, {
    params: {
      ranchId: ranchId,
      search: search || null,
    },
  });
}

export {
  getCompetitionRiders,
  getCompetitionTrainers,
  getRidersByRanch,
  getTrainersByRanch,
};
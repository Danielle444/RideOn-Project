import axios from "./axiosInstance";

function getMobileAdminCompetitionsBoard(ranchId) {
  return axios.get("/Competitions/mobile/admin-board", {
    params: {
      ranchId: ranchId,
    },
  });
}

function getMobileAdminHomeCompetitions(ranchId) {
  return axios.get("/Competitions/mobile/admin-home", {
    params: {
      ranchId: ranchId,
    },
  });
}

function getMobileWorkerCompetitionsBoard(ranchId) {
  return axios.get("/Competitions/mobile/worker-board", {
    params: {
      ranchId: ranchId,
    },
  });
}

function getMobilePayerCompetitionsBoard(ranchId) {
  return axios.get("/Competitions/mobile/payer-board", {
    params: {
      ranchId: ranchId,
    },
  });
}

function getCompetitionInvitationDetails(competitionId) {
  return axios.get("/Competitions/" + competitionId + "/invitation");
}

export {
  getMobileAdminCompetitionsBoard,
  getMobileAdminHomeCompetitions,
  getMobileWorkerCompetitionsBoard,
  getMobilePayerCompetitionsBoard,
  getCompetitionInvitationDetails,
};
import axios from "./axiosInstance";

function getHorsesByRanch(ranchId, searchText) {
  return axios.get("/Horses", {
    params: {
      ranchId: ranchId,
      search: searchText || null,
    },
  });
}

function getCompetitionHorses(ranchId, competitionId, searchText) {
  return axios.get("/Horses/competition", {
    params: {
      ranchId: ranchId,
      competitionId: competitionId,
      search: searchText || null,
    },
  });
}

function updateHorseBarnName(horseId, ranchId, barnName) {
  return axios.put("/Horses/" + horseId + "/barnname", {
    horseId: horseId,
    ranchId: ranchId,
    barnName: barnName || null,
  });
}

function getHealthCertificates(competitionId, ranchId) {
  return axios.get("/Horses/health-certificates", {
    params: {
      competitionId: competitionId,
      ranchId: ranchId,
    },
  });
}

function saveHealthCertificate(horseId, competitionId, ranchId, hcPath) {
  return axios.post("/Horses/health-certificates/save", {
    horseId: horseId,
    competitionId: competitionId,
    ranchId: ranchId,
    hcPath: hcPath,
  });
}

function approveHealthCertificate(horseId, competitionId, ranchId) {
  return axios.post("/Horses/health-certificates/approve", {
    horseId: horseId,
    competitionId: competitionId,
    ranchId: ranchId,
  });
}

export {
  getHorsesByRanch,
  getCompetitionHorses,
  updateHorseBarnName,
  getHealthCertificates,
  saveHealthCertificate,
  approveHealthCertificate,
};
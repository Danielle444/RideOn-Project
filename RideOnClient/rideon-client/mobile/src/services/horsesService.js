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

function getHealthCertificates(competitionId) {
  return axios.get("/Horses/health-certificates", {
    params: { competitionId },
  });
}

function saveHealthCertificate(horseId, competitionId, hcPath) {
  return axios.post("/Horses/health-certificates/save", {
    horseId,
    competitionId,
    hcPath,
  });
}

export {
  getHorsesByRanch,
  getCompetitionHorses,
  updateHorseBarnName,
  getHealthCertificates,
  saveHealthCertificate,
};
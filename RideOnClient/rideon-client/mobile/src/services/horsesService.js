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

function uploadHealthCertificateFile(params) {
  var formData = new FormData();

  formData.append("horseId", String(params.horseId));
  formData.append("competitionId", String(params.competitionId));
  formData.append("ranchId", String(params.ranchId));

  formData.append("file", {
    uri: params.file.uri,
    name: params.file.name || "health-certificate.pdf",
    type: params.file.mimeType || "application/pdf",
  });

  console.log("UPLOAD HEALTH CERTIFICATE REQUEST START");
  console.log("UPLOAD HEALTH CERTIFICATE PARAMS", {
    horseId: params.horseId,
    competitionId: params.competitionId,
    ranchId: params.ranchId,
    fileName: params.file?.name,
    fileUri: params.file?.uri,
    fileType: params.file?.mimeType,
  });

  return axios.post("/Horses/health-certificates/upload", formData);
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
  uploadHealthCertificateFile,
  saveHealthCertificate,
  approveHealthCertificate,
};

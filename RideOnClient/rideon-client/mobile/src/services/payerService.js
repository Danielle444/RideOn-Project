import axios from "./axiosInstance";

function getManagedPayers(ranchId, search, approvalStatus) {
  return axios.get("/Payers", {
    params: {
      ranchId: ranchId,
      search: search || null,
      approvalStatus: approvalStatus || null,
    },
  });
}

function findPotentialPayerByContact(ranchId, email, cellPhone) {
  return axios.get("/Payers/lookup", {
    params: {
      ranchId: ranchId,
      email: email || null,
      cellPhone: cellPhone || null,
    },
  });
}

function requestManagedPayer(payload) {
  return axios.post("/Payers/request-managed", payload);
}

function updateManagedPayer(personId, payload) {
  return axios.put("/Payers/" + personId, payload);
}

function removeManagedPayer(personId, ranchId) {
  return axios.delete("/Payers/" + personId, {
    params: {
      ranchId: ranchId,
    },
  });
}

function getCompetitionPayers(ranchId, competitionId, search) {
  return axios.get("/Payers/competition", {
    params: {
      ranchId: ranchId,
      competitionId: competitionId,
      search: search || null,
    },
  });
}

export {
  getManagedPayers,
  findPotentialPayerByContact,
  requestManagedPayer,
  updateManagedPayer,
  removeManagedPayer,
  getCompetitionPayers,
};
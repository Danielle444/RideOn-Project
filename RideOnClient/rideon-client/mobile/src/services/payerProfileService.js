import axios from "./axiosInstance";

function getPayerManagers(personId) {
  return axios.get("/Payers/" + personId + "/managers");
}

function getAvailablePayerManagers(personId, searchText) {
  return axios.get("/Payers/" + personId + "/available-managers", {
    params: {
      search: searchText || null,
    },
  });
}

function addPayerManager(personId, adminPersonId) {
  return axios.post("/Payers/" + personId + "/managers", {
    personId: personId,
    adminPersonId: adminPersonId,
  });
}

function removePayerManager(personId, adminPersonId) {
  return axios.delete("/Payers/" + personId + "/managers", {
    data: {
      personId: personId,
      adminPersonId: adminPersonId,
    },
  });
}

function answerPayerManagerRequest(personId, adminPersonId, answerStatus) {
  return axios.put(
    "/Payers/" + personId + "/managers/" + adminPersonId + "/answer",
    {
      personId: personId,
      adminPersonId: adminPersonId,
      answerStatus: answerStatus,
    },
  );
}

export {
  getPayerManagers,
  getAvailablePayerManagers,
  addPayerManager,
  removePayerManager,
  answerPayerManagerRequest,
};
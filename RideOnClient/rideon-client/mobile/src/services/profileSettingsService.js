import axios from "./axiosInstance";

function getProfileSettings(personId, ranchId, roleId) {
  return axios.get("/SystemUsers/profile-settings", {
    params: {
      personId: personId,
      ranchId: ranchId,
      roleId: roleId,
    },
  });
}

function updateUserProfile(data) {
  return axios.put("/SystemUsers/profile", data);
}

function updateRanchProfile(ranchId, data) {
  return axios.put("/Ranches/" + ranchId, data);
}

function addProfileToUser(personId, data) {
  return axios.post("/SystemUsers/" + personId + "/roles", data);
}

export {
  getProfileSettings,
  updateUserProfile,
  updateRanchProfile,
  addProfileToUser,
};
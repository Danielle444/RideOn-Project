import axios from "axios";

const API = import.meta.env.VITE_API_BASE_URL;

function getAuthHeaders() {
  const token =
    localStorage.getItem("rideon_token") ||
    sessionStorage.getItem("rideon_token");

  return {
    Authorization: `Bearer ${token}`,
  };
}

function getProfileSettings(personId, ranchId, roleId) {
  return axios.get(`${API}/SystemUsers/profile-settings`, {
    params: {
      personId: personId,
      ranchId: ranchId,
      roleId: roleId,
    },
    headers: getAuthHeaders(),
  });
}

function updateUserProfile(data) {
  return axios.put(`${API}/SystemUsers/profile`, data, {
    headers: getAuthHeaders(),
  });
}

function updateRanchProfile(ranchId, data) {
  return axios.put(`${API}/Ranches/${ranchId}`, data, {
    headers: getAuthHeaders(),
  });
}

function addProfileToUser(personId, data) {
  return axios.post(`${API}/SystemUsers/${personId}/roles`, data, {
    headers: getAuthHeaders(),
  });
}

export {
  getProfileSettings,
  updateUserProfile,
  updateRanchProfile,
  addProfileToUser,
};
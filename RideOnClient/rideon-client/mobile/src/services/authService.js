import axios from "axios";

const API = "http://10.0.0.6:5268/api";

function login(username, password) {
  return axios.post(
    `${API}/SystemUsers/login`,
    {
      username: username,
      password: password,
    },
    {
      timeout: 8000,
    }
  );
}

function register(data) {
  return axios.post(`${API}/SystemUsers/register`, data, {
    timeout: 8000,
  });
}

function getRanches() {
  return axios.get(`${API}/Ranches`, {
    timeout: 8000,
  });
}

function getRoles() {
  return axios.get(`${API}/Roles`, {
    timeout: 8000,
  });
}

function checkUsername(username) {
  return axios.get(`${API}/SystemUsers/check-username`, {
    params: { username: username },
    timeout: 8000,
  });
}

function getPersonByNationalIdForRegistration(nationalId) {
  return axios.get(`${API}/Persons/by-national-id`, {
    params: { nationalId: nationalId },
    timeout: 8000,
  });
}

function changePassword(username, currentPassword, newPassword) {
  return axios.put(
    `${API}/SystemUsers/change-password`,
    {
      username: username,
      currentPassword: currentPassword,
      newPassword: newPassword,
    },
    {
      timeout: 8000,
    }
  );
}

export {
  login,
  register,
  getRanches,
  getRoles,
  checkUsername,
  getPersonByNationalIdForRegistration,
  changePassword,
};
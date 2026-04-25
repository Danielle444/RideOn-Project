import axios from "./axiosInstance";
import { getToken } from "./storageService";

const API = import.meta.env.VITE_API_BASE_URL;

function getAuthHeaders() {
  const token = getToken();
  return { headers: { Authorization: `Bearer ${token}` } };
}

function getHealthCertificates(competitionId, ranchId) {
  return axios.get(`${API}/Horses/health-certificates`, {
    ...getAuthHeaders(),
    params: {
      competitionId,
      ranchId,
    },
  });
}

function approveHealthCertificate(horseId, competitionId, ranchId) {
  return axios.post(
    `${API}/Horses/health-certificates/approve`,
    { horseId, competitionId, ranchId },
    getAuthHeaders()
  );
}

export { getHealthCertificates, approveHealthCertificate };

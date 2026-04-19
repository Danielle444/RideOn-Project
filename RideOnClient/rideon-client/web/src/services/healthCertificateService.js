import axios from "./axiosInstance";
import { getToken } from "./storageService";

const API = import.meta.env.VITE_API_BASE_URL;

function getAuthHeaders() {
  const token = getToken();
  return { headers: { Authorization: `Bearer ${token}` } };
}

function getHealthCertificates(competitionId) {
  return axios.get(`${API}/Horses/health-certificates`, {
    ...getAuthHeaders(),
    params: { competitionId },
  });
}

function approveHealthCertificate(horseId, competitionId) {
  return axios.post(
    `${API}/Horses/health-certificates/approve`,
    { horseId, competitionId },
    getAuthHeaders()
  );
}

export { getHealthCertificates, approveHealthCertificate };

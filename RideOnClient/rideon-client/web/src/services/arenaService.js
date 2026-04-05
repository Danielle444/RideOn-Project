import axios from "axios";
import { getToken } from "./storageService";

const API = import.meta.env.VITE_API_BASE_URL;

function getAuthHeaders() {
  const token = getToken();

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
}

function getArenasByRanchId(ranchId) {
  return axios.get(`${API}/Arenas`, {
    params: {
      ranchId: ranchId,
    },
    ...getAuthHeaders(),
  });
}

export { getArenasByRanchId };
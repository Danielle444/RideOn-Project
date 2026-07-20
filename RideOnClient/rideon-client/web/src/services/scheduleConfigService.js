import axios from "./axiosInstance";
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

function getScheduleConfigByFieldId(fieldId) {
  return axios.get(`${API}/ScheduleConfig/${fieldId}`, getAuthHeaders());
}

export { getScheduleConfigByFieldId };

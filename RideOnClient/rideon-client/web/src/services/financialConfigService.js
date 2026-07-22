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

// Competition-scoped (unlike scheduleConfigService, which is field-scoped): the backend
// resolves prices and stall supply by the competition's host ranch, and checks the ranchId
// query param against that host ranch. Mirrors getPaidTimeSlotsByCompetitionId's shape.
function getFinancialConfigForCompetition(competitionId, ranchId) {
  return axios.get(`${API}/FinancialConfig/${competitionId}`, {
    params: {
      ranchId: ranchId,
    },
    ...getAuthHeaders(),
  });
}

export { getFinancialConfigForCompetition };

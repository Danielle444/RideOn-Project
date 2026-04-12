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

function getPaidTimeSlotsByCompetitionId(competitionId, ranchId) {
  return axios.get(`${API}/PaidTimeSlotsInCompetition/${competitionId}`, {
    params: {
      ranchId: ranchId,
    },
    ...getAuthHeaders(),
  });
}

function getAllPaidTimeBaseSlots(ranchId) {
  return axios.get(`${API}/PaidTimeSlotsInCompetition/base-slots`, {
    params: {
      ranchId: ranchId,
    },
    ...getAuthHeaders(),
  });
}

function createPaidTimeSlotInCompetition(data) {
  return axios.post(
    `${API}/PaidTimeSlotsInCompetition`,
    data,
    getAuthHeaders(),
  );
}

function updatePaidTimeSlotInCompetition(compSlotId, data) {
  return axios.put(
    `${API}/PaidTimeSlotsInCompetition/${compSlotId}`,
    data,
    getAuthHeaders(),
  );
}

function deletePaidTimeSlotInCompetition(
  compSlotId,
  competitionId,
  ranchId,
  forceDelete = false,
) {
  return axios.delete(`${API}/PaidTimeSlotsInCompetition/${compSlotId}`, {
    params: {
      competitionId: competitionId,
      ranchId: ranchId,
      forceDelete: forceDelete,
    },
    ...getAuthHeaders(),
  });
}

export {
  getPaidTimeSlotsByCompetitionId,
  getAllPaidTimeBaseSlots,
  createPaidTimeSlotInCompetition,
  updatePaidTimeSlotInCompetition,
  deletePaidTimeSlotInCompetition,
};
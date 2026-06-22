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

function getHorsesForStallBooking(competitionId, ranchId) {
  return axios.get(`${API}/StallBookings/horses-for-booking`, {
    params: { competitionId: competitionId, ranchId: ranchId },
    ...getAuthHeaders(),
  });
}

function secretaryDeleteStallBooking(stallBookingId, ranchId) {
  return axios.delete(`${API}/StallBookings/secretary/${stallBookingId}`, {
    params: { ranchId: ranchId },
    ...getAuthHeaders(),
  });
}

function secretaryUpdateStallBooking(stallBookingId, payload) {
  return axios.put(
    `${API}/StallBookings/secretary/${stallBookingId}`,
    payload,
    getAuthHeaders(),
  );
}

function secretaryCreateStallBookingForPayer(payload) {
  return axios.post(
    `${API}/StallBookings/secretary/create-for-payer`,
    payload,
    getAuthHeaders(),
  );
}

export {
  getHorsesForStallBooking,
  secretaryDeleteStallBooking,
  secretaryUpdateStallBooking,
  secretaryCreateStallBookingForPayer,
};

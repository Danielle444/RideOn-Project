import axios from "./axiosInstance";

function getHorsesForStallBooking(competitionId, ranchId) {
  return axios.get("/StallBookings/horses-for-booking", {
    params: { competitionId, ranchId },
  });
}

function getHorsePayersForCompetition(competitionId, ranchId) {
  return axios.get("/StallBookings/horse-payers", {
    params: { competitionId, ranchId },
  });
}

function createStallBooking(payload) {
  return axios.post("/StallBookings", payload);
}

export {
  getHorsesForStallBooking,
  getHorsePayersForCompetition,
  createStallBooking,
};
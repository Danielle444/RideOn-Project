import axios from "./axiosInstance";

function getHorsesForStallBooking(competitionId, ranchId) {
  return axios.get("/StallBookings/horses-for-booking", {
    params: { competitionId: competitionId, ranchId: ranchId },
  });
}

function getHorsePayersForCompetition(competitionId, ranchId) {
  return axios.get("/StallBookings/horse-payers", {
    params: { competitionId: competitionId, ranchId: ranchId },
  });
}

function getStallBookingsForCompetitionAndRanch(competitionId, ranchId) {
  return axios.get("/StallBookings/by-competition-and-ranch", {
    params: { competitionId: competitionId, ranchId: ranchId },
  });
}

function createStallBooking(payload) {
  return axios.post("/StallBookings", payload);
}

function createTackStallBookings(payload) {
  return axios.post("/StallBookings/tack", payload);
}

export {
  getHorsesForStallBooking,
  getHorsePayersForCompetition,
  createStallBooking,
  getStallBookingsForCompetitionAndRanch,
  createTackStallBookings,
};

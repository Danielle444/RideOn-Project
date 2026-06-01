import axios from "./axiosInstance";

function getHorsesForStallBooking(competitionId, ranchId) {
  return axios.get("/StallBookings/horses-for-booking", {
    params: {
      competitionId: competitionId,
      ranchId: ranchId,
    },
  });
}

function getHorsePayersForCompetition(competitionId, ranchId) {
  return axios.get("/StallBookings/horse-payers", {
    params: {
      competitionId: competitionId,
      ranchId: ranchId,
    },
  });
}

function getStallBookingsForCompetitionAndRanch(competitionId, ranchId) {
  return axios.get("/StallBookings/by-competition-and-ranch", {
    params: {
      competitionId: competitionId,
      ranchId: ranchId,
    },
  });
}

function getAllStallBookingPayersForCompetitionAndRanch(
  competitionId,
  ranchId,
) {
  return axios.get("/StallBookings/payers/by-competition-and-ranch", {
    params: {
      competitionId: competitionId,
      ranchId: ranchId,
    },
  });
}

function createStallBooking(payload) {
  return axios.post("/StallBookings", payload);
}

function createTackStallBookings(payload) {
  return axios.post("/StallBookings/tack", payload);
}

function createStallBookingCancelRequest(payload) {
  return axios.post("/StallBookings/cancel-request", payload);
}

function createStallBookingChangeRequest(payload) {
  return axios.post("/StallBookings/change-request", payload);
}

function cancelStallBookingByPayer(payload) {
  return axios.post("/StallBookings/cancel-by-payer", payload);
}

export {
  getHorsesForStallBooking,
  getHorsePayersForCompetition,
  getStallBookingsForCompetitionAndRanch,
  getAllStallBookingPayersForCompetitionAndRanch,
  createStallBooking,
  createTackStallBookings,
  createStallBookingCancelRequest,
  createStallBookingChangeRequest,
  cancelStallBookingByPayer,
};
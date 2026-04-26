import axios from "./axiosInstance";

function getWorkerShavingsOrders() {
  return axios.get("/ShavingsOrders/worker-orders");
}

function getWorkerShavingsOrdersByCompetition(competitionId, ranchId) {
  return axios.get("/ShavingsOrders/worker-by-competition", {
    params: { competitionId, ranchId },
  });
}

function claimShavingsOrder(shavingsOrderId) {
  return axios.post("/ShavingsOrders/claim", { shavingsOrderId });
}

function saveDeliveryPhoto(shavingsOrderId, deliveryPhotoUrl) {
  return axios.post("/ShavingsOrders/save-delivery-photo", {
    shavingsOrderId: shavingsOrderId,
    deliveryPhotoUrl: deliveryPhotoUrl,
  });
}

function getStallBookingsForShavings(competitionId, ranchId) {
  return axios.get("/ShavingsOrders/stall-bookings-for-order", {
    params: {
      competitionId: competitionId,
      ranchId: ranchId,
    },
  });
}

function getShavingsOrdersForCompetitionAndRanch(competitionId, ranchId) {
  return axios.get("/ShavingsOrders/by-competition-and-ranch", {
    params: {
      competitionId: competitionId,
      ranchId: ranchId,
    },
  });
}

function createShavingsOrder(payload) {
  return axios.post("/ShavingsOrders", payload);
}

export {
  getWorkerShavingsOrders,
  getWorkerShavingsOrdersByCompetition,
  claimShavingsOrder,
  saveDeliveryPhoto,
  getStallBookingsForShavings,
  getShavingsOrdersForCompetitionAndRanch,
  createShavingsOrder,
};
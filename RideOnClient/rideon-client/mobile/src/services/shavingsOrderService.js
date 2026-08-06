import axios from "./axiosInstance";

function getWorkerShavingsOrders() {
  return axios.get("/ShavingsOrders/worker-orders");
}

function getWorkerShavingsOrdersByCompetition(competitionId, ranchId) {
  return axios.get("/ShavingsOrders/worker-by-competition", {
    params: { competitionId, ranchId },
  });
}

function getWorkerHomeShavingsFeed(ranchId) {
  return axios.get("/ShavingsOrders/worker-home-feed", {
    params: { ranchId },
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

// No-photo delivery fallback (CAP-4): records the delivery when the photo upload fails.
function markDelivered(shavingsOrderId) {
  return axios.post("/ShavingsOrders/mark-delivered", {
    shavingsOrderId: shavingsOrderId,
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

function getAllShavingsOrderDetailsForCompetitionAndRanch(
  competitionId,
  ranchId,
) {
  return axios.get("/ShavingsOrders/details/by-competition-and-ranch", {
    params: {
      competitionId,
      ranchId,
    },
  });
}

// Standalone shavings cancellation, Payer-gated: creates a Pending request,
// secretary must approve via the existing Change Tracking page. Payload
// object, matching the sibling payer-gated functions above
// (cancelStallBookingByPayer, createStallChangeRequestByPayer) rather than
// the admin-direct functions' positional-argument style.
function createShavingsOrderCancelRequest(payload) {
  return axios.post("/ShavingsOrders/cancel-request", payload);
}

// Standalone shavings cancellation, RanchAdmin-direct: cancels immediately,
// no secretary approval step.
function adminCancelShavingsOrder(shavingsOrderId, ranchId) {
  return axios.delete("/ShavingsOrders/admin-cancel/" + shavingsOrderId, {
    params: {
      ranchId: ranchId,
    },
  });
}

export {
  getWorkerShavingsOrders,
  getWorkerShavingsOrdersByCompetition,
  getWorkerHomeShavingsFeed,
  claimShavingsOrder,
  saveDeliveryPhoto,
  markDelivered,
  getStallBookingsForShavings,
  getShavingsOrdersForCompetitionAndRanch,
  createShavingsOrder,
  getAllShavingsOrderDetailsForCompetitionAndRanch,
  createShavingsOrderCancelRequest,
  adminCancelShavingsOrder,
};

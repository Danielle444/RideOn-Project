// Shavings order service (web).
//
// Spec 1 retired the secretary delivery-approval flow (the `pending-approvals` and
// `approve-delivery` endpoints no longer exist and are NOT reintroduced here). Spec 2
// (secretary shavings page redesign) adds the order-list read, the add-order stall picker,
// and the create call — mirroring the mobile service and the existing controller routes,
// all of which authorize HostSecretary.
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

// R2 (#176): per-order backbone for one participating ranch, incl. the SLA lifecycle fields
// (Seen/Delivered/PrequestDatetime) and DeliveryPhotoUrl (DEP-1).
function getShavingsOrdersForCompetitionAndRanch(competitionId, ranchId) {
  return axios.get(`${API}/ShavingsOrders/by-competition-and-ranch`, {
    params: {
      competitionId: competitionId,
      ranchId: ranchId,
    },
    ...getAuthHeaders(),
  });
}

// #177: pickable stalls for a ranch (add-order picker); excludes tack + cancelled change-requests.
function getStallBookingsForShavings(competitionId, ranchId) {
  return axios.get(`${API}/ShavingsOrders/stall-bookings-for-order`, {
    params: {
      competitionId: competitionId,
      ranchId: ranchId,
    },
    ...getAuthHeaders(),
  });
}

// #169: create a shavings order. Server overrides orderedBySystemUserId from the token.
function createShavingsOrder(payload) {
  return axios.post(`${API}/ShavingsOrders`, payload, getAuthHeaders());
}

// Standalone shavings cancellation, HostSecretary-direct: cancels
// immediately via usp_secretarycancelshavingsorder (242) — the shavings
// sibling of stallBookingsService.js's secretaryDeleteStallBooking.
function secretaryCancelShavingsOrder(shavingsOrderId, ranchId) {
  return axios.delete(`${API}/ShavingsOrders/secretary/${shavingsOrderId}`, {
    params: { ranchId: ranchId },
    ...getAuthHeaders(),
  });
}

export {
  getShavingsOrdersForCompetitionAndRanch,
  getStallBookingsForShavings,
  createShavingsOrder,
  secretaryCancelShavingsOrder,
};

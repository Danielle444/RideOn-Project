import axios from "./axiosInstance";
import { getToken } from "./storageService";

const API = import.meta.env.VITE_API_BASE_URL;

function getAuthHeaders() {
  const token = getToken();
  return { headers: { Authorization: `Bearer ${token}` } };
}

function getPendingDeliveryApprovals(ranchId) {
  return axios.get(`${API}/ShavingsOrders/pending-approvals`, {
    ...getAuthHeaders(),
    params: { ranchId },
  });
}

function approveDelivery(shavingsOrderId) {
  return axios.post(
    `${API}/ShavingsOrders/approve-delivery`,
    { shavingsOrderId, approvedByPersonId: 0 },
    getAuthHeaders()
  );
}

export { getPendingDeliveryApprovals, approveDelivery };

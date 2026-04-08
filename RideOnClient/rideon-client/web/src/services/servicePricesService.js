import axios from "axios";
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

function getServicePricesDashboard(ranchId) {
  return axios.get(`${API}/ServicePrices`, {
    params: {
      ranchId,
    },
    ...getAuthHeaders(),
  });
}

function createServiceProduct(data) {
  return axios.post(`${API}/ServicePrices/products`, data, getAuthHeaders());
}

function updateServiceProduct(data) {
  return axios.put(`${API}/ServicePrices/products`, data, getAuthHeaders());
}

function deleteServiceProduct(id) {
  return axios.delete(`${API}/ServicePrices/products/${id}`, getAuthHeaders());
}

function deactivateServiceProduct(productId, ranchId) {
  return axios.put(
    `${API}/ServicePrices/products/${productId}/deactivate`,
    null,
    {
      params: { ranchId },
      ...getAuthHeaders(),
    },
  );
}

function activateServiceProduct(productId, ranchId) {
  return axios.put(
    `${API}/ServicePrices/products/${productId}/activate`,
    null,
    {
      params: { ranchId },
      ...getAuthHeaders(),
    },
  );
}

export {
  getServicePricesDashboard,
  createServiceProduct,
  updateServiceProduct,
  deleteServiceProduct,
  deactivateServiceProduct,
  activateServiceProduct,
};
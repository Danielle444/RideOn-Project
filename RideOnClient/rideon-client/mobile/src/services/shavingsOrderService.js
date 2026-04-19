import axios from "./axiosInstance";

function getWorkerShavingsOrders() {
  return axios.get("/ShavingsOrders/worker-orders");
}

function saveDeliveryPhoto(shavingsOrderId, deliveryPhotoUrl) {
  return axios.post("/ShavingsOrders/save-delivery-photo", {
    shavingsOrderId,
    deliveryPhotoUrl,
  });
}

export { getWorkerShavingsOrders, saveDeliveryPhoto };

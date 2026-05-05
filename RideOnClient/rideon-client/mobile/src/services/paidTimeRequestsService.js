import axios from "./axiosInstance";

function createPaidTimeRequest(payload) {
  return axios.post("/PaidTimeRequests", payload);
}

function bulkCreatePaidTimeRequests(payload) {
  return axios.post("/PaidTimeRequests/bulk", payload);
}

export { createPaidTimeRequest, bulkCreatePaidTimeRequests };
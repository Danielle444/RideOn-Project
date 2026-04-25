import axios from "./axiosInstance";

function createPaidTimeRequest(payload) {
  return axios.post("/PaidTimeRequests", payload);
}

export { createPaidTimeRequest };
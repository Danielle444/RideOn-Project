import axios from "./axiosInstance";

function createEntry(payload) {
  return axios.post("/Entries", payload);
}

export { createEntry };
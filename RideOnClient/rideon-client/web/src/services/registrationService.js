import axios from "axios";

const API = import.meta.env.VITE_API_BASE_URL;

export async function validateRegistrationToken(token) {
  const response = await axios.get(`${API}/Registration/validate`, {
    params: { token },
  });
  return response.data;
}

export async function completeRegistration(payload) {
  const response = await axios.post(`${API}/Registration/complete`, payload);
  return response.data;
}

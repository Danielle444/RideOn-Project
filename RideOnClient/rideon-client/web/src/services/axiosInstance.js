import axios from "axios";
import { getToken, clearAuthStorage } from "./storageService";

const API = import.meta.env.VITE_API_BASE_URL;

const axiosInstance = axios.create({
  baseURL: API,
});

axiosInstance.interceptors.request.use(function (config) {
  const token = getToken();

  if (token) {
    config.headers.Authorization = "Bearer " + token;
  }

  return config;
});

axiosInstance.interceptors.response.use(
  function (response) {
    return response;
  },
  function (error) {
    if (error.response && error.response.status === 401) {
      clearAuthStorage();

      window.location.href = "/login";
    }

    if (error.response && error.response.status === 403) {
      window.location.href = "/unauthorized";
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
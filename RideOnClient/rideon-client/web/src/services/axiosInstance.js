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

const AUTH_LOGIN_URL_SUFFIXES = ["/SystemUsers/login", "/SuperUsers/login"];

function isAuthLoginRequest(config) {
  const url = config && config.url;

  return (
    typeof url === "string" &&
    AUTH_LOGIN_URL_SUFFIXES.some((suffix) => url.endsWith(suffix))
  );
}

axiosInstance.interceptors.response.use(
  function (response) {
    return response;
  },
  function (error) {
    if (
      error.response &&
      error.response.status === 401 &&
      !isAuthLoginRequest(error.config)
    ) {
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
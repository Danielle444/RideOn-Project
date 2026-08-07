import axios from "axios";
import { getToken, clearAuthStorage } from "./storageService";
import { API_BASE_URL } from "../config/apiBaseUrl";
import { isLoginRequestUrl } from "../../../shared/auth/utils/loginErrorMessages";

let unauthorizedHandler = null;

export function registerUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 8000,
});

axiosInstance.interceptors.request.use(
  async function (config) {
    const token = await getToken();

    if (token) {
      config.headers.Authorization = "Bearer " + token;
    }

    return config;
  },
  function (error) {
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  function (response) {
    return response;
  },
  async function (error) {
    if (error.response && error.response.status === 401) {
      // 401 מנקודת הקצה של ההתחברות אינו סשן מאומת שפג — הוא פשוט שם משתמש
      // או סיסמה שגויים. הוא מוחזר כמו שהוא ל-loginAndInitialize, בלי לנקות
      // מצב אימות ובלי להפעיל את מטפל ה-401 הגלובלי, שאחרת היה מציג
      // "ההתחברות פגה" על ניסיון התחברות ראשון.
      if (isLoginRequestUrl(error.config?.url, error.config?.baseURL)) {
        return Promise.reject(error);
      }

      await clearAuthStorage();

      if (typeof unauthorizedHandler === "function") {
        await unauthorizedHandler();
      }

      return Promise.reject({ isAuthError: true });
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
import { createContext, useContext, useEffect, useState } from "react";
import {
  login as loginRequest,
  changePassword as changePasswordRequest,
} from "../services/authService";
import {
  getToken,
  getUser,
  getActiveRole,
  saveToken,
  saveUser,
  clearAuthStorage,
  isTokenValid,
} from "../services/storageService";
import { registerUnauthorizedHandler } from "../services/axiosInstance";
import { getApiErrorMessage } from "../../../shared/auth/utils/authApiErrors";
import { useUser } from "./UserContext";
import { useActiveRole } from "./ActiveRoleContext";

const AuthContext = createContext(null);

export function AuthProvider(props) {
  const { setUser, setIsUserHydrated } = useUser();
  const { setActiveRole, clearActiveRole } = useActiveRole();

  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(function () {
    loadAuthState();
  }, []);

  useEffect(function () {
    registerUnauthorizedHandler(handleUnauthorized);

    return function () {
      registerUnauthorizedHandler(null);
    };
  }, []);

  async function resetAuthState() {
    setUser(null);
    setActiveRole(null);
    setIsUserHydrated(true);
    setIsAuthenticated(false);
  }

  async function handleUnauthorized() {
    await clearAuthStorage();
    await clearActiveRole();
    await resetAuthState();
  }

  async function loadAuthState() {
    try {
      const token = await getToken();
      const storedUser = await getUser();
      const storedActiveRole = await getActiveRole();

      const tokenIsValid = isTokenValid(token);

      if (!tokenIsValid || !storedUser) {
        await clearAuthStorage();
        setUser(null);
        setActiveRole(null);
        setIsAuthenticated(false);
      } else {
        setUser(storedUser);
        setActiveRole(storedActiveRole);
        setIsAuthenticated(true);
      }
    } catch (error) {
      await clearAuthStorage();
      setUser(null);
      setActiveRole(null);
      setIsAuthenticated(false);
    } finally {
      setIsUserHydrated(true);
      setIsLoading(false);
    }
  }

  async function login(nextUser) {
    if (nextUser) {
      setUser(nextUser);
    } else {
      const storedUser = await getUser();
      setUser(storedUser);
    }

    setIsUserHydrated(true);
    setIsAuthenticated(true);
  }

  async function loginAndInitialize(username, password) {
    try {
      await clearAuthStorage();
      setActiveRole(null);

      const response = await loginRequest(username.trim(), password);
      const data = response.data;

      if (
        !data ||
        !data.token ||
        !data.personId ||
        !data.approvedRolesAndRanches
      ) {
        return {
          ok: false,
          message: "נתוני התחברות לא תקינים",
        };
      }

      if (data.approvedRolesAndRanches.length === 0) {
        return {
          ok: false,
          message: "אין למשתמש תפקיד מאושר",
        };
      }

      if (!isTokenValid(data.token)) {
        await clearAuthStorage();
        await resetAuthState();

        return {
          ok: false,
          message: "התקבל טוקן לא תקין מהשרת",
        };
      }

      const userData = {
        personId: data.personId,
        username: data.username,
        firstName: data.firstName,
        lastName: data.lastName,
        isActive: data.isActive,
        mustChangePassword: data.mustChangePassword,
        approvedRolesAndRanches: data.approvedRolesAndRanches,
      };

      await saveToken(data.token);
      await saveUser(userData);

      setUser(userData);
      setActiveRole(null);
      setIsAuthenticated(true);
      setIsUserHydrated(true);

      return {
        ok: true,
        user: userData,
      };
    } catch (err) {
      if (err && err.isAuthError) {
        await logout();

        return {
          ok: false,
          message: "ההתחברות פגה, יש להתחבר מחדש",
        };
      }

      if (err?.response?.data === "PENDING_APPROVAL") {
        return {
          ok: false,
          message: "חשבונך ממתין לאישור מנהל המערכת",
        };
      }

      return {
        ok: false,
        message: "שגיאה בהתחברות",
      };
    }
  }

  async function changePasswordAndRefresh(currentPassword, newPassword) {
    try {
      const currentUser = await getUser();

      if (!currentUser || !currentUser.personId) {
        return {
          ok: false,
          message: "לא נמצאו פרטי משתמש מחובר",
        };
      }

      await changePasswordRequest(
        currentUser.personId,
        currentPassword,
        newPassword
      );

      const updatedUser = {
        ...currentUser,
        mustChangePassword: false,
      };

      await saveUser(updatedUser);
      setUser(updatedUser);

      return { ok: true };
    } catch (error) {
      if (error && error.isAuthError) {
        await logout();
        return {
          ok: false,
          message: "ההתחברות פגה, יש להתחבר מחדש",
        };
      }

      return {
        ok: false,
        message: String(getApiErrorMessage(error, "שגיאה בהחלפת סיסמה")),
      };
    }
  }

  async function logout() {
    await clearAuthStorage();
    await clearActiveRole();
    await resetAuthState();
  }

  return (
    <AuthContext.Provider
      value={{
        isLoading,
        isAuthenticated,
        login,
        loginAndInitialize,
        changePasswordAndRefresh,
        logout,
        reloadAuthState: loadAuthState,
      }}
    >
      {props.children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
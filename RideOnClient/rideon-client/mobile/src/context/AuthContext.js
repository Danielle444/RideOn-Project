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
} from "../services/storageService";
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

  async function loadAuthState() {
    try {
      const token = await getToken();
      const storedUser = await getUser();
      const activeRole = await getActiveRole();

      setUser(storedUser);
      setActiveRole(activeRole);
      setIsAuthenticated(!!token && !!storedUser);
    } catch (error) {
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
    setUser(null);
    setIsUserHydrated(true);
    setIsAuthenticated(false);
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
import { createContext, useContext, useEffect, useState } from "react";
import {
  login as loginRequest,
  loginSuperUser as loginSuperUserRequest,
  changePassword as changePasswordRequest,
  changeSuperUserPassword as changeSuperUserPasswordRequest,
} from "../services/authService";
import {
  getToken,
  getUser,
  getActiveRole,
  saveRememberMe,
  getRememberMe,
  saveToken,
  saveUser,
  clearAuthStorage,
} from "../services/storageService";
import { getApiErrorMessage } from "../../../shared/auth/utils/authApiErrors";
import { useUser } from "./UserContext";
import { useActiveRole } from "./ActiveRoleContext";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { setUser, setIsUserHydrated } = useUser();
  const { setActiveRole, clearActiveRole, setActiveRoleAndPersist } =
    useActiveRole();

  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(function () {
    loadAuthState();
  }, []);

  function loadAuthState() {
    try {
      const token = getToken();
      const storedUser = getUser();
      const activeRole = getActiveRole();

      setUser(storedUser);
      setActiveRole(activeRole);
      setIsAuthenticated(!!token && !!storedUser);
    } catch {
      setUser(null);
      setActiveRole(null);
      setIsAuthenticated(false);
    } finally {
      setIsUserHydrated(true);
      setIsLoading(false);
    }
  }

  function login(nextUser) {
    setUser(nextUser);
    setIsUserHydrated(true);
    setIsAuthenticated(true);
  }

  async function loginAndInitialize(username, password, rememberMe) {
    try {
      clearAuthStorage();
      setUser(null);
      setActiveRole(null);

      const response = await loginRequest(username.trim(), password);
      const data = response.data;

      const userData = {
        personId: data.personId,
        username: data.username,
        firstName: data.firstName,
        lastName: data.lastName,
        isActive: data.isActive,
        mustChangePassword: data.mustChangePassword,
        approvedRolesAndRanches: data.approvedRolesAndRanches,
      };

      if (
        !data.approvedRolesAndRanches ||
        data.approvedRolesAndRanches.length === 0
      ) {
        clearAuthStorage();
        setUser(null);
        setActiveRole(null);

        return {
          ok: false,
          message: "אין למשתמש תפקיד מאושר במערכת",
        };
      }

      saveRememberMe(rememberMe);
      saveToken(data.token, rememberMe);
      saveUser(userData, rememberMe);

      setUser(userData);
      setIsUserHydrated(true);
      setIsAuthenticated(true);

      let nextActiveRole = null;

      if (data.approvedRolesAndRanches.length === 1) {
        nextActiveRole = data.approvedRolesAndRanches[0];
        setActiveRoleAndPersist(nextActiveRole);
      } else {
        clearActiveRole();
      }

      return {
        ok: true,
        user: userData,
        activeRole: nextActiveRole,
      };
    } catch (error) {
      return {
        ok: false,
        message: String(getApiErrorMessage(error, "אירעה שגיאה בהתחברות לשרת")),
      };
    }
  }

  async function loginSuperUser(email, password, rememberMe) {
    try {
      clearAuthStorage();
      setUser(null);
      setActiveRole(null);

      const response = await loginSuperUserRequest(email.trim(), password);
      const data = response.data;

      const superUserData = {
        superUserId: data.superUserId,
        email: data.email,
        isActive: data.isActive,
        mustChangePassword: data.mustChangePassword,
        userType: "superUser",
      };

      saveRememberMe(rememberMe);
      saveToken(data.token, rememberMe);
      saveUser(superUserData, rememberMe);

      setUser(superUserData);
      setIsUserHydrated(true);
      setIsAuthenticated(true);
      clearActiveRole();

      return {
        ok: true,
        user: superUserData,
        activeRole: null,
      };
    } catch (error) {
      return {
        ok: false,
        message: String(getApiErrorMessage(error, "שגיאה בהתחברות מנהל מערכת")),
      };
    }
  }

  async function changePasswordAndRefresh(currentPassword, newPassword) {
    try {
      const storedUser = getUser();

      if (!storedUser || !storedUser.personId) {
        return {
          ok: false,
          message: "לא נמצאו פרטי משתמש. יש להתחבר מחדש.",
        };
      }

      await changePasswordRequest(
        storedUser.personId,
        currentPassword,
        newPassword,
      );

      const updatedUser = {
        ...storedUser,
        mustChangePassword: false,
      };

      const rememberMe = getRememberMe();
      saveUser(updatedUser, rememberMe);
      setUser(updatedUser);

      return { ok: true, user: updatedUser };
    } catch (error) {
      if (error.response && typeof error.response.data === "string") {
        return {
          ok: false,
          message: error.response.data,
        };
      }

      return {
        ok: false,
        message: "אירעה שגיאה בהחלפת הסיסמה",
      };
    }
  }

  async function changeSuperUserPasswordAndRefresh(
    currentPassword,
    newPassword,
  ) {
    try {
      const storedUser = getUser();

      if (!storedUser || storedUser.userType !== "superUser") {
        return {
          ok: false,
          message: "לא נמצאו פרטי מנהל מערכת. יש להתחבר מחדש.",
        };
      }

      await changeSuperUserPasswordRequest(currentPassword, newPassword);

      const updatedUser = {
        ...storedUser,
        mustChangePassword: false,
      };

      const rememberMe = getRememberMe();
      saveUser(updatedUser, rememberMe);
      setUser(updatedUser);

      return { ok: true, user: updatedUser };
    } catch (error) {
      if (error.response && typeof error.response.data === "string") {
        return {
          ok: false,
          message: error.response.data,
        };
      }

      return {
        ok: false,
        message: "אירעה שגיאה בהחלפת סיסמת מנהל המערכת",
      };
    }
  }

  function logout() {
    clearAuthStorage();
    setUser(null);
    setActiveRole(null);
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
        loginSuperUser,
        changePasswordAndRefresh,
        changeSuperUserPasswordAndRefresh,
        logout,
        reloadAuthState: loadAuthState,
      }}
    >
      {children}
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

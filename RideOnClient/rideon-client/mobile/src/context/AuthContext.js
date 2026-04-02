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
import { isRoleSupportedOnMobile } from "../../../shared/auth/utils/platformRoles";
import { useUser } from "./UserContext";
import { useActiveRole } from "./ActiveRoleContext";

const AuthContext = createContext(null);

export function AuthProvider(props) {
  const { user, setUser, setIsUserHydrated } = useUser();
  const { setActiveRole, setActiveRoleAndPersist, clearActiveRole } =
    useActiveRole();

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
        await clearAuthStorage();
        setUser(null);
        setActiveRole(null);

        return {
          ok: false,
          message: "אין למשתמש תפקיד מאושר במערכת",
        };
      }

      await saveToken(data.token);
      await saveUser(userData);

      setUser(userData);
      setIsUserHydrated(true);

      if (
        data.approvedRolesAndRanches.length === 1 &&
        isRoleSupportedOnMobile(data.approvedRolesAndRanches[0].roleName)
      ) {
        await setActiveRoleAndPersist(data.approvedRolesAndRanches[0]);
      } else {
        await clearActiveRole();
      }

      setIsAuthenticated(true);

      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        message: String(getApiErrorMessage(err, "שגיאה בהתחברות")),
      };
    }
  }

  async function changePasswordAndRefresh(currentPassword, newPassword) {
    try {
      if (!user || !user.username) {
        return {
          ok: false,
          message: "לא נמצאו פרטי משתמש מחובר",
        };
      }

      await changePasswordRequest(user.username, currentPassword, newPassword);

      const updatedUser = {
        ...user,
        mustChangePassword: false,
      };

      await saveUser(updatedUser);
      setUser(updatedUser);

      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        message: String(getApiErrorMessage(error, "שגיאה בהחלפת סיסמה")),
      };
    }
  }

  async function logout() {
    await clearAuthStorage();
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

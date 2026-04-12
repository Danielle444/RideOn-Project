import { useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useUser } from "../../context/UserContext";
import { useActiveRole } from "../../context/ActiveRoleContext";
import { getRolesForPlatform } from "../../../shared/auth/utils/platformRoles";

export default function RoleGuard({
  children,
  allowedRoles = [],
  navigation,
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const { user } = useUser();
  const { activeRole } = useActiveRole();

  useEffect(() => {
    if (isLoading) return;

    // ❌ לא מחובר
    if (!isAuthenticated || !user) {
      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });
      return;
    }

    // ❌ אין role
    if (!activeRole) {
      navigation.reset({
        index: 0,
        routes: [{ name: "SelectActiveRole" }],
      });
      return;
    }

    // ❌ role לא מתאים
    if (allowedRoles.length > 0) {
      const roles = getRolesForPlatform("mobile");

      const currentRole = roles.find(
        (r) => r.id === activeRole.roleId
      );

      if (!currentRole || !allowedRoles.includes(currentRole.name)) {
        navigation.reset({
          index: 0,
          routes: [{ name: "SelectActiveRole" }],
        });
      }
    }
  }, [isLoading, isAuthenticated, user, activeRole]);

  if (isLoading) {
    return null;
  }

  return children;
}
import { useAuth } from "../../context/AuthContext";
import { useUser } from "../../context/UserContext";
import { useActiveRole } from "../../context/ActiveRoleContext";
import { getRolesForPlatform } from "../../../shared/auth/utils/platformRoles";

export default function RoleGuard({
  children,
  allowedRoles = [],
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const { user } = useUser();
  const { activeRole } = useActiveRole();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  if (!activeRole) {
    return null;
  }

  if (allowedRoles.length > 0) {
    const roles = getRolesForPlatform("mobile");

    const currentRole = roles.find(function (r) {
      return r.id === activeRole.roleId;
    });

    if (!currentRole || !allowedRoles.includes(currentRole.name)) {
      return null;
    }
  }

  return children;
}
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useUser } from "../context/UserContext";
import { useActiveRole } from "../context/ActiveRoleContext";
import { getPostLoginRoute } from "../../../shared/auth/utils/authNavigation";

export default function ProtectedRoute({ children, requireSuperUser = false }) {
  const { isLoading, isAuthenticated } = useAuth();
  const { user } = useUser();
  const { activeRole } = useActiveRole();
  const location = useLocation();

  function getSuperUserRoute() {
    if (user && user.mustChangePassword) {
      return "/superuser-change-password";
    }

    return "/superuser-dashboard";
  }

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (requireSuperUser) {
    if (user.userType !== "superUser") {
      return <Navigate to={getPostLoginRoute(user, activeRole)} replace />;
    }

    if (
      user.mustChangePassword &&
      location.pathname !== "/superuser-change-password"
    ) {
      return <Navigate to="/superuser-change-password" replace />;
    }

    return children;
  }

  if (user.userType === "superUser") {
    return <Navigate to={getSuperUserRoute()} replace />;
  }

  return children;
}
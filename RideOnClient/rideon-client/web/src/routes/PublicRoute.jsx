import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useUser } from "../context/UserContext";
import { useActiveRole } from "../context/ActiveRoleContext";
import { getPostLoginRoute } from "../../../shared/auth/utils/authNavigation";

export default function PublicRoute({ children }) {
  const { isLoading, isAuthenticated } = useAuth();
  const { user } = useUser();
  const { activeRole } = useActiveRole();

  function getSuperUserRoute() {
    if (user && user.mustChangePassword) {
      return "/superuser-change-password";
    }

    return "/superuser/requests";
  }

  if (isLoading) {
    return null;
  }

  if (isAuthenticated && user) {
    if (user.userType === "superUser") {
      return <Navigate to={getSuperUserRoute()} replace />;
    }

    return <Navigate to={getPostLoginRoute(user, activeRole)} replace />;
  }

  return children;
}
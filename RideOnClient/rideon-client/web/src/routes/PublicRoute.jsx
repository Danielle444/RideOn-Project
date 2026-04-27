import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useUser } from "../context/UserContext";
import { useActiveRole } from "../context/ActiveRoleContext";
import { getPostLoginRoute } from "../../../shared/auth/utils/authNavigation";
import LoadingSpinner from "../components/common/LoadingSpinner";

export default function PublicRoute({ children }) {
  const { isLoading, isAuthenticated } = useAuth();
  const { user } = useUser();
  const { activeRole } = useActiveRole();

  function getSuperUserRoute() {
    if (user && user.mustChangePassword) {
      return "/superuser-change-password";
      //OrenNoteToFix - if we change in RideOnClient/rideon-client/web/src/routes/ProtectedRoute.jsx also change here
      //Can help to Move getSuperUserRoute into shared/auth/utils/authNavigation.js alongside getPostLoginRoute.
    }

    return "/superuser/requests";
  }

  if (isLoading) {
    return <LoadingSpinner text="LOADING" />;
  }

  if (isAuthenticated && user) {
    if (user.userType === "superUser") {
      return <Navigate to={getSuperUserRoute()} replace />;
    }

    return <Navigate to={getPostLoginRoute(user, activeRole)} replace />;
  }

  return children;
}
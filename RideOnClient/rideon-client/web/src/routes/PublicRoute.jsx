import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useUser } from "../context/UserContext";
import { useActiveRole } from "../context/ActiveRoleContext";
import { getPostLoginRoute } from "../../../shared/auth/utils/authNavigation";

export default function PublicRoute({ children }) {
  const { isLoading, isAuthenticated } = useAuth();
  const { user } = useUser();
  const { activeRole } = useActiveRole();

  // מחכים לטעינה
  if (isLoading) {
    return null;
  }

  if (isAuthenticated && user) {
    return <Navigate to={getPostLoginRoute(user, activeRole)} replace />;
  }

  return children;
}

import { Navigate } from "react-router-dom";
import { getToken, getUser, getActiveRole } from '../services/storageService';
import { getPostLoginRoute } from "../../../shared/auth/utils/authNavigation";

export default function PublicRoute({ children }) {
  const token = getToken();
  const user = getUser();
  const activeRole = getActiveRole();

  if (token && user) {
  return <Navigate to={getPostLoginRoute(user, activeRole)} replace />;
}

  return children;
}

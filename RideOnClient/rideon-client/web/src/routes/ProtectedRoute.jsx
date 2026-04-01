import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useUser } from "../context/UserContext";

export default function ProtectedRoute({ children }) {
  const { isLoading, isAuthenticated } = useAuth();
  const { user } = useUser();

  // מחכים לטעינה הראשונית מה-storage
  if (isLoading) {
    return null;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
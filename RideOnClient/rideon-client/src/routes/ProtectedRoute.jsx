import { Navigate } from "react-router-dom";
import { getToken, getUser } from '../services/storageService';

export default function ProtectedRoute({ children }) {
  const token = getToken();
  const user = getUser();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

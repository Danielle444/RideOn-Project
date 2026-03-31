import { createBrowserRouter, Navigate } from "react-router-dom";
import LoginScreen from "../components/auth/LoginScreen";
import RegisterScreen from "../components/auth/RegisterScreen";
import ProtectedRoute from "../routes/ProtectedRoute";
import PublicRoute from "../routes/PublicRoute";
import ChangePasswordPage from "../pages/ChangePasswordPage";
import SelectRanchPage from "../pages/SelectRanchPage";
import CompetitionsBoardPage from "../pages/CompetitionsBoardPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/login" />,
  },
  {
    path: "/login",
    element: (
      <PublicRoute>
        <LoginScreen />
      </PublicRoute>
    ),
  },
  {
    path: "/register",
    element: (
      <PublicRoute>
        <RegisterScreen />
      </PublicRoute>
    ),
  },
  {
    path: "/forgot-password",
    element: (
      <PublicRoute>
        <div dir="rtl" className="p-6">
          מסך שכחתי סיסמה ייבנה בהמשך
        </div>
      </PublicRoute>
    ),
  },
  {
    path: "/change-password",
    element: (
      <ProtectedRoute>
        <ChangePasswordPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/select-ranch",
    element: (
      <ProtectedRoute>
        <SelectRanchPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/competitions",
    element: (
      <ProtectedRoute>
        <CompetitionsBoardPage />
      </ProtectedRoute>
    ),
  },
]);

export default router;
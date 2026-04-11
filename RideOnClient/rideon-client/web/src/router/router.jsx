import { createBrowserRouter, Navigate } from "react-router-dom";
import LoginScreen from "../pages/auth/LoginScreen";
import RegisterScreen from "../pages/auth/RegisterScreen";
import ProtectedRoute from "../routes/ProtectedRoute";
import PublicRoute from "../routes/PublicRoute";
import ChangePasswordPage from "../pages/shared/ChangePasswordPage";
import SelectRanchPage from "../pages/secretary/SelectRanchPage";
import CompetitionsBoardPage from "../pages/secretary/CompetitionsBoardPage";
import CompetitionFormPage from "../pages/secretary/CompetitionFormPage";
import CompetitionSummaryPage from "../pages/secretary/CompetitionSummaryPage";
import CompetitionClassesPage from "../pages/secretary/CompetitionClassesPage";
import CompetitionPaidTimePage from "../pages/secretary/CompetitionPaidTimePage";
import CompetitionStallsPage from "../pages/secretary/CompetitionStallsPage";
import CompetitionShavingsPage from "../pages/secretary/CompetitionShavingsPage";
import CompetitionHealthCertificatesPage from "../pages/secretary/CompetitionHealthCertificatesPage";
import CompetitionChangeTrackingPage from "../pages/secretary/CompetitionChangeTrackingPage";
import CompetitionPaymentsPage from "../pages/secretary/CompetitionPaymentsPage";
import ServicePricesPage from "../pages/secretary/ServicePricesPage";
import ArenasAndStallsPage from "../pages/secretary/ArenasAndStallsPage";
import WorkersManagementPage from "../pages/secretary/WorkersManagementPage";
import ProfileSettingsPage from "../pages/secretary/ProfileSettingsPage";
import UserRequestsPage from "../pages/superuser/UserRequestsPage";
import SuperUsersManagementPage from "../pages/superuser/SuperUsersManagementPage";
import FieldsManagementPage from "../pages/superuser/FieldsManagementPage";
import ClassesManagementPage from "../pages/superuser/ClassesManagementPage";
import JudgesManagementPage from "../pages/superuser/JudgesManagementPage";
import ReiningPatternsManagementPage from "../pages/superuser/ReiningPatternsManagementPage";
import PrizesManagementPage from "../pages/superuser/PrizesManagementPage";
import FinesManagementPage from "../pages/superuser/FinesManagementPage";
import NotificationsManagementPage from "../pages/superuser/NotificationsManagementPage";
import ServicePricesPage from "../pages/secretary/ServicePricesPage";
import ArenasAndStallsPage from "../pages/secretary/ArenasAndStallsPage";
import ForgotPasswordScreen from "../pages/auth/ForgotPasswordScreen";
import ResetPasswordScreen from "../pages/auth/ResetPasswordScreen";

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
        <ForgotPasswordScreen />
      </PublicRoute>
    ),
  },
  {
    path: "/reset-password",
    element: (
      <PublicRoute>
        <ResetPasswordScreen />
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
  {
    path: "/competitions/create",
    element: (
      <ProtectedRoute>
        <CompetitionFormPage mode="create" />
      </ProtectedRoute>
    ),
  },
  {
    path: "/competitions/:competitionId",
    element: <Navigate to="summary" replace />,
  },
  {
    path: "/competitions/:competitionId/summary",
    element: (
      <ProtectedRoute>
        <CompetitionSummaryPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/competitions/:competitionId/classes",
    element: (
      <ProtectedRoute>
        <CompetitionClassesPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/competitions/:competitionId/paid-time",
    element: (
      <ProtectedRoute>
        <CompetitionPaidTimePage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/competitions/:competitionId/stalls",
    element: (
      <ProtectedRoute>
        <CompetitionStallsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/competitions/:competitionId/shavings",
    element: (
      <ProtectedRoute>
        <CompetitionShavingsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/competitions/:competitionId/health-certificates",
    element: (
      <ProtectedRoute>
        <CompetitionHealthCertificatesPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/competitions/:competitionId/change-tracking",
    element: (
      <ProtectedRoute>
        <CompetitionChangeTrackingPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/competitions/:competitionId/payments",
    element: (
      <ProtectedRoute>
        <CompetitionPaymentsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/competitions/:competitionId/edit",
    element: (
      <ProtectedRoute>
        <CompetitionFormPage mode="edit" />
      </ProtectedRoute>
    ),
  },
  {
    path: "/service-prices",
    element: (
      <ProtectedRoute>
        <ServicePricesPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/arenas-and-stalls",
    element: (
      <ProtectedRoute>
        <ArenasAndStallsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/workers-management",
    element: (
      <ProtectedRoute>
        <WorkersManagementPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/profile-settings",
    element: (
      <ProtectedRoute>
        <ProfileSettingsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/superuser",
    element: <Navigate to="/superuser/requests" replace />,
  },
  {
    path: "/superuser/requests",
    element: (
      <ProtectedRoute requireSuperUser={true}>
        <UserRequestsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/superuser/super-users",
    element: (
      <ProtectedRoute requireSuperUser={true}>
        <SuperUsersManagementPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/superuser/fields",
    element: (
      <ProtectedRoute requireSuperUser={true}>
        <FieldsManagementPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/superuser/classes",
    element: (
      <ProtectedRoute requireSuperUser={true}>
        <ClassesManagementPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/superuser/judges",
    element: (
      <ProtectedRoute requireSuperUser={true}>
        <JudgesManagementPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/superuser/reining-patterns",
    element: (
      <ProtectedRoute requireSuperUser={true}>
        <ReiningPatternsManagementPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/superuser/prizes",
    element: (
      <ProtectedRoute requireSuperUser={true}>
        <PrizesManagementPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/superuser/fines",
    element: (
      <ProtectedRoute requireSuperUser={true}>
        <FinesManagementPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/superuser/notifications",
    element: (
      <ProtectedRoute requireSuperUser={true}>
        <NotificationsManagementPage />
      </ProtectedRoute>
    ),
  },
]);

export default router;
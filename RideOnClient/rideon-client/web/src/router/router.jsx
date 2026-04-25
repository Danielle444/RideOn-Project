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
import UnauthorizedPage from "../pages/shared/UnauthorizedPage";

const SECRETARY_ROLE = "מזכירת חווה מארחת";
import ForgotPasswordScreen from "../pages/auth/ForgotPasswordScreen";
import ResetPasswordScreen from "../pages/auth/ResetPasswordScreen";
import SuperUserForgotPasswordScreen from "../pages/auth/SuperUserForgotPasswordScreen";
import CompleteRegistrationPage from "../pages/auth/CompleteRegistrationPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/login" />,
  },

  // 🔓 Public
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
    path: "/superuser-forgot-password",
    element: (
      <PublicRoute>
        <SuperUserForgotPasswordScreen />
      </PublicRoute>
    ),
  },
  {
    path: "/complete-registration",
    element: <CompleteRegistrationPage />,
  },

  // 🔐 General
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

  // 🟤 Secretary Routes
  {
    path: "/competitions",
    element: (
      <ProtectedRoute allowedRoles={[SECRETARY_ROLE]}>
        <CompetitionsBoardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/competitions/create",
    element: (
      <ProtectedRoute allowedRoles={[SECRETARY_ROLE]}>
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
      <ProtectedRoute allowedRoles={[SECRETARY_ROLE]}>
        <CompetitionSummaryPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/competitions/:competitionId/classes",
    element: (
      <ProtectedRoute allowedRoles={[SECRETARY_ROLE]}>
        <CompetitionClassesPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/competitions/:competitionId/paid-time",
    element: (
      <ProtectedRoute allowedRoles={[SECRETARY_ROLE]}>
        <CompetitionPaidTimePage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/competitions/:competitionId/stalls",
    element: (
      <ProtectedRoute allowedRoles={[SECRETARY_ROLE]}>
        <CompetitionStallsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/competitions/:competitionId/shavings",
    element: (
      <ProtectedRoute allowedRoles={[SECRETARY_ROLE]}>
        <CompetitionShavingsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/competitions/:competitionId/health-certificates",
    element: (
      <ProtectedRoute allowedRoles={[SECRETARY_ROLE]}>
        <CompetitionHealthCertificatesPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/competitions/:competitionId/change-tracking",
    element: (
      <ProtectedRoute allowedRoles={[SECRETARY_ROLE]}>
        <CompetitionChangeTrackingPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/competitions/:competitionId/payments",
    element: (
      <ProtectedRoute allowedRoles={[SECRETARY_ROLE]}>
        <CompetitionPaymentsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/competitions/:competitionId/edit",
    element: (
      <ProtectedRoute allowedRoles={[SECRETARY_ROLE]}>
        <CompetitionFormPage mode="edit" />
      </ProtectedRoute>
    ),
  },

  {
    path: "/service-prices",
    element: (
      <ProtectedRoute allowedRoles={[SECRETARY_ROLE]}>
        <ServicePricesPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/arenas-and-stalls",
    element: (
      <ProtectedRoute allowedRoles={[SECRETARY_ROLE]}>
        <ArenasAndStallsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/workers-management",
    element: (
      <ProtectedRoute allowedRoles={[SECRETARY_ROLE]}>
        <WorkersManagementPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/profile-settings",
    element: (
      <ProtectedRoute allowedRoles={[SECRETARY_ROLE]}>
        <ProfileSettingsPage />
      </ProtectedRoute>
    ),
  },

  // 🟣 SuperUser
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
  {
    path: "/unauthorized",
    element: <UnauthorizedPage />,
  },
]);

export default router;

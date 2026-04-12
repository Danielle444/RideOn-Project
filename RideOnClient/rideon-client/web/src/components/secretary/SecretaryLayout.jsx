import { Navigate } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import { useActiveRole } from "../../context/ActiveRoleContext";
import AppLayout from "../layout/AppLayout";

const SECRETARY_ROLE = "מזכירת חווה מארחת";

export default function SecretaryLayout(props) {
  const { user } = useUser();
  const { activeRole } = useActiveRole();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.userType === "superUser") {
    return <Navigate to="/superuser/requests" replace />;
  }

  if (!activeRole) {
    return <Navigate to="/select-ranch" replace />;
  }

  if (activeRole.roleName !== SECRETARY_ROLE) {
    return <Navigate to="/select-ranch" replace />;
  }

  return (
    <AppLayout
      userName={props.userName}
      subtitle={props.subtitle}
      contextNote={props.contextNote}
      menuItems={props.menuItems}
      activeItemKey={props.activeItemKey}
      onNavigate={props.onNavigate}
      onNotificationsClick={props.onNotificationsClick}
      notificationCount={props.notificationCount}
      notificationsOpen={props.notificationsOpen}
      notificationItems={props.notificationItems}
      onNotificationItemClick={props.onNotificationItemClick}
    >
      {props.children}
    </AppLayout>
  );
}
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import TopBar from "./TopBar";
import Sidebar from "./Sidebar";

export default function AppLayout(props) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  function handleNotificationsClick() {
    if (props.onNotificationsClick) {
      props.onNotificationsClick();
      return;
    }
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#F5F1EE]">
      <TopBar
        onLogout={handleLogout}
        onNotificationsClick={handleNotificationsClick}
        notificationCount={props.notificationCount}
        notificationsOpen={props.notificationsOpen}
        notificationItems={props.notificationItems}
        onNotificationItemClick={props.onNotificationItemClick}
      />

      <div className="min-h-[calc(100vh-48px)] flex">
        <Sidebar
          userName={props.userName}
          subtitle={props.subtitle}
          items={props.menuItems}
          activeItemKey={props.activeItemKey}
          onNavigate={props.onNavigate}
        />

        <main className="flex-1 p-6">{props.children}</main>
      </div>
    </div>
  );
}
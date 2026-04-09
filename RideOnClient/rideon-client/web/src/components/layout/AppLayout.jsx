import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import TopBar from "./TopBar";
import Sidebar from "./Sidebar";

export default function AppLayout(props) {
  const navigate = useNavigate();
  const authContext = useAuth();
  const logout = authContext.logout;

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

  function handleSidebarNavigate(itemKey) {
    if (props.onNavigate) {
      props.onNavigate(itemKey);
      return;
    }

    var matchedItem = Array.isArray(props.menuItems)
      ? props.menuItems.find(function (menuItem) {
          return menuItem.key === itemKey;
        })
      : null;

    if (matchedItem && matchedItem.path) {
      navigate(matchedItem.path);
    }
  }

  return (
    <div dir="rtl" className="h-screen overflow-hidden bg-[#F5F1EE]">
      <TopBar
        onLogout={handleLogout}
        onNotificationsClick={handleNotificationsClick}
        notificationCount={props.notificationCount}
        notificationsOpen={props.notificationsOpen}
        notificationItems={props.notificationItems}
        onNotificationItemClick={props.onNotificationItemClick}
      />

      <div className="flex h-[calc(100vh-48px)] overflow-hidden">
        <Sidebar
          userName={props.userName}
          subtitle={props.subtitle}
          contextNote={props.contextNote}
          items={props.menuItems}
          activeItemKey={props.activeItemKey}
          onNavigate={handleSidebarNavigate}
        />

        <main className="flex-1 overflow-y-auto p-6">{props.children}</main>
      </div>
    </div>
  );
}
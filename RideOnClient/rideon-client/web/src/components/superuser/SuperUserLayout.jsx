import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import AppLayout from "../layout/AppLayout";
import superUserMenu from "./superUserMenu";
import { getPendingRequestsSummary } from "../../services/superUserService";

export default function SuperUserLayout(props) {
  const navigate = useNavigate();
  const { user } = useUser();

  const [notificationCount, setNotificationCount] = useState(0);
  const [pendingCounts, setPendingCounts] = useState({
    admin: 0,
    secretary: 0,
    ranch: 0,
  });
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(
    function () {
      if (!user || user.userType !== "superUser") {
        return;
      }

      loadPendingRequestsCount();
    },
    [user],
  );

  async function loadPendingRequestsCount() {
    try {
      const summary = await getPendingRequestsSummary();

      setPendingCounts({
        admin: summary.admin || 0,
        secretary: summary.secretary || 0,
        ranch: summary.ranch || 0,
      });

      setNotificationCount(summary.total || 0);
    } catch (err) {
      console.error("Failed loading notification count:", err);
      setPendingCounts({
        admin: 0,
        secretary: 0,
        ranch: 0,
      });
      setNotificationCount(0);
    }
  }

  const notificationItems = useMemo(
    function () {
      const items = [];

      if (pendingCounts.admin > 0) {
        items.push({
          key: "admin",
          title: `${pendingCounts.admin} בקשות אדמין ממתינות`,
          subtitle: "לחצי למעבר לבקשות אדמין",
        });
      }

      if (pendingCounts.secretary > 0) {
        items.push({
          key: "secretary",
          title: `${pendingCounts.secretary} בקשות מזכירה ממתינות`,
          subtitle: "לחצי למעבר לבקשות מזכירה",
        });
      }

      if (pendingCounts.ranch > 0) {
        items.push({
          key: "ranch",
          title: `${pendingCounts.ranch} בקשות חווה ממתינות`,
          subtitle: "לחצי למעבר לבקשות חוות",
        });
      }

      return items;
    },
    [pendingCounts],
  );

  function handleNavigate(key) {
    navigate("/superuser/" + key);
  }

  function handleNotificationsClick() {
    setNotificationsOpen(function (prev) {
      return !prev;
    });
  }

  function handleNotificationItemClick(tabKey) {
    setNotificationsOpen(false);
    navigate(`/superuser/requests?tab=${tabKey}`);
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.userType !== "superUser") {
    return <Navigate to="/select-ranch" replace />;
  }

  return (
    <AppLayout
      userName={user.email || ""}
      subtitle="מנהל מערכת"
      menuItems={superUserMenu}
      activeItemKey={props.activeItemKey}
      onNavigate={handleNavigate}
      onNotificationsClick={handleNotificationsClick}
      notificationCount={notificationCount}
      notificationsOpen={notificationsOpen}
      notificationItems={notificationItems}
      onNotificationItemClick={handleNotificationItemClick}
    >
      {props.children}
    </AppLayout>
  );
}
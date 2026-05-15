import { Navigate, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useUser } from "../../context/UserContext";
import { useActiveRole } from "../../context/ActiveRoleContext";
import AppLayout from "../layout/AppLayout";
import { getPendingChangeRequestsByCompetition } from "../../services/changeTrackingService";
import { saveActiveCompetition } from "../../services/competitionSessionService";

const SECRETARY_ROLE = "מזכירת חווה מארחת";

export default function SecretaryLayout(props) {
  const navigate = useNavigate();

  const { user } = useUser();
  const { activeRole } = useActiveRole();

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationItems, setNotificationItems] = useState([]);

  useEffect(
    function () {
      loadSecretaryNotifications();
    },
    [activeRole?.ranchId],
  );

  async function loadSecretaryNotifications() {
    if (!activeRole?.ranchId) {
      setNotificationItems([]);
      return;
    }

    try {
      var response = await getPendingChangeRequestsByCompetition(
        activeRole.ranchId,
      );

      var data = Array.isArray(response.data) ? response.data : [];

      var items = data.map(function (item) {
        var competitionId =
          item.competitionId || item.CompetitionId;

        var competitionName =
          item.competitionName ||
          item.CompetitionName ||
          "תחרות ללא שם";

        var pendingCount =
          item.pendingCount ||
          item.PendingCount ||
          0;

        return {
          key: "change-tracking-" + competitionId,
          competitionId: competitionId,
          competitionName: competitionName,
          title: competitionName,
          subtitle:
            pendingCount +
            " בקשות שינוי ממתינות לאישור",
          pendingCount: Number(pendingCount),
        };
      });

      setNotificationItems(items);
    } catch (error) {
      console.error(error);
      setNotificationItems([]);
    }
  }

  const internalNotificationCount = useMemo(
    function () {
      return notificationItems.reduce(function (total, item) {
        return total + Number(item.pendingCount || 0);
      }, 0);
    },
    [notificationItems],
  );

  function handleNotificationsClick() {
    if (props.onNotificationsClick) {
      props.onNotificationsClick();
      return;
    }

    setNotificationsOpen(function (prev) {
      return !prev;
    });
  }

  function handleNotificationItemClick(itemKey) {
    if (props.onNotificationItemClick) {
      props.onNotificationItemClick(itemKey);
      return;
    }

    var matchedItem = notificationItems.find(function (item) {
      return item.key === itemKey;
    });

    setNotificationsOpen(false);

    if (!matchedItem || !matchedItem.competitionId) {
      return;
    }

    saveActiveCompetition({
      competitionId: matchedItem.competitionId,
      competitionName: matchedItem.competitionName,
    });

    navigate(
      "/competitions/" +
        matchedItem.competitionId +
        "/change-tracking",
    );
  }

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
      onNotificationsClick={handleNotificationsClick}
      notificationCount={
        props.notificationCount !== undefined
          ? props.notificationCount
          : internalNotificationCount
      }
      notificationsOpen={
        props.notificationsOpen !== undefined
          ? props.notificationsOpen
          : notificationsOpen
      }
      notificationItems={
        props.notificationItems !== undefined
          ? props.notificationItems
          : notificationItems
      }
      onNotificationItemClick={handleNotificationItemClick}
    >
      {props.children}
    </AppLayout>
  );
}
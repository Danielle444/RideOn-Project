import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppLayout from "../../layout/AppLayout";
import secretaryCompetitionMenu from "../secretaryCompetitionMenu";
import { useUser } from "../../../context/UserContext";
import { useActiveRole } from "../../../context/ActiveRoleContext";
import {
  getActiveCompetition,
  saveActiveCompetition,
  clearActiveCompetition,
} from "../../../services/competitionSessionService";

export default function CompetitionWorkspaceLayout(props) {
  const navigate = useNavigate();
  const params = useParams();

  const userContext = useUser();
  const activeRoleContext = useActiveRole();

  const user = userContext.user;
  const activeRole = activeRoleContext.activeRole;

  const competitionId = params.competitionId;

  const [currentCompetition, setCurrentCompetition] = useState(null);

  useEffect(
    function () {
      var storedCompetition = getActiveCompetition();

      if (!competitionId) {
        setCurrentCompetition(null);
        return;
      }

      if (
        storedCompetition &&
        String(storedCompetition.competitionId) === String(competitionId)
      ) {
        setCurrentCompetition(storedCompetition);
        return;
      }

      setCurrentCompetition({
        competitionId: competitionId,
        competitionName: "",
      });
    },
    [competitionId],
  );

  const userName = useMemo(
    function () {
      return ((user?.firstName || "") + " " + (user?.lastName || "")).trim();
    },
    [user],
  );

  const subtitle = useMemo(
    function () {
      return (
        [activeRole?.roleName, activeRole?.ranchName].filter(Boolean).join(" · ") ||
        "לא נבחר תפקיד וחווה"
      );
    },
    [activeRole],
  );

  const activeCompetitionName = useMemo(
    function () {
      return currentCompetition?.competitionName || "";
    },
    [currentCompetition],
  );

  function handleCompetitionMenuNavigate(itemKey) {
    var matchedItem = secretaryCompetitionMenu.find(function (item) {
      return item.key === itemKey;
    });

    if (!matchedItem || !matchedItem.getPath) {
      return;
    }

    if (itemKey === "back-to-competitions") {
      clearActiveCompetition();
      navigate("/competitions");
      return;
    }

    if (!competitionId) {
      return;
    }

    navigate(matchedItem.getPath(competitionId));
  }

  function updateCurrentCompetition(competition) {
    if (!competition) {
      return;
    }

    setCurrentCompetition(competition);
    saveActiveCompetition(competition);
  }

  if (!activeRole) {
    return null;
  }

  return (
    <AppLayout
      userName={userName}
      subtitle={subtitle}
      contextNote={activeCompetitionName}
      menuItems={secretaryCompetitionMenu}
      activeItemKey={props.activeItemKey}
      onNavigate={handleCompetitionMenuNavigate}
    >
      {typeof props.children === "function"
        ? props.children({
            competitionId: competitionId,
            currentCompetition: currentCompetition,
            setCurrentCompetition: updateCurrentCompetition,
          })
        : props.children}
    </AppLayout>
  );
}
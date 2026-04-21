import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Text, View } from "react-native";
import MobileScreenLayout from "../../../../components/mobile-nav/MobileScreenLayout";
import SideMenuTemplate from "../../../../components/mobile-nav/SideMenuTemplate";
import CompetitionMenuTemplate from "../../../../components/mobile-nav/CompetitionMenuTemplate";
import roleSharedStyles from "../../../../styles/roleSharedStyles";
import competitionBoardStyles from "../../../../styles/competitionBoardStyles";
import { getAdminBottomNavConfig } from "../../../../navigation/bottomNavConfigs";
import { getAdminMenuItems } from "../../../../navigation/sideMenuConfigs";
import { getAdminCompetitionMenuItems } from "../../../../navigation/competitionMenuConfigs";
import { useUser } from "../../../../context/UserContext";
import { useActiveRole } from "../../../../context/ActiveRoleContext";
import { useCompetition } from "../../../../context/CompetitionContext";
import { getMobileAdminCompetitionsBoard } from "../../../../services/competitionService";
import CompetitionBoardCard from "../../../../components/competitions/CompetitionBoardCard";
import { formatCompetitionDateRange } from "../../../../../../shared/auth/utils/competitions/competitionFormatters";
import {
  canAdminEnterCompetition,
  canAdminRegisterCompetition,
} from "../../../../../../shared/auth/utils/competitions/competitionStatus";
import { sortCompetitionsByStatusAndDate } from "../../../../../../shared/auth/utils/competitions/competitionSorting";
import { MOBILE_COMPETITION_STATUS_ORDER } from "../../../../config/competitionStatusOrder";

export default function AdminCompetitionsBoardScreen(props) {
  var userContext = useUser();
  var activeRoleContext = useActiveRole();
  var competitionContext = useCompetition();

  var user = userContext.user;
  var activeRole = activeRoleContext.activeRole;

  var [menuMode, setMenuMode] = useState("general");
  var [selectedCompetition, setSelectedCompetition] = useState(null);
  var [competitions, setCompetitions] = useState([]);
  var [loading, setLoading] = useState(false);

  useEffect(
    function () {
      if (!activeRole || !activeRole.ranchId) return;
      loadCompetitions();
    },
    [activeRole],
  );

  async function loadCompetitions() {
    try {
      setLoading(true);
      var response = await getMobileAdminCompetitionsBoard(activeRole.ranchId);

      setCompetitions(
        sortCompetitionsByStatusAndDate(
          Array.isArray(response.data) ? response.data : [],
          MOBILE_COMPETITION_STATUS_ORDER,
        ),
      );
    } catch (error) {
      Alert.alert("שגיאה", "אירעה שגיאה בטעינת התחרויות");
      setCompetitions([]);
    } finally {
      setLoading(false);
    }
  }

  async function setCompetitionAndNavigate(item, screen) {
    await competitionContext.setActiveCompetitionAndPersist({
      competitionId: item.competitionId,
      competitionName: item.competitionName,
      competitionStatus: item.competitionStatus,
      ranchId: activeRole.ranchId,
    });

    props.navigation.navigate(screen, {
      competitionId: item.competitionId,
      competitionName: item.competitionName,
    });
  }

  async function handleLogout() {
    if (props.onLogout) {
      await props.onLogout();
    }
  }

  function handleAdminMenuPress(item) {
    props.navigation.navigate(item.screen);
  }

  function handleCompetitionMenuPress(item) {
    props.navigation.navigate(item.screen);
  }

  function buildActions(item) {
    return [
      {
        key: "details",
        label: "פרטי תחרות",
        onPress: function () {
          setCompetitionAndNavigate(item, "AdminCompetitionDetails");
        },
        disabled: false,
        variant: "secondary",
      },
      {
        key: "registration",
        label: "הרשמה",
        onPress: function () {
          setCompetitionAndNavigate(item, "AdminCompetitionRegistrations");
        },
        disabled: !canAdminRegisterCompetition(item.competitionStatus),
        variant: "secondary",
      },
      {
        key: "enter",
        label: "כניסה",
        onPress: function () {
          setCompetitionAndNavigate(item, "AdminCompetitionPayers");
        },
        disabled: !canAdminEnterCompetition(item.competitionStatus),
        variant: "primary",
      },
    ];
  }

  return (
    <MobileScreenLayout
      title="לוח התחרויות"
      bottomNavItems={getAdminBottomNavConfig(props.navigation)}
      menuContent={({ closeMenu }) => {
        if (menuMode === "competition" && selectedCompetition) {
          return (
            <CompetitionMenuTemplate
              competitionName={selectedCompetition.competitionName}
              items={getAdminCompetitionMenuItems()}
              onItemPress={handleCompetitionMenuPress}
              onExitCompetition={() => setMenuMode("general")}
              closeMenu={closeMenu}
            />
          );
        }

        return (
          <SideMenuTemplate
            activeKey="competitions"
            userName={
              (user &&
                (
                  (user.firstName || "") +
                  " " +
                  (user.lastName || "")
                ).trim()) ||
              ""
            }
            roleName={(activeRole && activeRole.roleName) || ""}
            ranchName={(activeRole && activeRole.ranchName) || ""}
            competitionName={
              competitionContext.activeCompetition
                ? competitionContext.activeCompetition.competitionName
                : ""
            }
            closeMenu={closeMenu}
            items={getAdminMenuItems()}
            onItemPress={handleAdminMenuPress}
            onSwitchRole={function () {
              props.navigation.replace("SelectActiveRole");
            }}
            onLogout={handleLogout}
          />
        );
      }}
    >
      <Text style={roleSharedStyles.sectionTitle}>כל התחרויות</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#8B6352" />
      ) : (
        <View style={competitionBoardStyles.listContent}>
          {competitions.map((item) => (
            <CompetitionBoardCard
              key={item.competitionId}
              title={item.competitionName}
              ranchName={item.hostRanchName || ""}
              dateText={formatCompetitionDateRange(
                item.competitionStartDate,
                item.competitionEndDate,
              )}
              status={item.competitionStatus}
              actions={buildActions(item)}
            />
          ))}
        </View>
      )}
    </MobileScreenLayout>
  );
}

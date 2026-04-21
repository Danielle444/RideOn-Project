import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Text, View } from "react-native";
import MobileScreenLayout from "../../../../components/mobile-nav/MobileScreenLayout";
import roleSharedStyles from "../../../../styles/roleSharedStyles";
import competitionBoardStyles from "../../../../styles/competitionBoardStyles";
import SideMenuTemplate from "../../../../components/mobile-nav/SideMenuTemplate";
import CompetitionMenuTemplate from "../../../../components/mobile-nav/CompetitionMenuTemplate";
import { getPayerMenuItems } from "../../../../navigation/sideMenuConfigs";
import { getPayerCompetitionMenuItems } from "../../../../navigation/competitionMenuConfigs";
import { getPayerBottomNavConfig } from "../../../../navigation/bottomNavConfigs";
import { useUser } from "../../../../context/UserContext";
import { useActiveRole } from "../../../../context/ActiveRoleContext";
import { useCompetition } from "../../../../context/CompetitionContext";
import { getMobilePayerCompetitionsBoard } from "../../../../services/competitionService";
import CompetitionBoardCard from "../../../../components/competitions/CompetitionBoardCard";
import { formatCompetitionDateRange } from "../../../../../../shared/auth/utils/competitions/competitionFormatters";
import { canPayerEnterCompetition } from "../../../../../../shared/auth/utils/competitions/competitionStatus";
import { sortCompetitionsByStatusAndDate } from "../../../../../../shared/auth/utils/competitions/competitionSorting";
import { MOBILE_COMPETITION_STATUS_ORDER } from "../../../../config/competitionStatusOrder";

export default function PayerCompetitionsBoardScreen(props) {
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
      if (!activeRole || !activeRole.ranchId) {
        return;
      }

      loadCompetitions();
    },
    [activeRole],
  );

  async function loadCompetitions() {
    try {
      setLoading(true);

      var response = await getMobilePayerCompetitionsBoard(activeRole.ranchId);
      setCompetitions(
        sortCompetitionsByStatusAndDate(
          Array.isArray(response.data) ? response.data : [],
          MOBILE_COMPETITION_STATUS_ORDER,
        ),
      );
    } catch (error) {
      console.error(error);
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

    setSelectedCompetition(item);
    setMenuMode("competition");
    props.navigation.navigate(screen);
  }

  function openCompetitionMenu(competition) {
    setSelectedCompetition(competition);
    setMenuMode("competition");
  }

  async function exitCompetitionMenu() {
    setSelectedCompetition(null);
    setMenuMode("general");
    await competitionContext.clearCompetition();
  }

  async function handleLogout() {
    if (props.onLogout) {
      await props.onLogout();
    }
  }

  function handlePayerMenuPress(item) {
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
          setCompetitionAndNavigate(item, "PayerCompetitionDetails");
        },
        disabled: false,
        variant: "secondary",
      },
      {
        key: "enter",
        label: "כניסה",
        onPress: function () {
          setCompetitionAndNavigate(item, "PayerCompetitionAccount");
        },
        disabled: !canPayerEnterCompetition(item.competitionStatus),
        variant: "primary",
      },
    ];
  }

  function renderCompetitionCard(info) {
    var item = info.item;

    return (
      <CompetitionBoardCard
        title={item.competitionName}
        dateText={formatCompetitionDateRange(
          item.competitionStartDate,
          item.competitionEndDate,
        )}
        ranchName={
          activeRole && activeRole.ranchName ? activeRole.ranchName : ""
        }
        status={item.competitionStatus}
        actions={buildActions(item)}
      />
    );
  }

  return (
    <MobileScreenLayout
      title="לוח התחרויות"
      subtitle=""
      activeBottomTab="home"
      bottomNavItems={getPayerBottomNavConfig(props.navigation)}
      menuContent={function ({ closeMenu }) {
        if (menuMode === "competition" && selectedCompetition) {
          return (
            <CompetitionMenuTemplate
              activeKey=""
              closeMenu={closeMenu}
              competitionName={selectedCompetition.competitionName}
              items={getPayerCompetitionMenuItems()}
              onItemPress={handleCompetitionMenuPress}
              onExitCompetition={exitCompetitionMenu}
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
            items={getPayerMenuItems()}
            onItemPress={handlePayerMenuPress}
            onSwitchRole={function () {
              props.navigation.replace("SelectActiveRole");
            }}
            onLogout={handleLogout}
          />
        );
      }}
    >
      <Text style={roleSharedStyles.sectionTitle}>התחרויות שלי</Text>

      {loading ? (
        <View style={competitionBoardStyles.loadingWrapper}>
          <ActivityIndicator size="large" color="#8B6352" />
        </View>
      ) : (
        <View style={competitionBoardStyles.listContent}>
          {competitions.length === 0 ? (
            <Text style={competitionBoardStyles.emptyText}>
              לא נמצאו תחרויות להצגה
            </Text>
          ) : (
            competitions.map(function (item) {
              return (
                <View key={String(item.competitionId)}>
                  {renderCompetitionCard({ item: item })}
                </View>
              );
            })
          )}
        </View>
      )}
    </MobileScreenLayout>
  );
}

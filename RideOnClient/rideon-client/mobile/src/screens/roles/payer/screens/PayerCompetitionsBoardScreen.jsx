import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import MobileScreenLayout from "../../../../components/mobile-nav/MobileScreenLayout";
import roleSharedStyles from "../../../../styles/roleSharedStyles";
import competitionBoardStyles from "../../../../styles/competitionBoardStyles";
import SideMenuTemplate from "../../../../components/mobile-nav/SideMenuTemplate";
import CompetitionMenuTemplate from "../../../../components/mobile-nav/CompetitionMenuTemplate";
import CompetitionsFilterBar from "../../../../components/competitions/CompetitionsFilterBar";
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
import { MOBILE_COMPETITION_STATUS_ORDER } from "../../../../../../shared/auth/utils/competitions/competitionStatusOrder";
import {
  buildHostRanchOptions,
  buildFieldOptions,
  buildStatusOptions,
  filterCompetitionsForBoard,
} from "../../../../utils/competitionsBoardFilters";

// Enrolled competitions first (highest relevance), then the rest; each group
// keeps the standard status + date order.
function sortPayerCompetitionsByRelevance(items) {
  var source = Array.isArray(items) ? items : [];

  var enrolled = source.filter(function (item) {
    return item && item.hasParticipated;
  });

  var others = source.filter(function (item) {
    return !(item && item.hasParticipated);
  });

  return sortCompetitionsByStatusAndDate(
    enrolled,
    MOBILE_COMPETITION_STATUS_ORDER,
  ).concat(
    sortCompetitionsByStatusAndDate(others, MOBILE_COMPETITION_STATUS_ORDER),
  );
}

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

  // CAP-1: status/host-ranch/field are multi-select sets now (an empty
  // array means "no filtering for that facet"), owned here as the board's
  // APPLIED filters - CompetitionsFilterBar owns its own draft copy
  // internally and only calls handleApplyFilters on "החל".
  var [searchText, setSearchText] = useState("");
  var [hostRanchFilter, setHostRanchFilter] = useState([]);
  var [fieldFilter, setFieldFilter] = useState([]);
  var [statusFilter, setStatusFilter] = useState([]);
  var [dateFrom, setDateFrom] = useState("");
  var [dateTo, setDateTo] = useState("");

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
        sortPayerCompetitionsByRelevance(
          Array.isArray(response.data) ? response.data : [],
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

  // AppNavigator is one flat native-stack (no unmountOnBlur): navigating to
  // "PayerCompetitionAccount"/"PayerCompetitionDetails" via setCompetitionAndNavigate
  // pushes it on top and leaves this screen mounted-but-blurred underneath
  // with menuMode/selectedCompetition still set to "competition"/the entered
  // item. Coming back here via the bottom-nav board icon or the "לוח תחרויות"
  // side-menu item just pops back to this SAME instance, so without this
  // reset the side menu would keep showing the in-competition items instead
  // of the normal board menu. Reuses the exact same reset already wired to
  // the explicit "יציאה מהתחרות" action.
  useFocusEffect(
    useCallback(function () {
      exitCompetitionMenu();
    }, []),
  );

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

  // CAP-1: the sheet's own "החל" - commits its whole draft filter set to
  // the board in one call. "איפוס" inside the sheet only clears the draft;
  // it reaches the board only once the user also presses "החל".
  function handleApplyFilters(nextFilters) {
    setSearchText(nextFilters.searchText || "");
    setHostRanchFilter(
      Array.isArray(nextFilters.hostRanchIds) ? nextFilters.hostRanchIds : [],
    );
    setFieldFilter(Array.isArray(nextFilters.fieldIds) ? nextFilters.fieldIds : []);
    setStatusFilter(
      Array.isArray(nextFilters.statusValues) ? nextFilters.statusValues : [],
    );
    setDateFrom(nextFilters.dateFrom || "");
    setDateTo(nextFilters.dateTo || "");
  }

  var hostRanchOptions = useMemo(
    function () {
      return buildHostRanchOptions(competitions);
    },
    [competitions],
  );

  var fieldOptions = useMemo(
    function () {
      return buildFieldOptions(competitions);
    },
    [competitions],
  );

  var statusOptions = useMemo(
    function () {
      return buildStatusOptions(competitions, MOBILE_COMPETITION_STATUS_ORDER);
    },
    [competitions],
  );

  var filteredCompetitions = useMemo(
    function () {
      return filterCompetitionsForBoard(competitions, {
        searchText: searchText,
        hostRanchFilter: hostRanchFilter,
        fieldFilter: fieldFilter,
        statusFilter: statusFilter,
        dateFrom: dateFrom,
        dateTo: dateTo,
      });
    },
    [competitions, searchText, hostRanchFilter, fieldFilter, statusFilter, dateFrom, dateTo],
  );

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
          item.hostRanchName ||
          (activeRole && activeRole.ranchName ? activeRole.ranchName : "")
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
      activeBottomTab="board"
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
      <Text style={roleSharedStyles.sectionTitle}>כל התחרויות</Text>

      <CompetitionsFilterBar
        hostRanchOptions={hostRanchOptions}
        fieldOptions={fieldOptions}
        statusOptions={statusOptions}
        appliedFilters={{
          searchText: searchText,
          hostRanchIds: hostRanchFilter,
          fieldIds: fieldFilter,
          statusValues: statusFilter,
          dateFrom: dateFrom,
          dateTo: dateTo,
        }}
        onApply={handleApplyFilters}
      />

      {loading ? (
        <View style={competitionBoardStyles.loadingWrapper}>
          <ActivityIndicator size="large" color="#8B6352" />
        </View>
      ) : (
        <View style={competitionBoardStyles.listContent}>
          {filteredCompetitions.length === 0 ? (
            <Text style={competitionBoardStyles.emptyText}>
              לא נמצאו תחרויות התואמות את הסינון
            </Text>
          ) : (
            filteredCompetitions.map(function (item) {
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

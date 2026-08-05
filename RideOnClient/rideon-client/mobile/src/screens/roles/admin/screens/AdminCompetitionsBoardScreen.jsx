import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Text, View } from "react-native";
import MobileScreenLayout from "../../../../components/mobile-nav/MobileScreenLayout";
import SideMenuTemplate from "../../../../components/mobile-nav/SideMenuTemplate";
import CompetitionMenuTemplate from "../../../../components/mobile-nav/CompetitionMenuTemplate";
import CompetitionsFilterBar from "../../../../components/competitions/CompetitionsFilterBar";
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
import { sortCompetitionsByStatusAndDate } from "../../../../../../shared/auth/utils/competitions/competitionSorting";
import { MOBILE_COMPETITION_STATUS_ORDER } from "../../../../../../shared/auth/utils/competitions/competitionStatusOrder";
import { buildAdminCompetitionActions } from "../utils/buildAdminCompetitionActions";
import {
  buildHostRanchOptions,
  buildFieldOptions,
  buildStatusOptions,
  filterCompetitionsForBoard,
} from "../../../../utils/competitionsBoardFilters";

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
    return buildAdminCompetitionActions(item, {
      navigation: props.navigation,
      competitionContext: competitionContext,
      activeRole: activeRole,
    });
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

  return (
    <MobileScreenLayout
      title="לוח התחרויות"
      activeBottomTab="board"
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
        <ActivityIndicator size="large" color="#8B6352" />
      ) : (
        <View style={competitionBoardStyles.listContent}>
          {filteredCompetitions.length === 0 ? (
            <Text style={competitionBoardStyles.emptyText}>
              לא נמצאו תחרויות התואמות את הסינון
            </Text>
          ) : (
            filteredCompetitions.map((item) => (
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
            ))
          )}
        </View>
      )}
    </MobileScreenLayout>
  );
}

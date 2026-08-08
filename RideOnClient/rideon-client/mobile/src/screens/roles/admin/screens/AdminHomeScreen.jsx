import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MobileScreenLayout from "../../../../components/mobile-nav/MobileScreenLayout";
import SideMenuTemplate from "../../../../components/mobile-nav/SideMenuTemplate";
import { useUser } from "../../../../context/UserContext";
import { useActiveRole } from "../../../../context/ActiveRoleContext";
import { useCompetition } from "../../../../context/CompetitionContext";
import { getAdminMenuItems } from "../../../../navigation/sideMenuConfigs";
import { getAdminBottomNavConfig } from "../../../../navigation/bottomNavConfigs";
import homeScreenStyles from "../../../../styles/homeScreenStyles";
import HomeCompetitionCard from "../../../../components/home/HomeCompetitionCard";
import { getMobileAdminHomeCompetitions } from "../../../../services/competitionService";
import {
  selectCompetitionsShortlist,
  DEFAULT_SHORTLIST_CAP,
  HOME_TEASER_ALLOWED_STATUSES,
} from "../../../../../../shared/auth/utils/competitions/competitionHomeShortlist";
import { MOBILE_COMPETITION_STATUS_ORDER } from "../../../../../../shared/auth/utils/competitions/competitionStatusOrder";
import { buildAdminCompetitionActions } from "../utils/buildAdminCompetitionActions";
import { withTransientRetry } from "../../../../utils/transientRequestRetry";
import { showToast } from "../../../../services/toastService";

export default function AdminHomeScreen(props) {
  var userContext = useUser();
  var activeRoleContext = useActiveRole();
  var competitionContext = useCompetition();

  var user = userContext.user;
  var activeRole = activeRoleContext.activeRole;

  var [competitions, setCompetitions] = useState([]);
  var [loading, setLoading] = useState(false);
  var [refreshing, setRefreshing] = useState(false);

  useEffect(
    function () {
      if (!activeRole || !activeRole.ranchId) {
        return;
      }

      loadHomeCompetitions();
    },
    [activeRole],
  );

  async function loadHomeCompetitions() {
    try {
      setLoading(true);

      var response = await withTransientRetry(function () {
        return getMobileAdminHomeCompetitions(activeRole.ranchId);
      });
      setCompetitions(
        selectCompetitionsShortlist(
          response.data,
          MOBILE_COMPETITION_STATUS_ORDER,
          DEFAULT_SHORTLIST_CAP,
          HOME_TEASER_ALLOWED_STATUSES,
        ),
      );
    } catch (error) {
      console.error(error);
      setCompetitions([]);
      showToast("אירעה שגיאה בטעינת דף הבית", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    try {
      setRefreshing(true);
      await loadHomeCompetitions();
    } finally {
      setRefreshing(false);
    }
  }

  async function handleLogout() {
    if (props.onLogout) {
      await props.onLogout();
    }
  }

  function handleMenuPress(item) {
    props.navigation.navigate(item.screen);
  }

  function buildCompetitionActions(item) {
    return buildAdminCompetitionActions(item, {
      navigation: props.navigation,
      competitionContext: competitionContext,
      activeRole: activeRole,
    });
  }

  var userName = (
    (user && ((user.firstName || "") + " " + (user.lastName || "")).trim()) ||
    ""
  ).trim();

  return (
    <MobileScreenLayout
      title="דף הבית"
      subtitle=""
      activeBottomTab="home"
      bottomNavItems={getAdminBottomNavConfig(props.navigation)}
      menuContent={function ({ closeMenu }) {
        return (
          <SideMenuTemplate
            activeKey="home"
            userName={userName}
            roleName={(activeRole && activeRole.roleName) || ""}
            ranchName={(activeRole && activeRole.ranchName) || ""}
            closeMenu={closeMenu}
            items={getAdminMenuItems()}
            onItemPress={handleMenuPress}
            onSwitchRole={function () {
              props.navigation.replace("SelectActiveRole");
            }}
            onLogout={handleLogout}
          />
        );
      }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={homeScreenStyles.pageContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#8B6352"]}
            tintColor="#8B6352"
          />
        }
      >
        <View style={homeScreenStyles.welcomeCard}>
          <Text style={homeScreenStyles.welcomeTitle}>
            שלום {user?.firstName} {user?.lastName}
          </Text>

          <Text style={homeScreenStyles.welcomeRole}>
            {activeRole?.roleName}
          </Text>

          <Text style={homeScreenStyles.welcomeSubtitle}>
            זה התפקיד הפעיל שלך בחווה {activeRole?.ranchName}
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          style={homeScreenStyles.quickButton}
          onPress={function () {
            props.navigation.navigate("AdminCompetitionsBoard");
          }}
        >
          <Ionicons name="arrow-back-outline" size={24} color="#FFFFFF" />
          <View style={homeScreenStyles.quickButtonTextWrap}>
            <Text style={homeScreenStyles.quickButtonTitle}>
              מעבר מהיר ללוח התחרויות
            </Text>
            <Text style={homeScreenStyles.quickButtonSubtitle}>
              לצפייה בכל התחרויות והמשך עבודה
            </Text>
          </View>
        </TouchableOpacity>

        <View style={homeScreenStyles.sectionCard}>
          <Text style={homeScreenStyles.sectionTitle}>תחרויות קרובות</Text>

          {loading ? (
            <View style={homeScreenStyles.loadingWrapper}>
              <ActivityIndicator size="large" color="#8B6352" />
            </View>
          ) : competitions.length === 0 ? (
            <Text style={homeScreenStyles.emptyText}>
              עדיין לא נמצאו תחרויות קרובות עם מידע שהכנסת
            </Text>
          ) : (
            competitions.map(function (item) {
              return (
                <HomeCompetitionCard
                  key={String(item.competitionId)}
                  item={item}
                  ranchName={(activeRole && activeRole.ranchName) || ""}
                  actions={buildCompetitionActions(item)}
                />
              );
            })
          )}
        </View>
      </ScrollView>
    </MobileScreenLayout>
  );
}

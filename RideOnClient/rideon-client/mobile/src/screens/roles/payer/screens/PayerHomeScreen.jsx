import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { getPayerMenuItems } from "../../../../navigation/sideMenuConfigs";
import { getPayerBottomNavConfig } from "../../../../navigation/bottomNavConfigs";
import homeScreenStyles from "../../../../styles/homeScreenStyles";
import HomeCompetitionCard from "../../../../components/home/HomeCompetitionCard";
import { getMobilePayerCompetitionsBoard } from "../../../../services/competitionService";
import { canPayerEnterCompetition } from "../../../../../../shared/auth/utils/competitions/competitionStatus";
import { useCompetition } from "../../../../context/CompetitionContext";
import { selectHomeCompetitions } from "../utils/selectPayerHomeCompetitions";

export default function PayerHomeScreen(props) {
  var userContext = useUser();
  var activeRoleContext = useActiveRole();

  var user = userContext.user;
  var activeRole = activeRoleContext.activeRole;

  var [competitions, setCompetitions] = useState([]);
  var [loading, setLoading] = useState(false);
  var [refreshing, setRefreshing] = useState(false);

  var competitionContext = useCompetition();

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

      var response = await getMobilePayerCompetitionsBoard(activeRole.ranchId);
      var items = Array.isArray(response.data) ? response.data : [];
      setCompetitions(selectHomeCompetitions(items));
    } catch (error) {
      console.error(error);
      setCompetitions([]);
      Alert.alert("שגיאה", "אירעה שגיאה בטעינת דף הבית");
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
    return [
      {
        key: "details",
        label: "פרטי תחרות",
        onPress: async function () {
          await competitionContext.setActiveCompetitionAndPersist({
            competitionId: item.competitionId,
            competitionName: item.competitionName,
            competitionStatus: item.competitionStatus,
            ranchId: activeRole.ranchId,
          });

          props.navigation.navigate("PayerCompetitionDetails");
        },
        disabled: false,
        variant: "secondary",
      },
      {
        key: "enter",
        label: "כניסה",
        onPress: async function () {
          await competitionContext.setActiveCompetitionAndPersist({
            competitionId: item.competitionId,
            competitionName: item.competitionName,
            competitionStatus: item.competitionStatus,
            ranchId: activeRole.ranchId,
          });

          props.navigation.navigate("PayerCompetitionAccount");
        },
        disabled: !canPayerEnterCompetition(item.competitionStatus),
        variant: "primary",
      },
    ];
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
      bottomNavItems={getPayerBottomNavConfig(props.navigation)}
      menuContent={function ({ closeMenu }) {
        return (
          <SideMenuTemplate
            activeKey="home"
            userName={userName}
            roleName={(activeRole && activeRole.roleName) || ""}
            ranchName={(activeRole && activeRole.ranchName) || ""}
            closeMenu={closeMenu}
            items={getPayerMenuItems()}
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
            זה התפקיד הפעיל שלך במערכת
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          style={homeScreenStyles.quickButton}
          onPress={function () {
            props.navigation.navigate("PayerCompetitionsBoard");
          }}
        >
          <Ionicons name="arrow-back-outline" size={24} color="#FFFFFF" />
          <View style={homeScreenStyles.quickButtonTextWrap}>
            <Text style={homeScreenStyles.quickButtonTitle}>
              מעבר מהיר ללוח התחרויות
            </Text>
            <Text style={homeScreenStyles.quickButtonSubtitle}>
              לצפייה בתחרויות שלך ולפעולות תשלום/כניסה
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
              עדיין לא נמצאו תחרויות קרובות להצגה
            </Text>
          ) : (
            competitions.map(function (item) {
              return (
                <HomeCompetitionCard
                  key={String(item.competitionId)}
                  item={item}
                  ranchName={
                    item.hostRanchName ||
                    (activeRole && activeRole.ranchName) ||
                    ""
                  }
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

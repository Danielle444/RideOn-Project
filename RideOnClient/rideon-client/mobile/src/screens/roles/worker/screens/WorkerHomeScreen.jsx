import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { getWorkerMenuItems } from "../../../../navigation/sideMenuConfigs";
import { getWorkerBottomNavConfig } from "../../../../navigation/bottomNavConfigs";
import homeScreenStyles from "../../../../styles/homeScreenStyles";
import HomeCompetitionCard from "../../../../components/home/HomeCompetitionCard";
import HomeShortcutGrid from "../../../../components/home/HomeShortcutGrid";
import { getMobileWorkerCompetitionsBoard } from "../../../../services/competitionService";
import { canWorkerEnterCompetition } from "../../../../../../shared/auth/utils/competitions/competitionStatus";

function sortAndTakeNearest(items) {
  return [...items]
    .sort(function (a, b) {
      return String(a.competitionStartDate || "").localeCompare(
        String(b.competitionStartDate || ""),
      );
    })
    .slice(0, 2);
}

export default function WorkerHomeScreen(props) {
  var userContext = useUser();
  var activeRoleContext = useActiveRole();
  var competitionContext = useCompetition();

  var user = userContext.user;
  var activeRole = activeRoleContext.activeRole;

  var [competitions, setCompetitions] = useState([]);
  var [loading, setLoading] = useState(false);

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

      var response = await getMobileWorkerCompetitionsBoard(activeRole.ranchId);
      var items = Array.isArray(response.data) ? response.data : [];
      setCompetitions(sortAndTakeNearest(items));
    } catch (error) {
      console.error(error);
      setCompetitions([]);
      Alert.alert("שגיאה", "אירעה שגיאה בטעינת דף הבית");
    } finally {
      setLoading(false);
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
        onPress: function () {
          props.navigation.navigate("WorkerCompetitionDetails", {
            competitionId: item.competitionId,
            competitionName: item.competitionName,
          });
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

          props.navigation.navigate("WorkerCompetitionShavingsOrders", {
            competitionId: item.competitionId,
            competitionName: item.competitionName,
          });
        },
        disabled: !canWorkerEnterCompetition(item.competitionStatus),
        variant: "primary",
      },
    ];
  }

  var shortcutItems = useMemo(
    function () {
      return [
        {
          key: "board",
          label: "לוח התחרויות",
          icon: "trophy-outline",
          onPress: function () {
            props.navigation.navigate("WorkerCompetitionsBoard");
          },
        },
        {
          key: "profile",
          label: "פרופיל",
          icon: "person-outline",
          onPress: function () {
            props.navigation.navigate("WorkerProfile");
          },
        },
        {
          key: "switch-role",
          label: "החלפת פרופיל",
          icon: "sync-outline",
          onPress: function () {
            props.navigation.replace("SelectActiveRole");
          },
        },
        {
          key: "refresh",
          label: "רענון נתונים",
          icon: "refresh-outline",
          onPress: loadHomeCompetitions,
        },
      ];
    },
    [props.navigation, activeRole],
  );

  var userName = (
    (user && ((user.firstName || "") + " " + (user.lastName || "")).trim()) ||
    ""
  ).trim();

  return (
    <MobileScreenLayout
      title="דף הבית"
      subtitle=""
      activeBottomTab="home"
      bottomNavItems={getWorkerBottomNavConfig(props.navigation)}
      menuContent={function ({ closeMenu }) {
        return (
          <SideMenuTemplate
            activeKey="home"
            userName={userName}
            roleName={(activeRole && activeRole.roleName) || ""}
            ranchName={(activeRole && activeRole.ranchName) || ""}
            closeMenu={closeMenu}
            items={getWorkerMenuItems()}
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
            props.navigation.navigate("WorkerCompetitionsBoard");
          }}
        >
          <Ionicons name="arrow-back-outline" size={24} color="#FFFFFF" />
          <View style={homeScreenStyles.quickButtonTextWrap}>
            <Text style={homeScreenStyles.quickButtonTitle}>
              לוח התחרויות
            </Text>
            <Text style={homeScreenStyles.quickButtonSubtitle}>
              לצפייה בתחרויות הקרובות וכניסה לעבודה
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
                  ranchName={(activeRole && activeRole.ranchName) || ""}
                  actions={buildCompetitionActions(item)}
                />
              );
            })
          )}
        </View>

        <View style={homeScreenStyles.sectionCard}>
          <Text style={homeScreenStyles.sectionTitle}>קיצורים</Text>
          <HomeShortcutGrid items={shortcutItems} />
        </View>
      </ScrollView>
    </MobileScreenLayout>
  );
}

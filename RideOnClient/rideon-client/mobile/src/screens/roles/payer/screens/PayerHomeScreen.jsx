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
import { getPayerMenuItems } from "../../../../navigation/sideMenuConfigs";
import { getPayerBottomNavConfig } from "../../../../navigation/bottomNavConfigs";
import homeScreenStyles from "../../../../styles/homeScreenStyles";
import HomeCompetitionCard from "../../../../components/home/HomeCompetitionCard";
import HomeShortcutGrid from "../../../../components/home/HomeShortcutGrid";
import { getMobilePayerCompetitionsBoard } from "../../../../services/competitionService";
import { canPayerEnterCompetition } from "../../../../../../shared/auth/utils/competitions/competitionStatus";
import { useCompetition } from "../../../../context/CompetitionContext";

// Effective statuses (Hebrew) as returned by the backend.
var STATUS_FUTURE = "עתידית";
var STATUS_ACTIVE = "פעילה";
var STATUS_CURRENT = "כעת";
var STATUS_FINISHED = "הסתיימה";

var RECENTLY_FINISHED_DAYS = 7;
var UPCOMING_SOON_DAYS = 30;
var HOME_MAX_ITEMS = 3;

function startOfDay(value) {
  var date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setHours(0, 0, 0, 0);
  return date;
}

function daysBetween(fromDate, toDate) {
  return Math.round((toDate.getTime() - fromDate.getTime()) / 86400000);
}

// Home teaser: enrolled competitions that are still live or finished within the
// last week, plus ranch competitions starting within the next month.
function selectHomeCompetitions(items) {
  var source = Array.isArray(items) ? items : [];
  var today = startOfDay(new Date());

  var selected = source.filter(function (item) {
    if (!item) {
      return false;
    }

    var status = item.competitionStatus;
    var startDate = startOfDay(item.competitionStartDate);
    var endDate = startOfDay(item.competitionEndDate);

    if (item.hasParticipated) {
      if (
        status === STATUS_ACTIVE ||
        status === STATUS_CURRENT ||
        status === STATUS_FUTURE
      ) {
        return true;
      }

      if (status === STATUS_FINISHED && endDate) {
        return daysBetween(endDate, today) <= RECENTLY_FINISHED_DAYS;
      }

      return false;
    }

    if (status === STATUS_FUTURE && startDate) {
      var daysUntilStart = daysBetween(today, startDate);
      return daysUntilStart >= 0 && daysUntilStart <= UPCOMING_SOON_DAYS;
    }

    return false;
  });

  return selected
    .sort(function (a, b) {
      if (Boolean(a.hasParticipated) !== Boolean(b.hasParticipated)) {
        return a.hasParticipated ? -1 : 1;
      }

      return String(a.competitionStartDate || "").localeCompare(
        String(b.competitionStartDate || ""),
      );
    })
    .slice(0, HOME_MAX_ITEMS);
}

export default function PayerHomeScreen(props) {
  var userContext = useUser();
  var activeRoleContext = useActiveRole();

  var user = userContext.user;
  var activeRole = activeRoleContext.activeRole;

  var [competitions, setCompetitions] = useState([]);
  var [loading, setLoading] = useState(false);

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

  async function handleLogout() {
    if (props.onLogout) {
      await props.onLogout();
    }
  }

  function handleMenuPress(item) {
    if (item.screen === "PayerProfile") {
      Alert.alert("בהמשך", "מסך הפרופיל של המשלם יחובר בהמשך");
      return;
    }

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

  var shortcutItems = useMemo(
    function () {
      return [
        {
          key: "board",
          label: "לוח התחרויות",
          icon: "trophy-outline",
          onPress: function () {
            props.navigation.navigate("PayerCompetitionsBoard");
          },
        },
        {
          key: "profile",
          label: "פרופיל",
          icon: "person-outline",
          onPress: function () {
            Alert.alert("בהמשך", "מסך הפרופיל של המשלם יחובר בהמשך");
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

        <View style={homeScreenStyles.sectionCard}>
          <Text style={homeScreenStyles.sectionTitle}>קיצורים</Text>
          <HomeShortcutGrid items={shortcutItems} />
        </View>
      </ScrollView>
    </MobileScreenLayout>
  );
}

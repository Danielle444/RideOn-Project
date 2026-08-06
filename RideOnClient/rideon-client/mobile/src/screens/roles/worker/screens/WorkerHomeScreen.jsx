import { useEffect, useRef, useState } from "react";
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
import { useCompetition } from "../../../../context/CompetitionContext";
import { getWorkerMenuItems } from "../../../../navigation/sideMenuConfigs";
import { getWorkerBottomNavConfig } from "../../../../navigation/bottomNavConfigs";
import homeScreenStyles from "../../../../styles/homeScreenStyles";
import HomeCompetitionCard from "../../../../components/home/HomeCompetitionCard";
import { getMobileWorkerCompetitionsBoard } from "../../../../services/competitionService";
import {
  getWorkerHomeShavingsFeed,
  claimShavingsOrder,
} from "../../../../services/shavingsOrderService";
import {
  getWorkerHomeFeedCardFlags,
  sortWorkerHomeFeed,
} from "../../../../utils/workerHomeShavingsFeed";
import WorkerShavingsOrderCard from "../components/WorkerShavingsOrderCard";
import { canWorkerEnterCompetition } from "../../../../../../shared/auth/utils/competitions/competitionStatus";
import {
  selectCompetitionsShortlist,
  DEFAULT_SHORTLIST_CAP,
  HOME_TEASER_ALLOWED_STATUSES,
} from "../../../../../../shared/auth/utils/competitions/competitionHomeShortlist";
import { MOBILE_COMPETITION_STATUS_ORDER } from "../../../../../../shared/auth/utils/competitions/competitionStatusOrder";
import { withTransientRetry } from "../../../../utils/transientRequestRetry";
import { createStartupAlertGuard } from "../../../../utils/startupAlertGuard";

export default function WorkerHomeScreen(props) {
  var userContext = useUser();
  var activeRoleContext = useActiveRole();
  var competitionContext = useCompetition();

  var user = userContext.user;
  var activeRole = activeRoleContext.activeRole;

  var [competitions, setCompetitions] = useState([]);
  var [loading, setLoading] = useState(false);
  var [shavingsFeed, setShavingsFeed] = useState([]);
  var [loadingFeed, setLoadingFeed] = useState(false);
  var [claimingOrderId, setClaimingOrderId] = useState(null);
  var [refreshing, setRefreshing] = useState(false);

  // One instance for the screen's lifetime, held in a ref (not state) so a
  // synchronous check-and-set is possible from either loader's catch block.
  var startupAlertGuardRef = useRef(null);
  if (startupAlertGuardRef.current === null) {
    startupAlertGuardRef.current = createStartupAlertGuard();
  }

  useEffect(
    function () {
      if (!activeRole || !activeRole.ranchId) {
        return;
      }

      loadWorkerHome();
    },
    [activeRole],
  );

  // Runs both startup requests together. Each one retries and fails on its
  // own via withTransientRetry, but the two share startupAlertGuardRef so
  // that if both fail in the same cycle, only the first alert is shown -
  // not two generic alerts back to back. The guard is reset before AND
  // after the cycle, so it never suppresses a later, unrelated call to
  // loadShavingsFeed (e.g. from handleClaimShavingsOrder below).
  async function loadWorkerHome() {
    startupAlertGuardRef.current.reset();

    try {
      await Promise.all([loadHomeCompetitions(), loadShavingsFeed()]);
    } finally {
      startupAlertGuardRef.current.reset();
    }
  }

  async function loadHomeCompetitions() {
    try {
      setLoading(true);

      var response = await withTransientRetry(function () {
        return getMobileWorkerCompetitionsBoard(activeRole.ranchId);
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
      if (startupAlertGuardRef.current.shouldAlert()) {
        Alert.alert("שגיאה", "אירעה שגיאה בטעינת דף הבית");
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadShavingsFeed() {
    if (!activeRole || !activeRole.ranchId) {
      return;
    }

    try {
      setLoadingFeed(true);

      var response = await withTransientRetry(function () {
        return getWorkerHomeShavingsFeed(activeRole.ranchId);
      });
      var items = Array.isArray(response.data?.data) ? response.data.data : [];
      setShavingsFeed(sortWorkerHomeFeed(items, user?.personId));
    } catch (error) {
      console.error(error);
      setShavingsFeed([]);
      if (startupAlertGuardRef.current.shouldAlert()) {
        Alert.alert("שגיאה", "אירעה שגיאה בטעינת הזמנות הנסורת להיום");
      }
    } finally {
      setLoadingFeed(false);
    }
  }

  async function handleClaimShavingsOrder(order) {
    try {
      setClaimingOrderId(order.shavingsOrderId);
      await claimShavingsOrder(order.shavingsOrderId);
      await loadShavingsFeed();
    } catch (error) {
      if (error?.response?.status === 409) {
        Alert.alert("לא ניתן", "ההזמנה כבר נלקחה לטיפול על ידי עובד אחר");
        await loadShavingsFeed();
      } else {
        Alert.alert("שגיאה", "לא ניתן לקחת את ההזמנה לטיפול");
      }
    } finally {
      setClaimingOrderId(null);
    }
  }

  function handleGoToShavingsWorkflow(order) {
    props.navigation.navigate("WorkerCompetitionShavingsOrders", {
      competitionId: order.competitionId,
      competitionName: order.competitionName,
    });
  }

  async function handleRefresh() {
    try {
      setRefreshing(true);
      await loadWorkerHome();
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
          <Text style={homeScreenStyles.sectionTitle}>הזמנות נסורת להיום</Text>

          {loadingFeed ? (
            <View style={homeScreenStyles.loadingWrapper}>
              <ActivityIndicator size="large" color="#8B6352" />
            </View>
          ) : shavingsFeed.length === 0 ? (
            <View style={homeScreenStyles.loadingWrapper}>
              <Text style={homeScreenStyles.welcomeTitle}>
                כל הכבוד, סיימת להיום!
              </Text>
              <Text style={homeScreenStyles.emptyText}>
                אין הזמנות נסורת שממתינות לך כרגע.
              </Text>
            </View>
          ) : (
            shavingsFeed.map(function (order) {
              var flags = getWorkerHomeFeedCardFlags(order, user?.personId);

              return (
                <WorkerShavingsOrderCard
                  key={order.shavingsOrderId}
                  orderTitle={`הזמנה #${order.shavingsOrderId}`}
                  deliveryStatus={order.deliveryStatus}
                  arrivalTime={order.arrivalTime}
                  workerSystemUserId={order.workerSystemUserId}
                  stallNumber={order.stallNumber}
                  bagQuantity={order.bagQuantity}
                  payerFirstName={order.payerFirstName}
                  payerLastName={order.payerLastName}
                  workerFirstName={order.workerFirstName}
                  workerLastName={order.workerLastName}
                  isCancelled={order.isCancelled}
                  hasPendingCancellation={order.hasPendingCancellation}
                  isMyOrder={flags.isMyOrder}
                  isUnclaimed={flags.isUnclaimed}
                  isTakenByOther={flags.isTakenByOther}
                  claiming={claimingOrderId === order.shavingsOrderId}
                  onClaim={function () {
                    handleClaimShavingsOrder(order);
                  }}
                  onCapturePhoto={function () {
                    handleGoToShavingsWorkflow(order);
                  }}
                  capturePhotoIcon="arrow-back-outline"
                  capturePhotoLabel="מעבר למסך האספקה"
                />
              );
            })
          )}
        </View>
      </ScrollView>
    </MobileScreenLayout>
  );
}

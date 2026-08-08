import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import MobileScreenLayout from "../../../../components/mobile-nav/MobileScreenLayout";
import WorkerShavingsOrderCard from "../components/WorkerShavingsOrderCard";
import WorkerShavingsStatusTabs from "../components/WorkerShavingsStatusTabs";
import { getWorkerBottomNavConfig } from "../../../../navigation/bottomNavConfigs";
import SideMenuTemplate from "../../../../components/mobile-nav/SideMenuTemplate";
import { getWorkerMenuItems } from "../../../../navigation/sideMenuConfigs";
import { useUser } from "../../../../context/UserContext";
import { useActiveRole } from "../../../../context/ActiveRoleContext";
import {
  getWorkerShavingsOrdersByCompetition,
  claimShavingsOrder,
  saveDeliveryPhoto,
  markDelivered,
} from "../../../../services/shavingsOrderService";
import { getMobileWorkerCompetitionsBoard } from "../../../../services/competitionService";
import { getCompetitionStatusLabel } from "../../../../../../shared/auth/utils/competitions/competitionStatus";
import { getApiErrorMessage } from "../../../../../../shared/auth/utils/authApiErrors";
import { supabase } from "../../../../lib/supabaseClient";
import {
  bucketWorkerCompetitionOrders,
  groupWorkerShavingsBoardOrders,
  splitFutureDatedShavingsBoardOrders,
  isFutureDatedOrder,
} from "../../../../utils/workerHomeShavingsFeed";
import roleSharedStyles from "../../../../styles/roleSharedStyles";

// Smallest local accordion for the two inMyCare sub-sections (בטיפול שלי / בטיפול של עובד
// אחר) - manual expand/collapse only, no styling beyond what sectionTitle/chevron already
// establish elsewhere on this screen (see WorkerShavingsOrderCard's own resolved-state
// chevron for the same visual language). Deliberately NOT a shared component: this is the
// only screen with a two-group collapsible split today, so a local component is the smallest
// change that satisfies "reusable/local" without a broader refactor.
function CollapsibleCareSection(props) {
  const [expanded, setExpanded] = useState(props.defaultExpanded);

  return (
    <View style={{ gap: 12 }}>
      <Pressable
        onPress={function () {
          setExpanded(!expanded);
        }}
        style={{
          flexDirection: "row-reverse",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text style={roleSharedStyles.sectionTitle}>{props.title}</Text>
        <Ionicons
          name={expanded ? "chevron-up-outline" : "chevron-down-outline"}
          size={20}
          color="#8B6352"
        />
      </Pressable>
      {expanded && props.children}
    </View>
  );
}

// The middle tab is deliberately labeled "בטיפול" (not "בטיפול שלי") - it also contains
// orders claimed by another worker (read-only, secondary), and a "my care" label would
// misdescribe that section. The two sub-sections rendered inside it carry the ownership
// distinction instead - see renderActiveTabContent below.
//
// "future" (הוזמנו להמשך) holds every future-dated, non-completed order pulled out of the
// two tabs above by splitFutureDatedShavingsBoardOrders — דורש טיפול/בטיפול therefore only
// ever show today/overdue orders. "הושלם" is untouched by that split and keeps showing
// completed orders at any date, same as before this change.
var STATUS_TABS = [
  { key: "requiresAttention", label: "דורש טיפול" },
  { key: "inMyCare", label: "בטיפול" },
  { key: "future", label: "הוזמנו להמשך" },
  { key: "completed", label: "הושלם" },
];

var STATUS_TAB_EMPTY_TEXT = {
  requiresAttention: "אין הזמנות שממתינות לטיפול",
  inMyCare: "אין הזמנות בטיפול כרגע",
  future: "אין הזמנות עתידיות",
  completed: "אין הזמנות שהושלמו עדיין",
};

// Confirmation copy for acting on a future-dated order (קח לטיפול / סופק) — a soft warning,
// never a block: cancel leaves the order untouched, confirm runs the exact same mutation a
// same-day action would.
var FUTURE_ORDER_CONFIRM_TITLE = "הזמנה עתידית";
var FUTURE_ORDER_CONFIRM_MESSAGE =
  "ההזמנה מתוזמנת לתאריך עתידי. להמשיך בפעולה?";

const DELIVERY_BUCKET = "delivery-photos";

export default function WorkerCompetitionShavingsOrdersScreen(props) {
  const { user } = useUser();
  const { activeRole } = useActiveRole();

  const [competitions, setCompetitions] = useState([]);
  const [selectedCompetition, setSelectedCompetition] = useState(null);
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState("requiresAttention");
  // Start loading=true so the first frame shows a spinner, not "לא נמצאו תחרויות" before the
  // fetch runs. loadCompetitions settles it to false when there is no active ranch.
  const [loadingCompetitions, setLoadingCompetitions] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [uploadingOrderId, setUploadingOrderId] = useState(null);
  const [claimingOrderId, setClaimingOrderId] = useState(null);
  const [markingOrderId, setMarkingOrderId] = useState(null);
  // Orders whose photo upload just failed — reveals the no-photo fallback button (CAP-4).
  const [photoFailedOrderId, setPhotoFailedOrderId] = useState(null);

  // Keyed on ranchId (not []) so a ranch that becomes known after mount actually triggers the
  // fetch. With [] deps a late-arriving activeRole left loadingCompetitions=false and the list
  // empty forever, showing a false "לא נמצאו תחרויות" that no fetch would ever clear.
  useEffect(
    function () {
      loadCompetitions();
    },
    [activeRole?.ranchId],
  );

  // Route-param preselect runs once on mount only.
  useEffect(function () {
    const pid = props.route?.params?.competitionId;
    if (pid) {
      handleSelectCompetition({
        competitionId: pid,
        competitionName: props.route?.params?.competitionName || "",
      });
    }
  }, []);

  async function loadCompetitions() {
    if (!activeRole?.ranchId) {
      // No active ranch yet: settle the initial loading=true so the screen shows its
      // empty state rather than a stuck spinner (the effect re-runs when ranchId arrives).
      setLoadingCompetitions(false);
      return;
    }

    try {
      setLoadingCompetitions(true);
      const response = await getMobileWorkerCompetitionsBoard(activeRole.ranchId);
      setCompetitions(response.data || []);
    } catch (err) {
      Alert.alert("שגיאה", getApiErrorMessage(err, "לא ניתן לטעון את התחרויות"));
    } finally {
      setLoadingCompetitions(false);
    }
  }

  async function loadOrders(competition) {
    try {
      setLoadingOrders(true);
      const response = await getWorkerShavingsOrdersByCompetition(
        competition.competitionId,
        activeRole.ranchId
      );
      setOrders(response.data?.data || []);
    } catch (err) {
      Alert.alert("שגיאה", getApiErrorMessage(err, "לא ניתן לטעון את ההזמנות"));
    } finally {
      setLoadingOrders(false);
    }
  }

  function handleSelectCompetition(competition) {
    setSelectedCompetition(competition);
    setOrders([]);
    setActiveTab("requiresAttention");
    loadOrders(competition);
  }

  async function handleClaimOrder(order) {
    try {
      setClaimingOrderId(order.shavingsOrderId);
      await claimShavingsOrder(order.shavingsOrderId);
      await loadOrders(selectedCompetition);
      // Business rule: a successful claim always surfaces the claimed order on whichever tab
      // will actually display it after the reload above. A future-dated order is pulled out of
      // "בטיפול" into "הוזמנו להמשך" by splitFutureDatedShavingsBoardOrders regardless of who
      // claimed it, so switching to "inMyCare" for a future-dated claim would land on a tab
      // that never renders it. Only on success: the catch branches below (409 / generic
      // failure) must never switch tabs.
      setActiveTab(isFutureDatedOrder(order, new Date()) ? "future" : "inMyCare");
    } catch (err) {
      if (err?.response?.status === 409) {
        Alert.alert("לא ניתן", "ההזמנה כבר נלקחה לטיפול על ידי עובד אחר");
        await loadOrders(selectedCompetition);
      } else {
        Alert.alert("שגיאה", getApiErrorMessage(err, "לא ניתן לקחת את ההזמנה לטיפול"));
      }
    } finally {
      setClaimingOrderId(null);
    }
  }

  async function handleCapturePhoto(order) {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("הרשאה נדרשת", "נא לאשר גישה למצלמה בהגדרות הטלפון");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      allowsEditing: false,
    });

    if (result.canceled) return;

    const imageAsset = result.assets[0];

    try {
      setUploadingOrderId(order.shavingsOrderId);

      const fileName = `order_${order.shavingsOrderId}_${Date.now()}.jpg`;
      const filePath = `orders/${fileName}`;

      const formData = new FormData();
      formData.append("file", {
        uri: imageAsset.uri,
        type: "image/jpeg",
        name: fileName,
      });

      const { error: uploadError } = await supabase.storage
        .from(DELIVERY_BUCKET)
        .upload(filePath, formData, {
          contentType: "image/jpeg",
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from(DELIVERY_BUCKET)
        .getPublicUrl(filePath);

      await saveDeliveryPhoto(order.shavingsOrderId, urlData.publicUrl);

      setPhotoFailedOrderId(null);
      Alert.alert("בוצע", "ההזמנה סופקה");
      await loadOrders(selectedCompetition);
    } catch (err) {
      console.error("Photo upload error:", err);
      setPhotoFailedOrderId(order.shavingsOrderId);
      Alert.alert(
        "העלאת התמונה נכשלה",
        getApiErrorMessage(err, "ניתן לסמן את ההזמנה כסופקה גם ללא תמונה.")
      );
    } finally {
      setUploadingOrderId(null);
    }
  }

  async function handleMarkDelivered(order) {
    try {
      setMarkingOrderId(order.shavingsOrderId);
      await markDelivered(order.shavingsOrderId);
      setPhotoFailedOrderId(null);
      Alert.alert("בוצע", "ההזמנה סופקה");
      await loadOrders(selectedCompetition);
    } catch (err) {
      if (err?.response?.status === 409) {
        Alert.alert("לא ניתן", "ההזמנה כבר סופקה");
        await loadOrders(selectedCompetition);
      } else {
        Alert.alert("שגיאה", getApiErrorMessage(err, "לא ניתן לסמן את ההזמנה כסופקה"));
      }
    } finally {
      setMarkingOrderId(null);
    }
  }

  async function handleLogout() {
    if (props.onLogout) {
      await props.onLogout();
    }
  }

  const currentUserId = user?.personId;

  // Status-tab membership (דורש טיפול / בטיפול / הושלם) is a coarser axis layered on top
  // of the existing date bucketing below, not a replacement for it - each tab's order list is
  // still run back through bucketWorkerCompetitionOrders for its own today/older/future
  // sections. See groupWorkerShavingsBoardOrders' own comment for the exact membership rules.
  const orderGroups = useMemo(
    function () {
      return groupWorkerShavingsBoardOrders(orders, currentUserId);
    },
    [orders, currentUserId],
  );

  // Pulls future-dated, non-completed orders out of orderGroups into their own `future`
  // sub-object - דורש טיפול/בטיפול below read ONLY this split's non-future arrays, so a
  // future-dated order never appears in either tab; it renders exclusively under "הוזמנו
  // להמשך" instead. `completed` passes through unchanged (any date), same as before.
  const dateSplitGroups = useMemo(
    function () {
      return splitFutureDatedShavingsBoardOrders(orderGroups, new Date());
    },
    [orderGroups],
  );

  const statusTabs = STATUS_TABS.map(function (tab) {
    if (tab.key === "requiresAttention") {
      return Object.assign({}, tab, { count: dateSplitGroups.requiresAttention.length });
    }
    if (tab.key === "inMyCare") {
      return Object.assign({}, tab, {
        count: dateSplitGroups.myCare.length + dateSplitGroups.otherCare.length,
      });
    }
    if (tab.key === "future") {
      return Object.assign({}, tab, {
        count:
          dateSplitGroups.future.requiresAttention.length +
          dateSplitGroups.future.myCare.length +
          dateSplitGroups.future.otherCare.length,
      });
    }
    return Object.assign({}, tab, { count: orderGroups.completed.length });
  });

  // Wraps a mutation (קח לטיפול / סופק) with a soft confirmation when the order is
  // future-dated - cancel is a no-op (order stays untouched), confirm calls `action` exactly
  // as a same-day tap would. Non-future orders run `action` immediately, no dialog.
  function confirmIfFutureDated(order, action) {
    return function () {
      if (!isFutureDatedOrder(order, new Date())) {
        action();
        return;
      }

      Alert.alert(FUTURE_ORDER_CONFIRM_TITLE, FUTURE_ORDER_CONFIRM_MESSAGE, [
        { text: "ביטול", style: "cancel" },
        { text: "המשך", onPress: action },
      ]);
    };
  }

  function renderOrderCard(order) {
    const isMyOrder = order.workerSystemUserId === currentUserId;
    const isTakenByOther =
      order.workerSystemUserId !== null &&
      order.workerSystemUserId !== undefined &&
      !isMyOrder;
    const isUnclaimed =
      order.workerSystemUserId === null ||
      order.workerSystemUserId === undefined;

    return (
      <WorkerShavingsOrderCard
        key={order.shavingsOrderId}
        deliveryStatus={order.deliveryStatus}
        arrivalTime={order.arrivalTime}
        requestedDeliveryTime={order.requestedDeliveryTime}
        workerSystemUserId={order.workerSystemUserId}
        stallNumber={order.stallNumber}
        requestingRanchName={order.requestingRanchName}
        deliveryDestinations={order.deliveryDestinations}
        hasUnassignedStalls={order.hasUnassignedStalls}
        bagQuantity={order.bagQuantity}
        payerFirstName={order.payerFirstName}
        payerLastName={order.payerLastName}
        workerFirstName={order.workerFirstName}
        workerLastName={order.workerLastName}
        isCancelled={order.isCancelled}
        hasPendingCancellation={order.hasPendingCancellation}
        isMyOrder={isMyOrder}
        isTakenByOther={isTakenByOther}
        isUnclaimed={isUnclaimed}
        uploading={uploadingOrderId === order.shavingsOrderId}
        claiming={claimingOrderId === order.shavingsOrderId}
        marking={markingOrderId === order.shavingsOrderId}
        showNoPhotoFallback={photoFailedOrderId === order.shavingsOrderId}
        onCapturePhoto={confirmIfFutureDated(order, function () {
          handleCapturePhoto(order);
        })}
        onClaim={confirmIfFutureDated(order, function () {
          handleClaimOrder(order);
        })}
        onMarkDelivered={confirmIfFutureDated(order, function () {
          handleMarkDelivered(order);
        })}
      />
    );
  }

  function renderOrderSection(title, sectionOrders) {
    if (sectionOrders.length === 0) return null;

    return (
      <View style={{ gap: 12 }}>
        <Text style={roleSharedStyles.sectionTitle}>{title}</Text>
        {sectionOrders.map(renderOrderCard)}
      </View>
    );
  }

  // Re-applies the existing today/older/future date bucketing within one status tab's order
  // subset - the due-date grouping is preserved, just scoped to a smaller list per tab
  // instead of the whole competition.
  function renderDateSections(tabOrders) {
    const buckets = bucketWorkerCompetitionOrders(tabOrders, new Date());

    return (
      <>
        {renderOrderSection("להיום", buckets.today)}
        {renderOrderSection("לטיפול — הזמנות קודמות", buckets.older)}
        {renderOrderSection("בהמשך", buckets.future)}
      </>
    );
  }

  // Renders one future-dated subset as a single section, sorted date-ascending. Every order
  // here already passed isFutureDatedOrder, so re-running bucketWorkerCompetitionOrders on
  // just this subset always yields an empty today/older and a fully-populated, already-sorted
  // future bucket - reusing its tested sort instead of duplicating it.
  function renderFutureSection(title, futureOrders) {
    if (futureOrders.length === 0) return null;

    const buckets = bucketWorkerCompetitionOrders(futureOrders, new Date());
    return renderOrderSection(title, buckets.future);
  }

  function renderActiveTabContent() {
    if (activeTab === "requiresAttention") {
      if (dateSplitGroups.requiresAttention.length === 0) {
        return (
          <Text style={roleSharedStyles.cardSubText}>
            {STATUS_TAB_EMPTY_TEXT.requiresAttention}
          </Text>
        );
      }
      return renderDateSections(dateSplitGroups.requiresAttention);
    }

    if (activeTab === "inMyCare") {
      if (dateSplitGroups.myCare.length === 0 && dateSplitGroups.otherCare.length === 0) {
        return (
          <Text style={roleSharedStyles.cardSubText}>
            {STATUS_TAB_EMPTY_TEXT.inMyCare}
          </Text>
        );
      }

      return (
        <>
          {dateSplitGroups.myCare.length > 0 && (
            <CollapsibleCareSection title="בטיפול שלי" defaultExpanded={true}>
              {renderDateSections(dateSplitGroups.myCare)}
            </CollapsibleCareSection>
          )}
          {dateSplitGroups.otherCare.length > 0 && (
            <CollapsibleCareSection
              title="בטיפול של עובד אחר"
              defaultExpanded={false}
            >
              {renderDateSections(dateSplitGroups.otherCare)}
            </CollapsibleCareSection>
          )}
        </>
      );
    }

    if (activeTab === "future") {
      const future = dateSplitGroups.future;
      const isEmpty =
        future.requiresAttention.length === 0 &&
        future.myCare.length === 0 &&
        future.otherCare.length === 0;

      if (isEmpty) {
        return (
          <Text style={roleSharedStyles.cardSubText}>
            {STATUS_TAB_EMPTY_TEXT.future}
          </Text>
        );
      }

      return (
        <>
          {renderFutureSection("דורש טיפול", future.requiresAttention)}
          {renderFutureSection("בטיפול שלי", future.myCare)}
          {renderFutureSection("בטיפול של עובד אחר", future.otherCare)}
        </>
      );
    }

    // completed
    if (orderGroups.completed.length === 0) {
      return (
        <Text style={roleSharedStyles.cardSubText}>
          {STATUS_TAB_EMPTY_TEXT.completed}
        </Text>
      );
    }
    return renderDateSections(orderGroups.completed);
  }

  return (
    <MobileScreenLayout
      title="הזמנות נסורת"
      subtitle={selectedCompetition ? selectedCompetition.competitionName : ""}
      activeBottomTab="home"
      loading={loadingCompetitions || loadingOrders}
      bottomNavItems={getWorkerBottomNavConfig(props.navigation)}
      menuContent={function ({ closeMenu }) {
        return (
          <SideMenuTemplate
            userName={`${user?.firstName || ""} ${user?.lastName || ""}`.trim()}
            roleName={activeRole?.roleName || ""}
            ranchName={activeRole?.ranchName || ""}
            closeMenu={closeMenu}
            items={getWorkerMenuItems()}
            onItemPress={function (item) {
              props.navigation.navigate(item.screen);
            }}
            onSwitchRole={function () {
              props.navigation.replace("SelectActiveRole");
              closeMenu();
            }}
            onLogout={async function () {
              await handleLogout();
              closeMenu();
            }}
          />
        );
      }}
    >
      {!selectedCompetition ? (
        <View style={{ gap: 10 }}>
          <Text
            style={{
              textAlign: "center",
              color: "#5D4037",
              fontSize: 15,
              fontWeight: "600",
              marginBottom: 6,
            }}
          >
            בחר תחרות להצגת הזמנות
          </Text>

          {competitions.length === 0 && !loadingCompetitions && (
            <Text
              style={{
                textAlign: "center",
                color: "#8D6E63",
                fontSize: 15,
                marginTop: 20,
              }}
            >
              לא נמצאו תחרויות
            </Text>
          )}

          {competitions.map(function (comp) {
            return (
              <Pressable
                key={comp.competitionId}
                onPress={function () {
                  handleSelectCompetition(comp);
                }}
                style={{
                  backgroundColor: "#fff",
                  borderRadius: 12,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: "#D7CCC8",
                  shadowColor: "#000",
                  shadowOpacity: 0.05,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "600",
                    color: "#4E342E",
                    textAlign: "right",
                  }}
                >
                  {comp.competitionName}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: "#8D6E63",
                    marginTop: 4,
                    textAlign: "right",
                  }}
                >
                  {getCompetitionStatusLabel(comp.competitionStatus)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          <Pressable
            onPress={function () {
              setSelectedCompetition(null);
              setOrders([]);
            }}
            style={{
              flexDirection: "row-reverse",
              alignItems: "center",
              marginBottom: 4,
            }}
          >
            <Text style={{ color: "#795548", fontSize: 14, fontWeight: "600" }}>
              {"< חזור לבחירת תחרות"}
            </Text>
          </Pressable>

          {orders.length === 0 && !loadingOrders && (
            <Text
              style={{
                textAlign: "center",
                color: "#8D6E63",
                fontSize: 16,
                marginTop: 40,
              }}
            >
              לא נמצאו הזמנות נסורת לתחרות זו
            </Text>
          )}

          {orders.length > 0 && (
            <WorkerShavingsStatusTabs
              tabs={statusTabs}
              activeKey={activeTab}
              onChange={setActiveTab}
            />
          )}

          {orders.length > 0 && renderActiveTabContent()}
        </View>
      )}
    </MobileScreenLayout>
  );
}

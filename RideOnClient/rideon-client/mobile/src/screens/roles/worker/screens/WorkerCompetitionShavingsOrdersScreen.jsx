import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import MobileScreenLayout from "../../../../components/mobile-nav/MobileScreenLayout";
import AppDialog from "../../../../components/common/AppDialog";
import WorkerShavingsOrderCard from "../components/WorkerShavingsOrderCard";
import WorkerShavingsStatusTabs from "../components/WorkerShavingsStatusTabs";
import { getWorkerBottomNavConfig } from "../../../../navigation/bottomNavConfigs";
import SideMenuTemplate from "../../../../components/mobile-nav/SideMenuTemplate";
import { getWorkerMenuItems } from "../../../../navigation/sideMenuConfigs";
import { useUser } from "../../../../context/UserContext";
import { useActiveRole } from "../../../../context/ActiveRoleContext";
import { useCompetition } from "../../../../context/CompetitionContext";
import {
  getWorkerShavingsOrdersByCompetition,
  claimShavingsOrder,
  saveDeliveryPhoto,
  markDelivered,
} from "../../../../services/shavingsOrderService";
import { showToast } from "../../../../services/toastService";
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
  const competitionContext = useCompetition();

  const [selectedCompetition, setSelectedCompetition] = useState(null);
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState("requiresAttention");
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [uploadingOrderId, setUploadingOrderId] = useState(null);
  const [claimingOrderId, setClaimingOrderId] = useState(null);
  const [markingOrderId, setMarkingOrderId] = useState(null);
  // Orders whose photo upload just failed — reveals the no-photo fallback button (CAP-4).
  const [photoFailedOrderId, setPhotoFailedOrderId] = useState(null);
  // App-owned follow-up shown after the OS camera-permission prompt is denied - never the
  // OS prompt itself, just this screen's own single-button AppDialog acknowledgement.
  const [permissionDialogVisible, setPermissionDialogVisible] = useState(false);
  // Single shared future-dated confirmation dialog for all three mutating actions (claim/
  // photo/deliver) - confirmIfFutureDated below stashes whichever action is pending here
  // instead of each action owning its own dialog instance.
  const [futureConfirmState, setFutureConfirmState] = useState({
    visible: false,
    pendingAction: null,
  });

  // Route-param hydration runs once on mount only. Every live entry into this screen (board
  // "כניסה", Home "כניסה", Home's today-shavings-feed card) always supplies a competitionId -
  // a missing one means this screen was reached without going through any of those, so redirect
  // to the canonical board instead of rendering anything here (no embedded picker to fall back
  // to anymore).
  useEffect(function () {
    const pid = props.route?.params?.competitionId;
    if (pid) {
      handleSelectCompetition({
        competitionId: pid,
        competitionName: props.route?.params?.competitionName || "",
      });
    } else {
      props.navigation.navigate("WorkerCompetitionsBoard");
    }
  }, []);

  async function loadOrders(competition) {
    try {
      setLoadingOrders(true);
      const response = await getWorkerShavingsOrdersByCompetition(
        competition.competitionId,
        activeRole.ranchId
      );
      setOrders(response.data?.data || []);
    } catch (err) {
      showToast(getApiErrorMessage(err, "לא ניתן לטעון את ההזמנות"), "error");
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
        showToast("ההזמנה כבר נלקחה לטיפול על ידי עובד אחר", "warning");
        await loadOrders(selectedCompetition);
      } else {
        showToast(getApiErrorMessage(err, "לא ניתן לקחת את ההזמנה לטיפול"), "error");
      }
    } finally {
      setClaimingOrderId(null);
    }
  }

  async function handleCapturePhoto(order) {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      setPermissionDialogVisible(true);
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
      showToast("ההזמנה סופקה", "success");
      await loadOrders(selectedCompetition);
    } catch (err) {
      console.error("Photo upload error:", err);
      setPhotoFailedOrderId(order.shavingsOrderId);
      showToast(
        "העלאת התמונה נכשלה: " +
          getApiErrorMessage(err, "ניתן לסמן את ההזמנה כסופקה גם ללא תמונה."),
        "error",
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
      showToast("ההזמנה סופקה", "success");
      await loadOrders(selectedCompetition);
    } catch (err) {
      if (err?.response?.status === 409) {
        showToast("ההזמנה כבר סופקה", "warning");
        await loadOrders(selectedCompetition);
      } else {
        showToast(getApiErrorMessage(err, "לא ניתן לסמן את ההזמנה כסופקה"), "error");
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

      setFutureConfirmState({ visible: true, pendingAction: action });
    };
  }

  // AppDialog auto-hides on confirm before the pending action runs, so there is never a
  // window where it's visible mid-action and a second tap could double-fire it.
  function handleFutureConfirm() {
    var pendingAction = futureConfirmState.pendingAction;
    setFutureConfirmState({ visible: false, pendingAction: null });
    if (pendingAction) {
      pendingAction();
    }
  }

  function handleFutureCancel() {
    setFutureConfirmState({ visible: false, pendingAction: null });
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
      loading={loadingOrders}
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
      {selectedCompetition && (
        <View style={{ gap: 12 }}>
          <Pressable
            onPress={async function () {
              await competitionContext.clearCompetition();
              props.navigation.navigate("WorkerCompetitionsBoard");
              // Defensive local cleanup, deferred until after navigation is dispatched:
              // AppNavigator is a flat native-stack with no unmountOnBlur (same as
              // WorkerCompetitionsBoardScreen's exitCompetitionMenu), so this screen instance
              // stays mounted-but-blurred and can be revisited later - reset it now so a future
              // reopen doesn't show a stale selectedCompetition/orders from this session.
              // Clearing selectedCompetition BEFORE navigate() would render this screen's own
              // {selectedCompetition && (...)} branch as empty for a frame while it's still the
              // visible focused screen - doing it after navigate() avoids that flash.
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

      <AppDialog
        visible={permissionDialogVisible}
        title="הרשאה נדרשת"
        message="נא לאשר גישה למצלמה בהגדרות הטלפון"
        type="warning"
        onConfirm={function () {
          setPermissionDialogVisible(false);
        }}
      />

      <AppDialog
        visible={futureConfirmState.visible}
        title={FUTURE_ORDER_CONFIRM_TITLE}
        message={FUTURE_ORDER_CONFIRM_MESSAGE}
        type="warning"
        confirmLabel="המשך"
        cancelLabel="ביטול"
        onConfirm={handleFutureConfirm}
        onCancel={handleFutureCancel}
      />
    </MobileScreenLayout>
  );
}

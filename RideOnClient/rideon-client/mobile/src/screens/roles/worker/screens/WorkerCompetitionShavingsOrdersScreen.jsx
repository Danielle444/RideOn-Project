import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
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
import { supabase } from "../../../../lib/supabaseClient";
import {
  bucketWorkerCompetitionOrders,
  groupWorkerShavingsBoardOrders,
} from "../../../../utils/workerHomeShavingsFeed";
import roleSharedStyles from "../../../../styles/roleSharedStyles";

// The middle tab is deliberately labeled "בטיפול" (not "בטיפול שלי") - it also contains
// orders claimed by another worker (read-only, secondary), and a "my care" label would
// misdescribe that section. The two sub-sections rendered inside it carry the ownership
// distinction instead - see renderActiveTabContent below.
var STATUS_TABS = [
  { key: "requiresAttention", label: "דורש טיפול" },
  { key: "inMyCare", label: "בטיפול" },
  { key: "completed", label: "הושלם" },
];

var STATUS_TAB_EMPTY_TEXT = {
  requiresAttention: "אין הזמנות שממתינות לטיפול",
  inMyCare: "אין הזמנות בטיפול כרגע",
  completed: "אין הזמנות שהושלמו עדיין",
};

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
      Alert.alert("שגיאה", "לא ניתן לטעון את התחרויות");
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
      Alert.alert("שגיאה", "לא ניתן לטעון את ההזמנות");
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
    } catch (err) {
      if (err?.response?.status === 409) {
        Alert.alert("לא ניתן", "ההזמנה כבר נלקחה לטיפול על ידי עובד אחר");
        await loadOrders(selectedCompetition);
      } else {
        Alert.alert("שגיאה", "לא ניתן לקחת את ההזמנה לטיפול");
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
        "ניתן לסמן את ההזמנה כסופקה גם ללא תמונה."
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
        Alert.alert("שגיאה", "לא ניתן לסמן את ההזמנה כסופקה");
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

  const statusTabs = STATUS_TABS.map(function (tab) {
    if (tab.key === "requiresAttention") {
      return Object.assign({}, tab, { count: orderGroups.requiresAttention.length });
    }
    if (tab.key === "inMyCare") {
      return Object.assign({}, tab, {
        count: orderGroups.myCare.length + orderGroups.otherCare.length,
      });
    }
    return Object.assign({}, tab, { count: orderGroups.completed.length });
  });

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
        onCapturePhoto={function () {
          handleCapturePhoto(order);
        }}
        onClaim={function () {
          handleClaimOrder(order);
        }}
        onMarkDelivered={function () {
          handleMarkDelivered(order);
        }}
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

  function renderActiveTabContent() {
    if (activeTab === "requiresAttention") {
      if (orderGroups.requiresAttention.length === 0) {
        return (
          <Text style={roleSharedStyles.cardSubText}>
            {STATUS_TAB_EMPTY_TEXT.requiresAttention}
          </Text>
        );
      }
      return renderDateSections(orderGroups.requiresAttention);
    }

    if (activeTab === "inMyCare") {
      if (orderGroups.myCare.length === 0 && orderGroups.otherCare.length === 0) {
        return (
          <Text style={roleSharedStyles.cardSubText}>
            {STATUS_TAB_EMPTY_TEXT.inMyCare}
          </Text>
        );
      }

      return (
        <>
          {orderGroups.myCare.length > 0 && (
            <View style={{ gap: 12 }}>
              <Text style={roleSharedStyles.sectionTitle}>בטיפול שלי</Text>
              {renderDateSections(orderGroups.myCare)}
            </View>
          )}
          {orderGroups.otherCare.length > 0 && (
            <View style={{ gap: 12 }}>
              <Text style={roleSharedStyles.sectionTitle}>
                בטיפול של עובד אחר
              </Text>
              {renderDateSections(orderGroups.otherCare)}
            </View>
          )}
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

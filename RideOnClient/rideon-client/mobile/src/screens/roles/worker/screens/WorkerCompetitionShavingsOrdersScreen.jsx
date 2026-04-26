import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import MobileScreenLayout from "../../../../components/mobile-nav/MobileScreenLayout";
import WorkerShavingsOrderCard from "../components/WorkerShavingsOrderCard";
import { getWorkerBottomNavConfig } from "../../../../navigation/bottomNavConfigs";
import SideMenuTemplate from "../../../../components/mobile-nav/SideMenuTemplate";
import { getWorkerMenuItems } from "../../../../navigation/sideMenuConfigs";
import { useUser } from "../../../../context/UserContext";
import { useActiveRole } from "../../../../context/ActiveRoleContext";
import {
  getWorkerShavingsOrdersByCompetition,
  claimShavingsOrder,
  saveDeliveryPhoto,
} from "../../../../services/shavingsOrderService";
import { getMobileWorkerCompetitionsBoard } from "../../../../services/competitionService";
import { supabase } from "../../../../lib/supabaseClient";

const DELIVERY_BUCKET = "delivery-photos";

export default function WorkerCompetitionShavingsOrdersScreen(props) {
  const { user } = useUser();
  const { activeRole } = useActiveRole();

  const [competitions, setCompetitions] = useState([]);
  const [selectedCompetition, setSelectedCompetition] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loadingCompetitions, setLoadingCompetitions] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [uploadingOrderId, setUploadingOrderId] = useState(null);
  const [claimingOrderId, setClaimingOrderId] = useState(null);

  useEffect(function () {
    loadCompetitions();
  }, []);

  async function loadCompetitions() {
    if (!activeRole?.ranchId) return;

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
        competition.CompetitionId,
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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: false,
    });

    if (result.canceled) return;

    const imageAsset = result.assets[0];

    try {
      setUploadingOrderId(order.shavingsOrderId);

      const fileName = `order_${order.shavingsOrderId}_${Date.now()}.jpg`;
      const filePath = `orders/${fileName}`;

      const response = await fetch(imageAsset.uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from(DELIVERY_BUCKET)
        .upload(filePath, blob, { contentType: "image/jpeg", upsert: false });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data: urlData } = supabase.storage
        .from(DELIVERY_BUCKET)
        .getPublicUrl(filePath);

      await saveDeliveryPhoto(order.shavingsOrderId, urlData.publicUrl);

      Alert.alert("בוצע", "התמונה נשמרה וההזמנה ממתינה לאישור מזכירה");
      await loadOrders(selectedCompetition);
    } catch (err) {
      Alert.alert("שגיאה", "לא ניתן להעלות את התמונה. נסה שוב.");
    } finally {
      setUploadingOrderId(null);
    }
  }

  async function handleLogout() {
    if (props.onLogout) {
      await props.onLogout();
    }
  }

  const currentUserId = user?.personId;

  return (
    <MobileScreenLayout
      title="הזמנות נסורת"
      subtitle={selectedCompetition ? selectedCompetition.CompetitionName : ""}
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
                key={comp.CompetitionId}
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
                  {comp.CompetitionName}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: "#8D6E63",
                    marginTop: 4,
                    textAlign: "right",
                  }}
                >
                  {comp.CompetitionStatus}
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

          {orders.map(function (order) {
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
                orderTitle={`הזמנה #${order.shavingsOrderId}`}
                deliveryStatus={order.deliveryStatus}
                stallNumber={order.stallNumber}
                bagQuantity={order.bagQuantity}
                payerFirstName={order.payerFirstName}
                payerLastName={order.payerLastName}
                workerFirstName={order.workerFirstName}
                workerLastName={order.workerLastName}
                isMyOrder={isMyOrder}
                isTakenByOther={isTakenByOther}
                isUnclaimed={isUnclaimed}
                uploading={uploadingOrderId === order.shavingsOrderId}
                claiming={claimingOrderId === order.shavingsOrderId}
                onCapturePhoto={function () {
                  handleCapturePhoto(order);
                }}
                onClaim={function () {
                  handleClaimOrder(order);
                }}
              />
            );
          })}
        </View>
      )}
    </MobileScreenLayout>
  );
}

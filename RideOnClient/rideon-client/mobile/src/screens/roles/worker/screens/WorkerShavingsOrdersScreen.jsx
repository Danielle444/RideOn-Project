import { useEffect, useState } from "react";
import { Alert, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import MobileScreenLayout from "../../../../components/mobile-nav/MobileScreenLayout";
import roleSharedStyles from "../../../../styles/roleSharedStyles";
import workerStyles from "../../../../styles/workerStyles";
import WorkerShavingsOrderCard from "../components/WorkerShavingsOrderCard";
import { getWorkerBottomNavConfig } from "../../../../navigation/bottomNavConfigs";
import SideMenuTemplate from "../../../../components/mobile-nav/SideMenuTemplate";
import { getWorkerMenuItems } from "../../../../navigation/sideMenuConfigs";
import { useUser } from "../../../../context/UserContext";
import { useActiveRole } from "../../../../context/ActiveRoleContext";
import { getWorkerShavingsOrders, saveDeliveryPhoto } from "../../../../services/shavingsOrderService";
import { supabase } from "../../../../lib/supabaseClient";

const DELIVERY_BUCKET = "delivery-photos";

export default function WorkerShavingsOrdersScreen(props) {
  const { user } = useUser();
  const { activeRole } = useActiveRole();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadingOrderId, setUploadingOrderId] = useState(null);

  useEffect(function () {
    loadOrders();
  }, []);

  async function loadOrders() {
    try {
      setLoading(true);
      const response = await getWorkerShavingsOrders();
      setOrders(response.data?.data || []);
    } catch (err) {
      Alert.alert("שגיאה", "לא ניתן לטעון את ההזמנות");
    } finally {
      setLoading(false);
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

      const publicUrl = urlData.publicUrl;

      await saveDeliveryPhoto(order.shavingsOrderId, publicUrl);

      Alert.alert("בוצע", "התמונה נשמרה וההזמנה ממתינה לאישור מזכירה");
      await loadOrders();
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

  return (
    <MobileScreenLayout
      title="הזמנות נסורת"
      subtitle=""
      activeBottomTab="home"
      loading={loading}
      bottomNavItems={getWorkerBottomNavConfig(props.navigation)}
      menuContent={function ({ closeMenu }) {
        return (
          <SideMenuTemplate
            userName={`${user?.firstName || ""} ${user?.lastName || ""}`.trim()}
            roleName={activeRole?.roleName || ""}
            ranchName={activeRole?.ranchName || ""}
            closeMenu={closeMenu}
            items={getWorkerMenuItems(props.navigation)}
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
      <View style={{ gap: 12 }}>
        {orders.map(function (order) {
          return (
            <WorkerShavingsOrderCard
              key={order.shavingsOrderId}
              orderTitle={`הזמנה #${order.shavingsOrderId}`}
              deliveryStatus={order.deliveryStatus}
              ranchName={order.ranchName}
              competitionName={order.competitionName}
              stallName={order.stallName}
              bagQuantity={order.bagQuantity}
              payerFirstName={order.payerFirstName}
              payerLastName={order.payerLastName}
              uploading={uploadingOrderId === order.shavingsOrderId}
              onCapturePhoto={function () {
                handleCapturePhoto(order);
              }}
            />
          );
        })}
      </View>
    </MobileScreenLayout>
  );
}

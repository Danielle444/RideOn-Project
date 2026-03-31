import { useEffect, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import MobileScreenLayout from "../../../../components/mobile-nav/MobileScreenLayout";
import roleSharedStyles from "../../../../styles/roleSharedStyles";
import workerStyles from "../../../../styles/workerStyles";
import { getUser, getActiveRole } from "../../../../services/storageService";
import WorkerShavingsOrderCard from "../components/WorkerShavingsOrderCard";
import { getAdminBottomNavConfig } from "../../../../navigation/bottomNavConfigs";
import SideMenuTemplate from "../../../../components/mobile-nav/SideMenuTemplate";
import { getWorkerMenuItems } from "../../../../navigation/sideMenuConfigs";

export default function WorkerShavingsOrdersScreen(props) {
  const [user, setUser] = useState(null);
  const [activeRole, setActiveRole] = useState(null);
  const [activeFilter, setActiveFilter] = useState("needs-treatment");

  useEffect(function () {
    loadData();
  }, []);

  async function loadData() {
    const storedUser = await getUser();
    const storedActiveRole = await getActiveRole();

    setUser(storedUser);
    setActiveRole(storedActiveRole);
  }

  const orders = [
    {
      id: 1243,
      orderTitle: "הזמנה #1243",
      orderStatus: "נדרש טיפול",
      ranchName: "חוות השרון",
      stallNumber: "תא 12",
      bagsAmount: "5 שקים",
    },
    {
      id: 1244,
      orderTitle: "הזמנה #1244",
      orderStatus: "נדרש טיפול",
      ranchName: "חוות השרון",
      stallNumber: "תא 8",
      bagsAmount: "3 שקים",
    },
    {
      id: 1245,
      orderTitle: "הזמנה #1245",
      orderStatus: "נדרש טיפול",
      ranchName: "חוות השרון",
      stallNumber: "תא 3",
      bagsAmount: "4 שקים",
    },
  ];

  function goToProfile() {
    Alert.alert("בהמשך", "מסך פרופיל עובד יתחבר בהמשך");
  }

  function goToShavingsOrders() {
    props.navigation.navigate("WorkerShavingsOrders");
  }

  async function handleLogout() {
    if (props.onLogout) {
      await props.onLogout();
    }
  }

  function getFilterButtonStyle(filterKey) {
    return activeFilter === filterKey
      ? roleSharedStyles.primaryButton
      : [roleSharedStyles.primaryButton, workerStyles.filterButtonInactive];
  }

  function getFilterTextStyle(filterKey) {
    return activeFilter === filterKey
      ? roleSharedStyles.primaryButtonText
      : [
          roleSharedStyles.primaryButtonText,
          workerStyles.filterButtonTextInactive,
        ];
  }

  return (
    <MobileScreenLayout
      title="הזמנות נסורת"
      subtitle=""
      activeBottomTab="home"
      bottomNavItems={getAdminBottomNavConfig(props.navigation)}
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
      <View style={workerStyles.filterRow}>
        <Pressable
          style={getFilterButtonStyle("needs-treatment")}
          onPress={function () {
            setActiveFilter("needs-treatment");
          }}
        >
          <Text style={getFilterTextStyle("needs-treatment")}>נדרש טיפול</Text>
        </Pressable>

        <Pressable
          style={getFilterButtonStyle("future")}
          onPress={function () {
            setActiveFilter("future");
          }}
        >
          <Text style={getFilterTextStyle("future")}>עתידי</Text>
        </Pressable>

        <Pressable
          style={getFilterButtonStyle("supplied")}
          onPress={function () {
            setActiveFilter("supplied");
          }}
        >
          <Text style={getFilterTextStyle("supplied")}>סופל</Text>
        </Pressable>
      </View>

      {orders.map(function (order) {
        return (
          <WorkerShavingsOrderCard
            key={order.id}
            orderTitle={order.orderTitle}
            orderStatus={order.orderStatus}
            ranchName={order.ranchName}
            stallNumber={order.stallNumber}
            bagsAmount={order.bagsAmount}
            onInTreatmentPress={function () {
              Alert.alert("בהמשך", "עדכון סטטוס יתחבר בהמשך");
            }}
            onDonePress={function () {
              Alert.alert("בהמשך", "סימון סופק יתחבר בהמשך");
            }}
          />
        );
      })}
    </MobileScreenLayout>
  );
}

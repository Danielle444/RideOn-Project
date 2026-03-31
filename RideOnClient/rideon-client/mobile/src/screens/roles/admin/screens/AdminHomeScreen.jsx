import { Alert, Pressable, Text, View } from "react-native";
import { useEffect, useState } from "react";
import MobileScreenLayout from "../../../../components/mobile-nav/MobileScreenLayout";
import AdminHomeCard from "../components/AdminHomeCard";
import { getUser, getActiveRole } from "../../../../services/storageService";
import roleSharedStyles from "../../../../styles/roleSharedStyles";
import { getAdminBottomNavConfig } from "../../../../navigation/bottomNavConfigs";
import SideMenuTemplate from "../../../../components/mobile-nav/SideMenuTemplate";
import { getAdminMenuItems } from "../../../../navigation/sideMenuConfigs";

export default function AdminHomeScreen(props) {
  const [user, setUser] = useState(null);
  const [activeRole, setActiveRole] = useState(null);

  useEffect(function () {
    loadData();
  }, []);

  async function loadData() {
    const storedUser = await getUser();
    const storedActiveRole = await getActiveRole();

    setUser(storedUser);
    setActiveRole(storedActiveRole);
  }

  const competitions = [
    {
      id: 1,
      title: "ריינינג 1+2 2026",
      dateText: "17-15 במרץ, 2026",
      ranchName: "חוות דאבל קיי",
      status: "כעת",
      registrationDisabled: true,
      enterDisabled: false,
    },
    {
      id: 2,
      title: "גביע הקיץ - קפיצות",
      dateText: "24-22 במרץ, 2026",
      ranchName: "מרכז הרכיבה הארצי",
      status: "פתוחה",
      registrationDisabled: false,
      enterDisabled: true,
    },
    {
      id: 3,
      title: "תחרות מסלולים ים המלח",
      dateText: "04-02 באפריל, 2026",
      ranchName: "חוות סוסים המדבר",
      status: "סגורה",
      registrationDisabled: false,
      enterDisabled: true,
    },
  ];

  function goToProfile() {
    props.navigation.navigate("AdminProfile");
  }

  function goToHome() {
    props.navigation.navigate("AdminHome");
  }

  function goToCompetitionsBoard() {
    props.navigation.navigate("AdminCompetitionsBoard");
  }

  async function handleLogout() {
    if (props.onLogout) {
      await props.onLogout();
    }
  }

  return (
    <MobileScreenLayout
      title="דף הבית"
      subtitle=""
      activeBottomTab="home"
      bottomNavItems={getAdminBottomNavConfig(props.navigation)}
      menuContent={function ({ closeMenu }) {
        return (
          <SideMenuTemplate
            userName={`${user?.firstName || ""} ${user?.lastName || ""}`}
            roleName={activeRole?.roleName}
            ranchName={activeRole?.ranchName}
            closeMenu={closeMenu}
            items={getAdminMenuItems(props.navigation)}
            onItemPress={function (item) {
              props.navigation.navigate(item.screen);
            }}
            onSwitchRole={function () {
              props.navigation.navigate("SelectActiveRole");
            }}
            onLogout={handleLogout}
          />
        );
      }}
    >
      <View style={roleSharedStyles.welcomeCard}>
        <Text style={roleSharedStyles.welcomeTitle}>
          שלום {user?.firstName || ""},
        </Text>
        <Text style={roleSharedStyles.welcomeText}>
          ברוכה הבאה למערכת RideOn
        </Text>
      </View>

      <Pressable
        style={roleSharedStyles.shortcutButton}
        onPress={goToCompetitionsBoard}
      >
        <Text style={roleSharedStyles.shortcutButtonText}>לוח התחרויות</Text>
      </Pressable>

      <Text style={roleSharedStyles.sectionTitle}>תחרויות קרובות</Text>

      {competitions.map(function (item) {
        return (
          <AdminHomeCard
            key={item.id}
            title={item.title}
            dateText={item.dateText}
            ranchName={item.ranchName}
            status={item.status}
            registrationDisabled={item.registrationDisabled}
            enterDisabled={item.enterDisabled}
            onDetailsPress={function () {
              Alert.alert("בהמשך", "מסך פרטי תחרות יתחבר כאן בהמשך");
            }}
            onRegistrationPress={function () {
              Alert.alert("בהמשך", "מסך הרשמה יתחבר כאן בהמשך");
            }}
            onEnterPress={function () {
              Alert.alert("בהמשך", "כניסה לתחרות תחובר בהמשך");
            }}
          />
        );
      })}
    </MobileScreenLayout>
  );
}

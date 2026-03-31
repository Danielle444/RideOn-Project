import { View, Text } from "react-native";
import { useEffect, useState } from "react";
import MobileScreenLayout from "../../../../components/mobile-nav/MobileScreenLayout";
import { getUser, getActiveRole } from "../../../../services/storageService";
import roleSharedStyles from "../../../../styles/roleSharedStyles";
import { getAdminBottomNavConfig } from "../../../../navigation/bottomNavConfigs";
import SideMenuTemplate from "../../../../components/mobile-nav/SideMenuTemplate";
import { getAdminMenuItems } from "../../../../navigation/sideMenuConfigs";

export default function AdminProfileScreen(props) {
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

  function goToProfile() {
    props.navigation.navigate("AdminProfile");
  }

  function goToHome() {
    props.navigation.navigate("AdminHome");
  }

  async function handleLogout() {
    if (props.onLogout) {
      await props.onLogout();
    }
  }

  return (
    <MobileScreenLayout
      title="פרופיל"
      subtitle=""
      activeBottomTab="profile"
      bottomNavItems={getAdminBottomNavConfig(props.navigation)}
      menuContent={function ({ closeMenu }) {
        return (
          <SideMenuTemplate
            userName={`${user?.firstName || ""} ${user?.lastName || ""}`.trim()}
            roleName={activeRole?.roleName || ""}
            ranchName={activeRole?.ranchName || ""}
            closeMenu={closeMenu}
            items={getAdminMenuItems(props.navigation)}
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
      <View style={roleSharedStyles.profileCard}>
        <Text style={roleSharedStyles.profileName}>
          {user?.firstName || ""} {user?.lastName || ""}
        </Text>

        <Text style={roleSharedStyles.profileLine}>
          שם משתמש: {user?.username || ""}
        </Text>
        <Text style={roleSharedStyles.profileLine}>
          תפקיד: {activeRole?.roleName || ""}
        </Text>
        <Text style={roleSharedStyles.profileLine}>
          חווה: {activeRole?.ranchName || ""}
        </Text>
      </View>
    </MobileScreenLayout>
  );
}

import { View, Text } from "react-native";
import MobileScreenLayout from "../../../../components/mobile-nav/MobileScreenLayout";
import roleSharedStyles from "../../../../styles/roleSharedStyles";
import { getAdminBottomNavConfig } from "../../../../navigation/bottomNavConfigs";
import SideMenuTemplate from "../../../../components/mobile-nav/SideMenuTemplate";
import { getAdminMenuItems } from "../../../../navigation/sideMenuConfigs";
import { useUser } from "../../../../context/UserContext";
import { useActiveRole } from "../../../../context/ActiveRoleContext";

export default function AdminProfileScreen(props) {
  const { user } = useUser();
  const { activeRole } = useActiveRole();

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
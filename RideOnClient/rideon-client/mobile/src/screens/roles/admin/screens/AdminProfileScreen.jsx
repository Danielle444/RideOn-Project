import ProfileScreenTemplate from "../../../../components/profile/ProfileScreenTemplate";
import useProfileScreen from "../../../../hooks/useProfileScreen";
import { getAdminBottomNavConfig } from "../../../../navigation/bottomNavConfigs";
import { getAdminMenuItems } from "../../../../navigation/sideMenuConfigs";

export default function AdminProfileScreen(props) {
  var page = useProfileScreen();

  return (
    <ProfileScreenTemplate
      page={page}
      navigation={props.navigation}
      onLogout={props.onLogout}
      bottomNavItems={getAdminBottomNavConfig(props.navigation)}
      menuItems={getAdminMenuItems()}
    />
  );
}
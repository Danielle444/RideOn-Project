import ProfileScreenTemplate from "../../../../components/profile/ProfileScreenTemplate";
import useProfileScreen from "../../../../hooks/useProfileScreen";
import { getPayerBottomNavConfig } from "../../../../navigation/bottomNavConfigs";
import { getPayerMenuItems } from "../../../../navigation/sideMenuConfigs";

export default function PayerProfileScreen(props) {
  var page = useProfileScreen();

  return (
    <ProfileScreenTemplate
      page={page}
      navigation={props.navigation}
      onLogout={props.onLogout}
      bottomNavItems={getPayerBottomNavConfig(props.navigation)}
      menuItems={getPayerMenuItems()}
    />
  );
}
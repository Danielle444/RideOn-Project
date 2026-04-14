import ProfileScreenTemplate from "../../../../components/profile/ProfileScreenTemplate";
import useProfileScreen from "../../../../hooks/useProfileScreen";
import { getWorkerBottomNavConfig } from "../../../../navigation/bottomNavConfigs";
import { getWorkerMenuItems } from "../../../../navigation/sideMenuConfigs";

export default function WorkerProfileScreen(props) {
  var page = useProfileScreen();

  return (
    <ProfileScreenTemplate
      page={page}
      navigation={props.navigation}
      onLogout={props.onLogout}
      bottomNavItems={getWorkerBottomNavConfig(props.navigation)}
      menuItems={getWorkerMenuItems()}
    />
  );
}
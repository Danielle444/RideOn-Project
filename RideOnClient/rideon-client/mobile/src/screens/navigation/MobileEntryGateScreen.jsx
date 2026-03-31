import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import styles from "../../styles/authStyles";
import {
  getUser,
  getActiveRole,
  saveActiveRole,
} from "../../services/storageService";
import {
  isRoleSupportedOnMobile,
  getMobileSupportedRoleOptions,
  getMobileHomeScreenName,
} from "../../../../shared/auth/utils/platformRoles";

export default function MobileEntryGateScreen(props) {
  useEffect(function () {
    handleNavigation();
  }, []);

  async function handleNavigation() {
    const user = await getUser();
    const activeRole = await getActiveRole();

    if (!user) return;

    if (user.mustChangePassword) {
      props.navigation.replace("ChangePassword");
      return;
    }

    if (activeRole && isRoleSupportedOnMobile(activeRole.roleName)) {
      const screenName = getMobileHomeScreenName(activeRole.roleName);

      if (screenName) {
        props.navigation.replace(screenName);
        return;
      }
    }

    const roles = Array.isArray(user.approvedRolesAndRanches)
      ? user.approvedRolesAndRanches
      : [];

    const supported = getMobileSupportedRoleOptions(roles);

    if (roles.length === 1 && supported.length === 1) {
      await saveActiveRole(supported[0]);

      const screenName = getMobileHomeScreenName(supported[0].roleName);

      if (screenName) {
        props.navigation.replace(screenName);
        return;
      }
    }

    props.navigation.replace("SelectActiveRole");
  }

  return (
    <View style={styles.loadingScreen}>
      <ActivityIndicator size="large" color="#8B6352" />
    </View>
  );
}
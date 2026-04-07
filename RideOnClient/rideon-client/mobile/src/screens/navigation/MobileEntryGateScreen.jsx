import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import styles from "../../styles/authStyles";

import {
  isRoleSupportedOnMobile,
  getMobileHomeScreenName,
} from "../../../../shared/auth/utils/platformRoles";
import { resolveSingleMobileRoleSelection } from "../../../../shared/auth/utils/autoRoleSelection";

import { useUser } from "../../context/UserContext";
import { useActiveRole } from "../../context/ActiveRoleContext";
import { useAuth } from "../../context/AuthContext";

export default function MobileEntryGateScreen(props) {
  const isFocused = useIsFocused();

  const { user, isUserHydrated } = useUser();
  const { activeRole, setActiveRoleAndPersist } = useActiveRole();
  const { logout } = useAuth();

  const [didNavigate, setDidNavigate] = useState(false);

  useEffect(
    function () {
      if (!isFocused || !isUserHydrated || didNavigate) {
        return;
      }

      handleNavigation();
    },
    [isFocused, isUserHydrated, user, activeRole, didNavigate],
  );

  async function handleNavigation() {
    if (!user) {
      setDidNavigate(true);
      await logout();
      return;
    }

    if (user.mustChangePassword) {
      setDidNavigate(true);
      props.navigation.reset({
        index: 0,
        routes: [{ name: "ChangePassword" }],
      });
      return;
    }

    if (activeRole && isRoleSupportedOnMobile(activeRole.roleName)) {
      const screenName = getMobileHomeScreenName(activeRole.roleName);

      if (screenName) {
        setDidNavigate(true);
        props.navigation.reset({
          index: 0,
          routes: [{ name: screenName }],
        });
        return;
      }
    }

    const roles = Array.isArray(user.approvedRolesAndRanches)
      ? user.approvedRolesAndRanches
      : [];

    const autoSelection = resolveSingleMobileRoleSelection(roles);

    if (autoSelection.shouldAutoSelect && autoSelection.result?.ok) {
      await setActiveRoleAndPersist(autoSelection.result.activeRole);

      setDidNavigate(true);
      props.navigation.reset({
        index: 0,
        routes: [{ name: autoSelection.result.destination }],
      });
      return;
    }

    setDidNavigate(true);
    setTimeout(function () {
      props.navigation.replace("SelectActiveRole");
    }, 0);
  }

  return (
    <View style={styles.loadingScreen}>
      <ActivityIndicator size="large" color="#8B6352" />
    </View>
  );
}

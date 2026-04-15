import { useEffect, useRef } from "react";
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
  const hasNavigatedRef = useRef(false);

  const { user, isUserHydrated } = useUser();
  const { activeRole, setActiveRoleAndPersist } = useActiveRole();
  const { isAuthenticated } = useAuth();

  useEffect(
    function () {
      if (!isFocused) {
        hasNavigatedRef.current = false;
        return;
      }

      if (!isUserHydrated) {
        return;
      }

      if (hasNavigatedRef.current) {
        return;
      }

      // אם המשתמש לא מחובר - לא עושים ניווט מכאן.
      // App.js כבר יציג את AuthNavigator לבד.
      if (!isAuthenticated || !user) {
        return;
      }

      handleNavigation();
    },
    [isFocused, isUserHydrated, isAuthenticated, user, activeRole]
  );

  async function handleNavigation() {
    if (!user) {
      return;
    }

    if (user.mustChangePassword) {
      hasNavigatedRef.current = true;

      props.navigation.reset({
        index: 0,
        routes: [{ name: "ChangePassword" }],
      });
      return;
    }

    if (activeRole && isRoleSupportedOnMobile(activeRole.roleName)) {
      const screenName = getMobileHomeScreenName(activeRole.roleName);

      if (screenName) {
        hasNavigatedRef.current = true;

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

      hasNavigatedRef.current = true;

      props.navigation.reset({
        index: 0,
        routes: [{ name: autoSelection.result.destination }],
      });
      return;
    }

    hasNavigatedRef.current = true;

    props.navigation.reset({
      index: 0,
      routes: [{ name: "SelectActiveRole" }],
    });
  }

  return (
    <View style={styles.loadingScreen}>
      <ActivityIndicator size="large" color="#8B6352" />
    </View>
  );
}
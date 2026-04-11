import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { useUser } from "../context/UserContext";
import { useActiveRole } from "../context/ActiveRoleContext";

export default function GuardedScreen(props) {
  const { isLoading, isAuthenticated } = useAuth();
  const { user, isUserHydrated } = useUser();
  const { activeRole } = useActiveRole();

  useEffect(
    function () {
      if (isLoading || !isUserHydrated) {
        return;
      }

      if (!isAuthenticated || !user) {
        props.navigation.reset({
          index: 0,
          routes: [{ name: "Login" }],
        });
        return;
      }

      if (user.mustChangePassword) {
        props.navigation.reset({
          index: 0,
          routes: [{ name: "ChangePassword" }],
        });
        return;
      }

      if (!activeRole) {
        props.navigation.reset({
          index: 0,
          routes: [{ name: "SelectActiveRole" }],
        });
        return;
      }

      if (
        Array.isArray(props.allowedRoles) &&
        props.allowedRoles.length > 0 &&
        !props.allowedRoles.includes(activeRole.roleName)
      ) {
        props.navigation.reset({
          index: 0,
          routes: [{ name: "SelectActiveRole" }],
        });
      }
    },
    [
      isLoading,
      isAuthenticated,
      user,
      isUserHydrated,
      activeRole,
      props.navigation,
      props.allowedRoles,
    ],
  );

  if (isLoading || !isUserHydrated) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F5EDE8",
        }}
      >
        <ActivityIndicator size="large" color="#8B6352" />
      </View>
    );
  }

  if (!isAuthenticated || !user || !activeRole) {
    return null;
  }

  if (
    Array.isArray(props.allowedRoles) &&
    props.allowedRoles.length > 0 &&
    !props.allowedRoles.includes(activeRole.roleName)
  ) {
    return null;
  }

  return props.children;
}
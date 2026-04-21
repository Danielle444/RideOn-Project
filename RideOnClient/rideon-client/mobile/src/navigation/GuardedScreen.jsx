import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { useUser } from "../context/UserContext";
import { useActiveRole } from "../context/ActiveRoleContext";

export default function GuardedScreen(props) {
  const { isLoading, isAuthenticated } = useAuth();
  const { user, isUserHydrated } = useUser();
  const { activeRole } = useActiveRole();

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

  if (!isAuthenticated || !user) {
    return null;
  }

  if (user.mustChangePassword) {
    return null;
  }

  if (!activeRole) {
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
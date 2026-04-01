import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import AuthNavigator from "./src/navigation/AuthNavigator";
import AppNavigator from "./src/navigation/AppNavigator";

import { UserProvider } from "./src/context/UserContext";
import { ActiveRoleProvider } from "./src/context/ActiveRoleContext";
import { AuthProvider, useAuth } from "./src/context/AuthContext";

function AppShell() {
  const { isLoading, isAuthenticated, login, logout } = useAuth();

  if (isLoading) {
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

  return (
    <NavigationContainer>
      {isAuthenticated ? (
        <AppNavigator onLogout={logout} />
      ) : (
        <AuthNavigator onLoginSuccess={login} />
      )}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <UserProvider>
        <ActiveRoleProvider>
          <AuthProvider>
            <AppShell />
          </AuthProvider>
        </ActiveRoleProvider>
      </UserProvider>
    </SafeAreaProvider>
  );
}
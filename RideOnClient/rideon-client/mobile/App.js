import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import AuthNavigator from "./src/navigation/AuthNavigator";
import AppNavigator from "./src/navigation/AppNavigator";

import { UserProvider } from "./src/context/UserContext";
import { ActiveRoleProvider } from "./src/context/ActiveRoleContext";
import { CompetitionProvider } from "./src/context/CompetitionContext";
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
    <NavigationContainer key={isAuthenticated ? "app" : "auth"}>
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
          <CompetitionProvider>
            <AuthProvider>
              <AppShell />
            </AuthProvider>
          </CompetitionProvider>
        </ActiveRoleProvider>
      </UserProvider>
    </SafeAreaProvider>
  );
}
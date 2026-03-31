import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AuthNavigator from "./src/navigation/AuthNavigator";
import AppNavigator from "./src/navigation/AppNavigator";
import {
  getToken,
  getUser,
  clearAuthStorage,
} from "./src/services/storageService";

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(function () {
    loadAuthState();
  }, []);

  async function loadAuthState() {
    try {
      const token = await getToken();
      const user = await getUser();

      setIsAuthenticated(!!token && !!user);
    } catch (error) {
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLoginSuccess() {
    setIsAuthenticated(true);
  }

  async function handleLogout() {
    await clearAuthStorage();
    setIsAuthenticated(false);
  }

  if (isLoading) {
    return (
      <SafeAreaProvider>
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
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        {isAuthenticated ? (
          <AppNavigator onLogout={handleLogout} />
        ) : (
          <AuthNavigator onLoginSuccess={handleLoginSuccess} />
        )}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
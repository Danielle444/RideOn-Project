import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import { login } from "../../services/authService";
import {
  saveToken,
  saveUser,
  saveActiveRole,
  clearAuthStorage,
} from "../../services/storageService";
import { validateLoginForm } from "../../../../shared/auth/validations/loginValidation";
import { getApiErrorMessage } from "../../../../shared/auth/utils/authApiErrors";
import { isRoleSupportedOnMobile } from "../../../../shared/auth/utils/platformRoles";

import styles from "../../styles/authStyles";

export default function LoginScreen(props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const navigation = useNavigation();

  async function handleLogin() {
    const validationError = validateLoginForm(username, password);

    if (validationError) {
      Alert.alert("שגיאה", validationError);
      return;
    }

    setIsLoading(true);

    try {
      await clearAuthStorage();

      const response = await login(username.trim(), password);
      const data = response.data;

      const userData = {
        personId: data.personId,
        username: data.username,
        firstName: data.firstName,
        lastName: data.lastName,
        isActive: data.isActive,
        mustChangePassword: data.mustChangePassword,
        approvedRolesAndRanches: data.approvedRolesAndRanches,
      };

      await saveToken(data.token);
      await saveUser(userData);

      if (
        !data.approvedRolesAndRanches ||
        data.approvedRolesAndRanches.length === 0
      ) {
        await clearAuthStorage();
        Alert.alert("שגיאה", "אין למשתמש תפקיד מאושר במערכת");
        return;
      }

      if (
        data.approvedRolesAndRanches.length === 1 &&
        isRoleSupportedOnMobile(data.approvedRolesAndRanches[0].roleName)
      ) {
        await saveActiveRole(data.approvedRolesAndRanches[0]);
      }

      if (props.onLoginSuccess) {
        await props.onLoginSuccess();
      }
    } catch (err) {
      const message = getApiErrorMessage(err, "שגיאה בהתחברות");
      Alert.alert("שגיאה", String(message));
    } finally {
      setIsLoading(false);
    }
  }

  function handleForgotPassword() {
    Alert.alert("שכחתי סיסמה", "נחבר אחר כך");
  }

  function handleRegister() {
    navigation.navigate("Register");
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardWrapper}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.centeredScreen}>
          <View style={styles.card}>
            <Image
              source={require("../../../../shared/assets/logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />

            <Text style={styles.loginTitle}>כניסה לחשבון</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>שם משתמש</Text>
              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder="הזן שם משתמש"
                placeholderTextColor="#B7AAA3"
                style={styles.input}
                textAlign="right"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>סיסמה</Text>

              <View style={styles.passwordWrapper}>
                <Pressable
                  onPress={function () {
                    setShowPassword(function (prev) {
                      return !prev;
                    });
                  }}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#8B6352"
                  />
                </Pressable>

                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="הזן סיסמה"
                  placeholderTextColor="#B7AAA3"
                  style={styles.passwordInput}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.optionsRow}>
              <Pressable onPress={handleForgotPassword}>
                <Text style={styles.forgotText}>שכחת סיסמה?</Text>
              </Pressable>

              <Pressable
                style={styles.rememberWrapper}
                onPress={function () {
                  setRememberMe(!rememberMe);
                }}
              >
                <Text style={styles.optionText}>זכור אותי</Text>

                <View
                  style={[
                    styles.checkbox,
                    rememberMe ? styles.checkboxChecked : null,
                  ]}
                >
                  {rememberMe ? <Text style={styles.checkboxMark}>✓</Text> : null}
                </View>
              </Pressable>
            </View>

            <Pressable
              style={[
                styles.primaryButton,
                isLoading ? styles.primaryButtonDisabled : null,
              ]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <Text style={styles.primaryButtonText}>
                {isLoading ? "מתחבר..." : "התחבר"}
              </Text>
            </Pressable>

            <Pressable onPress={handleRegister}>
              <Text style={styles.bottomLink}>להרשמה</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
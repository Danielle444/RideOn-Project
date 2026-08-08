import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import { validateLoginForm } from "../../../../shared/auth/validations/loginValidation";
import { useAuth } from "../../context/AuthContext";
import { getRememberMe } from "../../services/storageService";
import { showToast } from "../../services/toastService";

import styles from "../../styles/authStyles";

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // ברגע שהמשתמש נוגע בתיבה, הבחירה שלו גוברת על ההעדפה השמורה — גם אם
  // הקריאה מהאחסון מסתיימת אחריה.
  const hasToggledRememberMeRef = useRef(false);

  const navigation = useNavigation();
  const { loginAndInitialize } = useAuth();

  useEffect(function () {
    let isMounted = true;

    async function loadStoredRememberMe() {
      let storedRememberMe = false;

      try {
        storedRememberMe = await getRememberMe();
      } catch (error) {
        // כשל בקריאת האחסון נופל לברירת המחדל הסגורה: לא זוכרים.
        storedRememberMe = false;
      }

      if (!isMounted || hasToggledRememberMeRef.current) {
        return;
      }

      setRememberMe(storedRememberMe === true);
    }

    loadStoredRememberMe();

    return function () {
      isMounted = false;
    };
  }, []);

  async function handleLogin() {
    const validationError = validateLoginForm(username, password);

    if (validationError) {
      showToast(validationError, "error");
      return;
    }

    setIsLoading(true);

    try {
      const result = await loginAndInitialize(username, password, rememberMe);

      if (!result.ok) {
        showToast(result.message, "error");
      }
    } finally {
      setIsLoading(false);
    }
  }

  function handleForgotPassword() {
    showToast("נחבר אחר כך", "info");
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
                  hasToggledRememberMeRef.current = true;
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
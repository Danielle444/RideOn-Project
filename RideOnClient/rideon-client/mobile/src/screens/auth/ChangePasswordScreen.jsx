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

import { useUser } from "../../context/UserContext";
import { useAuth } from "../../context/AuthContext";
import styles from "../../styles/authStyles";

export default function ChangePasswordScreen(props) {
  const { user } = useUser();
  const { changePasswordAndRefresh } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  function validateForm() {
    if (!currentPassword.trim()) {
      return "יש להזין סיסמה נוכחית";
    }

    if (!newPassword.trim()) {
      return "יש להזין סיסמה חדשה";
    }

    if (!confirmPassword.trim()) {
      return "יש לאשר את הסיסמה החדשה";
    }

    if (newPassword.length < 6) {
      return "הסיסמה החדשה חייבת להכיל לפחות 6 תווים";
    }

    if (newPassword !== confirmPassword) {
      return "אימות הסיסמה אינו תואם";
    }

    if (newPassword === currentPassword) {
      return "הסיסמה החדשה חייבת להיות שונה מהסיסמה הנוכחית";
    }

    if (!user || !user.username) {
      return "לא נמצאו פרטי משתמש מחובר";
    }

    return null;
  }

  async function handleChangePassword() {
    const validationError = validateForm();

    if (validationError) {
      Alert.alert("שגיאה", validationError);
      return;
    }

    setIsLoading(true);

    try {
      const result = await changePasswordAndRefresh(
        currentPassword,
        newPassword
      );

      if (!result.ok) {
        Alert.alert("שגיאה", result.message);
        return;
      }

      Alert.alert("הצלחה", "הסיסמה הוחלפה בהצלחה", [
        {
          text: "אישור",
          onPress: function () {
            setTimeout(() => {
            props.navigation.replace("MobileEntryGate");}, 0);
          },
        },
      ]);
    } finally {
      setIsLoading(false);
    }
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

            <Text style={styles.loginTitle}>החלפת סיסמה</Text>

            <Text style={styles.subtitleCenter}>
              לפני הכניסה למערכת צריך לבחור סיסמה חדשה
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>סיסמה נוכחית</Text>

              <View style={styles.passwordWrapper}>
                <Pressable
                  onPress={function () {
                    setShowCurrentPassword(function (prev) {
                      return !prev;
                    });
                  }}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={
                      showCurrentPassword ? "eye-off-outline" : "eye-outline"
                    }
                    size={20}
                    color="#8B6352"
                  />
                </Pressable>

                <TextInput
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="הזן סיסמה נוכחית"
                  placeholderTextColor="#B7AAA3"
                  style={styles.passwordInput}
                  secureTextEntry={!showCurrentPassword}
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>סיסמה חדשה</Text>

              <View style={styles.passwordWrapper}>
                <Pressable
                  onPress={function () {
                    setShowNewPassword(function (prev) {
                      return !prev;
                    });
                  }}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={showNewPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#8B6352"
                  />
                </Pressable>

                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="הזן סיסמה חדשה"
                  placeholderTextColor="#B7AAA3"
                  style={styles.passwordInput}
                  secureTextEntry={!showNewPassword}
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>אימות סיסמה חדשה</Text>

              <View style={styles.passwordWrapper}>
                <Pressable
                  onPress={function () {
                    setShowConfirmPassword(function (prev) {
                      return !prev;
                    });
                  }}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={
                      showConfirmPassword ? "eye-off-outline" : "eye-outline"
                    }
                    size={20}
                    color="#8B6352"
                  />
                </Pressable>

                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="הזן שוב את הסיסמה החדשה"
                  placeholderTextColor="#B7AAA3"
                  style={styles.passwordInput}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
              </View>
            </View>

            <Pressable
              style={[
                styles.primaryButton,
                isLoading ? styles.primaryButtonDisabled : null,
              ]}
              onPress={handleChangePassword}
              disabled={isLoading}
            >
              <Text style={styles.primaryButtonText}>
                {isLoading ? "שומר..." : "שמור סיסמה חדשה"}
              </Text>
            </Pressable>

            <Pressable
              onPress={props.onLogout}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>התנתקות</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
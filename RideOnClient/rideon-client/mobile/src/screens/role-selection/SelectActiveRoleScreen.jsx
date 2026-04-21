import { useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import styles from "../../styles/authStyles";

import {
  mapRoleOptionForMobile,
  getMobileSupportedRoleOptions,
} from "../../../../shared/auth/utils/platformRoles";
import { resolveMobileRoleSelection } from "../../../../shared/auth/utils/activeRoleSelection";

import { useUser } from "../../context/UserContext";
import { useActiveRole } from "../../context/ActiveRoleContext";

export default function SelectActiveRoleScreen(props) {
  const { user } = useUser();
  const { setActiveRoleAndPersist } = useActiveRole();

  const [isNavigating, setIsNavigating] = useState(false);

  const approvedRolesAndRanches = useMemo(function () {
    if (!user || !Array.isArray(user.approvedRolesAndRanches)) {
      return [];
    }

    return user.approvedRolesAndRanches;
  }, [user]);

  const roleOptionsForMobile = useMemo(function () {
    const mapped = approvedRolesAndRanches.map(mapRoleOptionForMobile);

    return mapped.sort(function (a, b) {
      if (a.isSupportedOnMobile && !b.isSupportedOnMobile) return -1;
      if (!a.isSupportedOnMobile && b.isSupportedOnMobile) return 1;
      return 0;
    });
  }, [approvedRolesAndRanches]);

  const supportedMobileRoles = useMemo(function () {
    return getMobileSupportedRoleOptions(approvedRolesAndRanches);
  }, [approvedRolesAndRanches]);

  async function handleRolePress(item) {
    if (isNavigating) {
      return;
    }

    const result = resolveMobileRoleSelection(item);

    if (!result.ok) {
      Alert.alert("שגיאה", result.message);
      return;
    }

    setIsNavigating(true);

    try {
      await setActiveRoleAndPersist(result.activeRole);
      setTimeout(() => {
      props.navigation.replace(result.destination);}, 0);
    } catch (error) {
      setIsNavigating(false);
      Alert.alert("שגיאה", "אירעה שגיאה במעבר לתפקיד שנבחר");
    }
  }

  async function handleLogout() {
    if (props.onLogout) {
      await props.onLogout();
    }
  }

  return (
    <SafeAreaView style={styles.screenWrapper}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.roleCard}>
          <View style={styles.roleHeader}>
            <Text style={styles.roleTitle}>
              באיזה תפקיד את עובדת עכשיו?
            </Text>

            <Text style={styles.roleSubtitle}>
              בחרי את החווה והתפקיד שדרכם תרצי לעבוד בחשבון זה
            </Text>
          </View>

          <View style={styles.roleListContainer}>
            {supportedMobileRoles.length === 0 ? (
              <View style={styles.noticeBox}>
                <Text style={styles.noticeText}>
                  בחשבון זה לא נמצא כרגע תפקיד שזמין במובייל.
                </Text>
              </View>
            ) : null}

            {roleOptionsForMobile.map(function (item, index) {
              const isDisabled = !item.isSupportedOnMobile;

              return (
                <Pressable
                  key={`${item.ranchId}-${item.roleId}-${index}`}
                  disabled={isDisabled || isNavigating}
                  onPress={function () {
                    handleRolePress(item);
                  }}
                  style={[
                    styles.roleItem,
                    isDisabled && styles.roleItemDisabled,
                  ]}
                >
                  <View style={styles.roleRow}>
                    <View style={styles.roleTextWrap}>
                      <Text style={styles.roleMainText}>
                        {item.displayTitle}
                      </Text>

                      <Text style={styles.roleSubText}>
                        {item.displaySubtitle}
                      </Text>

                      {isDisabled ? (
                        <Text style={styles.roleDisabledText}>
                          {item.platformMessage}
                        </Text>
                      ) : null}
                    </View>

                    <View style={styles.roleIconBox}>
                      <Ionicons
                        name={
                          isDisabled
                            ? "desktop-outline"
                            : "briefcase-outline"
                        }
                        size={28}
                        color="#8B6352"
                      />
                    </View>
                  </View>
                </Pressable>
              );
            })}

            <View style={styles.roleActionsRow}>
              <View />

              <Pressable
                onPress={handleLogout}
                style={styles.logoutButtonSecondary}
              >
                <Ionicons name="log-out-outline" size={18} color="#5D4037" />
                <Text style={styles.logoutTextSecondary}>
                  התנתקות
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import MobileScreenLayout from "../../../../components/mobile-nav/MobileScreenLayout";
import SideMenuTemplate from "../../../../components/mobile-nav/SideMenuTemplate";
import roleSharedStyles from "../../../../styles/roleSharedStyles";
import styles from "../../../../styles/adminAddPayerStyles";

import { getAdminBottomNavConfig } from "../../../../navigation/bottomNavConfigs";
import { getAdminMenuItems } from "../../../../navigation/sideMenuConfigs";

import { useUser } from "../../../../context/UserContext";
import { useActiveRole } from "../../../../context/ActiveRoleContext";
import { useCompetition } from "../../../../context/CompetitionContext";

import {
  findPotentialPayerByContact,
  requestManagedPayer,
} from "../../../../services/payerService";

export default function AdminAddPayerScreen(props) {
  var userContext = useUser();
  var activeRoleContext = useActiveRole();
  var competitionContext = useCompetition();

  var user = userContext.user;
  var activeRole = activeRoleContext.activeRole;

  var [firstName, setFirstName] = useState("");
  var [lastName, setLastName] = useState("");
  var [cellPhone, setCellPhone] = useState("");
  var [email, setEmail] = useState("");
  var [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogout() {
    if (props.onLogout) {
      await props.onLogout();
    }
  }

  function handleAdminMenuPress(item) {
    props.navigation.navigate(item.screen);
  }

  function validateForm() {
    if (!firstName.trim()) {
      Alert.alert("שגיאה", "יש להזין שם פרטי");
      return false;
    }

    if (!lastName.trim()) {
      Alert.alert("שגיאה", "יש להזין שם משפחה");
      return false;
    }

    if (!cellPhone.trim() && !email.trim()) {
      Alert.alert("שגיאה", "יש להזין לפחות טלפון או אימייל");
      return false;
    }

    return true;
  }

  async function handleSubmit() {
    if (!activeRole || !activeRole.ranchId) {
      Alert.alert("שגיאה", "לא נמצאה חווה פעילה");
      return;
    }

    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);

      var lookupResponse = await findPotentialPayerByContact(
        activeRole.ranchId,
        email.trim() || null,
        cellPhone.trim() || null,
      );

      var existingPerson = lookupResponse.data;

      var requestPayload = {
        ranchId: activeRole.ranchId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || null,
        cellPhone: cellPhone.trim() || null,
      };

      await requestManagedPayer(requestPayload);

      if (existingPerson && existingPerson.personId) {
        Alert.alert(
          "הבקשה נשלחה",
          "נמצא אדם קיים במערכת ונשלחה עבורו בקשת ניהול לאישור.",
          [
            {
              text: "אישור",
              onPress: function () {
                props.navigation.goBack();
              },
            },
          ],
        );
        return;
      }

      Alert.alert(
        "הבקשה נשלחה",
        "נוצרה רשומה חלקית ונשלחה בקשת ניהול. בהמשך יחובר תהליך אימות והשלמת פרטים.",
        [
          {
            text: "אישור",
            onPress: function () {
              props.navigation.goBack();
            },
          },
        ],
      );
    } catch (error) {
      console.error("Add payer error:", error);
      console.error("Response data:", error?.response?.data);
      console.error("Response status:", error?.response?.status);

      Alert.alert(
        "שגיאה",
        String(error?.response?.data || "אירעה שגיאה בשליחת בקשת הוספת משלם"),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <MobileScreenLayout
      title="הוספת משלם"
      subtitle=""
      activeBottomTab={null}
      bottomNavItems={getAdminBottomNavConfig(props.navigation)}
      menuContent={function ({ closeMenu }) {
        return (
          <SideMenuTemplate
            activeKey="payers"
            userName={
              (user &&
                (
                  (user.firstName || "") +
                  " " +
                  (user.lastName || "")
                ).trim()) ||
              ""
            }
            roleName={(activeRole && activeRole.roleName) || ""}
            ranchName={(activeRole && activeRole.ranchName) || ""}
            competitionName={
              competitionContext.activeCompetition
                ? competitionContext.activeCompetition.competitionName
                : ""
            }
            closeMenu={closeMenu}
            items={getAdminMenuItems()}
            onItemPress={handleAdminMenuPress}
            onSwitchRole={async function () {
              await competitionContext.clearCompetition();
              props.navigation.replace("SelectActiveRole");
            }}
            onLogout={handleLogout}
          />
        );
      }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        <Text style={roleSharedStyles.sectionTitle}>פרטי משלם חדש</Text>

        <View style={styles.formCard}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>שם פרטי</Text>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder="הזיני שם פרטי"
              placeholderTextColor="#9E8A7F"
              style={styles.input}
              textAlign="right"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>שם משפחה</Text>
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              placeholder="הזיני שם משפחה"
              placeholderTextColor="#9E8A7F"
              style={styles.input}
              textAlign="right"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>טלפון</Text>
            <TextInput
              value={cellPhone}
              onChangeText={setCellPhone}
              placeholder="הזיני מספר טלפון"
              placeholderTextColor="#9E8A7F"
              style={styles.input}
              textAlign="right"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>אימייל</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="הזיני כתובת אימייל"
              placeholderTextColor="#9E8A7F"
              style={styles.input}
              textAlign="right"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.infoBox}>
            <Ionicons
              name="information-circle-outline"
              size={20}
              color="#8B6352"
            />
            <Text style={styles.infoText}>
              המערכת תבדוק אם האדם כבר קיים. אם כן, תישלח בקשת ניהול. אם לא,
              תיווצר רשומה חלקית ותישלח בקשה להשלמת פרטים בהמשך.
            </Text>
          </View>

          <Pressable
            style={[
              styles.submitButton,
              isSubmitting ? styles.submitButtonDisabled : null,
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? "שולח בקשה..." : "בדוק ושלח בקשה"}
            </Text>
          </Pressable>

          <Pressable
            style={styles.backButton}
            onPress={function () {
              props.navigation.goBack();
            }}
          >
            <Text style={styles.backButtonText}>חזרה</Text>
          </Pressable>
        </View>
      </ScrollView>
    </MobileScreenLayout>
  );
}

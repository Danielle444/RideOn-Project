import { useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import MobileScreenLayout from "../../../../components/mobile-nav/MobileScreenLayout";
import SideMenuTemplate from "../../../../components/mobile-nav/SideMenuTemplate";
import AppDialog from "../../../../components/common/AppDialog";
import roleSharedStyles from "../../../../styles/roleSharedStyles";
import styles from "../../../../styles/adminAddPayerStyles";

import { getAdminBottomNavConfig } from "../../../../navigation/bottomNavConfigs";
import { getAdminMenuItems } from "../../../../navigation/sideMenuConfigs";
import { getApiErrorMessage } from "../../../../../../shared/auth/utils/authApiErrors";

import { useUser } from "../../../../context/UserContext";
import { useActiveRole } from "../../../../context/ActiveRoleContext";
import { useCompetition } from "../../../../context/CompetitionContext";

import {
  findPotentialPayerByContact,
  requestManagedPayer,
  createPayerWithCredentials,
} from "../../../../services/payerService";
import { showToast } from "../../../../services/toastService";

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
  var [isCreatingWithCredentials, setIsCreatingWithCredentials] = useState(false);
  // { title, message } for the single-button success dialog, or null when
  // hidden. Shared by both submit flows since all three success messages
  // behave identically: navigation.goBack() fires only once the user
  // acknowledges (same gating the native Alert's OK button used to do).
  var [successDialog, setSuccessDialog] = useState(null);

  function handleSuccessDialogConfirm() {
    setSuccessDialog(null);
    props.navigation.goBack();
  }

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
      showToast("יש להזין שם פרטי", "error");
      return false;
    }

    if (!lastName.trim()) {
      showToast("יש להזין שם משפחה", "error");
      return false;
    }

    if (!cellPhone.trim() && !email.trim()) {
      showToast("יש להזין לפחות טלפון או אימייל", "error");
      return false;
    }

    return true;
  }

  async function handleSubmit() {
    if (!activeRole || !activeRole.ranchId) {
      showToast("לא נמצאה חווה פעילה", "error");
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
        setSuccessDialog({
          title: "הבקשה נשלחה",
          message: "נמצא אדם קיים במערכת ונשלחה עבורו בקשת ניהול לאישור.",
        });
        return;
      }

      setSuccessDialog({
        title: "הבקשה נשלחה",
        message:
          "נוצרה רשומה חלקית ונשלחה בקשת ניהול. בהמשך יחובר תהליך אימות והשלמת פרטים.",
      });
    } catch (error) {
      console.error("Add payer error:", error);
      console.error("Response data:", error?.response?.data);
      console.error("Response status:", error?.response?.status);

      showToast(
        getApiErrorMessage(error, "אירעה שגיאה בשליחת בקשת הוספת משלם"),
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreateWithCredentials() {
    if (!activeRole || !activeRole.ranchId) {
      showToast("לא נמצאה חווה פעילה", "error");
      return;
    }

    if (!firstName.trim()) {
      showToast("יש להזין שם פרטי", "error");
      return;
    }

    if (!lastName.trim()) {
      showToast("יש להזין שם משפחה", "error");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      showToast("יש להזין כתובת אימייל תקינה (חובה לשליחת פרטי התחברות)", "error");
      return;
    }

    try {
      setIsCreatingWithCredentials(true);

      await createPayerWithCredentials({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        cellPhone: cellPhone.trim() || null,
        ranchId: activeRole.ranchId,
      });

      setSuccessDialog({
        title: "המשלם נוצר בהצלחה",
        message:
          "נשלח מייל למשלם עם פרטי ההתחברות הזמניים. המשלם יתחבר ויחליף סיסמה בכניסה הראשונה.",
      });
    } catch (error) {
      showToast(
        getApiErrorMessage(error, "אירעה שגיאה ביצירת המשלם"),
        "error",
      );
    } finally {
      setIsCreatingWithCredentials(false);
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
              name="mail-outline"
              size={20}
              color="#8B6352"
            />
            <Text style={styles.infoText}>
              "צור משלם ושלח פרטים" — יוצר חשבון עם סיסמה זמנית ושולח מייל
              ישירות למשלם עם פרטי ההתחברות. המשלם יחליף סיסמה בכניסה הראשונה.
              דרוש מייל תקין.
            </Text>
          </View>

          <Pressable
            style={[
              styles.submitButton,
              isCreatingWithCredentials ? styles.submitButtonDisabled : null,
            ]}
            onPress={handleCreateWithCredentials}
            disabled={isCreatingWithCredentials}
          >
            <Text style={styles.submitButtonText}>
              {isCreatingWithCredentials ? "יוצר חשבון ושולח מייל..." : "צור משלם ושלח פרטי התחברות"}
            </Text>
          </Pressable>

          <View style={styles.infoBox}>
            <Ionicons
              name="information-circle-outline"
              size={20}
              color="#8B6352"
            />
            <Text style={styles.infoText}>
              "בדוק ושלח בקשה" — בודק אם האדם קיים ושולח בקשת ניהול לאישור
              (ללא יצירת חשבון חדש).
            </Text>
          </View>

          <Pressable
            style={[
              styles.submitButton,
              isSubmitting ? styles.submitButtonDisabled : null,
              { backgroundColor: "#A47B6A" },
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

      <AppDialog
        visible={successDialog !== null}
        title={successDialog ? successDialog.title : ""}
        message={successDialog ? successDialog.message : ""}
        type="success"
        onConfirm={handleSuccessDialogConfirm}
      />
    </MobileScreenLayout>
  );
}

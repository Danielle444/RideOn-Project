import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import MobileScreenLayout from "../../../../components/mobile-nav/MobileScreenLayout";
import SideMenuTemplate from "../../../../components/mobile-nav/SideMenuTemplate";
import roleSharedStyles from "../../../../styles/roleSharedStyles";
import styles from "../../../../styles/adminAddPayerStyles";

import { getAdminBottomNavConfig } from "../../../../navigation/bottomNavConfigs";
import { getAdminMenuItems } from "../../../../navigation/sideMenuConfigs";

import { useUser } from "../../../../context/UserContext";
import { useActiveRole } from "../../../../context/ActiveRoleContext";
import { useCompetition } from "../../../../context/CompetitionContext";

import { updateManagedPayer } from "../../../../services/payerService";

export default function AdminEditPayerScreen(props) {
  var userContext = useUser();
  var activeRoleContext = useActiveRole();
  var competitionContext = useCompetition();

  var user = userContext.user;
  var activeRole = activeRoleContext.activeRole;

  var payer = props.route.params ? props.route.params.payer : null;

  var [firstName, setFirstName] = useState(payer ? payer.firstName || "" : "");
  var [lastName, setLastName] = useState(payer ? payer.lastName || "" : "");
  var [cellPhone, setCellPhone] = useState(payer ? payer.cellPhone || "" : "");
  var [email, setEmail] = useState(payer ? payer.email || "" : "");
  var [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogout() {
    if (props.onLogout) {
      await props.onLogout();
    }
  }

  function handleAdminMenuPress(item) {
    props.navigation.navigate(item.screen);
  }

  async function handleSubmit() {
    if (!payer || !payer.personId) {
      Alert.alert("שגיאה", "לא נמצאו פרטי משלם לעריכה");
      return;
    }

    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert("שגיאה", "יש להזין שם פרטי ושם משפחה");
      return;
    }

    try {
      setIsSubmitting(true);

      await updateManagedPayer(payer.personId, {
        ranchId: activeRole.ranchId,
        personId: payer.personId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || null,
        cellPhone: cellPhone.trim() || null,
      });

      Alert.alert("נשמר", "פרטי המשלם עודכנו בהצלחה", [
        {
          text: "אישור",
          onPress: function () {
            props.navigation.goBack();
          },
        },
      ]);
    } catch (error) {
      Alert.alert(
        "שגיאה",
        String(error?.response?.data || "אירעה שגיאה בעדכון המשלם"),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <MobileScreenLayout
      title="עריכת משלם"
      subtitle=""
      activeBottomTab={null}
      bottomNavItems={getAdminBottomNavConfig(props.navigation)}
      menuContent={function ({ closeMenu }) {
        return (
          <SideMenuTemplate
            activeKey="payers"
            userName={(
              (user?.firstName || "") +
              " " +
              (user?.lastName || "")
            ).trim()}
            roleName={activeRole?.roleName || ""}
            ranchName={activeRole?.ranchName || ""}
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
        <Text style={roleSharedStyles.sectionTitle}>פרטי משלם</Text>

        <View style={styles.formCard}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>שם פרטי</Text>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              style={styles.input}
              textAlign="right"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>שם משפחה</Text>
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              style={styles.input}
              textAlign="right"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>טלפון</Text>
            <TextInput
              value={cellPhone}
              onChangeText={setCellPhone}
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
              style={styles.input}
              textAlign="right"
              keyboardType="email-address"
              autoCapitalize="none"
            />
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
              {isSubmitting ? "שומר..." : "שמור שינויים"}
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

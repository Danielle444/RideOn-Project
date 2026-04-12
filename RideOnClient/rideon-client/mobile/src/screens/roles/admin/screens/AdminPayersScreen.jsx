import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";

import styles from "../../../../styles/adminPayersStyles";

import MobileScreenLayout from "../../../../components/mobile-nav/MobileScreenLayout";
import SideMenuTemplate from "../../../../components/mobile-nav/SideMenuTemplate";
import roleSharedStyles from "../../../../styles/roleSharedStyles";

import { getAdminBottomNavConfig } from "../../../../navigation/bottomNavConfigs";
import { getAdminMenuItems } from "../../../../navigation/sideMenuConfigs";

import { useUser } from "../../../../context/UserContext";
import { useActiveRole } from "../../../../context/ActiveRoleContext";
import { useCompetition } from "../../../../context/CompetitionContext";

import { getManagedPayers } from "../../../../services/payerService";

import { removeManagedPayer } from "../../../../services/payerService";

export default function AdminPayersScreen(props) {
  var userContext = useUser();
  var activeRoleContext = useActiveRole();
  var competitionContext = useCompetition();

  var user = userContext.user;
  var activeRole = activeRoleContext.activeRole;

  var [payers, setPayers] = useState([]);
  var [loading, setLoading] = useState(false);
  var [searchText, setSearchText] = useState("");

  useEffect(
    function () {
      if (!activeRole || !activeRole.ranchId) {
        return;
      }

      loadPayers();
    },
    [activeRole],
  );

  useFocusEffect(
    useCallback(
      function () {
        if (!activeRole || !activeRole.ranchId) {
          return;
        }

        loadPayers(searchText.trim());
      },
      [activeRole, searchText],
    ),
  );

  async function loadPayers(searchValue) {
    try {
      setLoading(true);

      var response = await getManagedPayers(
        activeRole.ranchId,
        searchValue || null,
        null,
      );

      setPayers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error(error);
      Alert.alert("שגיאה", "אירעה שגיאה בטעינת המשלמים");
      setPayers([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch() {
    await loadPayers(searchText.trim());
  }

  async function handleLogout() {
    if (props.onLogout) {
      await props.onLogout();
    }
  }

  async function handleRemovePayer(personId) {
    try {
      await removeManagedPayer(personId, activeRole.ranchId);
      Alert.alert("הוסר", "המשלם הוסר מרשימת הניהול");
      await loadPayers(searchText.trim());
    } catch (error) {
      Alert.alert(
        "שגיאה",
        String(error?.response?.data || "אירעה שגיאה בהסרת המשלם"),
      );
    }
  }

  function handleAdminMenuPress(item) {
    props.navigation.navigate(item.screen);
  }

  function renderStatusBadge(statusText) {
    var normalized = String(statusText || "").trim();

    var badgeStyle = styles.statusBadgeDefault;
    var textStyle = styles.statusTextDefault;
    var displayText = "ללא סטטוס";

    if (normalized === "Approved") {
      badgeStyle = styles.statusBadgeApproved;
      textStyle = styles.statusTextApproved;
      displayText = "אושר";
    } else if (normalized === "Pending") {
      badgeStyle = styles.statusBadgePending;
      textStyle = styles.statusTextPending;
      displayText = "ממתין לאישור";
    } else if (normalized === "Rejected") {
      badgeStyle = styles.statusBadgeRejected;
      textStyle = styles.statusTextRejected;
      displayText = "לא אושר";
    }

    return (
      <View style={[styles.statusBadgeBase, badgeStyle]}>
        <Text style={[styles.statusTextBase, textStyle]}>{displayText}</Text>
      </View>
    );
  }

  return (
    <MobileScreenLayout
      title="ניהול משלמים"
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
        <View style={styles.topActionsWrap}>
          <Pressable
            style={styles.addButton}
            onPress={function () {
              props.navigation.navigate("AdminAddPayer");
            }}
          >
            <Ionicons name="add" size={22} color="#FFFFFF" />
            <Text style={styles.addButtonText}>הוסף משלם</Text>
          </Pressable>
        </View>

        <View style={styles.searchCard}>
          <Text style={styles.searchLabel}>חיפוש משלם</Text>

          <View style={styles.searchRow}>
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="שם, ת״ז או שם משתמש"
              placeholderTextColor="#9E8A7F"
              style={styles.searchInput}
              textAlign="right"
            />

            <Pressable style={styles.searchButton} onPress={handleSearch}>
              <Ionicons name="search-outline" size={20} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        <Text style={roleSharedStyles.sectionTitle}>המשלמים שלי</Text>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#8B6352" />
          </View>
        ) : payers.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>לא נמצאו משלמים להצגה</Text>
          </View>
        ) : (
          payers.map(function (payer) {
            return (
              <View key={String(payer.personId)} style={styles.card}>
                <View style={styles.cardTopRow}>
                  {renderStatusBadge(payer.approvalStatus)}

                  <View style={styles.iconCircle}>
                    <Ionicons name="card-outline" size={22} color="#7B5A4D" />
                  </View>
                </View>

                <Text style={styles.fullNameText}>
                  {payer.fullName ||
                    (
                      (payer.firstName || "") +
                      " " +
                      (payer.lastName || "")
                    ).trim()}
                </Text>

                <Text style={styles.infoText}>
                  תעודת זהות: {payer.nationalId || "-"}
                </Text>

                <Text style={styles.infoText}>
                  טלפון: {payer.cellPhone || "-"}
                </Text>

                <Text style={styles.infoText}>
                  אימייל: {payer.email || "-"}
                </Text>

                <Text style={styles.infoText}>
                  שם משתמש: {payer.username || "-"}
                </Text>

                <View style={styles.bottomButtonsRow}>
                  <Pressable
                    style={styles.secondaryButton}
                    onPress={function () {
                      props.navigation.navigate("AdminEditPayer", {
                        payer: payer,
                      });
                    }}
                  >
                    <Text style={styles.secondaryButtonText}>ערוך</Text>
                  </Pressable>

                  <Pressable
                    style={styles.dangerButton}
                    onPress={function () {
                      Alert.alert(
                        "הסרת משלם",
                        "האם להסיר את המשלם מרשימת הניהול שלך?",
                        [
                          { text: "ביטול", style: "cancel" },
                          {
                            text: "הסר",
                            style: "destructive",
                            onPress: function () {
                              handleRemovePayer(payer.personId);
                            },
                          },
                        ],
                      );
                    }}
                  >
                    <Text style={styles.dangerButtonText}>הסר</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </MobileScreenLayout>
  );
}

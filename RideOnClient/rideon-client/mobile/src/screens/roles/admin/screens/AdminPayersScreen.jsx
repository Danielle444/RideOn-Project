import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import AppDialog from "../../../../components/common/AppDialog";
import roleSharedStyles from "../../../../styles/roleSharedStyles";
import { getApiErrorMessage } from "../../../../../../shared/auth/utils/authApiErrors";

import { getAdminBottomNavConfig } from "../../../../navigation/bottomNavConfigs";
import { getAdminMenuItems } from "../../../../navigation/sideMenuConfigs";

import { useUser } from "../../../../context/UserContext";
import { useActiveRole } from "../../../../context/ActiveRoleContext";
import { useCompetition } from "../../../../context/CompetitionContext";

import { getManagedPayers } from "../../../../services/payerService";

import { removeManagedPayer } from "../../../../services/payerService";
import { showToast } from "../../../../services/toastService";
import { createInFlightGuard } from "../../../../utils/inFlightGuard";

export default function AdminPayersScreen(props) {
  var userContext = useUser();
  var activeRoleContext = useActiveRole();
  var competitionContext = useCompetition();

  var user = userContext.user;
  var activeRole = activeRoleContext.activeRole;

  var [payers, setPayers] = useState([]);
  var [loading, setLoading] = useState(false);
  var [searchText, setSearchText] = useState("");

  // Confirmation dialog target (personId) - set when the row's "הסר" button
  // is pressed, cleared on cancel or once the removal settles.
  var [removeTargetId, setRemoveTargetId] = useState(null);
  // Tracks which payer's removal API call is currently in flight - drives
  // the dialog's isBusy spinner and disables that row's "הסר" button so a
  // second confirmation dialog can't even be opened for the same payer
  // while the first request is still pending.
  var [removingPersonId, setRemovingPersonId] = useState(null);

  // Synchronous, key-scoped guard (same pattern as
  // AdminCompetitionPayerAccountScreen.jsx's cancel guards) - the real
  // correctness backstop against a duplicate removal, since React state
  // updates (removingPersonId above) are asynchronous and can't be trusted
  // alone to block two rapid confirms of the same row.
  var removeGuardRef = useRef(null);
  if (removeGuardRef.current === null) {
    removeGuardRef.current = createInFlightGuard();
  }

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
      showToast("אירעה שגיאה בטעינת המשלמים", "error");
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

  // The synchronous guard (removeGuardRef) is acquired BEFORE anything else,
  // including setRemovingPersonId - a second invocation for the same
  // personId (e.g. a re-confirm fired before the first render reflects
  // removingPersonId) returns immediately instead of firing a second
  // removeManagedPayer call.
  async function doRemovePayer(personId) {
    var guardKey = "payer:" + personId;

    if (!removeGuardRef.current.tryAcquire(guardKey)) {
      return;
    }

    try {
      setRemovingPersonId(personId);

      await removeManagedPayer(personId, activeRole.ranchId);

      setRemoveTargetId(null);
      showToast("המשלם הוסר מרשימת הניהול", "success");
      await loadPayers(searchText.trim());
    } catch (error) {
      setRemoveTargetId(null);
      showToast(
        getApiErrorMessage(error, "אירעה שגיאה בהסרת המשלם"),
        "error",
      );
    } finally {
      setRemovingPersonId(null);
      removeGuardRef.current.release(guardKey);
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
                    disabled={removingPersonId === payer.personId}
                    onPress={function () {
                      setRemoveTargetId(payer.personId);
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

      <AppDialog
        visible={removeTargetId !== null}
        title="הסרת משלם"
        message="האם להסיר את המשלם מרשימת הניהול שלך?"
        confirmLabel="הסר"
        cancelLabel="ביטול"
        destructive={true}
        isBusy={removingPersonId !== null}
        onConfirm={function () {
          doRemovePayer(removeTargetId);
        }}
        onCancel={function () {
          setRemoveTargetId(null);
        }}
      />
    </MobileScreenLayout>
  );
}

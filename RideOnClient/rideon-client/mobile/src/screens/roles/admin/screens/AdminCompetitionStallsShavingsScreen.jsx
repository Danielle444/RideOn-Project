import React, { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";

import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";

import Button from "../../../../components/ui/Button";

import MobileScreenLayout from "../../../../components/mobile-nav/MobileScreenLayout";

import CompetitionMenuTemplate from "../../../../components/mobile-nav/CompetitionMenuTemplate";

import { getAdminBottomNavConfig } from "../../../../navigation/bottomNavConfigs";

import { getAdminCompetitionMenuItems } from "../../../../navigation/competitionMenuConfigs";

import { useActiveRole } from "../../../../context/ActiveRoleContext";

import { useCompetition } from "../../../../context/CompetitionContext";

import useAdminCompetitionStallsOverview from "../../../../hooks/useAdminCompetitionStallsOverview";
import useRegistrationStepStatus from "../../../../hooks/useRegistrationStepStatus";

import CompetitionStallCard from "../../../../components/competitions/CompetitionStallCard";

import ShavingsOrderModal from "../../../../components/competitions/ShavingsOrderModal";

import StallBookingEditModal from "../../../../components/competitions/StallBookingEditModal";

import StallBookingCreateModal from "../../../../components/competitions/StallBookingCreateModal";

import StallMapModal from "../../../../components/competitions/StallMapModal";

import RegistrationStepNotice from "../../../../components/competitions/RegistrationStepNotice";

import { createStallBookingCancelRequest } from "../../../../services/stallBookingsService";
import { buildRegistrationStepNoticeMessage } from "../../../../utils/registrationStepNoticeMessages";

import styles from "../../../../styles/adminCompetitionStallsStyles";

export default function AdminCompetitionStallsShavingsScreen(props) {
  var activeRoleContext = useActiveRole();

  var competitionContext = useCompetition();

  var activeRole = activeRoleContext.activeRole;

  var activeCompetition = competitionContext.activeCompetition;

  var [showCreateStallModal, setShowCreateStallModal] = useState(false);

  var [showShavingsModal, setShowShavingsModal] = useState(false);

  var [selectedStallForShavings, setSelectedStallForShavings] = useState(null);

  var [showEditModal, setShowEditModal] = useState(false);

  var [selectedStallForEdit, setSelectedStallForEdit] = useState(null);

  var [showStallMap, setShowStallMap] = useState(false);

  var [stallMapFocus, setStallMapFocus] = useState(null);

  var registrationStepStatus = useRegistrationStepStatus({
    competitionId: activeCompetition?.competitionId,
    ranchId: activeRole?.ranchId,
    enabled: true,
  });

  var availability = registrationStepStatus.availability;
  var isRegistrationStatusLoading = registrationStepStatus.loading;
  var registrationStatusError = registrationStepStatus.error;
  var reloadRegistrationStepStatus = registrationStepStatus.reload;

  // Same dedup pattern proven in Stage 3: useFocusEffect also fires once on
  // initial mount (already focused), on top of the hook's own internal
  // mount/param-change effect - without this guard that's a duplicate
  // fetch. A genuine re-focus with the SAME reload identity still refreshes
  // exactly once.
  var lastTriggeredReloadRef = useRef(null);

  useFocusEffect(
    useCallback(
      function () {
        if (lastTriggeredReloadRef.current !== reloadRegistrationStepStatus) {
          lastTriggeredReloadRef.current = reloadRegistrationStepStatus;
          return;
        }

        reloadRegistrationStepStatus();
      },
      [reloadRegistrationStepStatus],
    ),
  );

  // Stalls and Shavings are independent gates - each gets its OWN force-close
  // effect, so disabling one section can never touch a modal belonging to
  // the other, still-enabled section.
  useEffect(
    function () {
      if (availability.stalls.isEnabled) {
        return;
      }

      if (showCreateStallModal) {
        setShowCreateStallModal(false);
      }

      if (showEditModal) {
        setShowEditModal(false);
        setSelectedStallForEdit(null);
      }
    },
    [availability.stalls.isEnabled, showCreateStallModal, showEditModal],
  );

  useEffect(
    function () {
      if (availability.shavings.isEnabled) {
        return;
      }

      if (showShavingsModal) {
        setShowShavingsModal(false);
        setSelectedStallForShavings(null);
      }
    },
    [availability.shavings.isEnabled, showShavingsModal],
  );

  function handleOpenStallMap() {
    setStallMapFocus(null);
    setShowStallMap(true);
  }

  function handleViewCompoundForStall(item) {
    if (!item || !item.assignedStallNumber) return;
    setStallMapFocus({
      compoundId: item.assignedCompoundId,
      stallNumber: item.assignedStallNumber,
    });
    setShowStallMap(true);
  }

  function handleCloseStallMap() {
    setShowStallMap(false);
    setStallMapFocus(null);
  }

  var overview = useAdminCompetitionStallsOverview({
    competitionId: activeCompetition?.competitionId,
    activeRole: activeRole,
  });

  var cards = Array.isArray(overview.cards) ? overview.cards : [];

  function handleCompetitionMenuPress(item) {
    props.navigation.navigate(item.screen);
  }

  async function handleExitCompetition() {
    await competitionContext.clearCompetition();

    props.navigation.navigate("AdminCompetitionsBoard");
  }

  function handleOpenCreateStallModal() {
    if (!availability.stalls.isEnabled) {
      return;
    }

    setShowCreateStallModal(true);
  }

  function handleCloseCreateStallModal() {
    setShowCreateStallModal(false);
  }

  async function handleStallCreated() {
    await overview.reload();
    // A new stall booking changes hasRelevantActiveNonTackStallBooking, which
    // drives the Shavings gate on THIS same screen.
    reloadRegistrationStepStatus();
  }

  function handleOpenGeneralShavingsModal() {
    if (!availability.shavings.isEnabled) {
      return;
    }

    setSelectedStallForShavings(null);

    setShowShavingsModal(true);
  }

  function handleAddShavingsForStall(item) {
    if (!availability.shavings.isEnabled) {
      return;
    }

    setSelectedStallForShavings(item);

    setShowShavingsModal(true);
  }

  function handleCloseShavingsModal() {
    setShowShavingsModal(false);

    setSelectedStallForShavings(null);
  }

  async function handleShavingsCreated() {
    await overview.reload();

    setSelectedStallForShavings(null);
  }

  function handleEditStallBooking(item) {
    if (!availability.stalls.isEnabled) {
      return;
    }

    if (!item || !item.stallBookingId) {
      Alert.alert("שגיאה", "לא נמצא מזהה הזמנת תא תקין");
      return;
    }

    if (item.isPaid) {
      Alert.alert("לא ניתן לערוך", "לא ניתן לערוך תא שכבר שולם");
      return;
    }

    if (
      item.isCancelled ||
      item.hasPendingCancellation ||
      item.hasPendingChange
    ) {
      Alert.alert("לא ניתן לערוך", "קיימת בקשה פתוחה או שהתא כבר בוטל");
      return;
    }

    setSelectedStallForEdit(item);
    setShowEditModal(true);
  }

  function handleCloseEditModal() {
    setShowEditModal(false);

    setSelectedStallForEdit(null);
  }

  async function handleEditCreated() {
    await overview.reload();
    reloadRegistrationStepStatus();

    setSelectedStallForEdit(null);
  }

  function handleCancelStallBooking(item) {
    if (!availability.stalls.isEnabled) {
      return;
    }

    if (!item || !item.stallBookingId) {
      Alert.alert("שגיאה", "לא נמצא מזהה הזמנת תא תקין");
      return;
    }

    if (item.isPaid) {
      Alert.alert("לא ניתן לבטל", "לא ניתן לבטל תא שכבר שולם");
      return;
    }

    if (
      item.isCancelled ||
      item.hasPendingCancellation ||
      item.hasPendingChange
    ) {
      Alert.alert("לא ניתן לבטל", "קיימת בקשה פתוחה או שהתא כבר בוטל");
      return;
    }

    if (!activeRole || !activeRole.ranchId) {
      Alert.alert("שגיאה", "לא נמצאה חווה פעילה");
      return;
    }

    Alert.alert("ביטול הזמנת תא", "האם לשלוח בקשת ביטול למזכירת התחרות?", [
      {
        text: "לא",
        style: "cancel",
      },
      {
        text: "כן, שלחי בקשה",
        style: "destructive",
        onPress: async function () {
          if (!availability.stalls.isEnabled) {
            return;
          }

          try {
            await createStallBookingCancelRequest({
              stallBookingId: item.stallBookingId,
              ranchId: activeRole.ranchId,
            });

            await overview.reload();
            reloadRegistrationStepStatus();

            Alert.alert("נשלח", "בקשת ביטול התא נשלחה בהצלחה");
          } catch (error) {
            console.log("CREATE STALL CANCEL REQUEST ERROR", error);

            Alert.alert(
              "שגיאה",
              String(
                error?.response?.data || "אירעה שגיאה בשליחת בקשת ביטול התא",
              ),
            );
          }
        },
      },
    ]);
  }

  function renderContent() {
    if (overview.loading) {
      return (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#7B5A4D" />

          <Text style={styles.loadingText}>טוענת תאים ונסורת...</Text>
        </View>
      );
    }

    if (overview.screenError) {
      return (
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>{overview.screenError}</Text>
        </View>
      );
    }

    if (cards.length === 0) {
      return (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>עדיין אין הזמנות תאים</Text>

          <Text style={styles.emptySubtitle}>
            הזמנות תאים ונסורת יופיעו כאן לאחר יצירה
          </Text>
        </View>
      );
    }

    return cards.map(function (item) {
      return (
        <CompetitionStallCard
          key={String(item.stallBookingId)}
          item={item}
          onAddShavings={handleAddShavingsForStall}
          onDelete={handleCancelStallBooking}
          onEdit={handleEditStallBooking}
          onViewCompound={handleViewCompoundForStall}
        />
      );
    });
  }

  return (
    <MobileScreenLayout
      title="תאים ונסורת"
      subtitle=""
      activeBottomTab={null}
      bottomNavItems={getAdminBottomNavConfig(props.navigation)}
      menuContent={function ({ closeMenu }) {
        return (
          <CompetitionMenuTemplate
            activeKey="stalls-shavings"
            closeMenu={closeMenu}
            competitionName={
              activeCompetition ? activeCompetition.competitionName : ""
            }
            items={getAdminCompetitionMenuItems()}
            onItemPress={handleCompetitionMenuPress}
            onExitCompetition={handleExitCompetition}
          />
        );
      }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={overview.loading}
            onRefresh={overview.reload}
          />
        }
      >
        {registrationStatusError ? (
          <View style={styles.errorWrap}>
            <Text style={styles.errorText}>{registrationStatusError}</Text>

            <Button
              variant="outline"
              label="נסה שוב"
              onPress={reloadRegistrationStepStatus}
              style={{ marginTop: 8 }}
            />
          </View>
        ) : null}

        {!availability.stalls.isEnabled ? (
          <RegistrationStepNotice
            message={buildRegistrationStepNoticeMessage(
              availability.stalls,
            )}
            isLoading={isRegistrationStatusLoading}
            containerStyle={styles.errorWrap}
            textStyle={styles.errorText}
            ctaLabel={
              availability.stalls.unavailableReason === "NEEDS_RELEVANT_ENTRY"
                ? "מעבר להוספת הרשמה"
                : null
            }
            onCtaPress={
              availability.stalls.unavailableReason === "NEEDS_RELEVANT_ENTRY"
                ? function () {
                    props.navigation.navigate("AdminCompetitionRegistrations");
                  }
                : null
            }
          />
        ) : null}

        {!availability.shavings.isEnabled ? (
          <RegistrationStepNotice
            message={buildRegistrationStepNoticeMessage(
              availability.shavings,
            )}
            isLoading={isRegistrationStatusLoading}
            containerStyle={styles.errorWrap}
            textStyle={styles.errorText}
            ctaLabel={
              availability.shavings.unavailableReason ===
              "NEEDS_RELEVANT_STALL_BOOKING"
                ? "מעבר להזמנת תא"
                : null
            }
            onCtaPress={
              availability.shavings.unavailableReason ===
              "NEEDS_RELEVANT_STALL_BOOKING"
                ? handleOpenCreateStallModal
                : null
            }
          />
        ) : null}

        <View style={styles.topActionsRow}>
          <Button
            variant="solid"
            label="+ הוסף תא"
            disabled={!availability.stalls.isEnabled}
            onPress={handleOpenCreateStallModal}
            style={{ flex: 1 }}
          />

          <Button
            variant="outline"
            label="+ הוסף הזמנת נסורת"
            disabled={!availability.shavings.isEnabled}
            onPress={handleOpenGeneralShavingsModal}
            style={{ flex: 1 }}
          />
        </View>

        <Button
          variant="outline"
          label="צפה במפת תאים"
          onPress={handleOpenStallMap}
          style={{ marginBottom: 12 }}
        />

        {renderContent()}

        <StallBookingCreateModal
          visible={showCreateStallModal && availability.stalls.isEnabled}
          competitionId={activeCompetition?.competitionId}
          onClose={handleCloseCreateStallModal}
          onCreated={handleStallCreated}
        />

        <ShavingsOrderModal
          visible={showShavingsModal && availability.shavings.isEnabled}
          competitionId={activeCompetition?.competitionId}
          initialStallBookingId={
            selectedStallForShavings
              ? selectedStallForShavings.stallBookingId
              : null
          }
          onClose={handleCloseShavingsModal}
          onCreated={handleShavingsCreated}
        />

        <StallBookingEditModal
          visible={showEditModal && availability.stalls.isEnabled}
          item={selectedStallForEdit}
          competitionId={activeCompetition?.competitionId}
          onClose={handleCloseEditModal}
          onUpdated={handleEditCreated}
        />

        <StallMapModal
          isOpen={showStallMap}
          competitionId={activeCompetition?.competitionId}
          ranchId={activeRole?.ranchId}
          focusCompoundId={stallMapFocus?.compoundId}
          focusStallNumber={stallMapFocus?.stallNumber}
          onClose={handleCloseStallMap}
        />
      </ScrollView>
    </MobileScreenLayout>
  );
}
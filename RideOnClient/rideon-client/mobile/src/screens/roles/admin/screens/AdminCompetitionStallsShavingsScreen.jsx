import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";

import {
  ActivityIndicator,
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
import { getApiErrorMessage } from "../../../../../../shared/auth/utils/authApiErrors";

import useAdminCompetitionStallsOverview from "../../../../hooks/useAdminCompetitionStallsOverview";
import useRegistrationStepStatus from "../../../../hooks/useRegistrationStepStatus";

import CompetitionStallCard from "../../../../components/competitions/CompetitionStallCard";

import ShavingsOrderModal from "../../../../components/competitions/ShavingsOrderModal";

import StallBookingEditModal from "../../../../components/competitions/StallBookingEditModal";

import StallBookingCreateModal from "../../../../components/competitions/StallBookingCreateModal";

import StallMapModal from "../../../../components/competitions/StallMapModal";

import RegistrationStepNotice from "../../../../components/competitions/RegistrationStepNotice";

import AppDialog from "../../../../components/common/AppDialog";

import { adminCancelStallBooking } from "../../../../services/stallBookingsService";
import { adminCancelShavingsOrder } from "../../../../services/shavingsOrderService";
import { showToast } from "../../../../services/toastService";
import { buildRegistrationStepNoticeMessage } from "../../../../utils/registrationStepNoticeMessages";
import { createInFlightGuard } from "../../../../utils/inFlightGuard";

import {
  LIFECYCLE_STATE,
  resolveStallLifecycleState,
} from "../../../../utils/payerAccountLifecycle";

import { bandAndSortStalls } from "../../../../utils/payerAccountBands";
import {
  getLifecycleBandHeader,
  DIRECT_CANCELLATION_COPY,
} from "../../../../utils/payerAccountCopy";

import styles from "../../../../styles/adminCompetitionStallsStyles";

// CAP-10: this admin surface's cards carry isCancelled/hasPendingCancellation/
// hasPendingChange straight off usp_getstallbookingsforcompetitionandranch
// (verified live 2026-08-06) - the exact shape resolveStallLifecycleState and
// bandAndSortStalls were already built for, so both are reused directly with
// no adapter.
//
// There is no filterTitle-equivalent style token in this screen's stylesheet
// (it has no filter UI), so the divider mirrors that token's values inline
// rather than inventing a new stylesheet entry for one line.
var BAND_HEADER_STYLE = {
  fontSize: 14,
  fontWeight: "800",
  color: "#4F3B31",
  textAlign: "right",
};

function renderBandDivider(headerText, keyValue) {
  if (!headerText) {
    return null;
  }

  return (
    <Text key={keyValue} style={BAND_HEADER_STYLE}>
      {headerText}
    </Text>
  );
}

// Renders one non-empty divider per lifecycle band, in Active / pending /
// cancelled order, using the caller's existing per-item card renderer
// unchanged.
function renderBandedSections(banded, renderCard) {
  var sections = [
    {
      key: "active",
      items: banded.active,
      header: getLifecycleBandHeader(LIFECYCLE_STATE.ACTIVE),
    },
    {
      key: "pending",
      items: banded.pending,
      header: getLifecycleBandHeader(LIFECYCLE_STATE.PENDING_CHANGE),
    },
    {
      key: "cancelled",
      items: banded.cancelled,
      header: getLifecycleBandHeader(LIFECYCLE_STATE.CANCELLED),
    },
  ];

  return sections.map(function (section) {
    if (section.items.length === 0) {
      return null;
    }

    return (
      <View key={"band-" + section.key}>
        {renderBandDivider(section.header, "band-header-" + section.key)}
        {section.items.map(renderCard)}
      </View>
    );
  });
}

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

  var [cancellingShavingsId, setCancellingShavingsId] = useState(null);

  var [stallCancelTarget, setStallCancelTarget] = useState(null);

  var [cancellingStallId, setCancellingStallId] = useState(null);

  var [shavingsCancelTarget, setShavingsCancelTarget] = useState(null);

  var stallCancelGuardRef = useRef(null);

  if (stallCancelGuardRef.current === null) {
    stallCancelGuardRef.current = createInFlightGuard();
  }

  var shavingsCancelGuardRef = useRef(null);

  if (shavingsCancelGuardRef.current === null) {
    shavingsCancelGuardRef.current = createInFlightGuard();
  }

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

  var bandedCards = useMemo(
    function () {
      return bandAndSortStalls(cards);
    },
    [cards],
  );

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
      showToast("לא נמצא מזהה הזמנת תא תקין", "error");
      return;
    }

    if (item.isPaid) {
      showToast("לא ניתן לערוך תא שכבר שולם", "error");
      return;
    }

    if (resolveStallLifecycleState(item) !== LIFECYCLE_STATE.ACTIVE) {
      showToast("קיימת בקשה פתוחה או שהתא כבר בוטל", "error");
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
      showToast("לא נמצא מזהה הזמנת תא תקין", "error");
      return;
    }

    if (item.isPaid) {
      showToast("לא ניתן לבטל תא שכבר שולם", "error");
      return;
    }

    if (resolveStallLifecycleState(item) !== LIFECYCLE_STATE.ACTIVE) {
      showToast("קיימת בקשה פתוחה או שהתא כבר בוטל", "error");
      return;
    }

    if (!activeRole || !activeRole.ranchId) {
      showToast("לא נמצאה חווה פעילה", "error");
      return;
    }

    // Direct cancel, matching AdminCompetitionPayerAccountScreen's mechanism
    // (fix/competition-ended-and-delivery-guards, 2026-08-07) -- both Admin
    // surfaces now cancel a stall booking the same way instead of this
    // screen routing through a Pending secretary-approval request while the
    // other screen cancelled immediately. The confirmation itself now opens
    // the AppDialog below instead of the native Alert.alert - the actual
    // mutation lives in handleConfirmCancelStallBooking so it can be gated
    // by a synchronous in-flight guard (PROVEN BUG fix: this handler had no
    // guard at all, unlike the sibling AdminCompetitionPayerAccountScreen).
    setStallCancelTarget(item);
  }

  async function handleConfirmCancelStallBooking() {
    var item = stallCancelTarget;

    if (!item || !availability.stalls.isEnabled) {
      setStallCancelTarget(null);
      return;
    }

    var guardKey = "stall:" + item.stallBookingId;

    // Synchronous guard, not React state: two rapid taps on the AppDialog
    // confirm button (or a stale second dialog instance) can both observe
    // isBusy=false before either state update lands, so the Set-based guard
    // is the actual correctness mechanism - isBusy below is UI-only.
    if (!stallCancelGuardRef.current.tryAcquire(guardKey)) {
      return;
    }

    setCancellingStallId(item.stallBookingId);

    try {
      await adminCancelStallBooking(item.stallBookingId, activeRole.ranchId);

      await overview.reload();
      reloadRegistrationStepStatus();

      setStallCancelTarget(null);
      showToast(DIRECT_CANCELLATION_COPY.text, "success");
    } catch (error) {
      console.log("ADMIN CANCEL STALL BOOKING ERROR", error);

      setStallCancelTarget(null);
      showToast(
        getApiErrorMessage(error, "אירעה שגיאה בביטול הזמנת התא"),
        "error",
      );
    } finally {
      setCancellingStallId(null);
      stallCancelGuardRef.current.release(guardKey);
    }
  }

  function handleDismissStallCancelDialog() {
    setStallCancelTarget(null);
  }

  // Admin history cancel: the button is only ever shown when proc 176's
  // server-computed CanCancelShavings was true (see ShavingsHistoryModal),
  // so no order-state re-check happens here -- usp_admincancelshavingsorder
  // (241) still re-validates every guard itself and is the final authority
  // for a race/stale-state tap.
  function handleCancelShavingsFromHistory(order) {
    if (!order || !order.shavingsOrderId) {
      showToast("לא נמצא מזהה הזמנת נסורת תקין", "error");
      return;
    }

    if (!activeRole || !activeRole.ranchId) {
      showToast("לא נמצאה חווה פעילה", "error");
      return;
    }

    // Confirmation moves to the AppDialog below; the mutation itself stays
    // in handleConfirmCancelShavingsFromHistory, gated by its own dedicated
    // in-flight guard instance (independent of the stall-cancel one above).
    setShavingsCancelTarget(order);
  }

  async function handleConfirmCancelShavingsFromHistory() {
    var order = shavingsCancelTarget;

    if (!order) {
      return;
    }

    var busyKey = "shavings:" + order.shavingsOrderId;

    // Synchronous guard, not React state - same rationale as the stall-cancel
    // guard above (two rapid taps on the AppDialog confirm button can both
    // observe isBusy=false before either state update lands). Dedicated
    // guard instance/namespace so a shavings cancel can never contend with an
    // in-flight stall cancel's key.
    if (!shavingsCancelGuardRef.current.tryAcquire(busyKey)) {
      return;
    }

    setCancellingShavingsId(busyKey);

    try {
      await adminCancelShavingsOrder(order.shavingsOrderId, activeRole.ranchId);

      await overview.reload();

      setShavingsCancelTarget(null);
      showToast(DIRECT_CANCELLATION_COPY.text, "success");
    } catch (error) {
      console.log("ADMIN CANCEL SHAVINGS ORDER ERROR", error);

      setShavingsCancelTarget(null);
      showToast(
        getApiErrorMessage(error, "אירעה שגיאה בביטול הזמנת הנסורת"),
        "error",
      );
    } finally {
      setCancellingShavingsId(null);
      shavingsCancelGuardRef.current.release(busyKey);
    }
  }

  function handleDismissShavingsCancelDialog() {
    setShavingsCancelTarget(null);
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

    return renderBandedSections(bandedCards, function (item) {
      return (
        <CompetitionStallCard
          key={String(item.stallBookingId)}
          item={item}
          onAddShavings={handleAddShavingsForStall}
          onDelete={handleCancelStallBooking}
          onEdit={handleEditStallBooking}
          onViewCompound={handleViewCompoundForStall}
          onCancelShavings={handleCancelShavingsFromHistory}
          cancellingShavingsId={cancellingShavingsId}
          cancellingStallId={cancellingStallId}
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

        <AppDialog
          visible={!!stallCancelTarget}
          title="ביטול הזמנת תא"
          message="האם לבטל את הזמנת התא?"
          confirmLabel="כן, בטלי"
          cancelLabel="לא"
          destructive={true}
          isBusy={
            !!stallCancelTarget &&
            cancellingStallId === stallCancelTarget.stallBookingId
          }
          onConfirm={handleConfirmCancelStallBooking}
          onCancel={handleDismissStallCancelDialog}
        />

        <AppDialog
          visible={!!shavingsCancelTarget}
          title="ביטול הזמנת נסורת"
          message="האם לבטל את הזמנת הנסורת?"
          confirmLabel="כן, בטלי"
          cancelLabel="לא"
          destructive={true}
          isBusy={
            !!shavingsCancelTarget &&
            cancellingShavingsId ===
              "shavings:" + shavingsCancelTarget.shavingsOrderId
          }
          onConfirm={handleConfirmCancelShavingsFromHistory}
          onCancel={handleDismissShavingsCancelDialog}
        />
      </ScrollView>
    </MobileScreenLayout>
  );
}
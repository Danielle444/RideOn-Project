import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";

import MobileScreenLayout from "../../../../components/mobile-nav/MobileScreenLayout";
import CompetitionMenuTemplate from "../../../../components/mobile-nav/CompetitionMenuTemplate";
import AppDialog from "../../../../components/common/AppDialog";

import { getAdminBottomNavConfig } from "../../../../navigation/bottomNavConfigs";
import { getAdminCompetitionMenuItems } from "../../../../navigation/competitionMenuConfigs";

import { useActiveRole } from "../../../../context/ActiveRoleContext";
import { useCompetition } from "../../../../context/CompetitionContext";

import useAdminCompetitionEntriesList from "../../../../hooks/useAdminCompetitionEntriesList";
import useRegistrationStepStatus from "../../../../hooks/useRegistrationStepStatus";

import styles from "../../../../styles/adminCompetitionClassesStyles";

import Button from "../../../../components/ui/Button";

import CompetitionEntryCreateModal from "../../../../components/competitions/CompetitionEntryCreateModal";

import CompetitionEntryCard from "../../../../components/competitions/CompetitionEntryCard";

import EntriesViewModal from "../../../../components/competitions/EntriesViewModal";

import DuplicateEntriesModal from "../../../../components/competitions/DuplicateEntriesModal";

import RegistrationStepNotice from "../../../../components/competitions/RegistrationStepNotice";

import { adminCancelEntry } from "../../../../services/entriesService";
import { showToast } from "../../../../services/toastService";
import { buildRegistrationStepNoticeMessage } from "../../../../utils/registrationStepNoticeMessages";
import {
  getCancellationConfirmationText,
  PAYER_ACCOUNT_ITEM_LABEL,
  DIRECT_CANCELLATION_COPY,
} from "../../../../utils/payerAccountCopy";
import { createInFlightGuard } from "../../../../utils/inFlightGuard";

import {
  LIFECYCLE_STATE,
  resolveClassLifecycleState,
} from "../../../../utils/payerAccountLifecycle";
import { sortClassesByVerifiedDate } from "../../../../utils/payerAccountBands";
import { getLifecycleBandHeader } from "../../../../utils/payerAccountCopy";

// Duplicate-from-previous-competition is hidden (off-design modal, escape-trap).
// Flip to true to restore. Modal + utils remain in the repo.
const DUPLICATE_ENTRIES_ENABLED = false;

// CAP-10: this admin surface's items (usp_getmycompetitionentries +
// usp_getmycompetitionentrystatusflags, verified live 2026-08-06) carry
// hasPendingCancellation/hasPendingChange in addition to entryStatus - a
// richer shape than the payer account's classes[] items, which
// resolveClassLifecycleState alone was built against (no pending signal
// there, per that file's own header comment). Layering the pending check on
// top of the shared resolver - rather than editing payerAccountLifecycle.js
// itself - keeps the payer-account contract and its tests untouched while
// still using the real, verified data this surface has.
function resolveEntryLifecycleState(item) {
  var baseState = resolveClassLifecycleState(item);

  if (baseState !== LIFECYCLE_STATE.ACTIVE) {
    return baseState;
  }

  if (item && item.hasPendingCancellation === true) {
    return LIFECYCLE_STATE.PENDING_CANCELLATION;
  }

  if (item && item.hasPendingChange === true) {
    return LIFECYCLE_STATE.PENDING_CHANGE;
  }

  return baseState;
}

// Mirrors bandItems/bandAndSortClasses in payerAccountBands.js exactly,
// swapping only the per-item resolver for the one above. Sorting is the
// shared, verified-date sorter - reused directly, not reimplemented.
function bandAndSortEntries(items) {
  var active = [];
  var pending = [];
  var cancelled = [];

  (Array.isArray(items) ? items : []).forEach(function (item) {
    var state = resolveEntryLifecycleState(item);

    if (state === LIFECYCLE_STATE.CANCELLED) {
      cancelled.push(item);
      return;
    }

    if (
      state === LIFECYCLE_STATE.PENDING_CHANGE ||
      state === LIFECYCLE_STATE.PENDING_CANCELLATION
    ) {
      pending.push(item);
      return;
    }

    if (state === LIFECYCLE_STATE.ACTIVE) {
      active.push(item);
    }
  });

  return {
    active: sortClassesByVerifiedDate(active),
    pending: sortClassesByVerifiedDate(pending),
    cancelled: sortClassesByVerifiedDate(cancelled),
  };
}

function renderBandDivider(headerText, keyValue) {
  if (!headerText) {
    return null;
  }

  return (
    <Text key={keyValue} style={styles.filterTitle}>
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

export default function AdminCompetitionClassesScreen(props) {
  var activeRoleContext = useActiveRole();

  var competitionContext = useCompetition();

  var activeRole = activeRoleContext.activeRole;

  var activeCompetition = competitionContext.activeCompetition;

  var entries = useAdminCompetitionEntriesList({
    activeRole: activeRole,
    activeCompetition: activeCompetition,
  });

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

  var [showFilters, setShowFilters] = useState(false);

  var [showCreateModal, setShowCreateModal] = useState(false);

  var [editingItem, setEditingItem] = useState(null);

  var [entriesViewOpen, setEntriesViewOpen] = useState(false);

  var [entriesViewFocusClass, setEntriesViewFocusClass] = useState(null);

  var [duplicateModalOpen, setDuplicateModalOpen] = useState(false);

  var [cancelEntryTarget, setCancelEntryTarget] = useState(null);

  // Synchronous in-flight guard for direct entry cancellation - same
  // reusable helper and per-key-held-through-refresh pattern as
  // AdminCompetitionPayerAccountScreen's stall cancellation. Initialized
  // lazily so createInFlightGuard() runs once, not on every render.
  var cancelGuardRef = useRef(null);
  if (cancelGuardRef.current === null) {
    cancelGuardRef.current = createInFlightGuard();
  }

  // Force-closes an already-open create/edit/duplicate modal the moment
  // Classes becomes disabled or read-only (e.g. the competition ends) - a
  // still-open modal must not remain a live mutation path just because it
  // was opened before eligibility changed.
  useEffect(
    function () {
      if (availability.classes.isEnabled) {
        return;
      }

      if (showCreateModal) {
        setShowCreateModal(false);
        setEditingItem(null);
      }

      if (duplicateModalOpen) {
        setDuplicateModalOpen(false);
      }
    },
    [availability.classes.isEnabled, showCreateModal, duplicateModalOpen],
  );

  var bandedEntries = useMemo(
    function () {
      return bandAndSortEntries(entries.filteredItems);
    },
    [entries.filteredItems],
  );

  function handleMutationSuccess() {
    entries.handleRefresh();
    reloadRegistrationStepStatus();
  }

  function handleViewAllEntries() {
    setEntriesViewFocusClass(null);
    setEntriesViewOpen(true);
  }

  function handleViewEntriesForClass(entryItem) {
    if (!entryItem || !entryItem.classInCompId) return;
    setEntriesViewFocusClass(entryItem.classInCompId);
    setEntriesViewOpen(true);
  }

  function handleCloseEntriesView() {
    setEntriesViewOpen(false);
    setEntriesViewFocusClass(null);
  }

  function handleCompetitionMenuPress(item) {
    props.navigation.navigate(item.screen);
  }

  async function handleExitCompetition() {
    await competitionContext.clearCompetition();

    props.navigation.navigate("AdminCompetitionsBoard");
  }

  function handleEditEntry(item) {
    if (!availability.classes.isEnabled) {
      return;
    }

    setEditingItem(item);

    setShowCreateModal(true);
  }

  // Phase 3C/CAP-6: direct admin cancellation via usp_admincancelentry
  // (same endpoint/copy AdminCompetitionPayerAccountScreen already uses) -
  // no ChangeEntryRequest is created from this screen anymore.
  function handleCancelEntry(item) {
    if (!availability.classes.isEnabled) {
      return;
    }

    setCancelEntryTarget(item);
  }

  function handleCancelEntryDialogCancel() {
    setCancelEntryTarget(null);
  }

  async function handleCancelEntryDialogConfirm() {
    var item = cancelEntryTarget;

    setCancelEntryTarget(null);

    if (!item || !availability.classes.isEnabled) {
      return;
    }

    var guardKey = "entry:" + item.entryId;

    if (!cancelGuardRef.current.tryAcquire(guardKey)) {
      return;
    }

    try {
      await adminCancelEntry(
        item.entryId,
        activeCompetition?.competitionId,
        activeRole?.ranchId,
      );

      // The cancel succeeded - refresh is best-effort and must not
      // be able to turn this into a reported failure.
      showToast(DIRECT_CANCELLATION_COPY.text, "success");

      try {
        await entries.handleRefresh();
        reloadRegistrationStepStatus();
      } catch (refreshError) {
        console.log("CANCEL ENTRY REFRESH ERROR", refreshError);
      }
    } catch (error) {
      showToast("אירעה שגיאה בביטול ההרשמה", "error");

      console.log(error);
    } finally {
      cancelGuardRef.current.release(guardKey);
    }
  }

  function renderFilterChip(label, isActive, onPress, keyValue) {
    return (
      <Pressable
        key={keyValue || label}
        style={[styles.filterChip, isActive ? styles.filterChipActive : null]}
        onPress={onPress}
      >
        <Text
          style={[
            styles.filterChipText,
            isActive ? styles.filterChipTextActive : null,
          ]}
        >
          {label}
        </Text>
      </Pressable>
    );
  }

  function renderSummaryBox(label, number, filterValue) {
    var isActive = entries.paymentFilter === filterValue;

    return (
      <Pressable
        style={[styles.summaryBox, isActive ? styles.summaryBoxActive : null]}
        onPress={function () {
          entries.setPaymentFilter(filterValue);
        }}
      >
        <Text
          style={[
            styles.summaryNumber,
            isActive ? styles.summaryNumberActive : null,
          ]}
        >
          {number}
        </Text>

        <Text
          style={[
            styles.summaryLabel,
            isActive ? styles.summaryLabelActive : null,
          ]}
        >
          {label}
        </Text>
      </Pressable>
    );
  }

  function renderFilters() {
    return (
      <View style={styles.filterSection}>
        <Text style={styles.filterTitle}>סינון לפי תשלום</Text>

        <View style={styles.chipsRow}>
          {renderFilterChip(
            "כל ההרשמות",
            entries.paymentFilter === "all",
            function () {
              entries.setPaymentFilter("all");
            },
          )}

          {renderFilterChip(
            "שולם",
            entries.paymentFilter === "paid",
            function () {
              entries.setPaymentFilter("paid");
            },
          )}

          {renderFilterChip(
            "לא שולם",
            entries.paymentFilter === "unpaid",
            function () {
              entries.setPaymentFilter("unpaid");
            },
          )}
        </View>

        <Text style={styles.filterTitle}>ימים</Text>

        <View style={styles.chipsRow}>
          {renderFilterChip(
            "כל הימים",
            entries.dateFilter === "all",
            function () {
              entries.setDateFilter("all");
            },
          )}

          {entries.availableDates.map(function (dateItem) {
            return renderFilterChip(
              dateItem.label,
              entries.dateFilter === dateItem.value,
              function () {
                entries.setDateFilter(dateItem.value);
              },
              "date-" + dateItem.value,
            );
          })}
        </View>

        <Pressable
          style={styles.clearFiltersButton}
          onPress={entries.resetFilters}
        >
          <Text style={styles.clearFiltersText}>ניקוי כל הסינונים</Text>
        </Pressable>
      </View>
    );
  }

  function renderContent() {
    if (entries.loading) {
      return (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#7B5A4D" />

          <Text style={styles.loadingText}>טוענת מקצים...</Text>
        </View>
      );
    }

    if (entries.screenError) {
      return (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{entries.screenError}</Text>
        </View>
      );
    }

    if (entries.filteredItems.length === 0) {
      return (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>לא נמצאו מקצים</Text>

          <Text style={styles.emptyText}>
            לא קיימות הרשמות למקצים שתואמות לחיפוש או לסינון שבחרת.
          </Text>
        </View>
      );
    }

    return renderBandedSections(bandedEntries, function (item) {
      return (
        <CompetitionEntryCard
          key={String(item.entryId)}
          item={item}
          formatDate={entries.formatDate}
          onEdit={handleEditEntry}
          onCancel={handleCancelEntry}
          onViewEntries={handleViewEntriesForClass}
        />
      );
    });
  }

  return (
    <MobileScreenLayout
      title="מקצים"
      subtitle=""
      activeBottomTab={null}
      bottomNavItems={getAdminBottomNavConfig(props.navigation)}
      menuContent={function ({ closeMenu, requestExitConfirm }) {
        return (
          <CompetitionMenuTemplate
            activeKey="classes"
            closeMenu={closeMenu}
            requestExitConfirm={requestExitConfirm}
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
        contentContainerStyle={styles.screenContent}
        refreshControl={
          <RefreshControl
            refreshing={entries.refreshing}
            onRefresh={entries.handleRefresh}
          />
        }
      >
        {registrationStatusError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{registrationStatusError}</Text>

            <Button
              variant="outline"
              label="נסה שוב"
              onPress={reloadRegistrationStepStatus}
              style={{ marginTop: 8 }}
            />
          </View>
        ) : null}

        {!availability.classes.isEnabled ? (
          <RegistrationStepNotice
            message={buildRegistrationStepNoticeMessage(availability.classes)}
            isLoading={isRegistrationStatusLoading}
            containerStyle={styles.errorCard}
            textStyle={styles.errorText}
          />
        ) : null}

        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>ההרשמות שלי למקצים</Text>

          <Text style={styles.helperText}>
            כאן מוצגות כל ההרשמות למקצים שיצרת עבור התחרות הפעילה.
          </Text>

          <View style={styles.summaryRow}>
            {renderSummaryBox("סה״כ הרשמות", entries.items.length, "all")}

            {renderSummaryBox(
              "שולמו",
              entries.items.filter(function (item) {
                return item.isPaid;
              }).length,
              "paid",
            )}

            {renderSummaryBox(
              "לא שולמו",
              entries.items.filter(function (item) {
                return !item.isPaid;
              }).length,
              "unpaid",
            )}
          </View>
        </View>

        <View style={styles.searchCard}>
          <Text style={styles.fieldLabel}>חיפוש</Text>

          <TextInput
            value={entries.searchText}
            onChangeText={entries.setSearchText}
            placeholder="חיפוש לפי מקצה, סוס, רוכב, מאמן או משלם"
            placeholderTextColor="#9E8A7F"
            style={styles.textInput}
            textAlign="right"
          />
        </View>

        <View style={styles.filterToggleCard}>
          <Pressable
            style={styles.filterToggleButton}
            onPress={function () {
              setShowFilters(!showFilters);
            }}
          >
            <Text style={styles.filterToggleText}>
              {showFilters ? "הסתר סינונים" : "הצג סינונים"}
            </Text>

            <Text style={styles.filterToggleIcon}>
              {showFilters ? "▲" : "▼"}
            </Text>
          </Pressable>

          {showFilters ? renderFilters() : null}
        </View>

        <Button
          variant="solid"
          label="+ הוסף הרשמה למקצה"
          disabled={!availability.classes.isEnabled}
          onPress={function () {
            if (!availability.classes.isEnabled) {
              return;
            }

            setShowCreateModal(true);
          }}
        />

        {DUPLICATE_ENTRIES_ENABLED ? (
          <Button
            variant="outline"
            label="שכפל הרשמות מתחרות קודמת"
            disabled={!availability.classes.isEnabled}
            onPress={function () {
              if (!availability.classes.isEnabled) {
                return;
              }

              setDuplicateModalOpen(true);
            }}
            style={{ marginTop: 10, marginBottom: 12 }}
          />
        ) : null}

        <Button
          variant="outline"
          label="צפה בסדר כניסות בכל התחרות"
          onPress={handleViewAllEntries}
          style={{ marginBottom: 12 }}
        />

        <CompetitionEntryCreateModal
          visible={showCreateModal && availability.classes.isEnabled}
          editItem={editingItem}
          useDirectAdminEdit={true}
          onClose={function () {
            setShowCreateModal(false);

            setEditingItem(null);
          }}
          onCreated={handleMutationSuccess}
        />

        <AppDialog
          visible={!!cancelEntryTarget}
          type="warning"
          title="ביטול הרשמה"
          message={getCancellationConfirmationText(PAYER_ACCOUNT_ITEM_LABEL.entry)}
          confirmLabel="כן"
          cancelLabel="לא"
          destructive={true}
          onConfirm={handleCancelEntryDialogConfirm}
          onCancel={handleCancelEntryDialogCancel}
        />

        <EntriesViewModal
          isOpen={entriesViewOpen}
          competitionId={activeCompetition?.competitionId}
          ranchId={activeRole?.ranchId}
          ranchName={activeRole?.ranchName}
          focusClassInCompId={entriesViewFocusClass}
          onClose={handleCloseEntriesView}
        />

        {DUPLICATE_ENTRIES_ENABLED ? (
          <DuplicateEntriesModal
            isOpen={duplicateModalOpen && availability.classes.isEnabled}
            activeCompetitionId={activeCompetition?.competitionId}
            ranchId={activeRole?.ranchId}
            onClose={function () {
              setDuplicateModalOpen(false);
            }}
            onDuplicated={handleMutationSuccess}
          />
        ) : null}

        <Text style={styles.resultsText}>
          מוצגות {entries.filteredItems.length} מתוך {entries.items.length}{" "}
          הרשמות
        </Text>

        {renderContent()}
      </ScrollView>
    </MobileScreenLayout>
  );
}

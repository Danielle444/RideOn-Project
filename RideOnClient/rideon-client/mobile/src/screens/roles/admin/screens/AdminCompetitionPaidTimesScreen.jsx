import {
  ActivityIndicator,
  Alert,
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

import { getAdminBottomNavConfig } from "../../../../navigation/bottomNavConfigs";
import { getAdminCompetitionMenuItems } from "../../../../navigation/competitionMenuConfigs";

import { useActiveRole } from "../../../../context/ActiveRoleContext";
import { useCompetition } from "../../../../context/CompetitionContext";

import useAdminCompetitionPaidTimesList from "../../../../hooks/useAdminCompetitionPaidTimesList";
import useRegistrationStepStatus from "../../../../hooks/useRegistrationStepStatus";

import { cancelPaidTimeRequest } from "../../../../services/paidTimeRequestsService";
import { buildRegistrationStepNoticeMessage } from "../../../../utils/registrationStepNoticeMessages";
import { createInFlightGuard } from "../../../../utils/inFlightGuard";

import { LIFECYCLE_STATE } from "../../../../utils/payerAccountLifecycle";
import { bandAndSortPaidTimes } from "../../../../utils/payerAccountBands";
import { getLifecycleBandHeader } from "../../../../utils/payerAccountCopy";

import PaidTimeListItemCard from "../../../../components/competitions/adminPaidTimes/PaidTimeListItemCard";
import PaidTimeScheduleView from "../../../../components/competitions/adminPaidTimes/PaidTimeScheduleView";
import PaidTimeCreateModal from "../../../../components/competitions/PaidTimeCreateModal";
import AddPaidTimeButton from "../../../../components/competitions/adminPaidTimes/AddPaidTimeButton";
import SlotScheduleModal from "../../../../components/competitions/adminPaidTimes/SlotScheduleModal";
import RegistrationStepNotice from "../../../../components/competitions/RegistrationStepNotice";

import styles from "../../../../styles/adminCompetitionPaidTimesStyles";

// CAP-10: this admin surface's items carry a `status` field straight off
// usp_getmypaidtimerequestsforcompetition (verified live 2026-08-06) - the
// exact shape resolvePaidTimeLifecycleState and bandAndSortPaidTimes were
// already built for, so both are reused directly with no adapter. Applied
// only to the "list" view mode below - the "schedule" mode is a separate
// day/slot/entry grid built by PaidTimeScheduleView (see CAP-2/CAP-3).
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

export default function AdminCompetitionPaidTimesScreen(props) {
  var activeRoleContext = useActiveRole();
  var competitionContext = useCompetition();

  var activeRole = activeRoleContext.activeRole;
  var activeCompetition = competitionContext.activeCompetition;

  var paidTimes = useAdminCompetitionPaidTimesList({
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
  var [editingItem, setEditingItem] = useState(null);
  var [cancellingId, setCancellingId] = useState(null);
  var [viewMode, setViewMode] = useState("list");
  var [expandedIds, setExpandedIds] = useState({});
  var [viewingSlotId, setViewingSlotId] = useState(null);

  // CAP-3: יום/סלוט בתצוגת הלו"ז מתחילים תמיד מכווצים (allSectionsExpanded
  // = false) - "ברירת מחדל: כותרות ימים בלבד". כל תג/סלוט שנלחץ בנפרד
  // נכנס ל-overrides מול ברירת המחדל הגלובלית, כדי ש"הרחב הכל"/"מזער הכל"
  // לא יצטרכו להכיר את מרחב מפתחות היום/הסלוט (מחושב בתוך
  // PaidTimeScheduleView בלבד) - ראו isDayExpanded/isSlotExpanded למטה.
  var [allSectionsExpanded, setAllSectionsExpanded] = useState(false);
  var [dayExpandOverrides, setDayExpandOverrides] = useState({});
  var [slotExpandOverrides, setSlotExpandOverrides] = useState({});

  // Synchronous in-flight guard for paid-time cancellation on this screen -
  // cancellingId above is UI feedback only (async state), not a correctness
  // guard: two rapid taps can both pass a "busy?" check before either render
  // reflects the first one. Own ref/key-space, independent of any guard on
  // AdminCompetitionPayerAccountScreen's own paid-time cancel handler - a
  // different screen instance, so the two can never interfere. Initialized
  // lazily so createInFlightGuard() runs once, not on every render.
  var paidTimeCancelGuardRef = useRef(null);
  if (paidTimeCancelGuardRef.current === null) {
    paidTimeCancelGuardRef.current = createInFlightGuard();
  }

  var bandedPaidTimes = useMemo(
    function () {
      return bandAndSortPaidTimes(paidTimes.filteredItems);
    },
    [paidTimes.filteredItems],
  );

  // Force-closes an already-open edit modal the moment Paid Time becomes
  // disabled or read-only - a still-open modal must not remain a live
  // mutation path just because it was opened before eligibility changed.
  // The edit PaidTimeCreateModal is conditionally MOUNTED (via editingItem),
  // so resetting editingItem fully unmounts it.
  useEffect(
    function () {
      if (!availability.paidTimes.isEnabled && editingItem) {
        setEditingItem(null);
      }
    },
    [availability.paidTimes.isEnabled, editingItem],
  );

  function handleViewSlotSchedule(slotId) {
    setViewingSlotId(slotId);
  }

  function isExpanded(id) {
    return !!expandedIds[id];
  }

  function toggleExpand(id) {
    setExpandedIds(function (prev) {
      var next = Object.assign({}, prev);
      if (next[id]) {
        delete next[id];
      } else {
        next[id] = true;
      }
      return next;
    });
  }

  function isDayExpanded(dayKey) {
    return Object.prototype.hasOwnProperty.call(dayExpandOverrides, dayKey)
      ? dayExpandOverrides[dayKey]
      : allSectionsExpanded;
  }

  function toggleDay(dayKey) {
    var nextValue = !isDayExpanded(dayKey);
    setDayExpandOverrides(function (prev) {
      var next = Object.assign({}, prev);
      next[dayKey] = nextValue;
      return next;
    });
  }

  function isSlotExpanded(slotKey) {
    return Object.prototype.hasOwnProperty.call(slotExpandOverrides, slotKey)
      ? slotExpandOverrides[slotKey]
      : allSectionsExpanded;
  }

  function toggleSlot(slotKey) {
    var nextValue = !isSlotExpanded(slotKey);
    setSlotExpandOverrides(function (prev) {
      var next = Object.assign({}, prev);
      next[slotKey] = nextValue;
      return next;
    });
  }

  function expandAll() {
    var next = {};
    paidTimes.filteredItems.forEach(function (it) {
      next[it.paidTimeRequestId] = true;
    });
    setExpandedIds(next);
    setAllSectionsExpanded(true);
    setDayExpandOverrides({});
    setSlotExpandOverrides({});
  }

  function collapseAll() {
    setExpandedIds({});
    setAllSectionsExpanded(false);
    setDayExpandOverrides({});
    setSlotExpandOverrides({});
  }

  function handleCompetitionMenuPress(item) {
    props.navigation.navigate(item.screen);
  }

  async function handleExitCompetition() {
    await competitionContext.clearCompetition();
    props.navigation.navigate("AdminCompetitionsBoard");
  }

  function openEdit(item) {
    if (!availability.paidTimes.isEnabled) {
      return;
    }

    setEditingItem(item);
  }

  function closeEdit() {
    setEditingItem(null);
  }

  function confirmCancel(item) {
    if (!availability.paidTimes.isEnabled) {
      return;
    }

    var withinDay = item.hoursUntilStart != null && item.hoursUntilStart <= 24;
    var title = withinDay
      ? "ביטול בתוך 24 שעות - חיוב מלא"
      : "ביטול פייד טיים";
    var body = withinDay
      ? "שים לב: הביטול מתבצע פחות מ-24 שעות לפני המועד. במידה ותאשר, תחויב בתשלום מלא. הסלוט יתפנה לרוכב אחר."
      : "ביטול הבקשה ישחרר את הסלוט לרוכב אחר. עפ\"י כללי העסק חיוב מלא חל. להמשיך?";

    Alert.alert(
      title,
      body,
      [
        { text: "חזרה", style: "cancel" },
        {
          text: withinDay ? "אישור וחיוב" : "אישור ביטול",
          style: "destructive",
          onPress: function () {
            handleCancel(item);
          },
        },
      ],
      { cancelable: true }
    );
  }

  async function handleCancel(item) {
    if (!availability.paidTimes.isEnabled) {
      return;
    }

    var guardKey = item.paidTimeRequestId;

    if (!paidTimeCancelGuardRef.current.tryAcquire(guardKey)) {
      return;
    }

    try {
      setCancellingId(guardKey);
      await cancelPaidTimeRequest({
        paidTimeRequestId: item.paidTimeRequestId,
        ranchId: activeRole?.ranchId,
      });
      await paidTimes.handleRefresh();
    } catch (err) {
      var msg = err?.response?.data || err?.message || "אירעה שגיאה";
      Alert.alert("שגיאה", String(msg));
    } finally {
      setCancellingId(null);
      paidTimeCancelGuardRef.current.release(guardKey);
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
    var isActive = paidTimes.statusFilter === filterValue;
    return (
      <Pressable
        style={[styles.summaryBox, isActive ? styles.summaryBoxActive : null]}
        onPress={function () {
          paidTimes.setStatusFilter(filterValue);
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
        <Text style={styles.filterTitle}>סינון מהיר</Text>

        <View style={styles.chipsRow}>
          {renderFilterChip("כל התשלומים", paidTimes.paymentFilter === "all", function () {
            paidTimes.setPaymentFilter("all");
          })}
          {renderFilterChip("שולם", paidTimes.paymentFilter === "paid", function () {
            paidTimes.setPaymentFilter("paid");
          })}
          {renderFilterChip("לא שולם", paidTimes.paymentFilter === "unpaid", function () {
            paidTimes.setPaymentFilter("unpaid");
          })}
        </View>

        <View style={styles.chipsRow}>
          {renderFilterChip("כל הסוגים", paidTimes.productFilter === "all", function () {
            paidTimes.setProductFilter("all");
          })}
          {renderFilterChip("קצר", paidTimes.productFilter === "short", function () {
            paidTimes.setProductFilter("short");
          })}
          {renderFilterChip("ארוך", paidTimes.productFilter === "long", function () {
            paidTimes.setProductFilter("long");
          })}
        </View>

        <Text style={styles.filterTitle}>ימים</Text>
        <View style={styles.chipsRow}>
          {renderFilterChip("כל הימים", paidTimes.dateFilter === "all", function () {
            paidTimes.setDateFilter("all");
          })}
          {paidTimes.availableDates.map(function (dateItem) {
            return renderFilterChip(
              dateItem.label,
              paidTimes.dateFilter === dateItem.value,
              function () {
                paidTimes.setDateFilter(dateItem.value);
              },
              "date-" + dateItem.value
            );
          })}
        </View>

        <Text style={styles.filterTitle}>סלוטים</Text>
        <View style={styles.chipsRow}>
          {renderFilterChip("כל הסלוטים", paidTimes.slotFilter === "all", function () {
            paidTimes.setSlotFilter("all");
          })}
          {paidTimes.availableSlots.map(function (slotItem) {
            return renderFilterChip(
              slotItem.label,
              paidTimes.slotFilter === slotItem.value,
              function () {
                paidTimes.setSlotFilter(slotItem.value);
              },
              "slot-" + slotItem.value
            );
          })}
        </View>

        <Pressable style={styles.clearFiltersButton} onPress={paidTimes.resetFilters}>
          <Text style={styles.clearFiltersText}>ניקוי כל הסינונים</Text>
        </Pressable>
      </View>
    );
  }

  function renderContent() {
    if (paidTimes.loading) {
      return (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#7B5A4D" />
          <Text style={styles.loadingText}>טוענת פייד טיימים...</Text>
        </View>
      );
    }

    if (paidTimes.screenError) {
      return (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{paidTimes.screenError}</Text>
        </View>
      );
    }

    if (paidTimes.filteredItems.length === 0) {
      return (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>לא נמצאו פייד טיימים</Text>
          <Text style={styles.emptyText}>
            לא קיימות בקשות פייד טיים שתואמות לחיפוש או לסינון שבחרת.
          </Text>
        </View>
      );
    }

    if (viewMode === "schedule") {
      return (
        <PaidTimeScheduleView
          items={paidTimes.filteredItems}
          isExpanded={isExpanded}
          onToggleExpand={toggleExpand}
          isDayExpanded={isDayExpanded}
          onToggleDay={toggleDay}
          isSlotExpanded={isSlotExpanded}
          onToggleSlot={toggleSlot}
          onEdit={openEdit}
          onCancel={confirmCancel}
          cancellingId={cancellingId}
          formatDate={paidTimes.formatDate}
          formatTime={paidTimes.formatTime}
          onViewSlotSchedule={handleViewSlotSchedule}
        />
      );
    }

    return renderBandedSections(bandedPaidTimes, function (item) {
      return (
        <PaidTimeListItemCard
          key={String(item.paidTimeRequestId)}
          item={item}
          isExpanded={isExpanded(item.paidTimeRequestId)}
          onToggleExpand={function () {
            toggleExpand(item.paidTimeRequestId);
          }}
          onEdit={openEdit}
          onCancel={confirmCancel}
          cancellingId={cancellingId}
          formatDate={paidTimes.formatDate}
          formatTime={paidTimes.formatTime}
          onViewSlotSchedule={handleViewSlotSchedule}
        />
      );
    });
  }

  return (
    <MobileScreenLayout
      title="פייד טיימים"
      subtitle=""
      activeBottomTab={null}
      bottomNavItems={getAdminBottomNavConfig(props.navigation)}
      menuContent={function ({ closeMenu }) {
        return (
          <CompetitionMenuTemplate
            activeKey="paid-time"
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
        contentContainerStyle={styles.screenContent}
        refreshControl={
          <RefreshControl
            refreshing={paidTimes.refreshing}
            onRefresh={paidTimes.handleRefresh}
          />
        }
      >
        {registrationStatusError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{registrationStatusError}</Text>

            <Pressable
              style={styles.primaryButton}
              onPress={reloadRegistrationStepStatus}
            >
              <Text style={styles.primaryButtonText}>נסה שוב</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>הפייד טיימים שלי</Text>
          <Text style={styles.helperText}>
            כאן מוצגות כל בקשות הפייד טיים שיצרת עבור התחרות הפעילה.
          </Text>

          <View style={styles.summaryRow}>
            {renderSummaryBox(
              "סה״כ בקשות",
              paidTimes.filteredItems.length,
              "all",
            )}
            {renderSummaryBox(
              "שובצו",
              paidTimes.filteredItems.filter(function (item) {
                return item.isAssigned && item.assignedSlotIsPublished;
              }).length,
              "assigned"
            )}
            {renderSummaryBox(
              "טרם שובצו",
              paidTimes.filteredItems.filter(function (item) {
                return !(item.isAssigned && item.assignedSlotIsPublished);
              }).length,
              "pending"
            )}
          </View>
        </View>

        {availability.paidTimes.isEnabled ? (
          <AddPaidTimeButton
            paidTimesStepAvailability={availability.paidTimes}
            isRegistrationStatusLoading={isRegistrationStatusLoading}
            onCreated={paidTimes.handleRefresh}
          />
        ) : (
          <RegistrationStepNotice
            message={buildRegistrationStepNoticeMessage(
              availability.paidTimes,
            )}
            isLoading={isRegistrationStatusLoading}
            containerStyle={styles.errorCard}
            textStyle={styles.errorText}
          />
        )}

        <View style={styles.searchCard}>
          <Text style={styles.fieldLabel}>חיפוש</Text>
          <TextInput
            value={paidTimes.searchText}
            onChangeText={paidTimes.setSearchText}
            placeholder="חיפוש לפי סוס, מאמן, משלם או מגרש"
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
            <Text style={styles.filterToggleText}>סינון</Text>
            <Text style={styles.filterToggleIcon}>
              {showFilters ? "▲" : "▼"}
            </Text>
          </Pressable>

          {showFilters ? renderFilters() : null}
        </View>

        <View style={{ flexDirection: "row-reverse", gap: 8, marginBottom: 10 }}>
          <Pressable
            onPress={function () {
              setViewMode("list");
            }}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 8,
              backgroundColor: viewMode === "list" ? "#7B5A4D" : "#FFFFFF",
              borderWidth: 1,
              borderColor: "#7B5A4D",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: viewMode === "list" ? "#FFFFFF" : "#7B5A4D",
                fontWeight: "700",
              }}
            >
              רשימה
            </Text>
          </Pressable>
          <Pressable
            onPress={function () {
              setViewMode("schedule");
            }}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 8,
              backgroundColor: viewMode === "schedule" ? "#7B5A4D" : "#FFFFFF",
              borderWidth: 1,
              borderColor: "#7B5A4D",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: viewMode === "schedule" ? "#FFFFFF" : "#7B5A4D",
                fontWeight: "700",
              }}
            >
              לו"ז שיבוצים
            </Text>
          </Pressable>
        </View>

        <View
          style={{
            flexDirection: "row-reverse",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <Text style={styles.resultsText}>
            מוצגות {paidTimes.filteredItems.length} מתוך{" "}
            {paidTimes.items.length} בקשות
          </Text>
          <View style={{ flexDirection: "row-reverse", gap: 6 }}>
            <Pressable
              onPress={expandAll}
              style={{
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderRadius: 6,
                borderWidth: 1,
                borderColor: "#D9CFC2",
              }}
            >
              <Text style={{ fontSize: 12, color: "#5A4036" }}>הרחב הכל</Text>
            </Pressable>
            <Pressable
              onPress={collapseAll}
              style={{
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderRadius: 6,
                borderWidth: 1,
                borderColor: "#D9CFC2",
              }}
            >
              <Text style={{ fontSize: 12, color: "#5A4036" }}>מזער הכל</Text>
            </Pressable>
          </View>
        </View>

        {renderContent()}
      </ScrollView>

      {editingItem ? (
        <PaidTimeCreateModal
          visible={true}
          editPaidTimeRequestId={editingItem.paidTimeRequestId}
          paidTimesStepAvailability={availability.paidTimes}
          isRegistrationStatusLoading={isRegistrationStatusLoading}
          onClose={closeEdit}
          onSaved={paidTimes.handleRefresh}
        />
      ) : null}

      {viewingSlotId ? (
        <SlotScheduleModal
          slotId={viewingSlotId}
          competitionId={activeCompetition?.competitionId}
          ranchId={activeRole?.ranchId}
          onClose={function () {
            setViewingSlotId(null);
          }}
        />
      ) : null}

    </MobileScreenLayout>
  );
}

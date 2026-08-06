import React, { useEffect, useMemo, useState } from "react";

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

import MobileScreenLayout from "../../../../components/mobile-nav/MobileScreenLayout";

import CompetitionMenuTemplate from "../../../../components/mobile-nav/CompetitionMenuTemplate";

import { getAdminBottomNavConfig } from "../../../../navigation/bottomNavConfigs";

import { getAdminCompetitionMenuItems } from "../../../../navigation/competitionMenuConfigs";

import { useActiveRole } from "../../../../context/ActiveRoleContext";

import { useCompetition } from "../../../../context/CompetitionContext";

import useAdminCompetitionPayerAccount from "../../../../hooks/useAdminCompetitionPayerAccount";

import useRegistrationStepStatus from "../../../../hooks/useRegistrationStepStatus";

import { canEditPaidTimeRow } from "../../../../utils/paidTimeEditAvailability";

import { getAvailableDatesForTab } from "../../../../utils/payerAccountAvailableDates";

import {
  bandAndSortPaidTimes,
  bandAndSortStalls,
  sortShavingsOrders,
  sortClassesByVerifiedDate,
} from "../../../../utils/payerAccountBands";

import { LIFECYCLE_STATE } from "../../../../utils/payerAccountLifecycle";

import {
  getLifecycleBandHeader,
  DIRECT_CANCELLATION_COPY,
} from "../../../../utils/payerAccountCopy";

import styles from "../../../../styles/adminCompetitionPayerAccountStyles";

import { adminCancelEntry } from "../../../../services/entriesService";

import { cancelPaidTimeRequest } from "../../../../services/paidTimeRequestsService";

import { createStallBookingCancelRequest } from "../../../../services/stallBookingsService";

import CompetitionEntryCreateModal from "../../../../components/competitions/CompetitionEntryCreateModal";

import PaidTimeCreateModal from "../../../../components/competitions/PaidTimeCreateModal";

import PaidTimeEditModal from "../../../../components/competitions/adminPaidTimes/PaidTimeEditModal";

import StallBookingCreateModal from "../../../../components/competitions/StallBookingCreateModal";

import StallBookingEditModal from "../../../../components/competitions/StallBookingEditModal";

function extractErrorMessage(err) {
  if (!err) return "אירעה שגיאה";
  var data = err.response && err.response.data;
  if (data) {
    if (typeof data === "string") return data;
    if (data.message) return String(data.message);
    if (data.error) return String(data.error);
    try {
      return JSON.stringify(data);
    } catch {
      return "אירעה שגיאה";
    }
  }
  if (err.message) return err.message;
  return "אירעה שגיאה";
}

function pickDateKey(dateValue) {
  if (!dateValue) return "no-date";
  try {
    return new Date(dateValue).toISOString().slice(0, 10);
  } catch {
    return String(dateValue);
  }
}

function formatCurrency(value) {
  var numberValue = Number(value || 0);

  return "₪" + numberValue.toLocaleString("he-IL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  try {
    return new Date(value).toLocaleDateString("he-IL");
  } catch {
    return String(value);
  }
}

function formatTime(value) {
  if (!value) {
    return "-";
  }

  return String(value).slice(0, 5);
}

function getStatusInfo(status) {
  var normalized = String(status || "").trim();

  if (normalized === "Paid") {
    return {
      text: "שולם",
      boxStyle: styles.statusPaid,
      textStyle: styles.statusTextPaid,
    };
  }

  if (normalized === "Partial") {
    return {
      text: "שולם חלקית",
      boxStyle: styles.statusPartial,
      textStyle: styles.statusTextPartial,
    };
  }

  if (normalized === "Unpaid") {
    return {
      text: "לא שולם",
      boxStyle: styles.statusUnpaid,
      textStyle: styles.statusTextUnpaid,
    };
  }

  return {
    text: "ללא סטטוס",
    boxStyle: styles.statusDefault,
    textStyle: styles.statusTextDefault,
  };
}

function getDisplayName(payer) {
  if (!payer) {
    return "משלם";
  }

  if (payer.fullName) {
    return payer.fullName;
  }

  return ((payer.firstName || "") + " " + (payer.lastName || "")).trim();
}

function renderPaymentBadge(isPaid, amount) {
  // Skip badge when there's nothing to pay
  if (amount !== undefined && Number(amount || 0) <= 0) {
    return null;
  }

  var status = isPaid
    ? getStatusInfo("Paid")
    : getStatusInfo("Unpaid");

  return (
    <View style={[styles.statusBadgeBase, status.boxStyle]}>
      <Text style={[styles.statusTextBase, status.textStyle]}>
        {status.text}
      </Text>
    </View>
  );
}

function renderEmpty(text) {
  return (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

// CAP-3: one divider per non-empty lifecycle band, reusing the existing
// sectionTitle style (already used for "סיכום לפי סוג חיוב" in the summary
// tab) rather than introducing new styling.
function renderBandDivider(headerText, keyValue) {
  if (!headerText) {
    return null;
  }

  return (
    <Text key={keyValue} style={styles.sectionTitle}>
      {headerText}
    </Text>
  );
}

// CAP-3: renders one item type's three lifecycle bands (active / pending /
// cancelled) in the required order, each under its own divider only when
// non-empty, using the caller's existing per-item card renderer unchanged.
function renderBandedSections(banded, renderCard) {
  var sections = [
    { key: "active", items: banded.active, header: getLifecycleBandHeader(LIFECYCLE_STATE.ACTIVE) },
    { key: "pending", items: banded.pending, header: getLifecycleBandHeader(LIFECYCLE_STATE.PENDING_CHANGE) },
    { key: "cancelled", items: banded.cancelled, header: getLifecycleBandHeader(LIFECYCLE_STATE.CANCELLED) },
  ];

  return sections.map(function (section) {
    if (section.items.length === 0) {
      return null;
    }

    return (
      <React.Fragment key={"band-" + section.key}>
        {renderBandDivider(section.header, "band-header-" + section.key)}
        {section.items.map(renderCard)}
      </React.Fragment>
    );
  });
}

export default function AdminCompetitionPayerAccountScreen(props) {
  var activeRoleContext = useActiveRole();

  var competitionContext = useCompetition();

  var activeRole = activeRoleContext.activeRole;

  var activeCompetition = competitionContext.activeCompetition;

  var routePayer = props.route?.params?.payer || null;

  var routeCompetition = props.route?.params?.competition || null;

  var [activeTab, setActiveTab] = useState("summary");

  var account = useAdminCompetitionPayerAccount({
    activeRole: activeRole,
    activeCompetition: activeCompetition,
    routePayer: routePayer,
    routeCompetition: routeCompetition,
  });

  var registrationStepStatus = useRegistrationStepStatus({
    competitionId: activeCompetition?.competitionId,
    ranchId: activeRole?.ranchId,
    enabled: true,
  });

  var paidTimesAvailability = registrationStepStatus.availability.paidTimes;

  var payer = account.payer || routePayer;

  var summary = account.summary || {};

  var [cancellingId, setCancellingId] = useState(null);

  var [searchText, setSearchText] = useState("");

  var [dateFilter, setDateFilter] = useState("all");

  var [paymentFilter, setPaymentFilter] = useState("all");

  var [showFilters, setShowFilters] = useState(false);

  var [showEntryCreateModal, setShowEntryCreateModal] = useState(false);

  var [showPaidTimeCreateModal, setShowPaidTimeCreateModal] = useState(false);

  var [showStallCreateModal, setShowStallCreateModal] = useState(false);

  var [editEntryItem, setEditEntryItem] = useState(null);

  var [editPaidTimeItem, setEditPaidTimeItem] = useState(null);

  var [editStallItem, setEditStallItem] = useState(null);

  // Force-closes an already-open Paid Time edit modal the moment the step
  // becomes disabled (competition end is the case that matters here) - same
  // pattern as AdminCompetitionPaidTimesScreen. Only the edit modal is
  // affected; cancellation has no equivalent gate and is untouched.
  useEffect(
    function () {
      if (!paidTimesAvailability.isEnabled && editPaidTimeItem) {
        setEditPaidTimeItem(null);
      }
    },
    [paidTimesAvailability.isEnabled, editPaidTimeItem],
  );

  var lockedPayerPersonId = payer
    ? payer.personId || payer.PersonId || null
    : null;

  function handleCompetitionMenuPress(item) {
    props.navigation.navigate(item.screen);
  }

  async function handleExitCompetition() {
    await competitionContext.clearCompetition();

    props.navigation.navigate("AdminCompetitionsBoard");
  }

  function confirmCancelEntry(item) {
    Alert.alert(
      "ביטול הרשמה",
      "האם לבטל את ההרשמה?",
      [
        { text: "לא", style: "cancel" },
        {
          text: "כן",
          style: "destructive",
          onPress: function () {
            doCancelEntry(item);
          },
        },
      ],
    );
  }

  // Phase 3C: direct admin cancellation via usp_admincancelentry - no
  // ChangeEntryRequest is created from mobile for this screen anymore.
  //
  // Mutation vs refresh are deliberately two separate steps, not one
  // try/catch: the mutation's own try/catch/finally decides success/failure
  // and resets cancellingId the instant the API call settles, so success
  // copy happens unconditionally once the cancel itself succeeded - never
  // gated on account.reload(). Refresh runs afterward, best-effort, in its
  // own try/catch, so a refresh failure can never be misreported as a failed
  // cancel or leave cancellingId stuck.
  async function doCancelEntry(item) {
    try {
      setCancellingId("entry:" + item.entryId);

      await adminCancelEntry(
        item.entryId,
        activeCompetition?.competitionId,
        activeRole?.ranchId,
      );
    } catch (err) {
      Alert.alert("שגיאה", extractErrorMessage(err));
      return;
    } finally {
      setCancellingId(null);
    }

    // The cancel succeeded - everything below is refresh, not mutation
    // outcome, and must not be able to turn this into a reported failure.
    Alert.alert("בוטל", DIRECT_CANCELLATION_COPY.text);

    // account.reload() already owns its own failure UX (sets its screenError
    // and shows its own Alert internally) and never rejects - this try/catch
    // is a defensive backstop only, so a future reload implementation that
    // DOES reject can never be attributed to the cancel that already
    // succeeded above.
    try {
      await account.reload();
    } catch (refreshError) {
      console.log("CANCEL ENTRY REFRESH ERROR", refreshError);
    }
  }

  function confirmCancelPaidTime(item) {
    Alert.alert("ביטול פייד טיים", "האם לבטל את הבקשה?", [
      { text: "לא", style: "cancel" },
      {
        text: "כן",
        style: "destructive",
        onPress: function () {
          doCancelPaidTime(item);
        },
      },
    ]);
  }

  async function doCancelPaidTime(item) {
    try {
      setCancellingId("paidTime:" + item.paidTimeRequestId);

      await cancelPaidTimeRequest({
        paidTimeRequestId: item.paidTimeRequestId,
        ranchId: activeRole?.ranchId,
      });

      Alert.alert("בוטל", "הבקשה בוטלה");

      await account.reload();
    } catch (err) {
      Alert.alert("שגיאה", extractErrorMessage(err));
    } finally {
      setCancellingId(null);
    }
  }

  function confirmCancelStall(item) {
    Alert.alert("ביטול תא", "האם לשלוח בקשת ביטול למזכירה?", [
      { text: "לא", style: "cancel" },
      {
        text: "כן",
        style: "destructive",
        onPress: function () {
          doCancelStall(item);
        },
      },
    ]);
  }

  async function doCancelStall(item) {
    try {
      setCancellingId("stall:" + item.stallBookingId);

      await createStallBookingCancelRequest({
        stallBookingId: item.stallBookingId,
        ranchId: activeRole?.ranchId,
      });

      Alert.alert("נשלח", "בקשת הביטול נשלחה למזכירה");

      await account.reload();
    } catch (err) {
      Alert.alert("שגיאה", extractErrorMessage(err));
    } finally {
      setCancellingId(null);
    }
  }

  function renderActions(idKey, isLocked, onEdit, onCancel, lockedLabel) {
    if (isLocked) {
      return (
        <View
          style={{
            marginTop: 10,
            padding: 8,
            backgroundColor: "#F0E5DC",
            borderRadius: 8,
          }}
        >
          <Text
            style={{
              color: "#8A7268",
              fontSize: 12,
              textAlign: "right",
            }}
          >
            {lockedLabel}
          </Text>
        </View>
      );
    }

    var isBusy = cancellingId === idKey;

    return (
      <View
        style={{
          flexDirection: "row-reverse",
          marginTop: 10,
          gap: 8,
        }}
      >
        {onEdit ? (
          <Pressable
            onPress={onEdit}
            disabled={isBusy}
            style={{
              flex: 1,
              backgroundColor: "#F0E5DC",
              borderWidth: 1,
              borderColor: "#7B5A4D",
              borderRadius: 10,
              paddingVertical: 9,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#7B5A4D", fontWeight: "800" }}>ערוך</Text>
          </Pressable>
        ) : null}

        {onCancel ? (
          <Pressable
            onPress={onCancel}
            disabled={isBusy}
            style={{
              flex: 1,
              backgroundColor: isBusy ? "#C9B7AC" : "#A0522D",
              borderRadius: 10,
              paddingVertical: 9,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>
              {isBusy ? "שולח..." : "בטל"}
            </Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  function matchesSearch(text, targets) {
    if (!text) return true;
    var lower = String(text).toLowerCase().trim();
    if (!lower) return true;
    for (var i = 0; i < targets.length; i++) {
      var t = String(targets[i] || "").toLowerCase();
      if (t.indexOf(lower) >= 0) return true;
    }
    return false;
  }

  var filteredClasses = useMemo(
    function () {
      var list = Array.isArray(account.classes) ? account.classes : [];

      return list.filter(function (item) {
        if (
          paymentFilter === "paid" && !item.isPaid
        ) return false;
        if (
          paymentFilter === "unpaid" && item.isPaid
        ) return false;

        if (
          dateFilter !== "all" &&
          pickDateKey(item.classDateTime) !== dateFilter
        ) {
          return false;
        }

        return matchesSearch(searchText, [
          item.className,
          item.horseName,
          item.barnName,
          item.riderName,
          item.coachName,
        ]);
      });
    },
    [account.classes, searchText, dateFilter, paymentFilter],
  );

  var filteredPaidTimes = useMemo(
    function () {
      var list = Array.isArray(account.paidTimes) ? account.paidTimes : [];

      return list.filter(function (item) {
        if (paymentFilter === "paid" && !item.isPaid) return false;
        if (paymentFilter === "unpaid" && item.isPaid) return false;

        if (
          dateFilter !== "all" &&
          pickDateKey(item.displaySlotDate) !== dateFilter
        ) {
          return false;
        }

        return matchesSearch(searchText, [
          item.productName,
          item.horseName,
          item.barnName,
          item.riderName,
          item.coachName,
        ]);
      });
    },
    [account.paidTimes, searchText, dateFilter, paymentFilter],
  );

  var filteredStalls = useMemo(
    function () {
      var list = Array.isArray(account.stalls) ? account.stalls : [];

      return list.filter(function (item) {
        if (paymentFilter === "paid" && !item.isPaid) return false;
        if (paymentFilter === "unpaid" && item.isPaid) return false;

        if (
          dateFilter !== "all" &&
          pickDateKey(item.startDate) !== dateFilter
        ) {
          return false;
        }

        return matchesSearch(searchText, [
          item.productName,
          item.horseName,
          item.barnName,
        ]);
      });
    },
    [account.stalls, searchText, dateFilter, paymentFilter],
  );

  // CAP-3: classes have no verified lifecycle field yet (CAP-8 has not
  // added one to usp_getpayercompetitionaccount's classes[] array) - they
  // are deliberately NOT banded, only given the same deterministic
  // date/time ordering every other list gets. See
  // payerAccountBands.js/payerAccountLifecycle.js for why.
  var sortedClasses = useMemo(
    function () {
      return sortClassesByVerifiedDate(filteredClasses);
    },
    [filteredClasses],
  );

  // CAP-3: paid time and stalls DO carry verified lifecycle signals, so they
  // are grouped into active / pendingChange+pendingCancellation / cancelled
  // and sorted within each band, mirroring the server's own ORDER BY.
  var bandedPaidTimes = useMemo(
    function () {
      return bandAndSortPaidTimes(filteredPaidTimes);
    },
    [filteredPaidTimes],
  );

  var bandedStalls = useMemo(
    function () {
      return bandAndSortStalls(filteredStalls);
    },
    [filteredStalls],
  );

  // CAP-4: date chips are scoped to whichever tab is active, using that
  // tab's own date field only - never a union across classes/paidTimes/
  // stalls (a date that only has, say, a stall booking must not appear as
  // a choosable chip while on the classes tab). Logic lives in
  // payerAccountAvailableDates.js so it's covered by focused vitest tests.
  var availableDatesForActiveTab = useMemo(
    function () {
      return getAvailableDatesForTab(activeTab, account);
    },
    [activeTab, account.classes, account.paidTimes, account.stalls],
  );

  // CAP-4: switching tabs must not leave a date filter selected that has no
  // meaning in the new tab. Smallest possible change - only resets when the
  // currently selected date isn't one of the new tab's own dates; leaves an
  // already-valid selection (or "all") untouched.
  useEffect(
    function () {
      if (dateFilter === "all") {
        return;
      }

      if (availableDatesForActiveTab.indexOf(dateFilter) === -1) {
        setDateFilter("all");
      }
    },
    [activeTab, availableDatesForActiveTab],
  );

  function renderChip(label, isActive, onPress, keyValue) {
    return (
      <Pressable
        key={keyValue || label}
        onPress={onPress}
        style={{
          paddingHorizontal: 12,
          paddingVertical: 7,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: isActive ? "#7B5A4D" : "#D6C5B8",
          backgroundColor: isActive ? "#7B5A4D" : "#FFFFFF",
          marginLeft: 6,
          marginBottom: 6,
        }}
      >
        <Text
          style={{
            color: isActive ? "#FFFFFF" : "#5A4036",
            fontWeight: "700",
            fontSize: 12,
          }}
        >
          {label}
        </Text>
      </Pressable>
    );
  }

  function renderFiltersBlock() {
    return (
      <View
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 16,
          borderWidth: 1,
          borderColor: "#E8DDD6",
          padding: 12,
          marginBottom: 14,
        }}
      >
        <Pressable
          onPress={function () {
            setShowFilters(!showFilters);
          }}
          style={{
            flexDirection: "row-reverse",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text style={{ fontWeight: "800", color: "#4F3B31" }}>
            סינון וחיפוש
          </Text>
          <Text style={{ color: "#7B5A4D" }}>
            {showFilters ? "הסתר ▲" : "הצג ▼"}
          </Text>
        </Pressable>

        {showFilters ? (
          <View style={{ marginTop: 10 }}>
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="חיפוש לפי שם מקצה, סוס, רוכב, מאמן..."
              placeholderTextColor="#9E8A7F"
              style={{
                borderWidth: 1,
                borderColor: "#D6C5B8",
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 9,
                textAlign: "right",
                color: "#4F3B31",
                marginBottom: 10,
              }}
            />

            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: "#5A4036",
                marginBottom: 6,
                textAlign: "right",
              }}
            >
              סטטוס תשלום
            </Text>

            <View
              style={{
                flexDirection: "row-reverse",
                flexWrap: "wrap",
                marginBottom: 8,
              }}
            >
              {renderChip("הכל", paymentFilter === "all", function () {
                setPaymentFilter("all");
              })}
              {renderChip("שולם", paymentFilter === "paid", function () {
                setPaymentFilter("paid");
              })}
              {renderChip("לא שולם", paymentFilter === "unpaid", function () {
                setPaymentFilter("unpaid");
              })}
            </View>

            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: "#5A4036",
                marginBottom: 6,
                textAlign: "right",
              }}
            >
              תאריך
            </Text>

            <View
              style={{
                flexDirection: "row-reverse",
                flexWrap: "wrap",
              }}
            >
              {renderChip("כל התאריכים", dateFilter === "all", function () {
                setDateFilter("all");
              })}
              {availableDatesForActiveTab.map(function (dKey) {
                return renderChip(
                  formatDate(dKey),
                  dateFilter === dKey,
                  function () {
                    setDateFilter(dKey);
                  },
                  "date-" + dKey,
                );
              })}
            </View>

            <Pressable
              onPress={function () {
                setSearchText("");
                setDateFilter("all");
                setPaymentFilter("all");
              }}
              style={{
                marginTop: 10,
                alignSelf: "flex-end",
                paddingHorizontal: 10,
                paddingVertical: 6,
              }}
            >
              <Text style={{ color: "#7B5A4D", fontWeight: "700" }}>
                נקה סינונים
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  }

  function renderTabButton(key, label) {
    var isActive = activeTab === key;

    return (
      <Pressable
        style={[styles.tabButton, isActive ? styles.tabButtonActive : null]}
        onPress={function () {
          setActiveTab(key);
        }}
      >
        <Text style={[styles.tabText, isActive ? styles.tabTextActive : null]}>
          {label}
        </Text>
      </Pressable>
    );
  }

  function renderHeader() {
    var paymentStatus = getStatusInfo(summary.paymentStatus);

    return (
      <View style={styles.headerCard}>
        <View style={styles.headerTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.payerName}>{getDisplayName(payer)}</Text>

            <Text style={styles.payerSubText}>
              {payer?.cellPhone || "-"} · {payer?.email || "-"}
            </Text>
          </View>

          <View style={[styles.statusBadgeBase, paymentStatus.boxStyle]}>
            <Text style={[styles.statusTextBase, paymentStatus.textStyle]}>
              {paymentStatus.text}
            </Text>
          </View>
        </View>

        <View style={styles.grandTotalBox}>
          <Text style={styles.grandTotalLabel}>סה״כ חשבון</Text>

          <Text style={styles.grandTotalValue}>
            {formatCurrency(summary.grandTotal)}
          </Text>
        </View>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>שולם</Text>

              <Text style={styles.summaryValue}>
                {formatCurrency(summary.paidAmount)}
              </Text>
            </View>

            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>יתרה לתשלום</Text>

              <Text style={styles.summaryValue}>
                {formatCurrency(summary.remainingAmount)}
              </Text>
            </View>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>לתשלום למארגן</Text>

              <Text style={styles.summaryValue}>
                {formatCurrency(summary.organizerTotal)}
              </Text>
            </View>

            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>לתשלום להתאחדות</Text>

              <Text style={styles.summaryValue}>
                {formatCurrency(summary.federationTotal)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  function renderSummaryTab() {
    return (
      <>
        <Text style={styles.sectionTitle}>סיכום לפי סוג חיוב</Text>

        <View style={styles.itemCard}>
          <View style={styles.itemTopRow}>
            <Text style={styles.itemTitle}>מקצים</Text>

            <Text style={styles.itemAmount}>
              {formatCurrency(summary.classGrandTotal)}
            </Text>
          </View>

          <View style={styles.splitRow}>
            <View style={styles.splitPill}>
              <Text style={styles.splitPillLabel}>עלות מארגן</Text>

              <Text style={styles.splitPillValue}>
                {formatCurrency(summary.classOrganizerTotal)}
              </Text>
            </View>

            <View style={styles.splitPill}>
              <Text style={styles.splitPillLabel}>עלות התאחדות</Text>

              <Text style={styles.splitPillValue}>
                {formatCurrency(summary.classFederationTotal)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.itemCard}>
          <View style={styles.itemTopRow}>
            <Text style={styles.itemTitle}>פייד טיימים</Text>

            <Text style={styles.itemAmount}>
              {formatCurrency(summary.paidTimeTotal)}
            </Text>
          </View>
        </View>

        <View style={styles.itemCard}>
          <View style={styles.itemTopRow}>
            <Text style={styles.itemTitle}>תאים</Text>

            <Text style={styles.itemAmount}>
              {formatCurrency(summary.stallTotal)}
            </Text>
          </View>

          <Text style={styles.itemMutedText}>
            מוצג לפי החלק של המשלם הנוכחי
          </Text>
        </View>

        <View style={styles.itemCard}>
          <View style={styles.itemTopRow}>
            <Text style={styles.itemTitle}>נסורת</Text>

            <Text style={styles.itemAmount}>
              {formatCurrency(summary.shavingsTotal)}
            </Text>
          </View>

          <Text style={styles.itemMutedText}>
            מוצג לפי החלק של המשלם הנוכחי
          </Text>
        </View>
      </>
    );
  }

  function renderAddEntryButton() {
    return (
      <Pressable
        onPress={function () {
          setShowEntryCreateModal(true);
        }}
        style={{
          backgroundColor: "#7B5A4D",
          borderRadius: 12,
          paddingVertical: 12,
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 14 }}>
          + הוסף הרשמה למקצה
        </Text>
      </Pressable>
    );
  }

  function renderAddPaidTimeButton() {
    return (
      <Pressable
        onPress={function () {
          setShowPaidTimeCreateModal(true);
        }}
        style={{
          backgroundColor: "#FFFFFF",
          borderWidth: 1,
          borderColor: "#7B5A4D",
          borderRadius: 12,
          paddingVertical: 11,
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <Text style={{ color: "#7B5A4D", fontWeight: "800", fontSize: 13 }}>
          + הוסף פייד טיים
        </Text>
      </Pressable>
    );
  }

  function renderAddStallButton() {
    return (
      <Pressable
        onPress={function () {
          setShowStallCreateModal(true);
        }}
        style={{
          backgroundColor: "#FFFFFF",
          borderWidth: 1,
          borderColor: "#7B5A4D",
          borderRadius: 12,
          paddingVertical: 11,
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <Text style={{ color: "#7B5A4D", fontWeight: "800", fontSize: 13 }}>
          + הוסף תא
        </Text>
      </Pressable>
    );
  }

  function renderClassesTab() {
    if (!account.classes || account.classes.length === 0) {
      return (
        <>
          {renderAddEntryButton()}
          {renderEmpty("לא נמצאו מקצים בחשבון של משלם זה")}
        </>
      );
    }

    if (sortedClasses.length === 0) {
      return (
        <>
          {renderAddEntryButton()}
          {renderEmpty("לא נמצאו מקצים שתואמים לסינון")}
        </>
      );
    }

    // CAP-3: date/time ordered only, deliberately not banded into
    // active/pending/cancelled - see sortedClasses' own comment above for
    // why (no verified class lifecycle field until CAP-8).
    var listContent = sortedClasses.map(function (item) {
      var isLocked =
        item.isPaid === true ||
        item.hasPendingCancellation === true ||
        item.isCancelled === true ||
        String(item.entryStatus || "").toLowerCase() === "cancelled";

      var lockedLabel = item.isPaid
        ? "כבר שולם — לא ניתן לבטל"
        : item.hasPendingCancellation
          ? "בקשת ביטול ממתינה למזכירה"
          : "בוטל";

      return (
        <View key={String(item.entryId)} style={styles.itemCard}>
          <View style={styles.itemTopRow}>
            <Text style={styles.itemTitle}>{item.className || "מקצה"}</Text>

            <Text style={styles.itemAmount}>
              {formatCurrency(item.totalAmount)}
            </Text>
          </View>

          <Text style={styles.itemText}>
            סוס: {item.barnName || item.horseName || "-"}
          </Text>

          <Text style={styles.itemText}>רוכב: {item.riderName || "-"}</Text>

          <Text style={styles.itemText}>מאמן: {item.coachName || "-"}</Text>

          <Text style={styles.itemText}>
            תאריך: {formatDate(item.classDateTime)}
          </Text>

          <View style={styles.splitRow}>
            <View style={styles.splitPill}>
              <Text style={styles.splitPillLabel}>עלות מארגן</Text>

              <Text style={styles.splitPillValue}>
                {formatCurrency(item.organizerCost)}
              </Text>
            </View>

            <View style={styles.splitPill}>
              <Text style={styles.splitPillLabel}>עלות התאחדות</Text>

              <Text style={styles.splitPillValue}>
                {formatCurrency(item.federationCost)}
              </Text>
            </View>
          </View>

          {renderActions(
            "entry:" + item.entryId,
            isLocked,
            function () {
              setEditEntryItem(item);
            },
            function () {
              confirmCancelEntry(item);
            },
            lockedLabel,
          )}
        </View>
      );
    });

    return (
      <>
        {renderAddEntryButton()}
        {listContent}
      </>
    );
  }

  function renderPaidTimesTab() {
    if (!account.paidTimes || account.paidTimes.length === 0) {
      return (
        <>
          {renderAddPaidTimeButton()}
          {renderEmpty("לא נמצאו פייד טיימים בחשבון של משלם זה")}
        </>
      );
    }

    if (filteredPaidTimes.length === 0) {
      return (
        <>
          {renderAddPaidTimeButton()}
          {renderEmpty("לא נמצאו פייד טיימים שתואמים לסינון")}
        </>
      );
    }

    function renderPaidTimeCard(item) {
      var status = String(item.status || "").toLowerCase();
      var isLocked = item.isPaid === true || status === "cancelled";
      var lockedLabel = item.isPaid
        ? "כבר שולם — לא ניתן לבטל"
        : "בוטל";

      return (
        <View
          key={String(item.paidTimeRequestId)}
          style={styles.itemCard}
        >
          <View style={styles.itemTopRow}>
            <Text style={styles.itemTitle}>
              {item.productName || "פייד טיים"}
            </Text>

            <Text style={styles.itemAmount}>
              {formatCurrency(item.amountToPay)}
            </Text>
          </View>

          <Text style={styles.itemText}>
            סוס: {item.barnName || item.horseName || "-"}
          </Text>

          <Text style={styles.itemText}>רוכב: {item.riderName || "-"}</Text>

          <Text style={styles.itemText}>מאמן: {item.coachName || "-"}</Text>

          <Text style={styles.itemText}>
            מועד: {formatDate(item.displaySlotDate)} ·{" "}
            {formatTime(item.displayStartTime)}-{formatTime(item.displayEndTime)}
          </Text>

          <Text style={styles.itemText}>
            מגרש: {item.displayArenaName || "-"}
          </Text>

          <Text style={styles.itemMutedText}>סטטוס: {item.status || "-"}</Text>

          {renderActions(
            "paidTime:" + item.paidTimeRequestId,
            isLocked,
            canEditPaidTimeRow(item, paidTimesAvailability)
              ? function () {
                  setEditPaidTimeItem(item);
                }
              : null,
            function () {
              confirmCancelPaidTime(item);
            },
            lockedLabel,
          )}
        </View>
      );
    }

    return (
      <>
        {renderAddPaidTimeButton()}
        {renderBandedSections(bandedPaidTimes, renderPaidTimeCard)}
      </>
    );
  }

  function renderStallsTab() {
    if (!account.stalls || account.stalls.length === 0) {
      return (
        <>
          {renderAddStallButton()}
          {renderEmpty("לא נמצאו תאים בחשבון של משלם זה")}
        </>
      );
    }

    if (filteredStalls.length === 0) {
      return (
        <>
          {renderAddStallButton()}
          {renderEmpty("לא נמצאו תאים שתואמים לסינון")}
        </>
      );
    }

    function renderStallCard(item) {
      // CAP-3: nested shavings sub-lines are sorted (never banded - they
      // all share this stall's one inherited lifecycle state already).
      var shavingsOrders = sortShavingsOrders(item.shavingsOrders);

      var isLocked =
        item.isPaid === true ||
        item.isCancelled === true ||
        item.hasPendingCancellation === true ||
        item.hasPendingChange === true;

      var lockedLabel = item.isPaid
        ? "כבר שולם — לא ניתן לבטל"
        : item.isCancelled
          ? "בוטל"
          : item.hasPendingCancellation
            ? "בקשת ביטול ממתינה"
            : "בקשת שינוי ממתינה";

      return (
        <View key={String(item.stallBookingId)} style={styles.itemCard}>
          <View style={styles.itemTopRow}>
            <Text style={styles.itemTitle}>
              {item.isForTack
                ? "תא ציוד"
                : item.barnName || item.horseName || "תא"}
            </Text>

            <Text style={styles.itemAmount}>
              {formatCurrency(item.amountToPay)}
            </Text>
          </View>

          <Text style={styles.itemText}>
            סוג: {item.productName || "-"}
          </Text>

          <Text style={styles.itemText}>
            תאריכים: {formatDate(item.startDate)} - {formatDate(item.endDate)}
          </Text>

          <Text style={styles.itemText}>
            תא: {item.stallId ? "#" + item.stallId : "טרם שובץ"}
          </Text>

          {renderPaymentBadge(item.isPaid, item.amountToPay)}

          {shavingsOrders.length > 0 ? (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.itemMutedText}>נסורת לתא זה:</Text>

              {shavingsOrders.map(function (order) {
                return (
                  <Text
                    key={String(order.shavingsOrderId)}
                    style={styles.itemText}
                  >
                    {order.bagQuantity} שקים ·{" "}
                    {formatCurrency(order.amountToPay)} ·{" "}
                    {order.deliveryStatus || "-"}
                  </Text>
                );
              })}
            </View>
          ) : null}

          {renderActions(
            "stall:" + item.stallBookingId,
            isLocked,
            function () {
              setEditStallItem(item);
            },
            function () {
              confirmCancelStall(item);
            },
            lockedLabel,
          )}
        </View>
      );
    }

    return (
      <>
        {renderAddStallButton()}
        {renderBandedSections(bandedStalls, renderStallCard)}
      </>
    );
  }

  function renderActiveTab() {
    if (activeTab === "summary") {
      return renderSummaryTab();
    }

    if (activeTab === "classes") {
      return renderClassesTab();
    }

    if (activeTab === "paidTimes") {
      return renderPaidTimesTab();
    }

    if (activeTab === "stalls") {
      return renderStallsTab();
    }

    return null;
  }

  function renderContent() {
    if (account.loading) {
      return (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#7B5A4D" />

          <Text style={styles.loadingText}>טוען חשבון משלם...</Text>
        </View>
      );
    }

    if (account.screenError) {
      return (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{account.screenError}</Text>

          <Pressable style={styles.refreshButton} onPress={account.reload}>
            <Text style={styles.refreshButtonText}>נסה שוב</Text>
          </Pressable>
        </View>
      );
    }

    var showFiltersForTab =
      activeTab === "classes" ||
      activeTab === "paidTimes" ||
      activeTab === "stalls";

    return (
      <>
        {renderHeader()}

        <View style={styles.tabsWrap}>
          {renderTabButton("summary", "סיכום")}
          {renderTabButton("classes", "מקצים")}
          {renderTabButton("paidTimes", "פייד")}
          {renderTabButton("stalls", "תאים")}
        </View>

        {showFiltersForTab ? renderFiltersBlock() : null}

        {renderActiveTab()}
      </>
    );
  }

  return (
    <MobileScreenLayout
      title="חשבון משלם"
      subtitle=""
      activeBottomTab={null}
      bottomNavItems={getAdminBottomNavConfig(props.navigation)}
      menuContent={function ({ closeMenu }) {
        return (
          <CompetitionMenuTemplate
            activeKey="my-payers"
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
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={account.loading}
            onRefresh={account.reload}
          />
        }
      >
        {renderContent()}
      </ScrollView>

      <CompetitionEntryCreateModal
        visible={showEntryCreateModal}
        editItem={null}
        lockedPayerPersonId={lockedPayerPersonId}
        onClose={function () {
          setShowEntryCreateModal(false);
        }}
        onCreated={account.reload}
      />

      <CompetitionEntryCreateModal
        visible={!!editEntryItem}
        editItem={editEntryItem}
        lockedPayerPersonId={lockedPayerPersonId}
        useDirectAdminEdit={true}
        onClose={function () {
          setEditEntryItem(null);
        }}
        onCreated={account.reload}
      />

      <PaidTimeCreateModal
        visible={showPaidTimeCreateModal}
        lockedPayerPersonId={lockedPayerPersonId}
        paidTimesStepAvailability={paidTimesAvailability}
        isRegistrationStatusLoading={registrationStepStatus.loading}
        onClose={function () {
          setShowPaidTimeCreateModal(false);
        }}
        onCreated={account.reload}
      />

      <PaidTimeEditModal
        visible={!!editPaidTimeItem}
        item={editPaidTimeItem}
        competitionId={activeCompetition?.competitionId}
        ranchId={activeRole?.ranchId}
        roleId={activeRole?.roleId}
        onClose={function () {
          setEditPaidTimeItem(null);
        }}
        onSaved={account.reload}
      />

      <StallBookingCreateModal
        visible={showStallCreateModal}
        lockedPayerPersonId={lockedPayerPersonId}
        onClose={function () {
          setShowStallCreateModal(false);
        }}
        onCreated={account.reload}
      />

      <StallBookingEditModal
        visible={!!editStallItem}
        item={editStallItem}
        onClose={function () {
          setEditStallItem(null);
        }}
        onUpdated={account.reload}
      />
    </MobileScreenLayout>
  );
}
import React, { useEffect, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";

import MobileScreenLayout from "../../../../components/mobile-nav/MobileScreenLayout";

import CompetitionMenuTemplate from "../../../../components/mobile-nav/CompetitionMenuTemplate";

import { getPayerBottomNavConfig } from "../../../../navigation/bottomNavConfigs";

import { getPayerCompetitionMenuItems } from "../../../../navigation/competitionMenuConfigs";

import { useActiveRole } from "../../../../context/ActiveRoleContext";

import { useCompetition } from "../../../../context/CompetitionContext";

import usePayerMyCompetitionAccount from "../../../../hooks/usePayerMyCompetitionAccount";

import styles from "../../../../styles/adminCompetitionPayerAccountStyles";

import { cancelEntryByPayer } from "../../../../services/entriesService";

import { cancelPaidTimeRequestByPayer } from "../../../../services/paidTimeRequestsService";

import { cancelStallBookingByPayer } from "../../../../services/stallBookingsService";

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

function formatCurrency(value) {
  var numberValue = Number(value || 0);

  return (
    "₪" +
    numberValue.toLocaleString("he-IL", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
  );
}

function formatDate(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString("he-IL");
  } catch {
    return String(value);
  }
}

function formatTime(value) {
  if (!value) return "-";
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
  if (!payer) return "החשבון שלי";
  if (payer.fullName) return payer.fullName;
  return ((payer.firstName || "") + " " + (payer.lastName || "")).trim();
}

function renderPaymentBadge(isPaid) {
  var status = isPaid ? getStatusInfo("Paid") : getStatusInfo("Unpaid");

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

function resolveInitialTab(routeParams) {
  var requested = String(routeParams?.initialTab || "").toLowerCase();

  if (
    requested === "summary" ||
    requested === "classes" ||
    requested === "paidtimes" ||
    requested === "stalls"
  ) {
    if (requested === "paidtimes") return "paidTimes";
    return requested;
  }

  return "summary";
}

export default function PayerCompetitionAccountScreen(props) {
  var activeRoleContext = useActiveRole();
  var competitionContext = useCompetition();

  var activeRole = activeRoleContext.activeRole;
  var activeCompetition = competitionContext.activeCompetition;

  var routeParams = props.route?.params || {};

  var [activeTab, setActiveTab] = useState(resolveInitialTab(routeParams));

  // If menu navigates here with a new initialTab while screen is already
  // mounted, sync the tab.
  useEffect(
    function () {
      var nextTab = resolveInitialTab(routeParams);
      if (nextTab !== activeTab) {
        setActiveTab(nextTab);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [routeParams?.initialTab],
  );

  var account = usePayerMyCompetitionAccount({
    activeRole: activeRole,
    activeCompetition: activeCompetition,
  });

  var payer = account.payer;
  var summary = account.summary || {};

  var [cancellingId, setCancellingId] = useState(null);

  function confirmCancelEntry(item) {
    Alert.alert(
      "ביטול הרשמה",
      "האם לשלוח בקשת ביטול למזכירה? יתבצע רק לאחר אישור.",
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

  async function doCancelEntry(item) {
    try {
      setCancellingId("entry:" + item.entryId);

      await cancelEntryByPayer({
        entryId: item.entryId,
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

  function confirmCancelPaidTime(item) {
    Alert.alert(
      "ביטול פייד טיים",
      "האם לבטל? ניתן לבטל רק עד 24 שעות לפני המועד.",
      [
        { text: "לא", style: "cancel" },
        {
          text: "כן",
          style: "destructive",
          onPress: function () {
            doCancelPaidTime(item);
          },
        },
      ],
    );
  }

  async function doCancelPaidTime(item) {
    try {
      setCancellingId("paidTime:" + item.paidTimeRequestId);

      await cancelPaidTimeRequestByPayer({
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
    Alert.alert(
      "ביטול תא",
      "האם לשלוח בקשת ביטול תא למזכירה? יתבצע רק לאחר אישור.",
      [
        { text: "לא", style: "cancel" },
        {
          text: "כן",
          style: "destructive",
          onPress: function () {
            doCancelStall(item);
          },
        },
      ],
    );
  }

  async function doCancelStall(item) {
    try {
      setCancellingId("stall:" + item.stallBookingId);

      await cancelStallBookingByPayer({
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

  function renderCancelButton(idKey, isLocked, onPress, lockedLabel) {
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
      <Pressable
        onPress={onPress}
        disabled={isBusy}
        style={{
          marginTop: 10,
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
    );
  }

  function handleCompetitionMenuPress(item) {
    // Q3: payer sees a single screen with 4 tabs. All 4 menu items just
    // switch tab locally instead of navigating away.
    var tabByKey = {
      "account-details": "summary",
      classes: "classes",
      "paid-time": "paidTimes",
      stalls: "stalls",
    };

    var targetTab = tabByKey[item.key];

    if (targetTab) {
      setActiveTab(targetTab);
      return;
    }

    props.navigation.navigate(item.screen);
  }

  async function handleExitCompetition() {
    await competitionContext.clearCompetition();
    props.navigation.navigate("PayerCompetitionsBoard");
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
              <Text style={styles.splitPillLabel}>חלק מארגן</Text>
              <Text style={styles.splitPillValue}>
                {formatCurrency(summary.classOrganizerTotal)}
              </Text>
            </View>

            <View style={styles.splitPill}>
              <Text style={styles.splitPillLabel}>חלק התאחדות</Text>
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

          <Text style={styles.itemMutedText}>
            חיוב מלא למארגן / חווה מארחת
          </Text>
        </View>

        <View style={styles.itemCard}>
          <View style={styles.itemTopRow}>
            <Text style={styles.itemTitle}>תאים</Text>
            <Text style={styles.itemAmount}>
              {formatCurrency(summary.stallTotal)}
            </Text>
          </View>

          <Text style={styles.itemMutedText}>החלק שלך בלבד</Text>
        </View>

        <View style={styles.itemCard}>
          <View style={styles.itemTopRow}>
            <Text style={styles.itemTitle}>נסורת</Text>
            <Text style={styles.itemAmount}>
              {formatCurrency(summary.shavingsTotal)}
            </Text>
          </View>

          <Text style={styles.itemMutedText}>החלק שלך בלבד</Text>
        </View>
      </>
    );
  }

  function renderClassesTab() {
    if (!account.classes || account.classes.length === 0) {
      return renderEmpty("אין לך הרשמות למקצים בתחרות זו");
    }

    return account.classes.map(function (item) {
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
              <Text style={styles.splitPillLabel}>מארגן</Text>
              <Text style={styles.splitPillValue}>
                {formatCurrency(item.organizerCost)}
              </Text>
            </View>

            <View style={styles.splitPill}>
              <Text style={styles.splitPillLabel}>התאחדות</Text>
              <Text style={styles.splitPillValue}>
                {formatCurrency(item.federationCost)}
              </Text>
            </View>
          </View>

          {renderCancelButton(
            "entry:" + item.entryId,
            isLocked,
            function () {
              confirmCancelEntry(item);
            },
            lockedLabel,
          )}
        </View>
      );
    });
  }

  function renderPaidTimesTab() {
    if (!account.paidTimes || account.paidTimes.length === 0) {
      return renderEmpty("אין לך הרשמות לפייד טיים בתחרות זו");
    }

    return account.paidTimes.map(function (item) {
      var status = String(item.status || "").toLowerCase();

      var isLocked =
        item.isPaid === true ||
        status === "cancelled";

      var lockedLabel = item.isPaid
        ? "כבר שולם — לא ניתן לבטל"
        : "בוטל";

      return (
        <View key={String(item.paidTimeRequestId)} style={styles.itemCard}>
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

          {renderCancelButton(
            "paidTime:" + item.paidTimeRequestId,
            isLocked,
            function () {
              confirmCancelPaidTime(item);
            },
            lockedLabel,
          )}
        </View>
      );
    });
  }

  function renderStallsTab() {
    if (!account.stalls || account.stalls.length === 0) {
      return renderEmpty("אין לך הזמנות תאים בתחרות זו");
    }

    return account.stalls.map(function (item) {
      var shavingsOrders = Array.isArray(item.shavingsOrders)
        ? item.shavingsOrders
        : [];

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
            ? "בקשת ביטול ממתינה למזכירה"
            : "בקשת שינוי ממתינה למזכירה";

      return (
        <View key={String(item.stallBookingId)} style={styles.itemCard}>
          <View style={styles.itemTopRow}>
            <Text style={styles.itemTitle}>
              {item.isForTack
                ? "תא ציוד"
                : item.barnName || item.horseName || "תא"}
            </Text>
            <Text style={styles.itemAmount}>
              {formatCurrency(item.stallAmountToPay)}
            </Text>
          </View>

          <Text style={styles.itemText}>סוג: {item.productName || "-"}</Text>

          <Text style={styles.itemText}>
            תאריכים: {formatDate(item.startDate)} - {formatDate(item.endDate)}
          </Text>

          <Text style={styles.itemText}>
            תא: {item.stallId ? "#" + item.stallId : "טרם שובץ"}
          </Text>

          {renderPaymentBadge(item.isPaid)}

          {shavingsOrders.length > 0 ? (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.itemMutedText}>נסורת לתא זה:</Text>

              {shavingsOrders.map(function (order) {
                return (
                  <Text
                    key={String(order.shavingsOrderId)}
                    style={styles.itemText}
                  >
                    {order.bagQuantityPerStall} שקים ·{" "}
                    {formatCurrency(order.estimatedAmountToPay)} ·{" "}
                    {order.deliveryStatus || "-"}
                  </Text>
                );
              })}
            </View>
          ) : null}

          {renderCancelButton(
            "stall:" + item.stallBookingId,
            isLocked,
            function () {
              confirmCancelStall(item);
            },
            lockedLabel,
          )}
        </View>
      );
    });
  }

  function renderActiveTab() {
    if (activeTab === "summary") return renderSummaryTab();
    if (activeTab === "classes") return renderClassesTab();
    if (activeTab === "paidTimes") return renderPaidTimesTab();
    if (activeTab === "stalls") return renderStallsTab();
    return null;
  }

  function renderContent() {
    if (account.loading) {
      return (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#7B5A4D" />
          <Text style={styles.loadingText}>טוען חשבון...</Text>
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

    return (
      <>
        {renderHeader()}

        <View style={styles.tabsWrap}>
          {renderTabButton("summary", "סיכום")}
          {renderTabButton("classes", "מקצים")}
          {renderTabButton("paidTimes", "פייד")}
          {renderTabButton("stalls", "תאים")}
        </View>

        {renderActiveTab()}
      </>
    );
  }

  return (
    <MobileScreenLayout
      title="החשבון שלי"
      subtitle=""
      activeBottomTab={null}
      bottomNavItems={getPayerBottomNavConfig(props.navigation)}
      menuContent={function ({ closeMenu }) {
        return (
          <CompetitionMenuTemplate
            activeKey="account-details"
            closeMenu={closeMenu}
            competitionName={
              activeCompetition ? activeCompetition.competitionName : ""
            }
            items={getPayerCompetitionMenuItems()}
            onItemPress={function (item) {
              handleCompetitionMenuPress(item);
              closeMenu();
            }}
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
    </MobileScreenLayout>
  );
}

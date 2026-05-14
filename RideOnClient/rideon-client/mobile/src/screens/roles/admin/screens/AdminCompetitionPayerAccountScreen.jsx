import React, { useState } from "react";

import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";

import MobileScreenLayout from "../../../../components/mobile-nav/MobileScreenLayout";

import CompetitionMenuTemplate from "../../../../components/mobile-nav/CompetitionMenuTemplate";

import { getAdminBottomNavConfig } from "../../../../navigation/bottomNavConfigs";

import { getAdminCompetitionMenuItems } from "../../../../navigation/competitionMenuConfigs";

import { useActiveRole } from "../../../../context/ActiveRoleContext";

import { useCompetition } from "../../../../context/CompetitionContext";

import useAdminCompetitionPayerAccount from "../../../../hooks/useAdminCompetitionPayerAccount";

import styles from "../../../../styles/adminCompetitionPayerAccountStyles";

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

function renderPaymentBadge(isPaid) {
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

  var payer = account.payer || routePayer;

  var summary = account.summary || {};

  function handleCompetitionMenuPress(item) {
    props.navigation.navigate(item.screen);
  }

  async function handleExitCompetition() {
    await competitionContext.clearCompetition();

    props.navigation.navigate("AdminCompetitionsBoard");
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

  function renderClassesTab() {
    if (!account.classes || account.classes.length === 0) {
      return renderEmpty("לא נמצאו מקצים בחשבון של משלם זה");
    }

    return account.classes.map(function (item) {
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
        </View>
      );
    });
  }

  function renderPaidTimesTab() {
    if (!account.paidTimes || account.paidTimes.length === 0) {
      return renderEmpty("לא נמצאו פייד טיימים בחשבון של משלם זה");
    }

    return account.paidTimes.map(function (item) {
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
        </View>
      );
    });
  }

  function renderStallsTab() {
    if (!account.stalls || account.stalls.length === 0) {
      return renderEmpty("לא נמצאו תאים בחשבון של משלם זה");
    }

    return account.stalls.map(function (item) {
      var shavingsOrders = Array.isArray(item.shavingsOrders)
        ? item.shavingsOrders
        : [];

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

          <Text style={styles.itemText}>
            סוג: {item.productName || "-"}
          </Text>

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
        </View>
      );
    });
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
    </MobileScreenLayout>
  );
}
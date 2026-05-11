import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { useState } from "react";

import MobileScreenLayout from "../../../../components/mobile-nav/MobileScreenLayout";
import CompetitionMenuTemplate from "../../../../components/mobile-nav/CompetitionMenuTemplate";

import { getAdminBottomNavConfig } from "../../../../navigation/bottomNavConfigs";
import { getAdminCompetitionMenuItems } from "../../../../navigation/competitionMenuConfigs";

import { useActiveRole } from "../../../../context/ActiveRoleContext";
import { useCompetition } from "../../../../context/CompetitionContext";

import useAdminCompetitionPaidTimesList from "../../../../hooks/useAdminCompetitionPaidTimesList";

import styles from "../../../../styles/adminCompetitionPaidTimesStyles";

export default function AdminCompetitionPaidTimesScreen(props) {
  var activeRoleContext = useActiveRole();
  var competitionContext = useCompetition();

  var activeRole = activeRoleContext.activeRole;
  var activeCompetition = competitionContext.activeCompetition;

  var paidTimes = useAdminCompetitionPaidTimesList({
    activeRole: activeRole,
    activeCompetition: activeCompetition,
  });

  var [showFilters, setShowFilters] = useState(false);

  function handleCompetitionMenuPress(item) {
    props.navigation.navigate(item.screen);
  }

  async function handleExitCompetition() {
    await competitionContext.clearCompetition();
    props.navigation.navigate("AdminCompetitionsBoard");
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

  function renderStatusBadge(item) {
    var badgeStyle = [styles.statusBadge];

    if (item.isAssigned) {
      badgeStyle.push(styles.statusAssigned);
    } else {
      badgeStyle.push(styles.statusPending);
    }

    return (
      <View style={badgeStyle}>
        <Text style={styles.statusBadgeText}>{item.displayStatus}</Text>
      </View>
    );
  }

  function renderPaymentBadge(item) {
    return (
      <View
        style={[
          styles.paymentBadge,
          item.isPaid ? styles.paymentPaid : styles.paymentUnpaid,
        ]}
      >
        <Text style={styles.paymentBadgeText}>
          {item.isPaid ? "שולם" : "לא שולם"}
        </Text>
      </View>
    );
  }

  function renderPaidTimeCard(item) {
    return (
      <View key={String(item.paidTimeRequestId)} style={styles.requestCard}>
        <View style={styles.cardTopRow}>
          <Text style={styles.priceText}>{item.amountToPay} ₪</Text>
        </View>

        <Text style={styles.horseName}>{item.horseName}</Text>

        <View style={styles.badgesRow}>
          {renderStatusBadge(item)}
          {renderPaymentBadge(item)}
        </View>

        {item.barnName ? (
          <Text style={styles.barnName}>{item.barnName}</Text>
        ) : null}

        <View style={styles.detailsBlock}>
          <Text style={styles.detailText}>מאמן: {item.coachName || "-"}</Text>
          <Text style={styles.detailText}>משלם: {item.payerName || "-"}</Text>
          <Text style={styles.detailText}>סוג: {item.productName || "-"}</Text>
        </View>

        <View style={styles.slotCard}>
          <Text style={styles.slotTitle}>
            {item.isAssigned ? "שיבוץ בפועל" : "סלוט מבוקש"}
          </Text>

          <Text style={styles.slotDateText}>
            {paidTimes.formatDate(item.displaySlotDate)}
          </Text>

          <Text style={styles.slotText}>
            {paidTimes.formatTime(item.displayStartTime)} -{" "}
            {paidTimes.formatTime(item.displayEndTime)}
          </Text>

          <Text style={styles.slotText}>{item.displayArenaName}</Text>
        </View>

        {item.notes ? (
          <View style={styles.notesBox}>
            <Text style={styles.notesTitle}>הערות</Text>
            <Text style={styles.notesText}>{item.notes}</Text>
          </View>
        ) : null}
      </View>
    );
  }

  function renderFilters() {
    return (
      <View style={styles.filterSection}>
        <Text style={styles.filterTitle}>סינון מהיר</Text>

        <View style={styles.chipsRow}>
          {renderFilterChip(
            "כל התשלומים",
            paidTimes.paymentFilter === "all",
            function () {
              paidTimes.setPaymentFilter("all");
            },
          )}
          {renderFilterChip(
            "שולם",
            paidTimes.paymentFilter === "paid",
            function () {
              paidTimes.setPaymentFilter("paid");
            },
          )}
          {renderFilterChip(
            "לא שולם",
            paidTimes.paymentFilter === "unpaid",
            function () {
              paidTimes.setPaymentFilter("unpaid");
            },
          )}
        </View>

        <View style={styles.chipsRow}>
          {renderFilterChip(
            "כל הסוגים",
            paidTimes.productFilter === "all",
            function () {
              paidTimes.setProductFilter("all");
            },
          )}
          {renderFilterChip(
            "קצר",
            paidTimes.productFilter === "short",
            function () {
              paidTimes.setProductFilter("short");
            },
          )}
          {renderFilterChip(
            "ארוך",
            paidTimes.productFilter === "long",
            function () {
              paidTimes.setProductFilter("long");
            },
          )}
        </View>

        <Text style={styles.filterTitle}>ימים</Text>
        <View style={styles.chipsRow}>
          {renderFilterChip(
            "כל הימים",
            paidTimes.dateFilter === "all",
            function () {
              paidTimes.setDateFilter("all");
            },
          )}

          {paidTimes.availableDates.map(function (dateItem) {
            return renderFilterChip(
              dateItem.label,
              paidTimes.dateFilter === dateItem.value,
              function () {
                paidTimes.setDateFilter(dateItem.value);
              },
              "date-" + dateItem.value,
            );
          })}
        </View>

        <Text style={styles.filterTitle}>סלוטים</Text>
        <View style={styles.chipsRow}>
          {renderFilterChip(
            "כל הסלוטים",
            paidTimes.slotFilter === "all",
            function () {
              paidTimes.setSlotFilter("all");
            },
          )}

          {paidTimes.availableSlots.map(function (slotItem) {
            return renderFilterChip(
              slotItem.label,
              paidTimes.slotFilter === slotItem.value,
              function () {
                paidTimes.setSlotFilter(slotItem.value);
              },
              "slot-" + slotItem.value,
            );
          })}
        </View>

        <Pressable
          style={styles.clearFiltersButton}
          onPress={paidTimes.resetFilters}
        >
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

    return paidTimes.filteredItems.map(function (item) {
      return renderPaidTimeCard(item);
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
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>הפייד טיימים שלי</Text>
          <Text style={styles.helperText}>
            כאן מוצגות כל בקשות הפייד טיים שיצרת עבור התחרות הפעילה.
          </Text>

          <View style={styles.summaryRow}>
            {renderSummaryBox("סה״כ בקשות", paidTimes.items.length, "all")}

            {renderSummaryBox(
              "שובצו",
              paidTimes.items.filter(function (item) {
                return item.isAssigned;
              }).length,
              "assigned",
            )}

            {renderSummaryBox(
              "טרם שובצו",
              paidTimes.items.filter(function (item) {
                return !item.isAssigned;
              }).length,
              "pending",
            )}
          </View>
        </View>

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
            <Text style={styles.filterToggleText}>
              {showFilters ? "הסתר סינונים" : "הצג סינונים"}
            </Text>

            <Text style={styles.filterToggleIcon}>
              {showFilters ? "▲" : "▼"}
            </Text>
          </Pressable>

          {showFilters ? renderFilters() : null}
        </View>

        <Text style={styles.resultsText}>
          מוצגות {paidTimes.filteredItems.length} מתוך {paidTimes.items.length}{" "}
          בקשות
        </Text>

        {renderContent()}
      </ScrollView>
    </MobileScreenLayout>
  );
}

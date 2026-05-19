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

import { useState } from "react";

import MobileScreenLayout from "../../../../components/mobile-nav/MobileScreenLayout";
import CompetitionMenuTemplate from "../../../../components/mobile-nav/CompetitionMenuTemplate";

import { getAdminBottomNavConfig } from "../../../../navigation/bottomNavConfigs";
import { getAdminCompetitionMenuItems } from "../../../../navigation/competitionMenuConfigs";

import { useActiveRole } from "../../../../context/ActiveRoleContext";
import { useCompetition } from "../../../../context/CompetitionContext";

import useAdminCompetitionPaidTimesList from "../../../../hooks/useAdminCompetitionPaidTimesList";

import { cancelPaidTimeRequest } from "../../../../services/paidTimeRequestsService";

import PaidTimeListItemCard from "../../../../components/competitions/adminPaidTimes/PaidTimeListItemCard";
import PaidTimeScheduleView from "../../../../components/competitions/adminPaidTimes/PaidTimeScheduleView";
import PaidTimeEditModal from "../../../../components/competitions/adminPaidTimes/PaidTimeEditModal";
import AddPaidTimeButton from "../../../../components/competitions/adminPaidTimes/AddPaidTimeButton";
import SlotScheduleModal from "../../../../components/competitions/adminPaidTimes/SlotScheduleModal";
import PublishedSlotsModal from "../../../../components/competitions/adminPaidTimes/PublishedSlotsModal";

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
  var [editingItem, setEditingItem] = useState(null);
  var [cancellingId, setCancellingId] = useState(null);
  var [viewMode, setViewMode] = useState("list");
  var [expandedIds, setExpandedIds] = useState({});
  var [viewingSlotId, setViewingSlotId] = useState(null);
  var [publishedSlotsOpen, setPublishedSlotsOpen] = useState(false);

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

  function expandAll() {
    var next = {};
    paidTimes.filteredItems.forEach(function (it) {
      next[it.paidTimeRequestId] = true;
    });
    setExpandedIds(next);
  }

  function collapseAll() {
    setExpandedIds({});
  }

  function handleCompetitionMenuPress(item) {
    props.navigation.navigate(item.screen);
  }

  async function handleExitCompetition() {
    await competitionContext.clearCompetition();
    props.navigation.navigate("AdminCompetitionsBoard");
  }

  function openEdit(item) {
    setEditingItem(item);
  }

  function closeEdit() {
    setEditingItem(null);
  }

  function confirmCancel(item) {
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
    try {
      setCancellingId(item.paidTimeRequestId);
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
          onEdit={openEdit}
          onCancel={confirmCancel}
          cancellingId={cancellingId}
          formatDate={paidTimes.formatDate}
          formatTime={paidTimes.formatTime}
          onViewSlotSchedule={handleViewSlotSchedule}
        />
      );
    }

    return paidTimes.filteredItems.map(function (item) {
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
              "assigned"
            )}
            {renderSummaryBox(
              "טרם שובצו",
              paidTimes.items.filter(function (item) {
                return !item.isAssigned;
              }).length,
              "pending"
            )}
          </View>
        </View>

        <AddPaidTimeButton
          navigation={props.navigation}
          competitionId={activeCompetition?.competitionId}
        />

        <Pressable
          onPress={function () {
            setPublishedSlotsOpen(true);
          }}
          style={{
            flexDirection: "row-reverse",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#FFFFFF",
            borderWidth: 1,
            borderColor: "#7B5A4D",
            paddingVertical: 10,
            paddingHorizontal: 14,
            borderRadius: 10,
            gap: 8,
            marginBottom: 12,
          }}
        >
          <Text style={{ color: "#7B5A4D", fontWeight: "700", fontSize: 14 }}>
            כל הסלוטים שפורסמו
          </Text>
        </Pressable>

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
        <PaidTimeEditModal
          item={editingItem}
          competitionId={activeCompetition?.competitionId}
          ranchId={activeRole?.ranchId}
          roleId={activeRole?.roleId}
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

      <PublishedSlotsModal
        isOpen={publishedSlotsOpen}
        competitionId={activeCompetition?.competitionId}
        ranchId={activeRole?.ranchId}
        onClose={function () {
          setPublishedSlotsOpen(false);
        }}
      />
    </MobileScreenLayout>
  );
}

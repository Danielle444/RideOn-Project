import {
  ActivityIndicator,
  Alert,
  Modal,
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

import {
  cancelPaidTimeRequest,
  updatePaidTimeRequestNotes,
} from "../../../../services/paidTimeRequestsService";

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
  var [editNotes, setEditNotes] = useState("");
  var [savingNotes, setSavingNotes] = useState(false);
  var [cancellingId, setCancellingId] = useState(null);

  function openEditNotes(item) {
    setEditingItem(item);
    setEditNotes(item.notes || "");
  }

  function closeEditNotes() {
    setEditingItem(null);
    setEditNotes("");
  }

  async function handleSaveNotes() {
    if (!editingItem) return;
    try {
      setSavingNotes(true);
      await updatePaidTimeRequestNotes({
        paidTimeRequestId: editingItem.paidTimeRequestId,
        ranchId: activeRole?.ranchId,
        notes: editNotes,
      });
      closeEditNotes();
      await paidTimes.handleRefresh();
    } catch (err) {
      var msg = err?.response?.data || err?.message || "אירעה שגיאה";
      Alert.alert("שגיאה", String(msg));
    } finally {
      setSavingNotes(false);
    }
  }

  function confirmCancel(item) {
    var withinDay = item.hoursUntilStart != null && item.hoursUntilStart <= 24;
    var title = withinDay
      ? "ביטול בתוך 24 שעות - חיוב מלא"
      : "ביטול פייד טיים";
    var body = withinDay
      ? "שים לב: הביטול מתבצע פחות מ-24 שעות לפני המועד. במידה ותאשר, תחויב בתשלום מלא של הפייד טיים. הסלוט יתפנה לרוכב אחר. להמשיך?"
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

        {renderCardActions(item)}
      </View>
    );
  }

  function renderCardActions(item) {
    var isCancelling = cancellingId === item.paidTimeRequestId;
    var canEdit = !!item.canModify;
    var canCancel = !!item.canCancel;
    var isCancelled = item.status === "Cancelled";

    if (!canEdit && !canCancel) {
      var lockReason = "";
      if (isCancelled) {
        lockReason = "הבקשה בוטלה";
      } else if (item.isPaid) {
        lockReason = "הבקשה כבר שולמה - לא ניתן לערוך או לבטל";
      } else {
        lockReason = "לא ניתן לבצע פעולות על בקשה זו";
      }

      return (
        <View
          style={{
            marginTop: 10,
            paddingTop: 10,
            borderTopWidth: 1,
            borderTopColor: "#EFE5DF",
          }}
        >
          <Text
            style={{
              textAlign: "right",
              fontSize: 12,
              color: "#8D6E63",
            }}
          >
            {lockReason}
          </Text>
        </View>
      );
    }

    return (
      <View
        style={{
          flexDirection: "row-reverse",
          gap: 8,
          marginTop: 10,
          paddingTop: 10,
          borderTopWidth: 1,
          borderTopColor: "#EFE5DF",
        }}
      >
        {canEdit ? (
          <Pressable
            onPress={function () {
              openEditNotes(item);
            }}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: "#7B5A4D",
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#7B5A4D", fontWeight: "600" }}>
              ערוך הערות
            </Text>
          </Pressable>
        ) : null}

        {canCancel ? (
          <Pressable
            onPress={function () {
              confirmCancel(item);
            }}
            disabled={isCancelling}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 8,
              backgroundColor: isCancelling ? "#C4B5AA" : "#B45454",
              alignItems: "center",
            }}
          >
            {isCancelling ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>
                בטל פייד טיים
              </Text>
            )}
          </Pressable>
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

      <Modal
        visible={!!editingItem}
        transparent
        animationType="fade"
        onRequestClose={closeEditNotes}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.4)",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 14,
              padding: 18,
            }}
          >
            <Text
              style={{
                fontSize: 17,
                fontWeight: "700",
                color: "#3F312B",
                textAlign: "right",
                marginBottom: 12,
              }}
            >
              עריכת הערות
            </Text>
            {editingItem ? (
              <Text
                style={{
                  fontSize: 13,
                  color: "#8D6E63",
                  textAlign: "right",
                  marginBottom: 10,
                }}
              >
                {editingItem.horseName}
                {editingItem.barnName ? " (" + editingItem.barnName + ")" : ""}
              </Text>
            ) : null}
            <TextInput
              value={editNotes}
              onChangeText={setEditNotes}
              placeholder="הערות לבקשה"
              placeholderTextColor="#9E8A7F"
              multiline
              style={{
                borderWidth: 1,
                borderColor: "#D9CFC2",
                borderRadius: 8,
                padding: 10,
                minHeight: 90,
                textAlign: "right",
                color: "#3F312B",
                marginBottom: 12,
              }}
            />
            <View style={{ flexDirection: "row-reverse", gap: 8 }}>
              <Pressable
                onPress={handleSaveNotes}
                disabled={savingNotes}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor: savingNotes ? "#C4B5AA" : "#7B5A4D",
                  alignItems: "center",
                }}
              >
                {savingNotes ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>
                    שמור
                  </Text>
                )}
              </Pressable>
              <Pressable
                onPress={closeEditNotes}
                disabled={savingNotes}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: "#7B5A4D",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#7B5A4D", fontWeight: "600" }}>
                  ביטול
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </MobileScreenLayout>
  );
}

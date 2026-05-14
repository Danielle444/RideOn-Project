import React, { useMemo, useState } from "react";

import { Pressable, Text, View } from "react-native";

import ShavingsHistoryModal from "./ShavingsHistoryModal";

import styles from "../../styles/adminCompetitionStallsStyles";

function formatPrice(value) {
  if (value === null || value === undefined) {
    return "₪0";
  }

  try {
    return "₪" + Number(value).toLocaleString("he-IL");
  } catch {
    return "₪" + String(value);
  }
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

function getNumberOfDays(item) {
  if (item.numberOfDays) {
    return item.numberOfDays;
  }

  if (!item.startDate || !item.endDate) {
    return "-";
  }

  try {
    var start = new Date(item.startDate);
    var end = new Date(item.endDate);
    var diff = end.getTime() - start.getTime();
    var days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days <= 0) {
      return 1;
    }

    return days;
  } catch {
    return "-";
  }
}

function getBookingStatusText(item) {
  if (item.isCancelled) {
    return "בוטל";
  }

  if (item.hasPendingCancellation) {
    return "בקשת ביטול ממתינה";
  }

  if (item.hasApprovedChange) {
    return "עודכן";
  }

  return "";
}

function getBookingStatusStyle(item) {
  if (item.isCancelled) {
    return styles.stallStatusCancelled;
  }

  if (item.hasPendingCancellation) {
    return styles.stallStatusPending;
  }

  if (item.hasApprovedChange) {
    return styles.stallStatusUpdated;
  }

  return null;
}

export default function CompetitionStallCard(props) {
  var item = props.item;

  var [showHistory, setShowHistory] = useState(false);

  var isTackBooking = item.isTackBooking === true;

  var isLocked =
    item.isCancelled === true || item.hasPendingCancellation === true;

  var bookingStatusText = getBookingStatusText(item);

  var bookingStatusStyle = getBookingStatusStyle(item);

  var shavingsOrders = Array.isArray(item.shavingsOrders)
    ? item.shavingsOrders
    : [];

  var totalBags = useMemo(
    function () {
      if (isTackBooking) {
        return 0;
      }

      return shavingsOrders.reduce(function (sum, order) {
        return sum + Number(order.bagQuantityPerStall || 0);
      }, 0);
    },
    [shavingsOrders, isTackBooking],
  );

  var numberOfDays = getNumberOfDays(item);

  var stallAmount = Number(item.stallAmount || 0);

  var shavingsAmount = isTackBooking
    ? 0
    : Number(item.shavingsTotalAmount || 0);

  var totalAmount = Number(item.totalAmount || 0);

  return (
    <>
      <View
        style={[
          styles.stallCard,
          item.isCancelled ? styles.stallCardDisabled : null,
        ]}
      >
        <View style={styles.stallTopRow}>
          {!isTackBooking && !item.isCancelled ? (
            <View style={styles.shavingsPanel}>
              <View style={styles.shavingsPanelTopRow}>
                {!isLocked ? (
                  <Pressable
                    style={styles.shavingsPlusButton}
                    onPress={function () {
                      if (typeof props.onAddShavings === "function") {
                        props.onAddShavings(item);
                      }
                    }}
                  >
                    <Text style={styles.shavingsPlus}>+</Text>
                  </Pressable>
                ) : (
                  <View style={styles.shavingsPlusButtonDisabled}>
                    <Text style={styles.shavingsPlusDisabled}>+</Text>
                  </View>
                )}

                <Text style={styles.shavingsPanelTitle}>
                  נסורת - {totalBags} שקים
                </Text>
              </View>

              <Text style={styles.shavingsPanelPrice}>
                עלות נסורת: {formatPrice(shavingsAmount)}
              </Text>

              <Pressable
                style={styles.historyButton}
                onPress={function () {
                  setShowHistory(true);
                }}
              >
                <Text style={styles.historyButtonText}>
                  צפייה בהיסטוריית הזמנות
                </Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.stallDetails}>
            <View style={styles.stallTitleBlock}>
              <Text style={styles.stallHorseName}>
                {isTackBooking ? "תא ציוד" : item.horseName || "ללא סוס"}
              </Text>

              {bookingStatusText ? (
                <View style={[styles.stallStatusBadge, bookingStatusStyle]}>
                  <Text style={styles.stallStatusText}>
                    {bookingStatusText}
                  </Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.stallMeta}>
              סוג תא: {isTackBooking ? "תא ציוד" : "תא רגיל"}
            </Text>

            <Text style={styles.stallMeta}>
              {formatDate(item.startDate)} - {formatDate(item.endDate)} •{" "}
              {numberOfDays} ימים
            </Text>

            <Text style={styles.stallMeta}>
              משלם: {item.payerName || "לא צוין"}
            </Text>

            <Text style={styles.stallMeta}>
              עלות תא: {formatPrice(stallAmount)}
            </Text>
          </View>
        </View>

        <View style={styles.stallDivider} />

        <View style={styles.stallFooterBlock}>
          <Text style={styles.stallTotalText}>
            סה״כ תא: {formatPrice(totalAmount)}
          </Text>

          <View style={styles.stallFooterActionsLine}>
            <View
              style={[
                styles.paymentBadge,
                item.isPaid ? styles.paymentPaid : styles.paymentUnpaid,
              ]}
            >
              <Text
                style={[
                  styles.paymentBadgeText,
                  item.isPaid
                    ? styles.paymentBadgeTextPaid
                    : styles.paymentBadgeTextUnpaid,
                ]}
              >
                {item.isPaid ? "שולם" : "לא שולם"}
              </Text>
            </View>

            <View style={styles.footerActionsRow}>
              {props.onDelete && !isLocked ? (
                <Pressable
                  style={styles.cancelStallButton}
                  onPress={function () {
                    props.onDelete(item);
                  }}
                >
                  <Text style={styles.cancelStallButtonText}>ביטול תא</Text>
                </Pressable>
              ) : null}

              {props.onEdit && !isLocked ? (
                <Pressable
                  style={styles.editStallButton}
                  onPress={function () {
                    props.onEdit(item);
                  }}
                >
                  <Text style={styles.editStallButtonText}>עריכה</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>
      </View>

      {!isTackBooking && !item.isCancelled ? (
        <ShavingsHistoryModal
          visible={showHistory}
          onClose={function () {
            setShowHistory(false);
          }}
          orders={shavingsOrders}
        />
      ) : null}
    </>
  );
}
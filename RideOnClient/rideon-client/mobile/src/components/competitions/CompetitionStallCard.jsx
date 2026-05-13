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

function getShavingsTotalAmount(item, totalBags) {
  if (item.shavingsTotalAmount !== null && item.shavingsTotalAmount !== undefined) {
    return Number(item.shavingsTotalAmount || 0);
  }

  if (item.totalShavingsAmount !== null && item.totalShavingsAmount !== undefined) {
    return Number(item.totalShavingsAmount || 0);
  }

  if (item.shavingsBagPrice !== null && item.shavingsBagPrice !== undefined) {
    return Number(totalBags || 0) * Number(item.shavingsBagPrice || 0);
  }

  return 0;
}

export default function CompetitionStallCard(props) {
  var item = props.item;

  var [showHistory, setShowHistory] = useState(false);

  var shavingsOrders = Array.isArray(item.shavingsOrders)
    ? item.shavingsOrders
    : [];

  var totalBags = useMemo(
    function () {
      return shavingsOrders.reduce(function (sum, order) {
        return sum + Number(order.bagQuantityPerStall || 0);
      }, 0);
    },
    [shavingsOrders],
  );

  var numberOfDays = getNumberOfDays(item);
  var stallAmount = Number(item.totalAmount || 0);
  var shavingsAmount = getShavingsTotalAmount(item, totalBags);
  var totalAmount = stallAmount + shavingsAmount;

  return (
    <>
      <View style={styles.stallCard}>
        <View style={styles.stallTopRow}>
          <View style={styles.shavingsPanel}>
            <View style={styles.shavingsPanelTopRow}>
              <Text style={styles.shavingsPlus}>+</Text>

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

          <View style={styles.stallDetails}>
            <Text style={styles.stallHorseName}>
              {item.isTackBooking ? "תא ציוד" : item.horseName || "ללא סוס"}
            </Text>

            <Text style={styles.stallMeta}>
              סוג תא: {item.isTackBooking ? "תא ציוד" : "תא רגיל"}
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

        <View style={styles.stallFooterRow}>
          <View style={styles.footerActionsRow}>
            {props.onDelete ? (
              <Pressable
                style={styles.iconButton}
                onPress={function () {
                  props.onDelete(item);
                }}
              >
                <Text style={styles.iconButtonText}>🗑</Text>
              </Pressable>
            ) : null}

            {props.onEdit ? (
              <Pressable
                style={styles.iconButton}
                onPress={function () {
                  props.onEdit(item);
                }}
              >
                <Text style={styles.iconButtonText}>✎</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.totalAndStatusRow}>
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

            <Text style={styles.stallTotalText}>
              סה״כ תא: {formatPrice(totalAmount)}
            </Text>
          </View>
        </View>
      </View>

      <ShavingsHistoryModal
        visible={showHistory}
        onClose={function () {
          setShowHistory(false);
        }}
        orders={shavingsOrders}
      />
    </>
  );
}
import React, { useMemo } from "react";

import { Modal, Pressable, ScrollView, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";

import styles from "../../styles/adminCompetitionStallsStyles";

import { LIFECYCLE_STATE } from "../../utils/payerAccountLifecycle";

function formatPrice(value) {
  if (value === null || value === undefined || value === "") {
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
    return new Date(value).toLocaleString("he-IL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(value);
  }
}

function getOrderAmount(order) {
  if (order.amountForThisStall !== null && order.amountForThisStall !== undefined) {
    return Number(order.amountForThisStall || 0);
  }

  return Number(order.totalAmount || 0);
}

// SH-1: the shavings order's own cancellation lifecycle (proc 176's
// IsCancelled/HasPendingCancellation) is an axis independent of deliveryStatus
// (Spec 1 only ever stores Pending/Delivered there) - it must be checked first,
// or a cancelled/pending-cancellation order keeps rendering its stale delivery
// status (typically "ממתין") forever.
function getStatusText(order) {
  if (order && order.lifecycleState === LIFECYCLE_STATE.CANCELLED) {
    return "בוטל";
  }

  if (order && order.lifecycleState === LIFECYCLE_STATE.PENDING_CANCELLATION) {
    return "ממתין לביטול";
  }

  var value = String((order && order.deliveryStatus) || "").trim();

  if (!value) {
    return "לא ידוע";
  }

  if (value === "Pending") {
    return "ממתין";
  }

  if (value === "Claimed" || value === "InProgress") {
    return "בטיפול";
  }

  if (value === "Delivered") {
    return "נמסר";
  }

  if (value === "Approved") {
    return "אושר";
  }

  if (value === "Cancelled") {
    return "בוטל";
  }

  return value;
}

function getStatusBadgeStyle(order) {
  if (order && order.lifecycleState === LIFECYCLE_STATE.CANCELLED) {
    return styles.historyStatusDanger;
  }

  if (order && order.lifecycleState === LIFECYCLE_STATE.PENDING_CANCELLATION) {
    return styles.historyStatusWarning;
  }

  var value = String((order && order.deliveryStatus) || "").trim();

  if (value === "Approved" || value === "Delivered") {
    return styles.historyStatusSuccess;
  }

  if (value === "Claimed" || value === "InProgress") {
    return styles.historyStatusInfo;
  }

  if (value === "Pending") {
    return styles.historyStatusWarning;
  }

  if (value === "Cancelled") {
    return styles.historyStatusDanger;
  }

  return styles.historyStatusNeutral;
}

export default function ShavingsHistoryModal(props) {
  var orders = Array.isArray(props.orders) ? props.orders : [];

  var summary = useMemo(
    function () {
      return orders.reduce(
        function (acc, order) {
          // SH-2: mirrors the stall-card total's exclusion rule so this modal's own
          // summary never disagrees with the card it was opened from. Bag count is
          // left as an unfiltered historical count - only the amount is excluded.
          var isTerminallyCancelled =
            order.lifecycleState === LIFECYCLE_STATE.CANCELLED;

          return {
            totalBags:
              acc.totalBags + Number(order.bagQuantityPerStall || 0),

            totalAmount:
              acc.totalAmount +
              (isTerminallyCancelled ? 0 : getOrderAmount(order)),
          };
        },
        {
          totalBags: 0,
          totalAmount: 0,
        },
      );
    },
    [orders],
  );

  return (
    <Modal
      visible={props.visible}
      animationType="fade"
      transparent={true}
      onRequestClose={props.onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.historyModalCard}>
          <View style={styles.historyModalHeader}>
            <Pressable
              onPress={props.onClose}
              style={styles.historyCloseButton}
            >
              <Ionicons name="close-outline" size={25} color="#4F3B31" />
            </Pressable>

            <View style={styles.historyTitleWrap}>
              <Text style={styles.historyModalTitle}>
                היסטוריית הזמנות נסורת
              </Text>

              <Text style={styles.historySubtitle}>
                {orders.length} הזמנות עבור התא
              </Text>
            </View>

            <View style={styles.historyHeaderSpacer} />
          </View>

          <View style={styles.historySummaryRow}>
            <View style={styles.historySummaryBox}>
              <Text style={styles.historySummaryValue}>
                {summary.totalBags}
              </Text>

              <Text style={styles.historySummaryLabel}>
                שקים
              </Text>
            </View>

            <View style={styles.historySummaryBox}>
              <Text style={styles.historySummaryValue}>
                {formatPrice(summary.totalAmount)}
              </Text>

              <Text style={styles.historySummaryLabel}>
                סה״כ נסורת
              </Text>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={styles.historyContent}
            showsVerticalScrollIndicator={false}
          >
            {orders.length === 0 ? (
              <View style={styles.historyEmptyWrap}>
                <Text style={styles.historyEmptyTitle}>
                  אין הזמנות נסורת
                </Text>

                <Text style={styles.historyEmptyText}>
                  עדיין לא קיימות הזמנות נסורת עבור תא זה
                </Text>
              </View>
            ) : (
              orders.map(function (order, index) {
                return (
                  <View
                    key={String(order.shavingsOrderId || index)}
                    style={styles.historyOrderCard}
                  >
                    <View style={styles.historyOrderHeader}>
                      <View
                        style={[
                          styles.historyStatusBadge,
                          getStatusBadgeStyle(order),
                        ]}
                      >
                        <Text style={styles.historyStatusText}>
                          {getStatusText(order)}
                        </Text>
                      </View>

                      <Text style={styles.historyOrderPrice}>
                        {formatPrice(getOrderAmount(order))}
                      </Text>
                    </View>

                    <View style={styles.historyDetailsList}>
                      <View style={styles.historyDetailRow}>
                        <Text style={styles.historyDetailLabel}>
                          כמות שקים
                        </Text>

                        <Text style={styles.historyDetailValue}>
                          {order.bagQuantityPerStall || 0}
                        </Text>
                      </View>

                      <View style={styles.historyDetailRow}>
                        <Text style={styles.historyDetailLabel}>
                          הוזמן ע״י
                        </Text>

                        <Text style={styles.historyDetailValue}>
                          {order.orderedByName || "-"}
                        </Text>
                      </View>

                      <View style={styles.historyDetailRow}>
                        <Text style={styles.historyDetailLabel}>
                          זמן אספקה
                        </Text>

                        <Text style={styles.historyDetailValue}>
                          {formatDate(order.requestedDeliveryTime)}
                        </Text>
                      </View>
                    </View>

                    {order.notes ? (
                      <View style={styles.historyNotesBox}>
                        <Text style={styles.historyNotesLabel}>
                          הערות
                        </Text>

                        <Text style={styles.historyNotesText}>
                          {order.notes}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
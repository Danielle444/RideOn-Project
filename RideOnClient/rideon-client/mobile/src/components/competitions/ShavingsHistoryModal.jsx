import React from "react";

import { Modal, Pressable, ScrollView, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";

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

export default function ShavingsHistoryModal(props) {
  var orders = Array.isArray(props.orders) ? props.orders : [];

  return (
    <Modal
      visible={props.visible}
      animationType="slide"
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
              <Ionicons name="close-outline" size={28} color="#4F3B31" />
            </Pressable>

            <Text style={styles.historyModalTitle}>היסטוריית הזמנות נסורת</Text>

            <View style={styles.historyHeaderSpacer} />
          </View>

          <ScrollView
            contentContainerStyle={styles.historyContent}
            showsVerticalScrollIndicator={false}
          >
            {orders.length === 0 ? (
              <View style={styles.historyEmptyWrap}>
                <Text style={styles.historyEmptyTitle}>אין הזמנות נסורת</Text>

                <Text style={styles.historyEmptyText}>
                  עדיין לא קיימות הזמנות נסורת עבור תא זה
                </Text>
              </View>
            ) : (
              orders.map(function (order) {
                return (
                  <View
                    key={order.shavingsOrderId}
                    style={styles.historyOrderCard}
                  >
                    <View style={styles.historyOrderTop}>
                      <Text style={styles.historyOrderAmount}>
                        {formatPrice(order.totalAmount)}
                      </Text>

                      <Text style={styles.historyOrderStatus}>
                        {order.deliveryStatus}
                      </Text>
                    </View>

                    <Text style={styles.historyOrderText}>
                      שקים: {order.bagQuantityPerStall}
                    </Text>

                    <Text style={styles.historyOrderText}>
                      הוזמן ע״י: {order.orderedByName || "-"}
                    </Text>

                    <Text style={styles.historyOrderText}>
                      זמן אספקה: {formatDate(order.requestedDeliveryTime)}
                    </Text>
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

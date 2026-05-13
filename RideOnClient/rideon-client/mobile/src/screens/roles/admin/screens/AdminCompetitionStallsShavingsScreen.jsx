import React from "react";

import { ActivityIndicator, ScrollView, Text, View } from "react-native";

import { useActiveRole } from "../../../../context/ActiveRoleContext";

import { useCompetition } from "../../../../context/CompetitionContext";

import useAdminCompetitionStallsOverview from "../../../../hooks/useAdminCompetitionStallsOverview";

import styles from "../../../../styles/adminCompetitionStallsStyles";

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

export default function AdminCompetitionStallsShavingsScreen() {
  var activeRoleContext = useActiveRole();

  var competitionContext = useCompetition();

  var activeRole = activeRoleContext.activeRole;

  var activeCompetition = competitionContext.activeCompetition;

  var overview = useAdminCompetitionStallsOverview({
    competitionId: activeCompetition?.competitionId,

    activeRole: activeRole,
  });

  if (overview.loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#7B5A4D" />

        <Text style={styles.loadingText}>טוענת תאים ונסורת...</Text>
      </View>
    );
  }

  if (overview.screenError) {
    return (
      <View style={styles.errorWrap}>
        <Text style={styles.errorText}>{overview.screenError}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {overview.cards.map(function (item) {
        return (
          <View key={item.stallBookingId} style={styles.card}>
            <View style={styles.cardTop}>
              <View>
                <Text style={styles.horseName}>
                  {item.isTackBooking ? "תא ציוד" : item.horseName || "ללא סוס"}
                </Text>

                <Text style={styles.dateText}>
                  {item.startDate} - {item.endDate}
                </Text>
              </View>

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
            </View>

            <Text style={styles.amountText}>
              {formatPrice(item.totalAmount)}
            </Text>

            <View style={styles.shavingsSection}>
              <Text style={styles.sectionTitle}>נסורת</Text>

              {item.shavingsOrders?.length === 0 ? (
                <Text style={styles.emptyText}>אין הזמנות נסורת</Text>
              ) : (
                item.shavingsOrders.map(function (order) {
                  return (
                    <View
                      key={order.shavingsOrderId}
                      style={styles.shavingsCard}
                    >
                      <Text style={styles.shavingsText}>
                        שקיות: {order.bagQuantityPerStall}
                      </Text>

                      <Text style={styles.shavingsText}>
                        סטטוס: {order.deliveryStatus}
                      </Text>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

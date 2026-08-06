import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import styles from "../../styles/adminCompetitionPayerAccountStyles";

import { SHAVINGS_NEEDS_REVIEW_COPY } from "../../utils/payerAccountCopy";

// CAP-4: one collapsible card per shavings-order group, shared by
// AdminCompetitionPayerAccountScreen.jsx and PayerCompetitionAccountScreen.jsx
// so the rendered card is identical on both screens instead of duplicated.
// Owns its own collapse state (starts expanded).

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

// requestedDeliveryTime is `timestamp without time zone` (a full date+time),
// unlike the HH:MM:SS-only time strings the two screens' own formatTime
// helpers handle.
function formatShavingsDeliveryTime(value) {
  if (!value) {
    return "-";
  }

  var date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  var datePart = date.toLocaleDateString("he-IL");
  var hours = String(date.getHours()).padStart(2, "0");
  var minutes = String(date.getMinutes()).padStart(2, "0");

  return datePart + " " + hours + ":" + minutes;
}

// Mirrors the stall-label fallback already inline in both screens' stalls
// tab (isForTack -> "תא ציוד", else barnName/horseName, else "תא"). A group
// with no resolvable anchor stall (needsReview) uses the dedicated fallback
// instead, since "תא" would wrongly imply a real stall was found.
function getGroupLabel(group) {
  if (group.isNeedsReview || !group.anchorStall) {
    return SHAVINGS_NEEDS_REVIEW_COPY.stallLabel;
  }

  var stall = group.anchorStall;

  return stall.isForTack
    ? "תא ציוד"
    : stall.barnName || stall.horseName || "תא";
}

// One row per top-level shavings order within its group. Fields are exactly
// the deployed proc-212 shavings[] shape - bagQuantity, amountToPay,
// paidAmount, unpaidAmount, deliveryStatus, requestedDeliveryTime,
// stallBookingIds - nothing invented.
function renderShavingsOrderRow(order) {
  var linkedStallCount = Array.isArray(order.stallBookingIds)
    ? order.stallBookingIds.length
    : 0;

  return (
    <View
      key={String(order.shavingsOrderId)}
      style={{
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: "#F0E5DC",
      }}
    >
      <View style={styles.itemTopRow}>
        <Text style={styles.itemText}>{order.bagQuantity} שקים</Text>

        <Text style={styles.itemAmount}>
          {formatCurrency(order.amountToPay)}
        </Text>
      </View>

      <Text style={styles.itemText}>
        שולם: {formatCurrency(order.paidAmount)} · יתרה:{" "}
        {formatCurrency(order.unpaidAmount)}
      </Text>

      <Text style={styles.itemText}>
        מועד מבוקש: {formatShavingsDeliveryTime(order.requestedDeliveryTime)}
      </Text>

      <Text style={styles.itemMutedText}>
        סטטוס: {order.deliveryStatus || "-"}
      </Text>

      {linkedStallCount > 1 ? (
        <Text style={styles.itemMutedText}>
          משויך ל-{linkedStallCount} תאים
        </Text>
      ) : null}
    </View>
  );
}

export default function ShavingsGroupCard(props) {
  var group = props.group;
  var [isCollapsed, setIsCollapsed] = useState(false);

  function toggleCollapsed() {
    setIsCollapsed(function (prev) {
      return !prev;
    });
  }

  return (
    <View style={styles.itemCard}>
      <Pressable
        onPress={toggleCollapsed}
        style={{
          flexDirection: "row-reverse",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text style={styles.itemTitle}>{getGroupLabel(group)}</Text>

        <Text style={{ color: "#7B5A4D", fontWeight: "700", fontSize: 12 }}>
          {isCollapsed ? "הצג ▼" : "הסתר ▲"}
        </Text>
      </Pressable>

      {!isCollapsed
        ? group.entries.map(function (order) {
            return renderShavingsOrderRow(order);
          })
        : null}
    </View>
  );
}

export { getGroupLabel };

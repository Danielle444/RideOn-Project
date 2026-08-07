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
//
// Standalone shavings cancellation: the cancel action is opt-in via
// onCancelOrder, passed by the caller ONLY for groups it renders from the
// active band - cancelled/pending/needsReview groups are never given the
// prop, so they render with no button at all (same "no action on a
// non-active item" convention already used for stalls/paidTimes/classes on
// both screens, rather than reintroducing a duplicate isCancelled/
// hasPendingCancellation check here). A Paid order shows the same locked
// footer style as every other paid item on these screens instead of a
// button, since Policy A and the server both already refuse to cancel a
// paid order - this is purely a UX short-circuit, not the source of truth.
//
// A Delivered order (deliveryStatus === "Delivered", set only by
// usp_markdelivered/usp_savedeliveryphoto once arrivaltime is stamped -
// already part of the proc-212 shape, no new field needed) is locked the
// same way: usp_admincancelshavingsorder / usp_cancelshavingsorderbypayer /
// usp_secretarycancelshavingsorder all reject a delivered order server-side
// now (fix/competition-ended-and-delivery-guards), so offering the button
// here would only produce a guaranteed-fail tap.
function renderShavingsOrderRow(order, actions) {
  var linkedStallCount = Array.isArray(order.stallBookingIds)
    ? order.stallBookingIds.length
    : 0;

  var canShowCancel = actions && typeof actions.onCancelOrder === "function";
  var isPaid = order.isPaid === true;
  var isDelivered = order.deliveryStatus === "Delivered";
  var busyKey = "shavings:" + order.shavingsOrderId;
  var isBusy = !!actions && actions.cancellingId === busyKey;

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

      {canShowCancel && isPaid ? (
        <View
          style={{
            marginTop: 10,
            padding: 8,
            backgroundColor: "#F0E5DC",
            borderRadius: 8,
          }}
        >
          <Text
            style={{
              color: "#8A7268",
              fontSize: 12,
              textAlign: "right",
            }}
          >
            כבר שולם — לא ניתן לבטל
          </Text>
        </View>
      ) : null}

      {canShowCancel && !isPaid && isDelivered ? (
        <View
          style={{
            marginTop: 10,
            padding: 8,
            backgroundColor: "#F0E5DC",
            borderRadius: 8,
          }}
        >
          <Text
            style={{
              color: "#8A7268",
              fontSize: 12,
              textAlign: "right",
            }}
          >
            ההזמנה נמסרה — לא ניתן לבטל
          </Text>
        </View>
      ) : null}

      {canShowCancel && !isPaid && !isDelivered ? (
        <Pressable
          onPress={function () {
            actions.onCancelOrder(order);
          }}
          disabled={isBusy}
          style={{
            marginTop: 10,
            backgroundColor: isBusy ? "#C9B7AC" : "#A0522D",
            borderRadius: 10,
            paddingVertical: 9,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>
            {isBusy ? "שולח..." : "בטל"}
          </Text>
        </Pressable>
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

  var actions = {
    onCancelOrder: props.onCancelOrder,
    cancellingId: props.cancellingId,
  };

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
            return renderShavingsOrderRow(order, actions);
          })
        : null}
    </View>
  );
}

export { getGroupLabel };

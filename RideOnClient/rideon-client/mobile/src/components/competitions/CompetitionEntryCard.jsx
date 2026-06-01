import { Pressable, Text, View } from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";

import styles from "../../styles/adminCompetitionClassesStyles";

function getStatusBadgeText(item) {
  if (item.isCancelledAfterStart) {
    return "בוטל אחרי תחילת התחרות";
  }

  if (
    String(item.entryStatus || "").toLowerCase() === "cancelled" ||
    item.isCancelled === true
  ) {
    return "בוטל";
  }

  if (item.hasPendingCancellation) {
    return "בקשת ביטול ממתינה למזכירה";
  }

  if (item.hasPendingChange) {
    return "בקשת שינוי ממתינה למזכירה";
  }

  return "";
}

function getStatusBadgeStyle(item) {
  if (item.isCancelledAfterStart || item.isCancelled) {
    return {
      backgroundColor: "#EFE4DD",
      borderColor: "#C9B7AC",
      color: "#6B5448",
    };
  }

  if (item.hasPendingCancellation || item.hasPendingChange) {
    return {
      backgroundColor: "#FFF4E0",
      borderColor: "#E6C681",
      color: "#8A5A00",
    };
  }

  return null;
}

export default function CompetitionEntryCard(props) {
  var item = props.item;

  var [expanded, setExpanded] = useState(false);

  var isCancelled =
    item.isCancelledAfterStart === true ||
    item.isCancelled === true ||
    String(item.entryStatus || "").toLowerCase() === "cancelled";

  var hasPendingApproval =
    item.hasPendingCancellation === true || item.hasPendingChange === true;

  var isLocked = item.isPaid === true || isCancelled || hasPendingApproval;

  var grayedOut = isCancelled || hasPendingApproval;

  var statusText = getStatusBadgeText(item);

  var statusStyle = getStatusBadgeStyle(item);

  function renderPaymentBadge() {
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

  function renderFineBadge() {
    if (!item.fineAmount || Number(item.fineAmount) <= 0) {
      return null;
    }

    return (
      <View style={styles.fineBadge}>
        <Text style={styles.fineBadgeText}>כולל קנס ₪{item.fineAmount}</Text>
      </View>
    );
  }

  function renderStatusBadge() {
    if (!statusText || !statusStyle) {
      return null;
    }

    return (
      <View
        style={{
          alignSelf: "flex-end",
          borderRadius: 12,
          borderWidth: 1,
          paddingHorizontal: 10,
          paddingVertical: 4,
          backgroundColor: statusStyle.backgroundColor,
          borderColor: statusStyle.borderColor,
          marginTop: 4,
        }}
      >
        <Text
          style={{
            fontSize: 12,
            fontWeight: "700",
            color: statusStyle.color,
            textAlign: "right",
          }}
        >
          {statusText}
        </Text>
      </View>
    );
  }

  var priceColor = grayedOut ? "#A39689" : undefined;

  return (
    <Pressable
      style={styles.entryCard}
      onPress={function () {
        setExpanded(!expanded);
      }}
    >
      <View style={styles.topRow}>
        <View style={styles.classBlock}>
          <View
            style={{
              flexDirection: "row-reverse",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Text
              style={[styles.className, grayedOut ? { color: "#8A7A6E" } : null]}
            >
              {item.className}
            </Text>

            {typeof props.onViewEntries === "function" &&
            item.classInCompId ? (
              <Pressable
                onPress={function (e) {
                  if (e && e.stopPropagation) e.stopPropagation();
                  props.onViewEntries(item);
                }}
                hitSlop={8}
                style={{ padding: 2 }}
              >
                <Ionicons name="eye-outline" size={18} color="#5A4036" />
              </Pressable>
            ) : null}
          </View>

          <Text style={styles.classDate}>
            {props.formatDate(item.classDate)}
          </Text>
        </View>

        <Text
          style={[
            styles.amountText,
            priceColor
              ? { color: priceColor, textDecorationLine: "line-through" }
              : null,
          ]}
        >
          ₪{item.amountToPay}
        </Text>
      </View>

      <Text
        style={[styles.mainLine, grayedOut ? { color: "#8A7A6E" } : null]}
      >
        {item.riderName} • {item.horseName}
      </Text>

      {renderStatusBadge()}

      <View style={styles.badgesRow}>
        {renderPaymentBadge()}
        {renderFineBadge()}
      </View>

      {expanded ? (
        <View style={styles.detailsBlock}>
          <Text style={styles.detailText}>מאמן: {item.coachName || "-"}</Text>

          <Text style={styles.detailText}>משלם: {item.payerName || "-"}</Text>

          <Text style={styles.detailText}>
            מקבל פרס: {item.prizeRecipientName || "-"}
          </Text>

          {item.drawOrder ? (
            <Text style={styles.detailText}>סדר כניסה: {item.drawOrder}</Text>
          ) : null}

          <View
            style={{
              marginTop: 8,
              paddingTop: 8,
              borderTopWidth: 1,
              borderTopColor: "#E7D6CA",
              gap: 3,
              opacity: grayedOut ? 0.55 : 1,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: "#5B4438",
                textAlign: "right",
                marginBottom: 2,
              }}
            >
              פירוט מחיר
            </Text>

            <View
              style={{
                flexDirection: "row-reverse",
                justifyContent: "space-between",
              }}
            >
              <Text style={styles.detailText}>חלק החווה</Text>
              <Text style={styles.detailText}>
                ₪{Number(item.organizerCost || 0)}
              </Text>
            </View>

            <View
              style={{
                flexDirection: "row-reverse",
                justifyContent: "space-between",
              }}
            >
              <Text style={styles.detailText}>חלק ההתאחדות</Text>
              <Text style={styles.detailText}>
                ₪{Number(item.federationCost || 0)}
              </Text>
            </View>

            {Number(item.fineAmount || 0) > 0 ? (
              <View
                style={{
                  flexDirection: "row-reverse",
                  justifyContent: "space-between",
                }}
              >
                <Text style={[styles.detailText, { color: "#A0522D" }]}>
                  קנס
                </Text>
                <Text style={[styles.detailText, { color: "#A0522D" }]}>
                  ₪{Number(item.fineAmount)}
                </Text>
              </View>
            ) : null}

            <View
              style={{
                flexDirection: "row-reverse",
                justifyContent: "space-between",
                marginTop: 4,
                paddingTop: 4,
                borderTopWidth: 1,
                borderTopColor: "#E7D6CA",
              }}
            >
              <Text style={[styles.detailText, { fontWeight: "800" }]}>
                סה״כ לתשלום
              </Text>
              <Text style={[styles.detailText, { fontWeight: "800" }]}>
                ₪{Number(item.amountToPay || 0)}
              </Text>
            </View>
          </View>

          {isLocked ? (
            <Text style={styles.detailText}>
              {item.isPaid
                ? "הרשמה זו כבר שולמה ולכן לא ניתן לערוך או לבטל אותה."
                : isCancelled
                  ? "הרשמה זו בוטלה ולכן לא ניתן לערוך אותה."
                  : "קיימת בקשה ממתינה למזכירה. לא ניתן לערוך עד שתאושר או תידחה."}
            </Text>
          ) : (
            <View style={styles.actionsRow}>
              <Pressable
                style={styles.secondaryActionButton}
                onPress={function () {
                  if (props.onEdit) {
                    props.onEdit(item);
                  }
                }}
              >
                <Text style={styles.secondaryActionButtonText}>ערוך הרשמה</Text>
              </Pressable>

              <Pressable
                style={styles.dangerActionButton}
                onPress={function () {
                  if (props.onCancel) {
                    props.onCancel(item);
                  }
                }}
              >
                <Text style={styles.dangerActionButtonText}>בטל הרשמה</Text>
              </Pressable>
            </View>
          )}
        </View>
      ) : null}
    </Pressable>
  );
}

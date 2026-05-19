import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PaidTimeCardActions from "./PaidTimeCardActions";
import styles from "../../../styles/adminCompetitionPaidTimesStyles";

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatActualTime(value) {
  if (!value) return null;
  try {
    var d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return pad2(d.getHours()) + ":" + pad2(d.getMinutes());
  } catch (e) {
    return null;
  }
}

function StatusBadge({ item }) {
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

function PaymentBadge({ item }) {
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

// כרטיס בקשת פייד טיים בתצוגת רשימה.
// מצב default: ממוזער (רק כותרת + badges). לחיצה -> מתרחב לפרטים מלאים + פעולות.
export default function PaidTimeListItemCard(props) {
  var item = props.item;
  var open = !!props.isExpanded;
  var actualTime = formatActualTime(item.assignedStartTimeActual);
  var canViewSlot =
    !!item.isAssigned &&
    !!item.assignedSlotIsPublished &&
    !!item.assignedCompSlotId &&
    typeof props.onViewSlotSchedule === "function";

  return (
    <View style={styles.requestCard}>
      <Pressable
        onPress={props.onToggleExpand}
        style={{
          flexDirection: "row-reverse",
          alignItems: "center",
          gap: 8,
        }}
      >
        <View style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: "row-reverse",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <Text style={styles.horseName}>{item.horseName}</Text>
            {actualTime ? (
              <Text
                style={{ fontSize: 13, fontWeight: "700", color: "#5A4036" }}
              >
                {actualTime}
              </Text>
            ) : null}
          </View>
          <View style={[styles.badgesRow, { marginTop: 4 }]}>
            <StatusBadge item={item} />
            <PaymentBadge item={item} />
          </View>
        </View>
        {canViewSlot ? (
          <Pressable
            onPress={function (e) {
              e.stopPropagation && e.stopPropagation();
              props.onViewSlotSchedule(item.assignedCompSlotId);
            }}
            hitSlop={8}
            style={{ padding: 4 }}
          >
            <Ionicons name="eye-outline" size={22} color="#5A4036" />
          </Pressable>
        ) : null}
        <Text style={{ fontSize: 18, color: "#7B5A4D" }}>
          {open ? "▲" : "▼"}
        </Text>
      </Pressable>

      {open ? (
        <View style={{ marginTop: 10 }}>
          <View style={styles.cardTopRow}>
            <Text style={styles.priceText}>{item.amountToPay} ₪</Text>
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
              {props.formatDate(item.displaySlotDate)}
            </Text>

            <Text style={styles.slotText}>
              {props.formatTime(item.displayStartTime)} -{" "}
              {props.formatTime(item.displayEndTime)}
            </Text>

            {actualTime ? (
              <Text
                style={[
                  styles.slotText,
                  { color: "#5A4036", fontWeight: "700" },
                ]}
              >
                זמן שיבוץ בפועל: {actualTime}
              </Text>
            ) : null}

            <Text style={styles.slotText}>{item.displayArenaName}</Text>
          </View>

          {item.notes ? (
            <View style={styles.notesBox}>
              <Text style={styles.notesTitle}>הערות</Text>
              <Text style={styles.notesText}>{item.notes}</Text>
            </View>
          ) : null}

          <PaidTimeCardActions
            item={item}
            cancellingId={props.cancellingId}
            onEdit={props.onEdit}
            onCancel={props.onCancel}
          />
        </View>
      ) : null}
    </View>
  );
}

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

function ScheduleRow(props) {
  var it = props.item;
  var open = props.isExpanded;
  var actualTime = formatActualTime(it.assignedStartTimeActual);
  var canViewSlot =
    !!it.assignedSlotIsPublished &&
    !!it.assignedCompSlotId &&
    typeof props.onViewSlotSchedule === "function";

  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: "#F3EAE4",
        paddingVertical: 10,
      }}
    >
      <Pressable
        onPress={props.onToggleExpand}
        style={{
          flexDirection: "row-reverse",
          alignItems: "center",
          gap: 8,
        }}
      >
        <View
          style={{
            width: 56,
            paddingVertical: 6,
            borderRadius: 8,
            backgroundColor: "#FAF5F1",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#5A4036" }}>
            {actualTime || "—"}
          </Text>
          {it.assignedOrder != null ? (
            <Text style={{ fontSize: 10, color: "#8D6E63", marginTop: 2 }}>
              #{it.assignedOrder}
            </Text>
          ) : null}
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "700",
              color: "#3F312B",
              textAlign: "right",
            }}
          >
            {it.horseName}
            {it.barnName ? " (" + it.barnName + ")" : ""}
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: "#8D6E63",
              textAlign: "right",
            }}
          >
            {it.coachName || "ללא מאמן"} • {it.productName}
          </Text>
        </View>
        {canViewSlot ? (
          <Pressable
            onPress={function (e) {
              e.stopPropagation && e.stopPropagation();
              props.onViewSlotSchedule(it.assignedCompSlotId);
            }}
            hitSlop={8}
            style={{ padding: 4 }}
          >
            <Ionicons name="eye-outline" size={20} color="#5A4036" />
          </Pressable>
        ) : null}
        <Text style={{ fontSize: 16, color: "#7B5A4D" }}>
          {open ? "▲" : "▼"}
        </Text>
      </Pressable>

      {open ? (
        <View style={{ marginTop: 8 }}>
          <View style={styles.detailsBlock}>
            <Text style={styles.detailText}>משלם: {it.payerName || "-"}</Text>
            <Text style={styles.detailText}>מחיר: {it.amountToPay} ₪</Text>
          </View>
          {it.notes ? (
            <View style={styles.notesBox}>
              <Text style={styles.notesTitle}>הערות</Text>
              <Text style={styles.notesText}>{it.notes}</Text>
            </View>
          ) : null}
          <PaidTimeCardActions
            item={it}
            cancellingId={props.cancellingId}
            onEdit={props.onEdit}
            onCancel={props.onCancel}
          />
        </View>
      ) : null}
    </View>
  );
}

// תצוגת לו"ז שיבוצים: מקבצת פריטים משובצים לפי תאריך+מגרש+טווח שעות סלוט,
// וממיינת בכל סלוט לפי AssignedOrder/Time בפועל.
export default function PaidTimeScheduleView(props) {
  var items = props.items || [];
  var assigned = items.filter(function (it) {
    return it.isAssigned;
  });

  if (assigned.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>אין שיבוצים להצגה</Text>
        <Text style={styles.emptyText}>
          כאן יוצג הלו"ז של הפייד טיימים שלך אחרי שייצא שיבוץ.
        </Text>
      </View>
    );
  }

  var groups = {};
  assigned.forEach(function (it) {
    var key =
      it.displaySlotDate +
      "|" +
      props.formatTime(it.displayStartTime) +
      "-" +
      props.formatTime(it.displayEndTime) +
      "|" +
      (it.displayArenaName || "");
    if (!groups[key]) {
      groups[key] = {
        date: it.displaySlotDate,
        start: props.formatTime(it.displayStartTime),
        end: props.formatTime(it.displayEndTime),
        arena: it.displayArenaName,
        items: [],
      };
    }
    groups[key].items.push(it);
  });

  var keys = Object.keys(groups).sort();

  return keys.map(function (key) {
    var g = groups[key];
    var sorted = g.items.slice().sort(function (a, b) {
      var ao = a.assignedOrder == null ? 9999 : a.assignedOrder;
      var bo = b.assignedOrder == null ? 9999 : b.assignedOrder;
      if (ao !== bo) return ao - bo;
      if (a.assignedStartTimeActual && b.assignedStartTimeActual) {
        return (
          new Date(a.assignedStartTimeActual) -
          new Date(b.assignedStartTimeActual)
        );
      }
      return 0;
    });

    return (
      <View
        key={"sched-" + key}
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 14,
          padding: 14,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: "#EFE5DF",
        }}
      >
        <Text
          style={{
            fontSize: 15,
            fontWeight: "700",
            color: "#3F312B",
            textAlign: "right",
            marginBottom: 4,
          }}
        >
          {props.formatDate(g.date)}
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: "#8D6E63",
            textAlign: "right",
            marginBottom: 10,
          }}
        >
          {g.start} - {g.end} • {g.arena || "מגרש לא צוין"}
        </Text>

        {sorted.map(function (it) {
          return (
            <ScheduleRow
              key={"sch-row-" + it.paidTimeRequestId}
              item={it}
              isExpanded={props.isExpanded(it.paidTimeRequestId)}
              onToggleExpand={function () {
                props.onToggleExpand(it.paidTimeRequestId);
              }}
              onEdit={props.onEdit}
              onCancel={props.onCancel}
              cancellingId={props.cancellingId}
              onViewSlotSchedule={props.onViewSlotSchedule}
            />
          );
        })}
      </View>
    );
  });
}

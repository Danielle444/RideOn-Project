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

// תצוגת לו"ז שיבוצים: מקבצת פריטים משובצים ומפורסמים בלבד (CAP-2 - שיבוץ
// שטרם פורסם עדיין לא "לו"ז אמיתי", ונשאר גלוי רק ברשימה), בהיררכיה יום ←
// סלוט (תאריך+מגרש+טווח שעות) ← בקשה (CAP-3). ברירת המחדל בטעינה היא כותרות
// יום מכווצות בלבד - toggle היום חושף את הסלוטים המכווצים שלו, toggle הסלוט
// חושף את הבקשות המכווצות שלו, ו-ScheduleRow הקיים ממשיך לנהל את פירוט
// הבקשה עצמה בלי שינוי.
export default function PaidTimeScheduleView(props) {
  var items = props.items || [];
  var assigned = items.filter(function (it) {
    return it.isAssigned && it.assignedSlotIsPublished;
  });

  if (assigned.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>אין שיבוצים להצגה</Text>
        <Text style={styles.emptyText}>
          כאן יוצג הלו"ז של הפייד טיימים שלך אחרי שייצא ויפורסם שיבוץ.
        </Text>
      </View>
    );
  }

  var dayGroups = {};
  assigned.forEach(function (it) {
    var dayKey = it.displaySlotDate;
    var slotKey =
      props.formatTime(it.displayStartTime) +
      "-" +
      props.formatTime(it.displayEndTime) +
      "|" +
      (it.displayArenaName || "");

    if (!dayGroups[dayKey]) {
      dayGroups[dayKey] = { date: it.displaySlotDate, slots: {} };
    }

    if (!dayGroups[dayKey].slots[slotKey]) {
      dayGroups[dayKey].slots[slotKey] = {
        start: props.formatTime(it.displayStartTime),
        end: props.formatTime(it.displayEndTime),
        arena: it.displayArenaName,
        items: [],
      };
    }

    dayGroups[dayKey].slots[slotKey].items.push(it);
  });

  var dayKeys = Object.keys(dayGroups).sort();

  return dayKeys.map(function (dayKey) {
    var day = dayGroups[dayKey];
    var slotKeys = Object.keys(day.slots).sort();
    var dayExpanded = props.isDayExpanded(dayKey);

    return (
      <View
        key={"day-" + dayKey}
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 14,
          padding: 14,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: "#EFE5DF",
        }}
      >
        <Pressable
          onPress={function () {
            props.onToggleDay(dayKey);
          }}
          style={{
            flexDirection: "row-reverse",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text
            style={{
              fontSize: 15,
              fontWeight: "700",
              color: "#3F312B",
              textAlign: "right",
            }}
          >
            {props.formatDate(day.date)}
          </Text>
          <Text style={{ fontSize: 16, color: "#7B5A4D" }}>
            {dayExpanded ? "▲" : "▼"}
          </Text>
        </Pressable>

        {dayExpanded
          ? slotKeys.map(function (slotKey) {
              var slot = day.slots[slotKey];
              var fullSlotKey = dayKey + "|" + slotKey;
              var slotExpanded = props.isSlotExpanded(fullSlotKey);
              var sorted = slot.items.slice().sort(function (a, b) {
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
                  key={"slot-" + fullSlotKey}
                  style={{
                    marginTop: 10,
                    paddingTop: 10,
                    borderTopWidth: 1,
                    borderTopColor: "#F3EAE4",
                  }}
                >
                  <Pressable
                    onPress={function () {
                      props.onToggleSlot(fullSlotKey);
                    }}
                    style={{
                      flexDirection: "row-reverse",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        color: "#8D6E63",
                        textAlign: "right",
                      }}
                    >
                      {slot.start} - {slot.end} •{" "}
                      {slot.arena || "מגרש לא צוין"}
                    </Text>
                    <Text style={{ fontSize: 14, color: "#7B5A4D" }}>
                      {slotExpanded ? "▲" : "▼"}
                    </Text>
                  </Pressable>

                  {slotExpanded
                    ? sorted.map(function (it) {
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
                      })
                    : null}
                </View>
              );
            })
          : null}
      </View>
    );
  });
}

import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { getSlotScheduleForViewing } from "../../../services/paidTimeRequestsService";

function pad2(n) {
  return String(n).padStart(2, "0");
}

function fmtActual(value) {
  if (!value) return "—";
  try {
    var d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return pad2(d.getHours()) + ":" + pad2(d.getMinutes());
  } catch (e) {
    return "—";
  }
}

function fmtTime(value) {
  if (!value) return "";
  return String(value).slice(0, 5);
}

function fmtDate(value) {
  if (!value) return "";
  var d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("he-IL");
}

// Modal לתצוגת לו"ז של סלוט פייד-טיים יחיד.
// מציג את כל הרוכבים שמשובצים בסלוט (כולל של חוות אחרות).
// בקשות של החווה שלי מודגשות.
export default function SlotScheduleModal(props) {
  var slotId = props.slotId;
  var competitionId = props.competitionId;
  var ranchId = props.ranchId;

  var [items, setItems] = useState([]);
  var [loading, setLoading] = useState(false);
  var [error, setError] = useState(null);

  useEffect(
    function () {
      if (!slotId) return;

      var cancelled = false;
      setLoading(true);
      setError(null);
      setItems([]);

      async function load() {
        try {
          var res = await getSlotScheduleForViewing(
            slotId,
            competitionId,
            ranchId
          );
          if (cancelled) return;
          setItems(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
          if (!cancelled) {
            setError(
              String(err?.response?.data || err?.message || "טעינה נכשלה")
            );
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      }
      load();
      return function () {
        cancelled = true;
      };
    },
    [slotId, competitionId, ranchId]
  );

  var header = items.length > 0 ? items[0] : null;

  return (
    <Modal
      visible={!!slotId}
      transparent
      animationType="fade"
      onRequestClose={props.onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.4)",
          justifyContent: "center",
          padding: 16,
        }}
      >
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 14,
            padding: 16,
            maxHeight: "90%",
          }}
        >
          <Text
            style={{
              fontSize: 17,
              fontWeight: "700",
              color: "#3F312B",
              textAlign: "right",
              marginBottom: 4,
            }}
          >
            לו"ז הסלוט
          </Text>

          {header ? (
            <Text
              style={{
                fontSize: 13,
                color: "#8D6E63",
                textAlign: "right",
                marginBottom: 10,
              }}
            >
              {fmtDate(header.slotDate)} | {fmtTime(header.slotStartTime)} -{" "}
              {fmtTime(header.slotEndTime)} | {header.arenaName}
            </Text>
          ) : null}

          {loading ? (
            <View style={{ paddingVertical: 24, alignItems: "center" }}>
              <ActivityIndicator size="large" color="#7B5A4D" />
              <Text style={{ marginTop: 8, color: "#8D6E63" }}>
                טוען לו"ז...
              </Text>
            </View>
          ) : error ? (
            <Text
              style={{
                color: "#B45454",
                fontSize: 13,
                textAlign: "right",
                marginVertical: 12,
              }}
            >
              {error}
            </Text>
          ) : items.length === 0 ? (
            <Text
              style={{
                color: "#8D6E63",
                fontSize: 13,
                textAlign: "right",
                marginVertical: 12,
              }}
            >
              אין שיבוצים בסלוט זה.
            </Text>
          ) : (
            <ScrollView style={{ maxHeight: 460 }}>
              {items.map(function (it) {
                return (
                  <ScheduleRow key={"row-" + it.paidTimeRequestId} item={it} />
                );
              })}
            </ScrollView>
          )}

          <Pressable
            onPress={props.onClose}
            style={{
              marginTop: 12,
              paddingVertical: 10,
              borderRadius: 8,
              backgroundColor: "#7B5A4D",
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>סגור</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function ScheduleRow(props) {
  var it = props.item;
  var isMine = !!it.isMine;
  return (
    <View
      style={{
        flexDirection: "row-reverse",
        alignItems: "center",
        gap: 8,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#F3EAE4",
      }}
    >
      <View
        style={{
          width: 56,
          paddingVertical: 6,
          borderRadius: 8,
          backgroundColor: isMine ? "#E8DCD0" : "#FAF5F1",
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: "700", color: "#5A4036" }}>
          {fmtActual(it.assignedStartTime)}
        </Text>
        {it.assignedOrder != null ? (
          <Text style={{ fontSize: 10, color: "#8D6E63", marginTop: 2 }}>
            #{it.assignedOrder}
          </Text>
        ) : null}
      </View>
      <View style={{ flex: 1 }}>
        <View
          style={{
            flexDirection: "row-reverse",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: "700",
              color: isMine ? "#5A4036" : "#3F312B",
              textAlign: "right",
            }}
          >
            {it.horseName}
            {it.barnName ? " (" + it.barnName + ")" : ""}
          </Text>
          {isMine ? (
            <View
              style={{
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 8,
                backgroundColor: "#7B5A4D",
              }}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 10, fontWeight: "700" }}>
                שלי
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={{ fontSize: 12, color: "#8D6E63", textAlign: "right" }}>
          רוכב: {it.riderName} • מאמן: {it.coachName || "—"}
        </Text>
        <Text style={{ fontSize: 12, color: "#8D6E63", textAlign: "right" }}>
          {it.productName} ({it.durationMinutes} דק')
        </Text>
      </View>
    </View>
  );
}

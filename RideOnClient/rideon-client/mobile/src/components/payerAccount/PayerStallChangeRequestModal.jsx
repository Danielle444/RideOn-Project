import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import CompetitionDateField from "../competitionRegistrations/CompetitionDateField";

function normalizeDateForInput(value) {
  if (!value) {
    return "";
  }

  var text = String(value).trim();

  if (!text) {
    return "";
  }

  if (text.includes("T")) {
    return text.split("T")[0];
  }

  if (text.length >= 10) {
    return text.slice(0, 10);
  }

  return text;
}

// Payer-facing counterpart to StallBookingEditModal (admin): submits the
// actual requested dates up front instead of a data-less confirm-only
// request, per the 2026-08-07 decision that the Secretary must see current
// vs requested values before approving. Product/type is fixed -- only
// dates and notes are requested here, mirroring what
// usp_createstallchangerequestbypayer accepts.
export default function PayerStallChangeRequestModal(props) {
  var item = props.item;

  var [newStartDate, setNewStartDate] = useState("");
  var [newEndDate, setNewEndDate] = useState("");
  var [notes, setNotes] = useState("");
  var [errorMessage, setErrorMessage] = useState("");

  useEffect(
    function () {
      if (!props.visible || !item) {
        return;
      }

      setNewStartDate(normalizeDateForInput(item.startDate));
      setNewEndDate(normalizeDateForInput(item.endDate));
      setNotes("");
      setErrorMessage("");
    },
    [props.visible, item],
  );

  function handleSubmit() {
    if (!newStartDate || !newEndDate) {
      setErrorMessage("יש לבחור תאריכי התחלה וסיום");
      return;
    }

    if (new Date(newStartDate) > new Date(newEndDate)) {
      setErrorMessage("תאריך התחלה לא יכול להיות אחרי תאריך סיום");
      return;
    }

    setErrorMessage("");

    if (typeof props.onSubmit === "function") {
      props.onSubmit({
        newStartDate: newStartDate,
        newEndDate: newEndDate,
        notes: notes ? notes.trim() : null,
      });
    }
  }

  var isSubmitting = props.isSubmitting === true;

  return (
    <Modal
      visible={props.visible}
      transparent
      animationType="fade"
      onRequestClose={props.onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.35)",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 20,
            padding: 18,
          }}
        >
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text
              style={{
                textAlign: "right",
                fontSize: 18,
                fontWeight: "800",
                color: "#4F3B31",
                marginBottom: 4,
              }}
            >
              בקשת שינוי תא
            </Text>

            <Text
              style={{
                textAlign: "right",
                fontSize: 13,
                color: "#7B5A4D",
                marginBottom: 14,
              }}
            >
              בחר/י את התאריכים המבוקשים. הבקשה תישלח למזכירה לאישור.
            </Text>

            <View style={{ marginBottom: 12 }}>
              <CompetitionDateField
                label="תאריך התחלה מבוקש"
                value={newStartDate}
                onChange={setNewStartDate}
              />
            </View>

            <View style={{ marginBottom: 12 }}>
              <CompetitionDateField
                label="תאריך סיום מבוקש"
                value={newEndDate}
                onChange={setNewEndDate}
              />
            </View>

            <View style={{ marginBottom: 4 }}>
              <Text
                style={{
                  textAlign: "right",
                  fontSize: 13,
                  fontWeight: "700",
                  color: "#4F3B31",
                  marginBottom: 6,
                }}
              >
                הערות (אופציונלי)
              </Text>

              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="הערות לבקשה"
                textAlign="right"
                style={{
                  borderWidth: 1,
                  borderColor: "#E4D5C7",
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  color: "#4F3B31",
                }}
              />
            </View>

            {errorMessage ? (
              <Text
                style={{
                  textAlign: "right",
                  color: "#B3261E",
                  fontSize: 13,
                  marginTop: 8,
                }}
              >
                {errorMessage}
              </Text>
            ) : null}

            <View
              style={{
                flexDirection: "row-reverse",
                gap: 10,
                marginTop: 18,
              }}
            >
              <Pressable
                onPress={handleSubmit}
                disabled={isSubmitting}
                style={{
                  flex: 1,
                  backgroundColor: isSubmitting ? "#C9B7AC" : "#7B5A4D",
                  borderRadius: 10,
                  paddingVertical: 11,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>
                  {isSubmitting ? "שולח..." : "שליחת בקשה"}
                </Text>
              </Pressable>

              <Pressable
                onPress={props.onClose}
                disabled={isSubmitting}
                style={{
                  flex: 1,
                  backgroundColor: "#F0E5DC",
                  borderWidth: 1,
                  borderColor: "#7B5A4D",
                  borderRadius: 10,
                  paddingVertical: 11,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#7B5A4D", fontWeight: "800" }}>
                  ביטול
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

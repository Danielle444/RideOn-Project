import React, { useEffect, useMemo, useState } from "react";

import {
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { useActiveRole } from "../../context/ActiveRoleContext";

import { createStallBookingChangeRequest } from "../../services/stallBookingsService";

import CompetitionDateField from "../competitionRegistrations/CompetitionDateField";

import styles from "../../styles/adminCompetitionStallsStyles";

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

function formatPrice(value) {
  if (value === null || value === undefined || value === "") {
    return "₪0";
  }

  try {
    return "₪" + Number(value).toLocaleString("he-IL");
  } catch {
    return "₪" + String(value);
  }
}

function calculateNumberOfDays(startDate, endDate) {
  if (!startDate || !endDate) {
    return 1;
  }

  try {
    var start = new Date(startDate);
    var end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return 1;
    }

    var diff = end.getTime() - start.getTime();
    var days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    return days > 0 ? days : 1;
  } catch {
    return 1;
  }
}

export default function StallBookingEditModal(props) {
  var activeRoleContext = useActiveRole();

  var activeRole = activeRoleContext.activeRole;

  var item = props.item;

  var [isSaving, setIsSaving] = useState(false);
  var [startDate, setStartDate] = useState("");
  var [endDate, setEndDate] = useState("");
  var [notes, setNotes] = useState("");

  var isTackBooking = item && item.isTackBooking === true;

  useEffect(
    function () {
      if (!props.visible || !item) {
        return;
      }

      setStartDate(normalizeDateForInput(item.startDate));
      setEndDate(normalizeDateForInput(item.endDate));
      setNotes(item.notes || "");
    },
    [props.visible, item],
  );

  var numberOfDays = useMemo(
    function () {
      return calculateNumberOfDays(startDate, endDate);
    },
    [startDate, endDate],
  );

  var estimatedAmount = useMemo(
    function () {
      return numberOfDays * Number(item?.itemPrice || 0);
    },
    [numberOfDays, item],
  );

  function validateForm() {
    if (!item || !item.stallBookingId) {
      return "לא נמצא מזהה הזמנת תא תקין";
    }

    if (item.isPaid) {
      return "לא ניתן לערוך תא שכבר שולם";
    }

    if (item.isCancelled || item.hasPendingCancellation) {
      return "לא ניתן לערוך תא עם בקשה פתוחה או תא שבוטל";
    }

    if (!activeRole || !activeRole.ranchId) {
      return "לא נמצאה חווה פעילה";
    }

    if (!startDate || !endDate) {
      return "יש לבחור תאריכי התחלה וסיום";
    }

    if (new Date(startDate) > new Date(endDate)) {
      return "תאריך התחלה לא יכול להיות אחרי תאריך סיום";
    }

    return "";
  }

  async function handleSubmit() {
    var validationMessage = validateForm();

    if (validationMessage) {
      Alert.alert("שגיאה", validationMessage);
      return;
    }

    try {
      setIsSaving(true);

      await createStallBookingChangeRequest({
        originalStallBookingId: item.stallBookingId,
        ranchId: activeRole.ranchId,
        newStartDate: startDate,
        newEndDate: endDate,
        notes: notes ? notes.trim() : null,
      });

      if (typeof props.onUpdated === "function") {
        await props.onUpdated();
      }

      Alert.alert("נשלח", "בקשת שינוי התא נשלחה בהצלחה");

      if (typeof props.onClose === "function") {
        props.onClose();
      }
    } catch (error) {
      Alert.alert(
        "שגיאה",
        String(error?.response?.data || "אירעה שגיאה בשליחת בקשת שינוי התא"),
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      visible={props.visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={props.onClose}
    >
      <SafeAreaView style={styles.shavingsModalContainer}>
        <View style={styles.shavingsModalHeader}>
          <Pressable
            onPress={props.onClose}
            style={styles.shavingsModalCloseButton}
          >
            <Ionicons name="close-outline" size={28} color="#4F3B31" />
          </Pressable>

          <Text style={styles.shavingsModalTitle}>עריכת הזמנת תא</Text>

          <View style={styles.shavingsModalHeaderSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.shavingsModalContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.editFormCard}>
            <Text style={styles.editFormTitle}>
              {isTackBooking ? "תא ציוד" : item?.horseName || "תא סוס"}
            </Text>

            <Text style={styles.editFormSubtitle}>
              אפשר לערוך תאריכים והערות בלבד. סוג התא והמחיר נקבעים לפי השיבוץ
              בפועל.
            </Text>

            <View style={styles.editSummaryBox}>
              <Text style={styles.editSummaryText}>
                סוג תא: {isTackBooking ? "תא ציוד" : "תא רגיל"}
              </Text>

              <Text style={styles.editSummaryText}>
                מחיר יומי לפי השיבוץ: {formatPrice(item?.itemPrice || 0)}
              </Text>
            </View>

            <View style={styles.editDateFields}>
              <CompetitionDateField
                label="תאריך התחלה"
                value={startDate}
                onChange={setStartDate}
              />

              <CompetitionDateField
                label="תאריך סיום"
                value={endDate}
                onChange={setEndDate}
              />
            </View>

            <View style={styles.editFieldBlock}>
              <Text style={styles.editFieldLabel}>הערות</Text>

              <TextInput
                style={styles.editTextInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="הערות לבקשת השינוי"
                textAlign="right"
              />
            </View>

            <View style={styles.editSummaryBox}>
              <Text style={styles.editSummaryText}>
                מספר ימים חדש: {numberOfDays}
              </Text>

              <Text style={styles.editSummaryText}>
                עלות תא משוערת: {formatPrice(estimatedAmount)}
              </Text>
            </View>

            <Pressable
              style={[
                styles.editSubmitButton,
                isSaving ? styles.editSubmitButtonDisabled : null,
              ]}
              disabled={isSaving}
              onPress={handleSubmit}
            >
              <Text style={styles.editSubmitButtonText}>
                {isSaving ? "שולח..." : "שליחת בקשת שינוי"}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

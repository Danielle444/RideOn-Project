import React from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import styles from "../../styles/adminCompetitionPaidTimesStyles";

function SuccessRow(props) {
  if (!props.value) {
    return null;
  }

  return (
    <View style={styles.reviewRow}>
      <Text style={styles.reviewLabel}>{props.label}</Text>
      <Text style={props.isPrice ? styles.reviewPriceValue : styles.reviewValue}>
        {props.value}
      </Text>
    </View>
  );
}

// מצב ההצלחה של בקשה בודדת - מחליף את ה-Alert שהיה מוצג אחרי השמירה.
// מוצג על בסיס snapshot שנלקח לפני איפוס השדות הלא נעולים, כך שהאיפוס
// הקיים לא מרוקן את מה שכתוב כאן.
//
// props:
//   visible, snapshot (מ-buildSuccessSnapshot), onAddAnother, onFinish
export default function PaidTimeRequestSuccessModal(props) {
  var snapshot = props.snapshot || null;

  if (!snapshot) {
    return null;
  }

  var slot = snapshot.slot;
  var slotLine = slot
    ? [slot.dateLabel, slot.timeLabel, slot.arenaName].filter(Boolean).join(" • ")
    : "";

  return (
    <Modal
      visible={!!props.visible}
      transparent={true}
      animationType="fade"
      onRequestClose={props.onFinish}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.successIconWrap}>
            <Ionicons name="checkmark-circle" size={34} color="#4C8C4A" />
          </View>

          <Text style={styles.successTitle}>הבקשה נוצרה</Text>

          <View style={styles.successPendingBadge}>
            <Text style={styles.successPendingText}>ממתינה לשיבוץ</Text>
          </View>

          <View style={styles.selectionSummaryCard}>
            <SuccessRow label="סוס" value={snapshot.horseLabel} />
            <SuccessRow label="סוג" value={snapshot.typeName} />
            <SuccessRow label="סלוט מבוקש" value={slotLine} />
            <SuccessRow label="מחיר" value={snapshot.priceLabel} isPrice={true} />
          </View>

          <View style={styles.infoNote}>
            <Text style={styles.infoNoteText}>
              הבקשה ממתינה לשיבוץ. השעה המדויקת בתוך הסלוט תיקבע לאחר השיבוץ.
            </Text>
          </View>

          <View style={styles.modalActionsRow}>
            <Pressable
              style={styles.modalPrimaryButton}
              onPress={props.onAddAnother}
              accessibilityRole="button"
            >
              <Text style={styles.modalPrimaryText}>בקשה נוספת</Text>
            </Pressable>

            <Pressable
              style={styles.modalSecondaryButton}
              onPress={props.onFinish}
              accessibilityRole="button"
            >
              <Text style={styles.modalSecondaryText}>סיום</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

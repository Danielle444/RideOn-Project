import React from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import styles from "../../styles/adminCompetitionPaidTimesStyles";

var SLOT_NOTICE =
  "זו בקשה לסלוט. השעה המדויקת בתוך הסלוט תיקבע לאחר השיבוץ.";

function ReviewRow(props) {
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

// מסך אישור לפני שליחת בקשה בודדת. מציג אך ורק את מה שנבחר בטופס -
// אין כאן שליפה נוספת ואין חישוב מחדש. השליחה עצמה קורית רק בלחיצה על
// "שליחת הבקשה", והכפתור נחסם בזמן שמירה כדי למנוע שליחה כפולה.
//
// props:
//   visible, model (מ-buildPaidTimeReviewModel), isSaving, errorMessage,
//   onBackToEdit, onConfirm
export default function PaidTimeRequestReviewModal(props) {
  var model = props.model || null;
  var isSaving = !!props.isSaving;

  if (!model) {
    return null;
  }

  var slot = model.slot;
  var type = model.type;

  return (
    <Modal
      visible={!!props.visible}
      transparent={true}
      animationType="fade"
      onRequestClose={props.onBackToEdit}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>אישור בקשת פייד טיים</Text>

          {model.competitionName ? (
            <Text style={styles.modalSubtitle}>{model.competitionName}</Text>
          ) : null}

          <View style={styles.infoNote}>
            <Text style={styles.infoNoteStrong}>{SLOT_NOTICE}</Text>
          </View>

          <ScrollView
            style={styles.modalScroll}
            showsVerticalScrollIndicator={false}
          >
            {slot ? (
              <View style={[styles.reviewGroup, styles.reviewGroupFirst]}>
                <Text style={styles.reviewGroupTitle}>הסלוט המבוקש</Text>
                <ReviewRow label="תאריך" value={slot.dateLabel} />
                <ReviewRow label="שעות" value={slot.timeLabel} />
                <ReviewRow label="מגרש" value={slot.arenaName} />
              </View>
            ) : null}

            {type ? (
              <View style={styles.reviewGroup}>
                <Text style={styles.reviewGroupTitle}>סוג פייד טיים</Text>
                <ReviewRow label="סוג" value={type.productName} />
                <ReviewRow label="משך" value={type.durationLabel} />
                <ReviewRow label="מחיר" value={type.priceLabel} isPrice={true} />
              </View>
            ) : null}

            <View style={styles.reviewGroup}>
              <Text style={styles.reviewGroupTitle}>פרטי הבקשה</Text>
              <ReviewRow label="סוס" value={model.horseLabel} />
              <ReviewRow label="רוכב" value={model.riderLabel} />
              <ReviewRow label="מאמן" value={model.coachLabel} />
              <ReviewRow label="משלם" value={model.payerLabel} />
            </View>

            {model.notes ? (
              <View style={styles.reviewGroup}>
                <Text style={styles.reviewGroupTitle}>הערות</Text>
                <Text style={styles.reviewValue}>{model.notes}</Text>
              </View>
            ) : null}
          </ScrollView>

          {props.errorMessage ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{props.errorMessage}</Text>
            </View>
          ) : null}

          <View style={styles.modalActionsRow}>
            <Pressable
              style={[
                styles.modalPrimaryButton,
                isSaving ? styles.modalPrimaryButtonDisabled : null,
              ]}
              disabled={isSaving}
              onPress={props.onConfirm}
              accessibilityRole="button"
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.modalPrimaryText}>שליחת הבקשה</Text>
              )}
            </Pressable>

            <Pressable
              style={styles.modalSecondaryButton}
              disabled={isSaving}
              onPress={props.onBackToEdit}
              accessibilityRole="button"
            >
              <Text style={styles.modalSecondaryText}>חזרה לעריכה</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

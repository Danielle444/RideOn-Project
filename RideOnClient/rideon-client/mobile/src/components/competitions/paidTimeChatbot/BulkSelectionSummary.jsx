import React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import styles, { COLORS } from "../../../styles/paidTimeChatbotStyles";

function SummaryChip(props) {
  if (!props.value) {
    return null;
  }

  return (
    <View style={styles.summaryChip}>
      <Ionicons name={props.icon} size={13} color={COLORS.primary} />
      <Text style={styles.summaryChipText}>{props.value}</Text>
    </View>
  );
}

// רצועת הסיכום הקבועה שמלווה את כל שלבי ההזמנה המרוכזת.
// מציגה רק מה שכבר ידוע - צ'יפ שאין לו ערך פשוט לא מרונדר.
//
// props.summary מגיע מ-buildSelectionSummary (utils/paidTimeBulkReview).
export default function BulkSelectionSummary(props) {
  const summary = props.summary;

  if (!summary) {
    return null;
  }

  const hasAnything =
    summary.coachCount > 0 ||
    summary.horseCount > 0 ||
    summary.requestCount > 0 ||
    !!summary.dayLabel;

  if (!hasAnything) {
    return (
      <View style={styles.summaryStrip}>
        <Text style={styles.summaryChipMuted}>
          טרם נבחרו מאמן וסוסים
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.summaryStrip}>
      <SummaryChip icon="person-circle-outline" value={summary.coachLabel} />

      <SummaryChip
        icon="paw-outline"
        value={summary.horseCount > 0 ? summary.horseCount + " סוסים" : ""}
      />

      <SummaryChip icon="location-outline" value={summary.arenaName} />

      <SummaryChip
        icon="documents-outline"
        value={
          summary.requestCount > 0 ? summary.requestCount + " בקשות" : ""
        }
      />
    </View>
  );
}

import React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import styles from "../../styles/adminCompetitionPaidTimesStyles";

// הודעה מעוצבת בתוך המסך כשלתחרות אין הגדרות פייד טיים מספקות.
// לא Alert של המערכת, ולא שלב ריק שאי אפשר להתקדם ממנו.
//
// props:
//   message (string) - מה חסר בדיוק
//   hint    (string) - איפה מגדירים
export default function PaidTimeSetupNotice(props) {
  if (!props.message) {
    return null;
  }

  return (
    <View style={styles.setupNoticeCard} accessibilityRole="alert">
      <View style={styles.setupNoticeIconWrap}>
        <Ionicons name="construct-outline" size={24} color="#7B5A4D" />
      </View>

      <Text style={styles.setupNoticeTitle}>
        התחרות עדיין לא מוכנה להזמנות פייד־טיים
      </Text>

      <Text style={styles.setupNoticeText}>{props.message}</Text>

      {props.hint ? (
        <Text style={styles.setupNoticeHint}>{props.hint}</Text>
      ) : null}
    </View>
  );
}

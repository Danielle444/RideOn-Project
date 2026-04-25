import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles from "../../styles/adminCompetitionRegistrationsStyles";

export default function CompetitionRegistrationLocksRow(props) {
  var locks = props.locks || {};

  function renderLockButton(fieldKey, label) {
    var isLocked = !!locks[fieldKey];

    return (
      <Pressable
        key={fieldKey}
        style={[
          styles.lockChip,
          isLocked ? styles.lockChipActive : styles.lockChipInactive,
        ]}
        onPress={function () {
          props.onToggle(fieldKey);
        }}
      >
        <Ionicons
          name={isLocked ? "lock-closed-outline" : "lock-open-outline"}
          size={16}
          color={isLocked ? "#FFFFFF" : "#7B5A4D"}
        />

        <Text
          style={[
            styles.lockChipText,
            isLocked ? styles.lockChipTextActive : styles.lockChipTextInactive,
          ]}
        >
          {label}
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.locksCard}>
      <Text style={styles.cardTitle}>נעילת שדות להזנה רציפה</Text>

      <Text style={styles.helperText}>
        שדות נעולים יישארו לאחר שמירת הרשמה חדשה.
      </Text>

      <View style={styles.locksWrap}>
        {renderLockButton("class", "מקצה")}
        {renderLockButton("rider", "רוכב")}
        {renderLockButton("horse", "סוס")}
        {renderLockButton("coach", "מאמן")}
        {renderLockButton("payer", "משלם")}
      </View>
    </View>
  );
}
import React from "react";
import { Text, View } from "react-native";
import styles from "../../../styles/paidTimeChatbotStyles";

export default function ChatProgress(props) {
  const total = props.total || 1;
  const current = Math.max(1, Math.min(props.current || 1, total));
  const percent = Math.round((current / total) * 100);

  return (
    <View style={styles.progressWrap}>
      <Text style={styles.progressText}>
        שלב {current} מתוך {total}
      </Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: percent + "%" }]} />
      </View>
    </View>
  );
}

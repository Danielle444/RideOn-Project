import React from "react";
import { View } from "react-native";
import styles from "../../../styles/paidTimeChatbotStyles";

// מחוון התקדמות סגמנטלי - סגמנט לכל שלב, כדי שרואים גם כמה נשאר וגם איפה
// אנחנו. הכותרת המילולית ("שלב X מתוך Y") עברה לכותרת העליונה של המודל.
export default function ChatProgress(props) {
  const total = Math.max(1, props.total || 1);
  const current = Math.max(1, Math.min(props.current || 1, total));

  const segments = [];

  for (let index = 0; index < total; index++) {
    segments.push(index);
  }

  return (
    <View style={styles.progressWrap}>
      <View style={styles.progressSegments}>
        {segments.map(function (index) {
          return (
            <View
              key={"seg-" + index}
              style={[
                styles.progressSegment,
                index < current ? styles.progressSegmentDone : null,
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

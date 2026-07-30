import React from "react";
import { Text, View } from "react-native";
import styles from "../../../styles/paidTimeChatbotStyles";

// היה בועת צ'אט (עם "מי מדבר"), והפך להערת עזר בטופס.
//
// השם נשמר כי כל השלבים מייבאים אותו, וכך אין צורך לגעת בעשרת הקבצים.
// props.from כבר לא משפיע על העיצוב - אין באפליקציה צד "משתמש" מול "בוט".
export default function ChatBubble(props) {
  if (!props.text) {
    return null;
  }

  return (
    <View style={styles.infoNote}>
      <Text style={styles.infoNoteText}>{props.text}</Text>
    </View>
  );
}

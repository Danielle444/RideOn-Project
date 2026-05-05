import React from "react";
import { Text, View } from "react-native";
import StepLayout from "./StepLayout";
import styles, { COLORS } from "../../../styles/paidTimeChatbotStyles";

const INTRO_BUBBLES = [
  "שלום! אני אעזור לך לרשום בקשות פייד טיים לכמה סוסים בבת אחת, בלי למלא בקשה־בקשה.",
  "במהלך השיחה תבחר מאמנים, סוסים, ימים, מגרשים, סוג פייד טיים והעדפות שיבוץ.",
  "חשוב להבדיל בין שני סוגי בחירות:",
];

export default function Step01_Intro(props) {
  return (
    <StepLayout
      bubbles={INTRO_BUBBLES}
      onNext={props.chatbot.next}
      onBack={props.chatbot.prev}
      showBack={false}
      nextLabel="בוא נתחיל"
    >
      <View>
        <View style={{ marginBottom: 10 }}>
          <Text style={[styles.bubbleTextBot, { fontWeight: "700" }]}>
            העדפה
          </Text>
          <Text style={styles.bubbleTextBot}>
            משהו שהמערכת תנסה למקסם, אבל גם אם לא מתקיים - עדיין נבצע הרשמה.
          </Text>
        </View>
        <View
          style={{
            height: 1,
            backgroundColor: COLORS.border,
            marginVertical: 8,
          }}
        />
        <View>
          <Text style={[styles.bubbleTextBot, { fontWeight: "700" }]}>
            אילוץ
          </Text>
          <Text style={styles.bubbleTextBot}>
            תנאי חובה. אם אי אפשר לעמוד בו, רק הסוס/המאמן הספציפי לא יירשם, לא
            כל ההזמנה.
          </Text>
        </View>
      </View>
    </StepLayout>
  );
}

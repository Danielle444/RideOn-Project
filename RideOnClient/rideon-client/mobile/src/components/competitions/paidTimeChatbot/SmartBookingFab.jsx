import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { COLORS } from "../../../styles/paidTimeChatbotStyles";

// כפתור צף לפתיחת ההזמנה המרוכזת מתוך טאב הפייד טיים במסך ההרשמות.
//
// קודם הופיעה כאן התראת מערכת ("האם להמשיך?") לפני הפתיחה. היא הוסרה:
// PaidTimeBookingModeModal כבר מסביר בדיוק מה עושה "כמה הזמנות יחד", ולכן
// אישור שני היה מיותר. הלחיצה פותחת את הזרימה ישירות.
//
// props:
//   onConfirm (function) - נשמר בשמו הקיים כדי לא לשבור את מסך ההרשמות
export default function SmartBookingFab(props) {
  const onConfirm = props.onConfirm;

  function handlePress() {
    if (typeof onConfirm === "function") onConfirm();
  }

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        zIndex: 9999,
        elevation: 9999,
      }}
    >
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          right: 16,
          bottom: 90,
          alignItems: "flex-end",
        }}
      >
        <Pressable
          onPress={handlePress}
          accessibilityRole="button"
          accessibilityLabel="פתיחת הזמנה מרוכזת לפייד טיים"
          style={({ pressed }) => ({
            flexDirection: "row-reverse",
            alignItems: "center",
            backgroundColor: COLORS.primary,
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 28,
            gap: 8,
            opacity: pressed ? 0.85 : 1,
            shadowColor: "#000",
            shadowOpacity: 0.3,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: 10,
          })}
        >
          <Ionicons name="albums-outline" size={20} color="#FFFFFF" />
          <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "700" }}>
            הזמנה מרוכזת
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

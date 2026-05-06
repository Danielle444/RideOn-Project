import React from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function SmartBookingFab(props) {
  const onConfirm = props.onConfirm;

  function handlePress() {
    Alert.alert(
      "הזמנה חכמה - פייד טיים",
      "המעבר להזמנה חכמה יעזור לך לרשום מספר בקשות בבת אחת לפי העדפות ואילוצים שתגדיר. האם להמשיך?",
      [
        { text: "חזרה", style: "cancel" },
        {
          text: "אישור והמשך",
          style: "default",
          onPress: function () {
            if (typeof onConfirm === "function") onConfirm();
          },
        },
      ],
      { cancelable: true }
    );
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
          style={({ pressed }) => ({
            flexDirection: "row-reverse",
            alignItems: "center",
            backgroundColor: "#5A4036",
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
          <Ionicons name="sparkles" size={20} color="#FFFFFF" />
          <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "700" }}>
            הזמנה חכמה
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

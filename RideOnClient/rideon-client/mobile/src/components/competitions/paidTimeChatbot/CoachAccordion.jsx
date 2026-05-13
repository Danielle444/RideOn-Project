import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../../styles/paidTimeChatbotStyles";

export default function CoachAccordion(props) {
  const [open, setOpen] = useState(props.defaultOpen !== false);

  function toggle() {
    setOpen(!open);
  }

  return (
    <View
      style={{
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: open ? COLORS.primary : COLORS.border,
        borderRadius: 12,
        marginBottom: 10,
        overflow: "hidden",
      }}
    >
      <Pressable
        onPress={toggle}
        style={{
          flexDirection: "row-reverse",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: 12,
          paddingHorizontal: 14,
          backgroundColor: open ? COLORS.primaryLight : "#FFFFFF",
        }}
      >
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={20}
          color={COLORS.primary}
        />
        <View style={{ flex: 1, marginHorizontal: 8 }}>
          <Text
            style={{
              fontSize: 15,
              fontWeight: "700",
              color: COLORS.textPrimary,
              textAlign: "right",
            }}
          >
            {props.title}
          </Text>
          {props.subtitle ? (
            <Text
              style={{
                fontSize: 12,
                color: COLORS.textMuted,
                textAlign: "right",
                marginTop: 2,
              }}
            >
              {props.subtitle}
            </Text>
          ) : null}
        </View>
        <Ionicons name="person-circle" size={26} color={COLORS.primary} />
      </Pressable>

      {open ? (
        <View style={{ padding: 14, paddingTop: 8 }}>{props.children}</View>
      ) : null}
    </View>
  );
}

import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles, { COLORS } from "../../../styles/paidTimeChatbotStyles";

export default function OptionRow(props) {
  const selected = !!props.selected;
  const multi = !!props.multi;

  return (
    <Pressable
      onPress={props.onPress}
      style={[styles.optionRow, selected ? styles.optionRowSelected : null]}
    >
      <Ionicons
        name={
          multi
            ? selected
              ? "checkbox"
              : "square-outline"
            : selected
              ? "radio-button-on"
              : "radio-button-off"
        }
        size={20}
        color={selected ? COLORS.primary : COLORS.textMuted}
      />
      <Text style={styles.optionLabel}>{props.label}</Text>
      {props.right ? <View>{props.right}</View> : null}
    </Pressable>
  );
}

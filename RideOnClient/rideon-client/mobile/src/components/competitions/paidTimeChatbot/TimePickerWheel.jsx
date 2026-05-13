import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../../styles/paidTimeChatbotStyles";

const MINUTE_STEP = 5;

function pad2(n) {
  return String(n).padStart(2, "0");
}

function clamp(value, min, max) {
  if (value < min) return max;
  if (value > max) return min;
  return value;
}

export default function TimePickerWheel(props) {
  const totalMinutes = Number.isFinite(props.value) ? props.value : 0;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const disabled = !!props.disabled;
  const minHour = props.minHour != null ? props.minHour : 0;
  const maxHour = props.maxHour != null ? props.maxHour : 23;

  function emit(newH, newM) {
    if (typeof props.onChange === "function") {
      props.onChange(newH * 60 + newM);
    }
  }

  function bumpHour(dir) {
    if (disabled) return;
    emit(clamp(hours + dir, minHour, maxHour), minutes);
  }

  function bumpMinute(dir) {
    if (disabled) return;
    const next = minutes + dir * MINUTE_STEP;
    if (next >= 60) {
      emit(clamp(hours + 1, minHour, maxHour), 0);
    } else if (next < 0) {
      emit(clamp(hours - 1, minHour, maxHour), 60 - MINUTE_STEP);
    } else {
      emit(hours, next);
    }
  }

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 6,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Column
        label={pad2(hours)}
        onUp={function () {
          bumpHour(1);
        }}
        onDown={function () {
          bumpHour(-1);
        }}
        disabled={disabled}
      />
      <Text
        style={{
          fontSize: 26,
          fontWeight: "700",
          color: COLORS.textPrimary,
          marginHorizontal: 2,
        }}
      >
        :
      </Text>
      <Column
        label={pad2(minutes)}
        onUp={function () {
          bumpMinute(1);
        }}
        onDown={function () {
          bumpMinute(-1);
        }}
        disabled={disabled}
      />
    </View>
  );
}

function Column(props) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <Pressable
        onPress={props.onUp}
        disabled={props.disabled}
        hitSlop={8}
        style={{ padding: 6 }}
      >
        <Ionicons name="chevron-up" size={22} color={COLORS.primary} />
      </Pressable>
      <View
        style={{
          minWidth: 50,
          paddingVertical: 8,
          paddingHorizontal: 12,
          borderWidth: 1,
          borderColor: COLORS.border,
          borderRadius: 10,
          backgroundColor: "#FFFFFF",
          alignItems: "center",
        }}
      >
        <Text
          style={{
            fontSize: 22,
            fontWeight: "700",
            color: COLORS.textPrimary,
          }}
        >
          {props.label}
        </Text>
      </View>
      <Pressable
        onPress={props.onDown}
        disabled={props.disabled}
        hitSlop={8}
        style={{ padding: 6 }}
      >
        <Ionicons name="chevron-down" size={22} color={COLORS.primary} />
      </Pressable>
    </View>
  );
}

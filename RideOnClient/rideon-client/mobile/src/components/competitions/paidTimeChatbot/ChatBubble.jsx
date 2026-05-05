import React from "react";
import { Text, View } from "react-native";
import styles from "../../../styles/paidTimeChatbotStyles";

export default function ChatBubble(props) {
  const isUser = props.from === "user";

  return (
    <View
      style={[
        styles.bubbleRow,
        isUser ? styles.bubbleRowUser : styles.bubbleRowBot,
      ]}
    >
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
        <Text style={isUser ? styles.bubbleTextUser : styles.bubbleTextBot}>
          {props.text}
        </Text>
      </View>
    </View>
  );
}

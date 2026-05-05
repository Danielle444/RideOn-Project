import React from "react";
import { Pressable, Text, View } from "react-native";
import styles from "../../../styles/paidTimeChatbotStyles";
import ChatBubble from "./ChatBubble";

export default function StepLayout(props) {
  const bubbles = Array.isArray(props.bubbles) ? props.bubbles : [];
  const showBack = props.showBack !== false;
  const nextLabel = props.nextLabel || "הבא";
  const backLabel = props.backLabel || "חזרה";
  const canAdvance = props.canAdvance !== false;
  const onNext = props.onNext;
  const onBack = props.onBack;

  return (
    <View>
      {bubbles.map(function (text, idx) {
        return <ChatBubble key={"bot-" + idx} from="bot" text={text} />;
      })}

      {props.children ? (
        <View style={styles.answerCard}>{props.children}</View>
      ) : null}

      <View style={{ flexDirection: "row-reverse", gap: 8, marginTop: 4 }}>
        <Pressable
          style={[
            styles.primaryButton,
            { flex: 1 },
            !canAdvance ? styles.primaryButtonDisabled : null,
          ]}
          disabled={!canAdvance}
          onPress={onNext}
        >
          <Text style={styles.primaryButtonText}>{nextLabel}</Text>
        </Pressable>
        {showBack ? (
          <Pressable
            style={[styles.secondaryButton, { flex: 1 }]}
            onPress={onBack}
          >
            <Text style={styles.secondaryButtonText}>{backLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

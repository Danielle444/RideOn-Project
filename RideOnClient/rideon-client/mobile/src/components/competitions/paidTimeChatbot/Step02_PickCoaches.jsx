import React from "react";
import { Text, View } from "react-native";
import StepLayout from "./StepLayout";
import OptionRow from "./OptionRow";
import styles from "../../../styles/paidTimeChatbotStyles";

export default function Step02_PickCoaches(props) {
  const chatbot = props.chatbot;
  const ctx = chatbot.state.context || {};
  const coachesWithHorses = ctx.coachesWithHorses || [];
  const selected = chatbot.state.answers.selectedCoachIds || [];

  const allSelected =
    coachesWithHorses.length > 0 &&
    selected.length === coachesWithHorses.length;

  function toggleAll() {
    if (allSelected) {
      chatbot.setAnswer("selectedCoachIds", []);
    } else {
      chatbot.setAnswer(
        "selectedCoachIds",
        coachesWithHorses.map(function (c) {
          return c.coachFederationMemberId;
        })
      );
    }
  }

  function toggleCoach(id) {
    const set = new Set(selected.map(String));
    const key = String(id);
    if (set.has(key)) set.delete(key);
    else set.add(key);
    chatbot.setAnswer("selectedCoachIds", Array.from(set).map(Number));
  }

  return (
    <StepLayout
      bubbles={[
        "מצאתי את המאמנים שיש להם סוסים רשומים למקצים בתחרות מטעם החווה שלך. בחר את כולם או מאמנים מסוימים.",
      ]}
      onNext={chatbot.next}
      onBack={chatbot.prev}
      canAdvance={selected.length > 0}
    >
      {coachesWithHorses.length === 0 ? (
        <Text style={styles.bubbleTextBot}>
          לא נמצאו מאמנים עם סוסים רשומים למקצים בתחרות זו עבור החווה שלך.
          סגור את הצ'אטבוט וודא שיש הרשמות למקצים תחילה.
        </Text>
      ) : (
        <View>
          <OptionRow
            multi={true}
            selected={allSelected}
            label={"בחר את כל המאמנים (" + coachesWithHorses.length + ")"}
            onPress={toggleAll}
          />
          <View style={{ height: 12 }} />
          {coachesWithHorses.map(function (coach) {
            const id = coach.coachFederationMemberId;
            const isSelected = selected.map(String).includes(String(id));
            return (
              <OptionRow
                key={"coach-" + id}
                multi={true}
                selected={isSelected}
                label={
                  coach.coachName + " (" + coach.horses.length + " סוסים)"
                }
                onPress={function () {
                  toggleCoach(id);
                }}
              />
            );
          })}
        </View>
      )}
    </StepLayout>
  );
}

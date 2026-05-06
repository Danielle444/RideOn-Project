import React from "react";
import { Text, View } from "react-native";
import StepLayout from "./StepLayout";
import OptionRow from "./OptionRow";
import styles, { COLORS } from "../../../styles/paidTimeChatbotStyles";

const CONSTRAINT_TYPES = [
  { key: "none", label: "ללא אילוץ" },
  { key: "morning", label: "רק בוקר (לפני 12:00)" },
  { key: "afternoon", label: "רק צהריים (12:00 - 16:00)" },
  { key: "evening", label: "רק ערב (אחרי 16:00)" },
];

export default function Step06_TimeConstraints(props) {
  const chatbot = props.chatbot;
  const ctx = chatbot.state.context || {};
  const coachesWithHorses = ctx.coachesWithHorses || [];
  const selectedCoachIds = chatbot.state.answers.selectedCoachIds || [];
  const timeConstraints = chatbot.state.answers.timeConstraints || {
    coachLevel: {},
    horseLevel: {},
  };

  const selectedCoaches = coachesWithHorses.filter(function (c) {
    return selectedCoachIds
      .map(String)
      .includes(String(c.coachFederationMemberId));
  });

  function setCoachConstraint(coachId, key) {
    chatbot.setAnswer("timeConstraints", {
      ...timeConstraints,
      coachLevel: {
        ...timeConstraints.coachLevel,
        [coachId]: key === "none" ? null : { type: key },
      },
    });
  }

  return (
    <StepLayout
      bubbles={[
        "אילוץ זמן הוא תנאי חובה. אם אי אפשר לעמוד בו, הבקשה לא תיווצר.",
        "האם יש אילוץ למאמן כלשהו?",
      ]}
      onNext={chatbot.next}
      onBack={chatbot.prev}
      canAdvance={true}
    >
      {selectedCoaches.length === 0 ? (
        <Text style={styles.bubbleTextBot}>לא נבחרו מאמנים.</Text>
      ) : (
        <View>
          {selectedCoaches.map(function (coach, idx) {
            const coachId = coach.coachFederationMemberId;
            const current = timeConstraints.coachLevel?.[coachId];
            const selectedKey = current ? current.type : "none";

            return (
              <View
                key={"con-" + coachId}
                style={{
                  marginBottom: 14,
                  paddingBottom: 12,
                  borderBottomWidth: idx < selectedCoaches.length - 1 ? 1 : 0,
                  borderBottomColor: COLORS.border,
                }}
              >
                <Text
                  style={[
                    styles.bubbleTextBot,
                    { fontWeight: "700", marginBottom: 8 },
                  ]}
                >
                  מאמן: {coach.coachName}
                </Text>
                {CONSTRAINT_TYPES.map(function (c) {
                  return (
                    <OptionRow
                      key={"con-" + coachId + "-" + c.key}
                      selected={selectedKey === c.key}
                      label={c.label}
                      onPress={function () {
                        setCoachConstraint(coachId, c.key);
                      }}
                    />
                  );
                })}
              </View>
            );
          })}
        </View>
      )}
    </StepLayout>
  );
}

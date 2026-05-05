import React from "react";
import { Text, View } from "react-native";
import StepLayout from "./StepLayout";
import OptionRow from "./OptionRow";
import styles, { COLORS } from "../../../styles/paidTimeChatbotStyles";

const PREF_TYPES = [
  { key: "none", label: "ללא העדפה" },
  { key: "earliest", label: "כמה שיותר מוקדם" },
  { key: "latest", label: "כמה שיותר מאוחר" },
];

export default function Step05_TimePreferences(props) {
  const chatbot = props.chatbot;
  const ctx = chatbot.state.context || {};
  const coachesWithHorses = ctx.coachesWithHorses || [];
  const selectedCoachIds = chatbot.state.answers.selectedCoachIds || [];
  const timePreferences = chatbot.state.answers.timePreferences || {
    coachLevel: {},
    horseLevel: {},
  };

  const selectedCoaches = coachesWithHorses.filter(function (c) {
    return selectedCoachIds
      .map(String)
      .includes(String(c.coachFederationMemberId));
  });

  function setCoachPref(coachId, prefKey) {
    chatbot.setAnswer("timePreferences", {
      ...timePreferences,
      coachLevel: {
        ...timePreferences.coachLevel,
        [coachId]: prefKey === "none" ? null : { type: prefKey },
      },
    });
  }

  return (
    <StepLayout
      bubbles={[
        "האם יש לך העדפת זמן לכל מאמן?",
        "זאת העדפה (לא חובה). המערכת תנסה להתחשב בה אבל גם אם לא מתקיימת - תבצע הרשמה.",
      ]}
      onNext={chatbot.next}
      onBack={chatbot.prev}
      canAdvance={true}
    >
      {selectedCoaches.length === 0 ? (
        <Text style={styles.bubbleTextBot}>
          לא נבחרו מאמנים בשלבים הקודמים.
        </Text>
      ) : (
        <View>
          {selectedCoaches.map(function (coach, idx) {
            const coachId = coach.coachFederationMemberId;
            const currentPref = timePreferences.coachLevel?.[coachId];
            const selectedKey = currentPref ? currentPref.type : "none";

            return (
              <View
                key={"pref-coach-" + coachId}
                style={{
                  marginBottom: 16,
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
                {PREF_TYPES.map(function (pref) {
                  return (
                    <OptionRow
                      key={"pref-" + coachId + "-" + pref.key}
                      selected={selectedKey === pref.key}
                      label={pref.label}
                      onPress={function () {
                        setCoachPref(coachId, pref.key);
                      }}
                    />
                  );
                })}
              </View>
            );
          })}

          <Text
            style={[
              styles.bubbleTextBot,
              { color: COLORS.textMuted, fontSize: 13, marginTop: 8 },
            ]}
          >
            הערה: בעתיד אפשר יהיה להוסיף העדפה ספציפית לסוס מסוים.
          </Text>
        </View>
      )}
    </StepLayout>
  );
}

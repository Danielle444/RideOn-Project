import React from "react";
import { Text, View } from "react-native";
import StepLayout from "./StepLayout";
import OptionRow from "./OptionRow";
import styles, { COLORS } from "../../../styles/paidTimeChatbotStyles";

function formatHorseLabel(horse) {
  const name = horse.horseName || "סוס";
  const barn = horse.barnName || "";
  return barn ? name + " (" + barn + ")" : name;
}

export default function Step04_HorsesPerCoach(props) {
  const chatbot = props.chatbot;
  const ctx = chatbot.state.context || {};
  const coachesWithHorses = ctx.coachesWithHorses || [];
  const selectedCoachIds = chatbot.state.answers.selectedCoachIds || [];
  const horsesPerCoach = chatbot.state.answers.horsesPerCoach || {};

  const selectedCoaches = coachesWithHorses.filter(function (c) {
    return selectedCoachIds
      .map(String)
      .includes(String(c.coachFederationMemberId));
  });

  function toggleHorse(coachId, horseId) {
    const current = horsesPerCoach[coachId] || [];
    const set = new Set(current.map(String));
    const key = String(horseId);
    if (set.has(key)) set.delete(key);
    else set.add(key);
    chatbot.setAnswer("horsesPerCoach", {
      ...horsesPerCoach,
      [coachId]: Array.from(set).map(Number),
    });
  }

  function toggleAllForCoach(coachId, coachHorses) {
    const current = horsesPerCoach[coachId] || [];
    const allIds = coachHorses.map(function (h) {
      return h.horseId;
    });
    const isAll = current.length === allIds.length && allIds.length > 0;
    chatbot.setAnswer("horsesPerCoach", {
      ...horsesPerCoach,
      [coachId]: isAll ? [] : allIds,
    });
  }

  const totalSelected = Object.values(horsesPerCoach).reduce(function (sum, arr) {
    return sum + (Array.isArray(arr) ? arr.length : 0);
  }, 0);

  const canAdvance = totalSelected > 0;

  return (
    <StepLayout
      bubbles={[
        "אלו הסוסים הרשומים תחת כל מאמן שבחרת. בחר אילו לרשום לפייד טיים.",
      ]}
      onNext={chatbot.next}
      onBack={chatbot.prev}
      canAdvance={canAdvance}
    >
      {selectedCoaches.length === 0 ? (
        <Text style={styles.bubbleTextBot}>
          לא נבחרו מאמנים. חזור צעד אחורה ובחר מאמן אחד לפחות.
        </Text>
      ) : (
        <View>
          {selectedCoaches.map(function (coach, idx) {
            const coachId = coach.coachFederationMemberId;
            const horses = coach.horses || [];
            const selectedHorseIds = horsesPerCoach[coachId] || [];
            const allIds = horses.map(function (h) {
              return h.horseId;
            });
            const isAll =
              allIds.length > 0 && selectedHorseIds.length === allIds.length;

            return (
              <View
                key={"coach-section-" + coachId}
                style={{
                  marginBottom: 18,
                  paddingBottom: 14,
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

                {horses.length === 0 ? (
                  <Text style={styles.bubbleTextBot}>
                    אין סוסים תחת מאמן זה.
                  </Text>
                ) : (
                  <>
                    <OptionRow
                      multi={true}
                      selected={isAll}
                      label={"כל הסוסים (" + horses.length + ")"}
                      onPress={function () {
                        toggleAllForCoach(coachId, horses);
                      }}
                    />
                    <View style={{ height: 8 }} />

                    {horses.map(function (horse) {
                      const isSel = selectedHorseIds
                        .map(String)
                        .includes(String(horse.horseId));
                      return (
                        <OptionRow
                          key={"h-" + coachId + "-" + horse.horseId}
                          multi={true}
                          selected={isSel}
                          label={formatHorseLabel(horse)}
                          onPress={function () {
                            toggleHorse(coachId, horse.horseId);
                          }}
                        />
                      );
                    })}
                  </>
                )}
              </View>
            );
          })}

          <Text
            style={[
              styles.bubbleTextBot,
              { textAlign: "center", marginTop: 8, color: COLORS.primary },
            ]}
          >
            סה״כ נבחרו {totalSelected} שיבוצי סוס
          </Text>
        </View>
      )}
    </StepLayout>
  );
}

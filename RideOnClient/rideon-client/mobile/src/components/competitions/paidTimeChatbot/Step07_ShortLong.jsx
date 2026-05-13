import React from "react";
import { Pressable, Text, View } from "react-native";
import StepLayout from "./StepLayout";
import CoachAccordion from "./CoachAccordion";
import styles, { COLORS } from "../../../styles/paidTimeChatbotStyles";

function formatHorseLabel(horse) {
  const name = horse.horseName || "סוס";
  const barn = horse.barnName || "";
  return barn ? name + " (" + barn + ")" : name;
}

export default function Step07_ShortLong(props) {
  const chatbot = props.chatbot;
  const ctx = chatbot.state.context || {};
  const coachesWithHorses = ctx.coachesWithHorses || [];
  const selectedCoachIds = chatbot.state.answers.selectedCoachIds || [];
  const horsesPerCoach = chatbot.state.answers.horsesPerCoach || {};
  const shortLong = chatbot.state.answers.shortLong || {};

  const selectedCoaches = coachesWithHorses.filter(function (c) {
    return selectedCoachIds
      .map(String)
      .includes(String(c.coachFederationMemberId));
  });

  function setHorse(horseId, value) {
    chatbot.setAnswer("shortLong", {
      ...shortLong,
      [horseId]: value,
    });
  }

  function applyToCoach(coachId, value) {
    const horseIds = horsesPerCoach[coachId] || [];
    const next = { ...shortLong };
    for (const hId of horseIds) {
      next[hId] = value;
    }
    chatbot.setAnswer("shortLong", next);
  }

  return (
    <StepLayout
      bubbles={[
        "לכל סוס בחר אם הפייד טיים יהיה קצר (8 דק') או ארוך (11 דק').",
      ]}
      onNext={chatbot.next}
      onBack={chatbot.prev}
      canAdvance={true}
    >
      {selectedCoaches.length === 0 ? (
        <Text style={styles.bubbleTextBot}>לא נבחרו מאמנים.</Text>
      ) : (
        <View>
          {selectedCoaches.map(function (coach) {
            const coachId = coach.coachFederationMemberId;
            const horseIds = horsesPerCoach[coachId] || [];
            const horses = (coach.horses || []).filter(function (h) {
              return horseIds.map(String).includes(String(h.horseId));
            });

            if (horses.length === 0) return null;

            const shortCount = horses.filter(function (h) {
              return (shortLong[h.horseId] || "short") === "short";
            }).length;
            const longCount = horses.length - shortCount;
            const subtitle =
              shortCount + " קצר, " + longCount + " ארוך";

            return (
              <CoachAccordion
                key={"sl-" + coachId}
                title={coach.coachName}
                subtitle={subtitle}
                defaultOpen={false}
              >
                <View
                  style={{
                    flexDirection: "row-reverse",
                    gap: 6,
                    marginBottom: 10,
                  }}
                >
                  <Pressable
                    onPress={function () {
                      applyToCoach(coachId, "short");
                    }}
                    style={[
                      styles.secondaryButton,
                      { flex: 1, marginTop: 0 },
                    ]}
                  >
                    <Text style={styles.secondaryButtonText}>הכל קצר</Text>
                  </Pressable>
                  <Pressable
                    onPress={function () {
                      applyToCoach(coachId, "long");
                    }}
                    style={[
                      styles.secondaryButton,
                      { flex: 1, marginTop: 0 },
                    ]}
                  >
                    <Text style={styles.secondaryButtonText}>הכל ארוך</Text>
                  </Pressable>
                </View>

                {horses.map(function (horse) {
                  const value = shortLong[horse.horseId] || "short";
                  return (
                    <View
                      key={"h-" + coachId + "-" + horse.horseId}
                      style={{ marginBottom: 8 }}
                    >
                      <Text
                        style={[styles.bubbleTextBot, { fontWeight: "700" }]}
                      >
                        {formatHorseLabel(horse)}
                      </Text>
                      <View
                        style={{
                          flexDirection: "row-reverse",
                          gap: 6,
                          marginTop: 4,
                        }}
                      >
                        <Pressable
                          onPress={function () {
                            setHorse(horse.horseId, "short");
                          }}
                          style={[
                            styles.optionRow,
                            { flex: 1, justifyContent: "center" },
                            value === "short"
                              ? styles.optionRowSelected
                              : null,
                          ]}
                        >
                          <Text style={styles.optionLabel}>קצר (8 דק')</Text>
                        </Pressable>
                        <Pressable
                          onPress={function () {
                            setHorse(horse.horseId, "long");
                          }}
                          style={[
                            styles.optionRow,
                            { flex: 1, justifyContent: "center" },
                            value === "long" ? styles.optionRowSelected : null,
                          ]}
                        >
                          <Text style={styles.optionLabel}>ארוך (11 דק')</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </CoachAccordion>
            );
          })}
        </View>
      )}
    </StepLayout>
  );
}

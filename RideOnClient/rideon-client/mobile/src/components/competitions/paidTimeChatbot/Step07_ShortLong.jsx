import React from "react";
import { Pressable, Text, View } from "react-native";
import StepLayout from "./StepLayout";
import OptionRow from "./OptionRow";
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

  // Build flat list of selected (coach, horse) pairs
  const allSelectedHorses = [];
  for (const coach of selectedCoaches) {
    const horseIds = horsesPerCoach[coach.coachFederationMemberId] || [];
    for (const hId of horseIds) {
      const horse = (coach.horses || []).find(function (h) {
        return String(h.horseId) === String(hId);
      });
      if (horse) {
        allSelectedHorses.push({
          coachName: coach.coachName,
          horse: horse,
        });
      }
    }
  }

  function setHorse(horseId, value) {
    chatbot.setAnswer("shortLong", {
      ...shortLong,
      [horseId]: value,
    });
  }

  function applyAll(value) {
    const next = { ...shortLong };
    for (const item of allSelectedHorses) {
      next[item.horse.horseId] = value;
    }
    chatbot.setAnswer("shortLong", next);
  }

  const allShort = allSelectedHorses.length > 0 &&
    allSelectedHorses.every(function (item) {
      return shortLong[item.horse.horseId] === "short";
    });
  const allLong = allSelectedHorses.length > 0 &&
    allSelectedHorses.every(function (item) {
      return shortLong[item.horse.horseId] === "long";
    });

  return (
    <StepLayout
      bubbles={[
        "לכל סוס בחר אם הפייד טיים יהיה קצר (8 דק') או ארוך (11 דק').",
      ]}
      onNext={chatbot.next}
      onBack={chatbot.prev}
      canAdvance={true}
    >
      {allSelectedHorses.length === 0 ? (
        <Text style={styles.bubbleTextBot}>אין סוסים לבחירה.</Text>
      ) : (
        <View>
          <View
            style={{
              flexDirection: "row-reverse",
              gap: 8,
              marginBottom: 14,
            }}
          >
            <Pressable
              onPress={function () {
                applyAll("short");
              }}
              style={[
                styles.secondaryButton,
                { flex: 1, marginTop: 0 },
                allShort
                  ? { backgroundColor: COLORS.primaryLight }
                  : null,
              ]}
            >
              <Text style={styles.secondaryButtonText}>הכל קצר</Text>
            </Pressable>
            <Pressable
              onPress={function () {
                applyAll("long");
              }}
              style={[
                styles.secondaryButton,
                { flex: 1, marginTop: 0 },
                allLong
                  ? { backgroundColor: COLORS.primaryLight }
                  : null,
              ]}
            >
              <Text style={styles.secondaryButtonText}>הכל ארוך</Text>
            </Pressable>
          </View>

          {allSelectedHorses.map(function (item, idx) {
            const horseId = item.horse.horseId;
            const value = shortLong[horseId] || "short";

            return (
              <View
                key={"h-" + horseId + "-" + idx}
                style={{
                  marginBottom: 12,
                  paddingBottom: 10,
                  borderBottomWidth: idx < allSelectedHorses.length - 1 ? 1 : 0,
                  borderBottomColor: COLORS.border,
                }}
              >
                <Text style={[styles.bubbleTextBot, { fontWeight: "700" }]}>
                  {formatHorseLabel(item.horse)}
                </Text>
                <Text
                  style={[
                    styles.bubbleTextBot,
                    { fontSize: 12, color: COLORS.textMuted, marginBottom: 6 },
                  ]}
                >
                  מאמן: {item.coachName}
                </Text>
                <View style={{ flexDirection: "row-reverse", gap: 6 }}>
                  <Pressable
                    onPress={function () {
                      setHorse(horseId, "short");
                    }}
                    style={[
                      styles.optionRow,
                      { flex: 1, justifyContent: "center" },
                      value === "short" ? styles.optionRowSelected : null,
                    ]}
                  >
                    <Text style={styles.optionLabel}>קצר (8 דק')</Text>
                  </Pressable>
                  <Pressable
                    onPress={function () {
                      setHorse(horseId, "long");
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
        </View>
      )}
    </StepLayout>
  );
}

import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import StepLayout from "./StepLayout";
import CoachAccordion from "./CoachAccordion";
import styles, { COLORS } from "../../../styles/paidTimeChatbotStyles";

function formatHorseLabel(horse) {
  const name = horse.horseName || "סוס";
  const barn = horse.barnName || "";
  return barn ? name + " (" + barn + ")" : name;
}

function moveItem(arr, fromIndex, toIndex) {
  if (toIndex < 0 || toIndex >= arr.length) return arr;
  const next = arr.slice();
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

export default function Step08_TrainingOrder(props) {
  const chatbot = props.chatbot;
  const ctx = chatbot.state.context || {};
  const coachesWithHorses = ctx.coachesWithHorses || [];
  const selectedCoachIds = chatbot.state.answers.selectedCoachIds || [];
  const horsesPerCoach = chatbot.state.answers.horsesPerCoach || {};
  const trainingOrder = chatbot.state.answers.trainingOrder || {};

  const selectedCoaches = coachesWithHorses.filter(function (c) {
    return selectedCoachIds
      .map(String)
      .includes(String(c.coachFederationMemberId));
  });

  function getOrderedHorses(coach) {
    const coachId = coach.coachFederationMemberId;
    const allHorses = coach.horses || [];
    const selectedIds = horsesPerCoach[coachId] || [];
    const orderForCoach = trainingOrder[coachId];

    const selectedHorses = allHorses.filter(function (h) {
      return selectedIds.map(String).includes(String(h.horseId));
    });

    if (
      Array.isArray(orderForCoach) &&
      orderForCoach.length === selectedHorses.length
    ) {
      const byId = {};
      for (const h of selectedHorses) byId[h.horseId] = h;
      const ordered = orderForCoach
        .map(function (id) {
          return byId[id];
        })
        .filter(Boolean);
      if (ordered.length === selectedHorses.length) return ordered;
    }
    return selectedHorses;
  }

  function moveHorse(coachId, currentList, fromIndex, direction) {
    const toIndex = fromIndex + direction;
    const reordered = moveItem(currentList, fromIndex, toIndex);
    const newOrder = reordered.map(function (h) {
      return h.horseId;
    });
    chatbot.setAnswer("trainingOrder", {
      ...trainingOrder,
      [coachId]: newOrder,
    });
  }

  return (
    <StepLayout
      bubbles={[
        "סדר אימון מועדף - השתמש בחצים כדי לסדר.",
        "אם לא תזיז כלום - המערכת תקבע סדר חכם. זו העדפה, לא חובה.",
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
            const horses = getOrderedHorses(coach);

            if (horses.length === 0) return null;

            const subtitle = horses
              .map(function (h, idx) {
                return idx + 1 + ". " + (h.horseName || "");
              })
              .join("  ");

            return (
              <CoachAccordion
                key={"order-" + coachId}
                title={coach.coachName}
                subtitle={subtitle}
                defaultOpen={false}
              >
                {horses.map(function (horse, hIdx) {
                  const isFirst = hIdx === 0;
                  const isLast = hIdx === horses.length - 1;

                  return (
                    <View
                      key={"h-" + coachId + "-" + horse.horseId}
                      style={[styles.optionRow, { marginBottom: 6 }]}
                    >
                      <Text
                        style={[
                          styles.optionLabel,
                          {
                            flex: 0,
                            fontWeight: "700",
                            color: COLORS.primary,
                            minWidth: 28,
                          },
                        ]}
                      >
                        {hIdx + 1}.
                      </Text>
                      <Text style={[styles.optionLabel, { flex: 1 }]}>
                        {formatHorseLabel(horse)}
                      </Text>
                      <View
                        style={{
                          flexDirection: "row-reverse",
                          gap: 4,
                        }}
                      >
                        <Pressable
                          onPress={function () {
                            moveHorse(coachId, horses, hIdx, -1);
                          }}
                          disabled={isFirst}
                          hitSlop={6}
                          style={{
                            padding: 6,
                            opacity: isFirst ? 0.3 : 1,
                          }}
                        >
                          <Ionicons
                            name="arrow-up"
                            size={22}
                            color={COLORS.primary}
                          />
                        </Pressable>
                        <Pressable
                          onPress={function () {
                            moveHorse(coachId, horses, hIdx, 1);
                          }}
                          disabled={isLast}
                          hitSlop={6}
                          style={{
                            padding: 6,
                            opacity: isLast ? 0.3 : 1,
                          }}
                        >
                          <Ionicons
                            name="arrow-down"
                            size={22}
                            color={COLORS.primary}
                          />
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

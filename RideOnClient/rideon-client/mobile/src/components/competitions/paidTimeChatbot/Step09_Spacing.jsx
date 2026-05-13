import React, { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import StepLayout from "./StepLayout";
import TimePickerWheel from "./TimePickerWheel";
import CoachAccordion from "./CoachAccordion";
import styles, { COLORS } from "../../../styles/paidTimeChatbotStyles";

const DEFAULT_SPACING = 15;

function formatHorseLabel(horse) {
  const name = horse.horseName || "סוס";
  const barn = horse.barnName || "";
  return barn ? name + " (" + barn + ")" : name;
}

function getPairKey(a, b) {
  const sorted = [String(a), String(b)].sort();
  return sorted[0] + "-" + sorted[1];
}

function getOrderedHorsesForCoach(coach, horsesPerCoach, trainingOrder) {
  const coachId = coach.coachFederationMemberId;
  const selectedIds = horsesPerCoach[coachId] || [];
  const allHorses = coach.horses || [];
  const order = trainingOrder[coachId];

  const selected = allHorses.filter(function (h) {
    return selectedIds.map(String).includes(String(h.horseId));
  });

  if (Array.isArray(order) && order.length === selected.length) {
    const byId = {};
    for (const h of selected) byId[h.horseId] = h;
    const ordered = order
      .map(function (id) {
        return byId[id];
      })
      .filter(Boolean);
    if (ordered.length === selected.length) return ordered;
  }
  return selected;
}

export default function Step09_Spacing(props) {
  const chatbot = props.chatbot;
  const ctx = chatbot.state.context || {};
  const coachesWithHorses = ctx.coachesWithHorses || [];
  const selectedCoachIds = chatbot.state.answers.selectedCoachIds || [];
  const horsesPerCoach = chatbot.state.answers.horsesPerCoach || {};
  const trainingOrder = chatbot.state.answers.trainingOrder || {};
  const spacing = chatbot.state.answers.spacing || {
    adjacency: [],
    minSpacing: [],
  };

  const selectedCoaches = coachesWithHorses.filter(function (c) {
    return selectedCoachIds
      .map(String)
      .includes(String(c.coachFederationMemberId));
  });

  // Build consecutive pairs per coach (based on training order).
  const coachPairs = useMemo(
    function () {
      return selectedCoaches.map(function (coach) {
        const ordered = getOrderedHorsesForCoach(
          coach,
          horsesPerCoach,
          trainingOrder
        );
        const pairs = [];
        for (let i = 0; i < ordered.length - 1; i++) {
          const a = ordered[i];
          const b = ordered[i + 1];
          pairs.push({
            key: getPairKey(a.horseId, b.horseId),
            a: a,
            b: b,
          });
        }
        return {
          coach: coach,
          pairs: pairs,
        };
      });
    },
    [selectedCoaches, horsesPerCoach, trainingOrder]
  );

  function isAdjacent(pairKey) {
    return (spacing.adjacency || []).some(function (p) {
      return getPairKey(p.horseA, p.horseB) === pairKey;
    });
  }

  function getMinutes(pairKey) {
    const found = (spacing.minSpacing || []).find(function (p) {
      return getPairKey(p.horseA, p.horseB) === pairKey;
    });
    return found ? found.minutes : null;
  }

  // mode: "none" | "adjacent" | "spacing"
  function getMode(pairKey) {
    if (isAdjacent(pairKey)) return "adjacent";
    if (getMinutes(pairKey) != null) return "spacing";
    return "none";
  }

  function setMode(pair, mode, minutes) {
    const adjacency = (spacing.adjacency || []).filter(function (p) {
      return getPairKey(p.horseA, p.horseB) !== pair.key;
    });
    const minSpacing = (spacing.minSpacing || []).filter(function (p) {
      return getPairKey(p.horseA, p.horseB) !== pair.key;
    });

    if (mode === "adjacent") {
      adjacency.push({ horseA: pair.a.horseId, horseB: pair.b.horseId });
    } else if (mode === "spacing" && minutes != null) {
      minSpacing.push({
        horseA: pair.a.horseId,
        horseB: pair.b.horseId,
        minutes: minutes,
      });
    }

    chatbot.setAnswer("spacing", {
      adjacency: adjacency,
      minSpacing: minSpacing,
    });
  }

  const totalPairs = coachPairs.reduce(function (sum, c) {
    return sum + c.pairs.length;
  }, 0);

  return (
    <StepLayout
      bubbles={[
        "מרווחים בין סוסים עוקבים - לכל זוג סוסים שאחד אחרי השני, האם יש מרווח מינימלי שתעדיף?",
        "ברירת מחדל: לא משנה. אפשר להגדיר זמן ספציפי במקום.",
      ]}
      onNext={chatbot.next}
      onBack={chatbot.prev}
      canAdvance={true}
    >
      {totalPairs === 0 ? (
        <Text style={styles.bubbleTextBot}>
          צריך לפחות 2 סוסים תחת מאמן כדי להגדיר מרווחים.
        </Text>
      ) : (
        <View>
          {coachPairs.map(function (block) {
            if (block.pairs.length === 0) return null;

            const coachId = block.coach.coachFederationMemberId;
            const definedCount = block.pairs.filter(function (p) {
              return getMode(p.key) !== "none";
            }).length;
            const subtitle =
              definedCount > 0
                ? definedCount + " מתוך " + block.pairs.length + " הוגדרו"
                : "לא משנה (ברירת מחדל)";

            return (
              <CoachAccordion
                key={"sp-" + coachId}
                title={block.coach.coachName}
                subtitle={subtitle}
                defaultOpen={false}
              >
                {block.pairs.map(function (pair) {
                  const mode = getMode(pair.key);
                  const minutes = getMinutes(pair.key);

                  return (
                    <View
                      key={"pair-" + pair.key}
                      style={{
                        marginBottom: 14,
                        paddingBottom: 10,
                        borderBottomWidth: 1,
                        borderBottomColor: COLORS.border,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row-reverse",
                          alignItems: "center",
                          gap: 6,
                          marginBottom: 6,
                        }}
                      >
                        <Text
                          style={[
                            styles.bubbleTextBot,
                            { fontWeight: "700", flex: 1 },
                          ]}
                        >
                          {formatHorseLabel(pair.a)}
                        </Text>
                        <Ionicons
                          name="arrow-down"
                          size={18}
                          color={COLORS.textMuted}
                        />
                      </View>
                      <Text
                        style={[styles.bubbleTextBot, { fontWeight: "700" }]}
                      >
                        {formatHorseLabel(pair.b)}
                      </Text>

                      <View
                        style={{
                          flexDirection: "row-reverse",
                          gap: 6,
                          marginTop: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <Pressable
                          onPress={function () {
                            setMode(pair, "none");
                          }}
                          style={[
                            styles.optionRow,
                            { flex: 1, justifyContent: "center", minWidth: 90 },
                            mode === "none" ? styles.optionRowSelected : null,
                          ]}
                        >
                          <Text style={styles.optionLabel}>לא משנה</Text>
                        </Pressable>
                        <Pressable
                          onPress={function () {
                            setMode(pair, "adjacent");
                          }}
                          style={[
                            styles.optionRow,
                            { flex: 1, justifyContent: "center", minWidth: 90 },
                            mode === "adjacent"
                              ? styles.optionRowSelected
                              : null,
                          ]}
                        >
                          <Text style={styles.optionLabel}>הצמד</Text>
                        </Pressable>
                        <Pressable
                          onPress={function () {
                            setMode(
                              pair,
                              "spacing",
                              minutes != null ? minutes : DEFAULT_SPACING
                            );
                          }}
                          style={[
                            styles.optionRow,
                            { flex: 1, justifyContent: "center", minWidth: 110 },
                            mode === "spacing"
                              ? styles.optionRowSelected
                              : null,
                          ]}
                        >
                          <Text style={styles.optionLabel}>מרווח מינימלי</Text>
                        </Pressable>
                      </View>

                      {mode === "spacing" ? (
                        <View style={{ marginTop: 8 }}>
                          <Text
                            style={[
                              styles.bubbleTextBot,
                              {
                                fontSize: 12,
                                color: COLORS.textMuted,
                                textAlign: "center",
                              },
                            ]}
                          >
                            לפחות (שעות:דקות)
                          </Text>
                          <TimePickerWheel
                            value={minutes != null ? minutes : DEFAULT_SPACING}
                            onChange={function (v) {
                              setMode(pair, "spacing", v);
                            }}
                            minHour={0}
                            maxHour={3}
                          />
                        </View>
                      ) : null}
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

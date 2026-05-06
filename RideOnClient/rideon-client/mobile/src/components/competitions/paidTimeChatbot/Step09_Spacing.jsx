import React, { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import StepLayout from "./StepLayout";
import OptionRow from "./OptionRow";
import styles, { COLORS } from "../../../styles/paidTimeChatbotStyles";

const SPACING_OPTIONS = [
  { minutes: 0, label: "ללא מרווח" },
  { minutes: 15, label: "15 דק'" },
  { minutes: 30, label: "30 דק'" },
  { minutes: 45, label: "45 דק'" },
  { minutes: 60, label: "שעה" },
];

function formatHorseLabel(horse) {
  const name = horse.horseName || "סוס";
  const barn = horse.barnName || "";
  return barn ? name + " (" + barn + ")" : name;
}

function getPairKey(a, b) {
  const sorted = [String(a), String(b)].sort();
  return sorted[0] + "-" + sorted[1];
}

export default function Step09_Spacing(props) {
  const chatbot = props.chatbot;
  const ctx = chatbot.state.context || {};
  const coachesWithHorses = ctx.coachesWithHorses || [];
  const selectedCoachIds = chatbot.state.answers.selectedCoachIds || [];
  const horsesPerCoach = chatbot.state.answers.horsesPerCoach || {};
  const spacing = chatbot.state.answers.spacing || {
    adjacency: [],
    minSpacing: [],
  };

  const selectedCoaches = coachesWithHorses.filter(function (c) {
    return selectedCoachIds
      .map(String)
      .includes(String(c.coachFederationMemberId));
  });

  // Build flat list of selected horses (for adjacency pair selection)
  const selectedHorseInfo = useMemo(
    function () {
      const out = [];
      for (const coach of selectedCoaches) {
        const horseIds = horsesPerCoach[coach.coachFederationMemberId] || [];
        for (const hId of horseIds) {
          const h = (coach.horses || []).find(function (x) {
            return String(x.horseId) === String(hId);
          });
          if (h) {
            out.push({
              horseId: h.horseId,
              label: formatHorseLabel(h),
              coachName: coach.coachName,
            });
          }
        }
      }
      return out;
    },
    [selectedCoaches, horsesPerCoach]
  );

  // Build all possible pairs (within same coach to be meaningful)
  const possiblePairs = useMemo(
    function () {
      const out = [];
      for (const coach of selectedCoaches) {
        const horseIds = horsesPerCoach[coach.coachFederationMemberId] || [];
        const horses = horseIds
          .map(function (id) {
            return selectedHorseInfo.find(function (h) {
              return String(h.horseId) === String(id);
            });
          })
          .filter(Boolean);

        for (let i = 0; i < horses.length; i++) {
          for (let j = i + 1; j < horses.length; j++) {
            out.push({
              key: getPairKey(horses[i].horseId, horses[j].horseId),
              a: horses[i],
              b: horses[j],
              coachName: coach.coachName,
            });
          }
        }
      }
      return out;
    },
    [selectedCoaches, horsesPerCoach, selectedHorseInfo]
  );

  function isAdjacent(pairKey) {
    return (spacing.adjacency || []).some(function (p) {
      return getPairKey(p.horseA, p.horseB) === pairKey;
    });
  }

  function getMinSpacing(pairKey) {
    const found = (spacing.minSpacing || []).find(function (p) {
      return getPairKey(p.horseA, p.horseB) === pairKey;
    });
    return found ? found.minutes : 0;
  }

  function toggleAdjacency(pair) {
    const key = pair.key;
    const list = spacing.adjacency || [];
    const existing = list.find(function (p) {
      return getPairKey(p.horseA, p.horseB) === key;
    });

    let nextAdjacency;
    let nextMinSpacing = spacing.minSpacing || [];

    if (existing) {
      nextAdjacency = list.filter(function (p) {
        return getPairKey(p.horseA, p.horseB) !== key;
      });
    } else {
      nextAdjacency = [
        ...list,
        { horseA: pair.a.horseId, horseB: pair.b.horseId },
      ];
      // Adjacency overrides min-spacing for the same pair.
      nextMinSpacing = nextMinSpacing.filter(function (p) {
        return getPairKey(p.horseA, p.horseB) !== key;
      });
    }

    chatbot.setAnswer("spacing", {
      adjacency: nextAdjacency,
      minSpacing: nextMinSpacing,
    });
  }

  function setMinSpacing(pair, minutes) {
    const key = pair.key;
    let list = spacing.minSpacing || [];

    list = list.filter(function (p) {
      return getPairKey(p.horseA, p.horseB) !== key;
    });

    if (minutes > 0) {
      list = [
        ...list,
        { horseA: pair.a.horseId, horseB: pair.b.horseId, minutes: minutes },
      ];
    }

    // Min-spacing > 0 cancels adjacency for the same pair
    let adjacency = spacing.adjacency || [];
    if (minutes > 0) {
      adjacency = adjacency.filter(function (p) {
        return getPairKey(p.horseA, p.horseB) !== key;
      });
    }

    chatbot.setAnswer("spacing", {
      adjacency: adjacency,
      minSpacing: list,
    });
  }

  return (
    <StepLayout
      bubbles={[
        "מרווחים בין סוסים - אופציונלי.",
        "אפשר לבקש שזוג סוסים יהיו צמודים, או למרווח מינימלי ביניהם. אלה העדפות, לא חובה.",
      ]}
      onNext={chatbot.next}
      onBack={chatbot.prev}
      canAdvance={true}
    >
      {possiblePairs.length === 0 ? (
        <Text style={styles.bubbleTextBot}>
          צריך לפחות 2 סוסים לאותו מאמן כדי להגדיר מרווחים.
        </Text>
      ) : (
        <View>
          {possiblePairs.map(function (pair, idx) {
            const adjacent = isAdjacent(pair.key);
            const minutes = getMinSpacing(pair.key);

            return (
              <View
                key={"pair-" + pair.key}
                style={{
                  marginBottom: 14,
                  paddingBottom: 10,
                  borderBottomWidth: idx < possiblePairs.length - 1 ? 1 : 0,
                  borderBottomColor: COLORS.border,
                }}
              >
                <Text style={[styles.bubbleTextBot, { fontWeight: "700" }]}>
                  {pair.a.label}
                </Text>
                <Text
                  style={[
                    styles.bubbleTextBot,
                    {
                      fontSize: 12,
                      color: COLORS.textMuted,
                      marginVertical: 4,
                    },
                  ]}
                >
                  ↕ ({pair.coachName})
                </Text>
                <Text style={[styles.bubbleTextBot, { fontWeight: "700" }]}>
                  {pair.b.label}
                </Text>

                <Pressable
                  onPress={function () {
                    toggleAdjacency(pair);
                  }}
                  style={[
                    styles.optionRow,
                    { marginTop: 8 },
                    adjacent ? styles.optionRowSelected : null,
                  ]}
                >
                  <Ionicons
                    name={adjacent ? "link" : "link-outline"}
                    size={20}
                    color={adjacent ? COLORS.primary : COLORS.textMuted}
                  />
                  <Text style={styles.optionLabel}>הצמד את שני הסוסים</Text>
                </Pressable>

                {!adjacent ? (
                  <View style={{ marginTop: 6 }}>
                    <Text
                      style={[
                        styles.bubbleTextBot,
                        { fontSize: 12, color: COLORS.textMuted },
                      ]}
                    >
                      או מרווח מינימלי:
                    </Text>
                    <View
                      style={{
                        flexDirection: "row-reverse",
                        flexWrap: "wrap",
                        gap: 6,
                        marginTop: 4,
                      }}
                    >
                      {SPACING_OPTIONS.map(function (opt) {
                        const isSel = minutes === opt.minutes;
                        return (
                          <Pressable
                            key={"sp-" + pair.key + "-" + opt.minutes}
                            onPress={function () {
                              setMinSpacing(pair, opt.minutes);
                            }}
                            style={[
                              {
                                paddingVertical: 6,
                                paddingHorizontal: 12,
                                borderRadius: 14,
                                borderWidth: 1,
                                borderColor: isSel
                                  ? COLORS.primary
                                  : COLORS.border,
                                backgroundColor: isSel
                                  ? COLORS.primaryLight
                                  : "#FFFFFF",
                              },
                            ]}
                          >
                            <Text
                              style={{
                                color: isSel
                                  ? COLORS.primary
                                  : COLORS.textPrimary,
                                fontSize: 13,
                                fontWeight: isSel ? "700" : "400",
                              }}
                            >
                              {opt.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      )}
    </StepLayout>
  );
}

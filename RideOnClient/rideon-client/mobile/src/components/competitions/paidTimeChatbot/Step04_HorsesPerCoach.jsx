import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import StepLayout from "./StepLayout";
import OptionRow from "./OptionRow";
import CoachAccordion from "./CoachAccordion";
import styles, { COLORS } from "../../../styles/paidTimeChatbotStyles";
import { formatHorseLabel } from "../../../utils/paidTimeBulkReview";

// שלב בחירת הסוסים לכל מאמן - הליבה של ההזמנה המרוכזת.
//
// לוגיקת הבחירה לא השתנתה: אותו answers.horsesPerCoach, אותו toggle,
// אותו כלל התקדמות (לכל מאמן שנבחר חייב להיות לפחות סוס אחד).
// מה שנוסף הוא תצוגה: חיפוש בתוך רשימת הסוסים של המאמן, צ'יפים של הסוסים
// שכבר נבחרו (כולל הסרה נקודתית), ומונה נבחרים - כדי שלא צריך לפתוח את
// הרשימה כדי להבין מה נבחר.
export default function Step04_HorsesPerCoach(props) {
  const chatbot = props.chatbot;
  const ctx = chatbot.state.context || {};
  const coachesWithHorses = ctx.coachesWithHorses || [];
  const selectedCoachIds = chatbot.state.answers.selectedCoachIds || [];
  const horsesPerCoach = chatbot.state.answers.horsesPerCoach || {};

  const [searchByCoach, setSearchByCoach] = useState({});

  const selectedCoaches = coachesWithHorses.filter(function (c) {
    return selectedCoachIds
      .map(String)
      .includes(String(c.coachFederationMemberId));
  });

  function getSearch(coachId) {
    return searchByCoach[coachId] || "";
  }

  function setSearch(coachId, value) {
    setSearchByCoach(function (prev) {
      const next = { ...prev };
      next[coachId] = value;
      return next;
    });
  }

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

  function removeHorse(coachId, horseId) {
    const current = horsesPerCoach[coachId] || [];
    const next = current.filter(function (id) {
      return String(id) !== String(horseId);
    });
    chatbot.setAnswer("horsesPerCoach", {
      ...horsesPerCoach,
      [coachId]: next,
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

  const totalSelected = Object.values(horsesPerCoach).reduce(
    function (sum, arr) {
      return sum + (Array.isArray(arr) ? arr.length : 0);
    },
    0
  );

  const coachesMissingHorses = selectedCoaches.filter(function (c) {
    const list = horsesPerCoach[c.coachFederationMemberId] || [];
    return list.length === 0;
  });

  const canAdvance = totalSelected > 0 && coachesMissingHorses.length === 0;

  const incompleteReason =
    coachesMissingHorses.length > 0
      ? "יש לבחור לפחות סוס אחד עבור: " +
        coachesMissingHorses
          .map(function (c) {
            return c.coachName;
          })
          .join(", ")
      : totalSelected === 0
        ? "יש לבחור לפחות סוס אחד כדי להמשיך."
        : "";

  return (
    <StepLayout
      bubbles={[
        "בחירת סוסים",
        "לכל מאמן שנבחר, סמני אילו סוסים לרשום לפייד טיים. אפשר לבחור כמה סוסים לאותו מאמן.",
      ]}
      onNext={chatbot.next}
      onBack={chatbot.prev}
      canAdvance={canAdvance}
      incompleteReason={incompleteReason}
    >
      {selectedCoaches.length === 0 ? (
        <Text style={styles.sectionHelp}>
          לא נבחרו מאמנים. חזרי צעד אחורה ובחרי מאמן.
        </Text>
      ) : (
        <View>
          {selectedCoaches.map(function (coach) {
            const coachId = coach.coachFederationMemberId;
            const horses = coach.horses || [];
            const selectedHorseIds = (horsesPerCoach[coachId] || []).map(String);
            const allIds = horses.map(function (h) {
              return h.horseId;
            });
            const isAll =
              allIds.length > 0 && selectedHorseIds.length === allIds.length;

            const selectedHorses = horses.filter(function (h) {
              return selectedHorseIds.includes(String(h.horseId));
            });

            const search = getSearch(coachId).trim().toLowerCase();
            const visibleHorses = search
              ? horses.filter(function (h) {
                  return formatHorseLabel(h).toLowerCase().includes(search);
                })
              : horses;

            const subtitle =
              selectedHorses.length > 0
                ? "נבחרו " + selectedHorses.length + " מתוך " + horses.length
                : "טרם נבחרו סוסים";

            return (
              <CoachAccordion
                key={"coach-" + coachId}
                title={coach.coachName}
                subtitle={subtitle}
                defaultOpen={true}
              >
                {horses.length === 0 ? (
                  <Text style={styles.sectionHelp}>
                    אין סוסים תחת מאמן זה.
                  </Text>
                ) : (
                  <>
                    <Text style={styles.selectedCountText}>
                      נבחרו {selectedHorses.length} מתוך {horses.length} סוסים
                    </Text>

                    {selectedHorses.length > 0 ? (
                      <View style={styles.chipsWrap}>
                        {selectedHorses.map(function (horse) {
                          return (
                            <View
                              key={"chip-" + coachId + "-" + horse.horseId}
                              style={styles.horseChip}
                            >
                              <Text style={styles.horseChipText}>
                                {formatHorseLabel(horse)}
                              </Text>
                              <Pressable
                                onPress={function () {
                                  removeHorse(coachId, horse.horseId);
                                }}
                                hitSlop={8}
                                style={styles.chipRemoveHit}
                                accessibilityRole="button"
                                accessibilityLabel={
                                  "הסרת " + formatHorseLabel(horse)
                                }
                              >
                                <Ionicons
                                  name="close-circle"
                                  size={16}
                                  color={COLORS.primary}
                                />
                              </Pressable>
                            </View>
                          );
                        })}
                      </View>
                    ) : (
                      <Text style={styles.emptySelectionText}>
                        עדיין לא נבחרו סוסים למאמן הזה.
                      </Text>
                    )}

                    {horses.length > 4 ? (
                      <TextInput
                        value={getSearch(coachId)}
                        onChangeText={function (value) {
                          setSearch(coachId, value);
                        }}
                        placeholder="חיפוש סוס"
                        placeholderTextColor={COLORS.textMuted}
                        style={styles.searchInput}
                        textAlign="right"
                      />
                    ) : null}

                    <OptionRow
                      multi={true}
                      selected={isAll}
                      label={"כל הסוסים (" + horses.length + ")"}
                      onPress={function () {
                        toggleAllForCoach(coachId, horses);
                      }}
                    />

                    {visibleHorses.length === 0 ? (
                      <Text style={styles.emptySelectionText}>
                        לא נמצאו סוסים שתואמים לחיפוש.
                      </Text>
                    ) : (
                      visibleHorses.map(function (horse) {
                        const isSel = selectedHorseIds.includes(
                          String(horse.horseId)
                        );
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
                      })
                    )}
                  </>
                )}
              </CoachAccordion>
            );
          })}

          <View style={styles.totalsCard}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>סה״כ סוסים שנבחרו</Text>
              <Text style={styles.totalsValue}>{totalSelected}</Text>
            </View>
          </View>

          {coachesMissingHorses.length > 0 ? (
            <View style={styles.warningBanner}>
              <Text style={styles.warningTitle}>חסר סוס למאמן/ים</Text>
              <Text style={styles.warningText}>
                כדי להתקדם, בחרי לפחות סוס אחד עבור:{" "}
                {coachesMissingHorses
                  .map(function (c) {
                    return c.coachName;
                  })
                  .join(", ")}
                . אם אין סוס מתאים, חזרי לשלב המאמנים והסירי אותם מהבחירה.
              </Text>
            </View>
          ) : null}
        </View>
      )}
    </StepLayout>
  );
}

import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import StepLayout from "./StepLayout";
import CoachAccordion from "./CoachAccordion";
import TimePickerWheel from "./TimePickerWheel";
import styles, { COLORS } from "../../../styles/paidTimeChatbotStyles";

const DEFAULT_EARLIEST = 8 * 60;   // 08:00
const DEFAULT_LATEST = 18 * 60;    // 18:00

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

  function getCoachPref(coachId) {
    return timePreferences.coachLevel?.[coachId] || {};
  }

  function patchCoachPref(coachId, patch) {
    const current = getCoachPref(coachId);
    const nextCoachLevel = {
      ...timePreferences.coachLevel,
      [coachId]: { ...current, ...patch },
    };
    chatbot.setAnswer("timePreferences", {
      ...timePreferences,
      coachLevel: nextCoachLevel,
    });
  }

  function toggleEarliest(coachId) {
    const pref = getCoachPref(coachId);
    if (pref.earliestMinutes != null) {
      patchCoachPref(coachId, { earliestMinutes: null });
    } else {
      patchCoachPref(coachId, { earliestMinutes: DEFAULT_EARLIEST });
    }
  }

  function toggleLatest(coachId) {
    const pref = getCoachPref(coachId);
    if (pref.latestMinutes != null) {
      patchCoachPref(coachId, { latestMinutes: null });
    } else {
      patchCoachPref(coachId, { latestMinutes: DEFAULT_LATEST });
    }
  }

  return (
    <StepLayout
      bubbles={[
        "העדפת זמן לכל מאמן - מתי הוא מעדיף שהפייד טיים יתחיל?",
        "זאת העדפה, לא חובה. אם המערכת לא יכולה לקיים אותה, הבקשה עדיין תיווצר.",
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
            const pref = getCoachPref(coachId);
            const hasEarliest = pref.earliestMinutes != null;
            const hasLatest = pref.latestMinutes != null;
            const summary = buildSummary(pref);

            return (
              <CoachAccordion
                key={"pref-" + coachId}
                title={coach.coachName}
                subtitle={summary}
                defaultOpen={false}
              >
                <ToggleField
                  active={hasEarliest}
                  label="לא לפני שעה"
                  onPress={function () {
                    toggleEarliest(coachId);
                  }}
                >
                  <TimePickerWheel
                    value={hasEarliest ? pref.earliestMinutes : DEFAULT_EARLIEST}
                    onChange={function (v) {
                      patchCoachPref(coachId, { earliestMinutes: v });
                    }}
                    disabled={!hasEarliest}
                  />
                </ToggleField>

                <ToggleField
                  active={hasLatest}
                  label="לא אחרי שעה"
                  onPress={function () {
                    toggleLatest(coachId);
                  }}
                >
                  <TimePickerWheel
                    value={hasLatest ? pref.latestMinutes : DEFAULT_LATEST}
                    onChange={function (v) {
                      patchCoachPref(coachId, { latestMinutes: v });
                    }}
                    disabled={!hasLatest}
                  />
                </ToggleField>
              </CoachAccordion>
            );
          })}
        </View>
      )}
    </StepLayout>
  );
}

function ToggleField(props) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Pressable
        onPress={props.onPress}
        style={{
          flexDirection: "row-reverse",
          alignItems: "center",
          paddingVertical: 10,
          paddingHorizontal: 12,
          backgroundColor: props.active ? COLORS.primaryLight : "#FFFFFF",
          borderRadius: 8,
          borderWidth: 1,
          borderColor: props.active ? COLORS.primary : COLORS.border,
          gap: 8,
        }}
      >
        <Ionicons
          name={props.active ? "checkbox" : "square-outline"}
          size={20}
          color={props.active ? COLORS.primary : COLORS.textMuted}
        />
        <Text
          style={{
            flex: 1,
            textAlign: "right",
            fontSize: 14,
            fontWeight: "600",
            color: COLORS.textPrimary,
          }}
        >
          {props.label}
        </Text>
      </Pressable>
      {props.active ? <View style={{ marginTop: 6 }}>{props.children}</View> : null}
    </View>
  );
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function fmtTime(min) {
  if (min == null) return null;
  return pad2(Math.floor(min / 60)) + ":" + pad2(min % 60);
}

function buildSummary(pref) {
  const e = fmtTime(pref.earliestMinutes);
  const l = fmtTime(pref.latestMinutes);
  if (e && l) return "מ-" + e + " עד " + l;
  if (e) return "מ-" + e + " והלאה";
  if (l) return "עד " + l;
  return "ללא העדפה";
}

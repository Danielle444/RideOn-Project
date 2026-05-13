import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import StepLayout from "./StepLayout";
import CoachAccordion from "./CoachAccordion";
import TimePickerWheel from "./TimePickerWheel";
import styles, { COLORS } from "../../../styles/paidTimeChatbotStyles";

const DEFAULT_EARLIEST = 8 * 60;
const DEFAULT_LATEST = 18 * 60;

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

  function getCoachConstraint(coachId) {
    return timeConstraints.coachLevel?.[coachId] || {};
  }

  function patchCoachConstraint(coachId, patch) {
    const current = getCoachConstraint(coachId);
    const nextCoachLevel = {
      ...timeConstraints.coachLevel,
      [coachId]: { ...current, ...patch },
    };
    chatbot.setAnswer("timeConstraints", {
      ...timeConstraints,
      coachLevel: nextCoachLevel,
    });
  }

  function toggleEarliest(coachId) {
    const c = getCoachConstraint(coachId);
    if (c.earliestMinutes != null) {
      patchCoachConstraint(coachId, { earliestMinutes: null });
    } else {
      patchCoachConstraint(coachId, { earliestMinutes: DEFAULT_EARLIEST });
    }
  }

  function toggleLatest(coachId) {
    const c = getCoachConstraint(coachId);
    if (c.latestMinutes != null) {
      patchCoachConstraint(coachId, { latestMinutes: null });
    } else {
      patchCoachConstraint(coachId, { latestMinutes: DEFAULT_LATEST });
    }
  }

  return (
    <StepLayout
      bubbles={[
        "אילוצי זמן לכל מאמן - מתי המאמן לא יכול בשום אופן?",
        "אילוץ הוא תנאי חובה. אם אי אפשר לעמוד בו, הבקשה לא תיווצר.",
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
            const c = getCoachConstraint(coachId);
            const hasEarliest = c.earliestMinutes != null;
            const hasLatest = c.latestMinutes != null;
            const summary = buildSummary(c);

            return (
              <CoachAccordion
                key={"con-" + coachId}
                title={coach.coachName}
                subtitle={summary}
                defaultOpen={false}
              >
                <ToggleField
                  active={hasEarliest}
                  label="חובה: לא לפני שעה"
                  onPress={function () {
                    toggleEarliest(coachId);
                  }}
                >
                  <TimePickerWheel
                    value={hasEarliest ? c.earliestMinutes : DEFAULT_EARLIEST}
                    onChange={function (v) {
                      patchCoachConstraint(coachId, { earliestMinutes: v });
                    }}
                    disabled={!hasEarliest}
                  />
                </ToggleField>

                <ToggleField
                  active={hasLatest}
                  label="חובה: לא אחרי שעה"
                  onPress={function () {
                    toggleLatest(coachId);
                  }}
                >
                  <TimePickerWheel
                    value={hasLatest ? c.latestMinutes : DEFAULT_LATEST}
                    onChange={function (v) {
                      patchCoachConstraint(coachId, { latestMinutes: v });
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
          backgroundColor: props.active ? "#FEE2E2" : "#FFFFFF",
          borderRadius: 8,
          borderWidth: 1,
          borderColor: props.active ? COLORS.danger : COLORS.border,
          gap: 8,
        }}
      >
        <Ionicons
          name={props.active ? "checkbox" : "square-outline"}
          size={20}
          color={props.active ? COLORS.danger : COLORS.textMuted}
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

function buildSummary(c) {
  const e = fmtTime(c.earliestMinutes);
  const l = fmtTime(c.latestMinutes);
  if (e && l) return "חובה: " + e + " - " + l;
  if (e) return "חובה: לא לפני " + e;
  if (l) return "חובה: לא אחרי " + l;
  return "ללא אילוץ";
}

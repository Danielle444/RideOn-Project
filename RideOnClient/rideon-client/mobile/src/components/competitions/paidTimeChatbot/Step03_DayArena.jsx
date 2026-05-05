import React, { useMemo } from "react";
import { Text, View } from "react-native";
import StepLayout from "./StepLayout";
import OptionRow from "./OptionRow";
import styles from "../../../styles/paidTimeChatbotStyles";

function formatDateHebrew(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return day + "/" + month + "/" + year;
}

function getArenasForDay(slotsByDay, day) {
  if (!day || !slotsByDay) return [];
  const seen = {};
  const slots = slotsByDay[day] || [];
  for (const s of slots) {
    const key = s.arenaRanchId + "-" + s.arenaId;
    if (!seen[key]) {
      seen[key] = {
        key: key,
        arenaName: s.arenaName,
      };
    }
  }
  return Object.values(seen);
}

export default function Step03_DayArena(props) {
  const chatbot = props.chatbot;
  const ctx = chatbot.state.context || {};
  const days = ctx.days || [];
  const slotsByDay = ctx.slotsByDay || {};
  const day = chatbot.state.answers.day;
  const arenaKey = chatbot.state.answers.arenaKey;
  const beforeOrAfter = chatbot.state.answers.beforeOrAfterCompetition;

  const arenasForDay = useMemo(
    function () {
      return getArenasForDay(slotsByDay, day);
    },
    [slotsByDay, day]
  );

  const onlyOneArena = arenasForDay.length === 1;
  const effectiveArenaKey = onlyOneArena ? arenasForDay[0].key : arenaKey;

  const canAdvance =
    !!day && (onlyOneArena || !!arenaKey);

  function handleNext() {
    if (onlyOneArena && !arenaKey) {
      chatbot.setAnswer("arenaKey", arenasForDay[0].key);
    }
    chatbot.next();
  }

  return (
    <StepLayout
      bubbles={[
        "באיזה יום תרצה לבצע את הפייד טיימים? בחר יום מתוך הימים שיש בהם סלוטים.",
      ]}
      onNext={handleNext}
      onBack={chatbot.prev}
      canAdvance={canAdvance}
    >
      {days.length === 0 ? (
        <Text style={styles.bubbleTextBot}>
          אין ימים פעילים עם סלוטי פייד טיים בתחרות הזו.
        </Text>
      ) : (
        <View>
          <Text style={[styles.bubbleTextBot, { fontWeight: "700", marginBottom: 8 }]}>
            יום:
          </Text>
          {days.map(function (d) {
            return (
              <OptionRow
                key={"day-" + d.date}
                selected={day === d.date}
                label={formatDateHebrew(d.date)}
                onPress={function () {
                  chatbot.patchAnswers({
                    day: d.date,
                    arenaKey: null,
                  });
                }}
              />
            );
          })}

          {day && arenasForDay.length > 1 ? (
            <View style={{ marginTop: 16 }}>
              <Text
                style={[
                  styles.bubbleTextBot,
                  { fontWeight: "700", marginBottom: 8 },
                ]}
              >
                מגרש:
              </Text>
              {arenasForDay.map(function (a) {
                return (
                  <OptionRow
                    key={"arena-" + a.key}
                    selected={effectiveArenaKey === a.key}
                    label={a.arenaName}
                    onPress={function () {
                      chatbot.setAnswer("arenaKey", a.key);
                    }}
                  />
                );
              })}
            </View>
          ) : null}

          {day && onlyOneArena ? (
            <Text
              style={[
                styles.bubbleTextBot,
                { marginTop: 16, color: "#7A7A7A" },
              ]}
            >
              רק מגרש אחד פעיל ביום זה: {arenasForDay[0].arenaName}
            </Text>
          ) : null}

          {day ? (
            <View style={{ marginTop: 16 }}>
              <Text
                style={[
                  styles.bubbleTextBot,
                  { fontWeight: "700", marginBottom: 8 },
                ]}
              >
                לפני התחרות / אחריה (אם רלוונטי):
              </Text>
              <OptionRow
                selected={beforeOrAfter === "before"}
                label="לפני התחרות"
                onPress={function () {
                  chatbot.setAnswer("beforeOrAfterCompetition", "before");
                }}
              />
              <OptionRow
                selected={beforeOrAfter === "after"}
                label="אחרי התחרות"
                onPress={function () {
                  chatbot.setAnswer("beforeOrAfterCompetition", "after");
                }}
              />
              <OptionRow
                selected={beforeOrAfter === null || beforeOrAfter === undefined}
                label="לא רלוונטי / לא בטוח"
                onPress={function () {
                  chatbot.setAnswer("beforeOrAfterCompetition", null);
                }}
              />
            </View>
          ) : null}
        </View>
      )}
    </StepLayout>
  );
}

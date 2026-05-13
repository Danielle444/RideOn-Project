import React, { useMemo } from "react";
import { Text, View } from "react-native";
import StepLayout from "./StepLayout";
import OptionRow from "./OptionRow";
import styles, { COLORS } from "../../../styles/paidTimeChatbotStyles";

function toDateOnlyKey(value) {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

function formatDateHebrew(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return (
    String(d.getDate()).padStart(2, "0") +
    "/" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "/" +
    d.getFullYear()
  );
}

function isCompetitionDay(dayKey, startDate, endDate) {
  if (!dayKey) return false;
  const start = toDateOnlyKey(startDate);
  const end = toDateOnlyKey(endDate);
  if (!start) return false;
  if (!end) return dayKey === start;
  return dayKey >= start && dayKey <= end;
}

function getArenasForDay(slotsByDay, day) {
  if (!day || !slotsByDay) return [];
  const seen = {};
  const slots = slotsByDay[day] || [];
  for (const s of slots) {
    const key = s.arenaRanchId + "-" + s.arenaId;
    if (!seen[key]) {
      seen[key] = { key: key, arenaName: s.arenaName };
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
  const showBeforeAfter = isCompetitionDay(
    day,
    ctx.competitionStartDate,
    ctx.competitionEndDate
  );

  const canAdvance =
    !!day &&
    (onlyOneArena || !!arenaKey) &&
    (!showBeforeAfter || beforeOrAfter === "before" || beforeOrAfter === "after");

  function handleDayPick(d) {
    chatbot.patchAnswers({
      day: d.date,
      arenaKey: null,
      beforeOrAfterCompetition: null,
    });
  }

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
          <Text
            style={[
              styles.bubbleTextBot,
              { fontWeight: "700", marginBottom: 8 },
            ]}
          >
            יום:
          </Text>
          {days.map(function (d) {
            return (
              <OptionRow
                key={"day-" + d.date}
                selected={day === d.date}
                label={formatDateHebrew(d.date)}
                onPress={function () {
                  handleDayPick(d);
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
                    selected={arenaKey === a.key}
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
                { marginTop: 16, color: COLORS.textMuted },
              ]}
            >
              רק מגרש אחד פעיל ביום זה: {arenasForDay[0].arenaName}
            </Text>
          ) : null}

          {showBeforeAfter ? (
            <View style={{ marginTop: 16 }}>
              <Text
                style={[
                  styles.bubbleTextBot,
                  { fontWeight: "700", marginBottom: 8 },
                ]}
              >
                היום הזה הוא יום תחרות - לפני או אחרי התחרות?
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
            </View>
          ) : null}
        </View>
      )}
    </StepLayout>
  );
}

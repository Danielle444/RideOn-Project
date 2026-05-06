import React, { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import StepLayout from "./StepLayout";
import ChatBubble from "./ChatBubble";
import styles, { COLORS } from "../../../styles/paidTimeChatbotStyles";

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

function buildPreview(answers, context) {
  const coachesWithHorses = context.coachesWithHorses || [];
  const selectedCoachIds = answers.selectedCoachIds || [];
  const horsesPerCoach = answers.horsesPerCoach || {};

  const lines = [];
  let totalRequests = 0;

  for (const coachId of selectedCoachIds) {
    const coach = coachesWithHorses.find(function (c) {
      return String(c.coachFederationMemberId) === String(coachId);
    });
    if (!coach) continue;

    const horseIds = horsesPerCoach[coachId] || [];
    if (horseIds.length === 0) continue;

    const horseNames = horseIds
      .map(function (hid) {
        const h = coach.horses.find(function (x) {
          return String(x.horseId) === String(hid);
        });
        if (!h) return null;
        return h.barnName ? h.horseName + " (" + h.barnName + ")" : h.horseName;
      })
      .filter(Boolean);

    lines.push({
      coachName: coach.coachName,
      horses: horseNames,
    });

    totalRequests += horseNames.length;
  }

  return { lines: lines, totalRequests: totalRequests };
}

export default function Step10_Summary(props) {
  const chatbot = props.chatbot;
  const onClose = props.onClose;
  const ctx = chatbot.state.context || {};
  const result = chatbot.state.result;
  const warnings = chatbot.state.warnings || [];
  const isSubmitting = chatbot.state.isSubmitting;
  const serverError = chatbot.state.serverError;
  const [showOverflowConfirm, setShowOverflowConfirm] = useState(false);

  const preview = useMemo(
    function () {
      return buildPreview(chatbot.state.answers, ctx);
    },
    [chatbot.state.answers, ctx]
  );

  const day = chatbot.state.answers.day;
  const arenaKey = chatbot.state.answers.arenaKey;
  const arena = (ctx.arenas || []).find(function (a) {
    return a.key === arenaKey;
  });

  async function handleSubmit() {
    setShowOverflowConfirm(false);
    await chatbot.submit({ confirmedOverflow: false });
  }

  async function handleSubmitWithOverflow() {
    setShowOverflowConfirm(false);
    await chatbot.submit({ confirmedOverflow: true });
  }

  // אם השליחה הוחזרה עם warnings (חריגת קיבולת) - מציגים אישור.
  if (warnings.length > 0 && !result) {
    return (
      <View>
        <ChatBubble
          from="bot"
          text="שים לב - חלק מהסלוטים עומדים לחרוג מהקיבולת אם נמשיך:"
        />

        {warnings.map(function (w, idx) {
          return (
            <View key={"warn-" + idx} style={styles.warningBanner}>
              <Text style={styles.warningTitle}>סלוט #{w.requestedCompSlotId}</Text>
              <Text style={styles.warningText}>
                קיבולת: {w.totalCapacityMinutes} דק' | תפוס:{" "}
                {w.usedCapacityMinutes} דק' | חדש: {w.newRequestMinutes} דק'
              </Text>
            </View>
          );
        })}

        <ChatBubble
          from="bot"
          text="אפשר להמשיך בכל זאת (השיבוץ ינסה לפזר), או לחזור ולתקן."
        />

        <View style={{ flexDirection: "row-reverse", gap: 8, marginTop: 8 }}>
          <Pressable
            style={[styles.primaryButton, { flex: 1 }]}
            onPress={handleSubmitWithOverflow}
          >
            <Text style={styles.primaryButtonText}>אישור והמשך</Text>
          </Pressable>
          <Pressable
            style={[styles.secondaryButton, { flex: 1 }]}
            onPress={chatbot.prev}
          >
            <Text style={styles.secondaryButtonText}>חזרה</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // תוצאה אחרי שליחה מוצלחת
  if (result) {
    const sched = result.scheduling;
    const totalCreated = (result.createdRequestIds || []).length;
    const scheduledCount = sched ? sched.scheduledCount : 0;
    const unscheduledCount = sched ? sched.unscheduledCount : 0;
    const unscheduledItems = sched ? sched.unscheduledItems || [] : [];

    return (
      <View>
        <ChatBubble
          from="bot"
          text={"הצלחה - נוצרו " + totalCreated + " בקשות פייד טיים."}
        />

        {sched ? (
          <View>
            <View
              style={[
                styles.answerCard,
                { borderColor: COLORS.success, borderWidth: 1 },
              ]}
            >
              <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
                <Ionicons name="checkmark-circle" size={22} color={COLORS.success} />
                <Text
                  style={[
                    styles.bubbleTextBot,
                    { fontWeight: "700", color: COLORS.success },
                  ]}
                >
                  שובצו אוטומטית: {scheduledCount}
                </Text>
              </View>
              {unscheduledCount > 0 ? (
                <View
                  style={{
                    flexDirection: "row-reverse",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 8,
                  }}
                >
                  <Ionicons name="time" size={22} color={COLORS.warning} />
                  <Text
                    style={[
                      styles.bubbleTextBot,
                      { fontWeight: "700", color: COLORS.warning },
                    ]}
                  >
                    בהמתנה לשיבוץ ידני: {unscheduledCount}
                  </Text>
                </View>
              ) : null}
            </View>

            {unscheduledItems.length > 0 ? (
              <View>
                <ChatBubble
                  from="bot"
                  text="הבקשות הבאות לא שובצו - המזכירה תטפל בהן ידנית:"
                />
                {unscheduledItems.map(function (item, idx) {
                  return (
                    <View key={"u-" + idx} style={styles.warningBanner}>
                      <Text style={styles.warningTitle}>
                        בקשה #{item.paidTimeRequestId}
                      </Text>
                      <Text style={styles.warningText}>{item.reason}</Text>
                    </View>
                  );
                })}
              </View>
            ) : null}
          </View>
        ) : (
          <ChatBubble
            from="bot"
            text="הבקשות נשמרו. השיבוץ האוטומטי לא רץ הפעם - המזכירה תטפל ידנית."
          />
        )}

        <Pressable
          style={[styles.primaryButton, { marginTop: 16 }]}
          onPress={onClose}
        >
          <Text style={styles.primaryButtonText}>סיום</Text>
        </Pressable>
      </View>
    );
  }

  // ברירת מחדל: מסך תצוגה מקדימה לפני שליחה
  return (
    <View>
      <ChatBubble
        from="bot"
        text="זהו סיכום הבקשות שלך לפני שליחה. עברתי על כל מה שבחרת."
      />

      <View style={styles.answerCard}>
        <Text style={[styles.bubbleTextBot, { fontWeight: "700", marginBottom: 8 }]}>
          פרטי כלליים:
        </Text>
        <Text style={styles.bubbleTextBot}>
          יום: {formatDateHebrew(day) || "לא נבחר"}
        </Text>
        <Text style={styles.bubbleTextBot}>
          מגרש: {arena ? arena.arenaName : "לא נבחר"}
        </Text>
        <Text
          style={[
            styles.bubbleTextBot,
            { marginTop: 6, color: COLORS.primary, fontWeight: "700" },
          ]}
        >
          סה״כ {preview.totalRequests} בקשות
        </Text>
      </View>

      <ChatBubble from="bot" text="פירוט לפי מאמן:" />

      {preview.lines.map(function (line, idx) {
        return (
          <View key={"line-" + idx} style={styles.answerCard}>
            <Text style={[styles.bubbleTextBot, { fontWeight: "700" }]}>
              {line.coachName}
            </Text>
            {line.horses.map(function (h, hi) {
              return (
                <Text
                  key={"h-" + idx + "-" + hi}
                  style={[styles.bubbleTextBot, { marginTop: 4 }]}
                >
                  • {h}
                </Text>
              );
            })}
          </View>
        );
      })}

      {serverError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{serverError}</Text>
        </View>
      ) : null}

      <ChatBubble
        from="bot"
        text="שים לב: זו הערכה לפי הנתונים שבחרת. השיבוץ האמיתי ייעשה אוטומטית מיד אחרי השליחה."
      />

      <View style={{ flexDirection: "row-reverse", gap: 8, marginTop: 8 }}>
        <Pressable
          style={[
            styles.primaryButton,
            { flex: 1 },
            isSubmitting || preview.totalRequests === 0
              ? styles.primaryButtonDisabled
              : null,
          ]}
          disabled={isSubmitting || preview.totalRequests === 0}
          onPress={handleSubmit}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>שלח בקשות</Text>
          )}
        </Pressable>
        <Pressable
          style={[styles.secondaryButton, { flex: 1 }]}
          onPress={chatbot.prev}
          disabled={isSubmitting}
        >
          <Text style={styles.secondaryButtonText}>חזרה</Text>
        </Pressable>
      </View>
    </View>
  );
}

import React, { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import StepLayout from "./StepLayout";
import ChatBubble from "./ChatBubble";
import CoachAccordion from "./CoachAccordion";
import styles, { COLORS } from "../../../styles/paidTimeChatbotStyles";

function pad2(n) {
  return String(n).padStart(2, "0");
}

function fmtTimeFromMinutes(min) {
  if (min == null) return null;
  return pad2(Math.floor(min / 60)) + ":" + pad2(min % 60);
}

function fmtIsoToTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return pad2(d.getHours()) + ":" + pad2(d.getMinutes());
}

function fmtDateHebrew(value) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return (
    pad2(d.getDate()) +
    "/" +
    pad2(d.getMonth() + 1) +
    "/" +
    d.getFullYear()
  );
}

function formatHorseLabel(horse) {
  if (!horse) return "סוס";
  const name = horse.horseName || "סוס";
  const barn = horse.barnName || "";
  return barn ? name + " (" + barn + ")" : name;
}

function buildHorseLookup(coachesWithHorses) {
  const out = {};
  for (const c of coachesWithHorses || []) {
    for (const h of c.horses || []) {
      out[h.horseId] = h;
    }
  }
  return out;
}

function buildCoachLookup(coachesWithHorses) {
  const out = {};
  for (const c of coachesWithHorses || []) {
    out[c.coachFederationMemberId] = c;
  }
  return out;
}

function buildOrderedHorses(coach, horsesPerCoach, trainingOrder) {
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
    const ordered = order.map(function (id) {
      return byId[id];
    }).filter(Boolean);
    if (ordered.length === selected.length) return ordered;
  }
  return selected;
}

function describeTimePref(pref) {
  if (!pref) return null;
  const e = fmtTimeFromMinutes(pref.earliestMinutes);
  const l = fmtTimeFromMinutes(pref.latestMinutes);
  if (e && l) return e + " - " + l;
  if (e) return "מ-" + e + " והלאה";
  if (l) return "עד " + l;
  return null;
}

function describeSpacing(pair, spacing) {
  const minSpacingList = (spacing && spacing.minSpacing) || [];
  const found = minSpacingList.find(function (p) {
    return (
      (String(p.horseA) === String(pair.a.horseId) &&
        String(p.horseB) === String(pair.b.horseId)) ||
      (String(p.horseA) === String(pair.b.horseId) &&
        String(p.horseB) === String(pair.a.horseId))
    );
  });
  if (!found) return "לא משנה";
  const m = found.minutes;
  if (m === 0) return "לא משנה";
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (h > 0 && mm > 0) return "לפחות " + h + "ש' " + mm + " דק'";
  if (h > 0) return "לפחות " + h + " שעות";
  return "לפחות " + mm + " דק'";
}

export default function Step10_Summary(props) {
  const chatbot = props.chatbot;
  const onClose = props.onClose;
  const ctx = chatbot.state.context || {};
  const answers = chatbot.state.answers;
  const result = chatbot.state.result;
  const warnings = chatbot.state.warnings || [];
  const isSubmitting = chatbot.state.isSubmitting;
  const serverError = chatbot.state.serverError;

  const coachesWithHorses = ctx.coachesWithHorses || [];
  const horseLookup = useMemo(
    function () {
      return buildHorseLookup(coachesWithHorses);
    },
    [coachesWithHorses]
  );
  const coachLookup = useMemo(
    function () {
      return buildCoachLookup(coachesWithHorses);
    },
    [coachesWithHorses]
  );

  const selectedCoaches = useMemo(
    function () {
      const ids = (answers.selectedCoachIds || []).map(String);
      return coachesWithHorses.filter(function (c) {
        return ids.includes(String(c.coachFederationMemberId));
      });
    },
    [answers.selectedCoachIds, coachesWithHorses]
  );

  const totalRequests = useMemo(
    function () {
      let sum = 0;
      for (const coach of selectedCoaches) {
        const hids = answers.horsesPerCoach[coach.coachFederationMemberId] || [];
        sum += hids.length;
      }
      return sum;
    },
    [selectedCoaches, answers.horsesPerCoach]
  );

  const arenaName = useMemo(
    function () {
      const a = (ctx.arenas || []).find(function (x) {
        return x.key === answers.arenaKey;
      });
      return a ? a.arenaName : "";
    },
    [ctx.arenas, answers.arenaKey]
  );

  async function handleSubmit() {
    await chatbot.submit({ confirmedOverflow: false });
  }

  async function handleSubmitWithOverflow() {
    await chatbot.submit({ confirmedOverflow: true });
  }

  // -------- WARNINGS GATE (capacity overflow) --------
  if (warnings.length > 0 && !result) {
    return (
      <View>
        <ChatBubble
          from="bot"
          text="שים לב - חלק מהסלוטים עומדים לחרוג מהקיבולת:"
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
          text="אפשר להמשיך בכל זאת, או לחזור ולתקן."
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

  // -------- SUCCESS RESULT --------
  if (result) {
    return (
      <SuccessResult
        result={result}
        coachLookup={coachLookup}
        horseLookup={horseLookup}
        onNewBooking={chatbot.restart}
        onClose={onClose}
      />
    );
  }

  // -------- PRE-SUBMIT REVIEW --------
  return (
    <View>
      <ChatBubble
        from="bot"
        text="סיכום הבקשות לפני שליחה. עברתי על כל מה שבחרת."
      />

      <View style={styles.answerCard}>
        <Text style={[styles.bubbleTextBot, { fontWeight: "700", marginBottom: 6 }]}>
          פרטים כלליים:
        </Text>
        <Text style={styles.bubbleTextBot}>
          יום: {fmtDateHebrew(answers.day)}
        </Text>
        <Text style={styles.bubbleTextBot}>
          מגרש: {arenaName || "—"}
        </Text>
        {answers.beforeOrAfterCompetition ? (
          <Text style={styles.bubbleTextBot}>
            יחס לתחרות:{" "}
            {answers.beforeOrAfterCompetition === "before"
              ? "לפני התחרות"
              : "אחרי התחרות"}
          </Text>
        ) : null}
        <Text
          style={[
            styles.bubbleTextBot,
            { marginTop: 6, color: COLORS.primary, fontWeight: "700" },
          ]}
        >
          סה״כ {totalRequests} בקשות
        </Text>
      </View>

      <ChatBubble from="bot" text="פירוט מלא לפי מאמן:" />

      {selectedCoaches.map(function (coach) {
        return (
          <CoachReviewCard
            key={"rev-" + coach.coachFederationMemberId}
            coach={coach}
            answers={answers}
          />
        );
      })}

      {serverError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{String(serverError)}</Text>
        </View>
      ) : null}

      <ChatBubble
        from="bot"
        text="שים לב: זו הערכה. השיבוץ האמיתי ייעשה אוטומטית מיד אחרי השליחה."
      />

      <View style={{ flexDirection: "row-reverse", gap: 8, marginTop: 8 }}>
        <Pressable
          style={[
            styles.primaryButton,
            { flex: 1 },
            isSubmitting || totalRequests === 0
              ? styles.primaryButtonDisabled
              : null,
          ]}
          disabled={isSubmitting || totalRequests === 0}
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

function CoachReviewCard(props) {
  const coach = props.coach;
  const answers = props.answers;
  const coachId = coach.coachFederationMemberId;

  const orderedHorses = buildOrderedHorses(
    coach,
    answers.horsesPerCoach || {},
    answers.trainingOrder || {}
  );

  if (orderedHorses.length === 0) return null;

  const pref = (answers.timePreferences?.coachLevel || {})[coachId];
  const constraint = (answers.timeConstraints?.coachLevel || {})[coachId];
  const prefStr = describeTimePref(pref);
  const constraintStr = describeTimePref(constraint);

  // build consecutive pairs for spacing
  const spacingPairs = [];
  for (let i = 0; i < orderedHorses.length - 1; i++) {
    spacingPairs.push({
      a: orderedHorses[i],
      b: orderedHorses[i + 1],
    });
  }

  return (
    <CoachAccordion
      title={coach.coachName}
      subtitle={orderedHorses.length + " סוסים"}
      defaultOpen={false}
    >
      <Text style={[styles.bubbleTextBot, { fontWeight: "700", marginBottom: 4 }]}>
        סוסים (לפי סדר אימון):
      </Text>
      {orderedHorses.map(function (h, idx) {
        const length = (answers.shortLong || {})[h.horseId] || "short";
        const lengthLabel = length === "short" ? "קצר 8 דק'" : "ארוך 11 דק'";
        return (
          <Text
            key={"h-" + h.horseId}
            style={[styles.bubbleTextBot, { marginBottom: 2 }]}
          >
            {idx + 1}. {formatHorseLabel(h)} — {lengthLabel}
          </Text>
        );
      })}

      {prefStr ? (
        <View style={{ marginTop: 8 }}>
          <Text style={[styles.bubbleTextBot, { fontWeight: "700" }]}>
            העדפת זמן: {prefStr}
          </Text>
        </View>
      ) : null}

      {constraintStr ? (
        <View style={{ marginTop: 4 }}>
          <Text
            style={[
              styles.bubbleTextBot,
              { fontWeight: "700", color: COLORS.danger },
            ]}
          >
            אילוץ זמן: {constraintStr}
          </Text>
        </View>
      ) : null}

      {spacingPairs.length > 0 ? (
        <View style={{ marginTop: 8 }}>
          <Text style={[styles.bubbleTextBot, { fontWeight: "700", marginBottom: 4 }]}>
            מרווחים:
          </Text>
          {spacingPairs.map(function (pair, idx) {
            return (
              <Text
                key={"sp-" + idx}
                style={[styles.bubbleTextBot, { fontSize: 13, marginBottom: 2 }]}
              >
                • {pair.a.horseName} ← {pair.b.horseName}:{" "}
                {describeSpacing(pair, answers.spacing)}
              </Text>
            );
          })}
        </View>
      ) : null}
    </CoachAccordion>
  );
}

function SuccessResult(props) {
  const result = props.result;
  const coachLookup = props.coachLookup;
  const horseLookup = props.horseLookup;
  const sched = result.scheduling;
  const totalCreated = (result.createdRequestIds || []).length;
  const scheduledItems = sched ? sched.scheduledItems || [] : [];
  const unscheduledItems = sched ? sched.unscheduledItems || [] : [];

  // group scheduled by coach
  const byCoach = {};
  for (const item of scheduledItems) {
    const cid = item.coachFederationMemberId;
    if (!byCoach[cid]) byCoach[cid] = [];
    byCoach[cid].push(item);
  }

  return (
    <View>
      <ChatBubble
        from="bot"
        text={"הצלחה - נוצרו " + totalCreated + " בקשות פייד טיים."}
      />

      <View
        style={[
          styles.answerCard,
          {
            borderColor: COLORS.success,
            borderWidth: 1,
            backgroundColor: "#F0F7EE",
          },
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
            שובצו אוטומטית: {scheduledItems.length}
          </Text>
        </View>
        {unscheduledItems.length > 0 ? (
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
              בהמתנה: {unscheduledItems.length}
            </Text>
          </View>
        ) : null}
      </View>

      {scheduledItems.length > 0 ? (
        <View>
          <ChatBubble from="bot" text="פירוט שיבוצים שבוצעו:" />
          {Object.keys(byCoach).map(function (cid) {
            const coach = coachLookup[cid];
            const items = byCoach[cid].slice().sort(function (a, b) {
              return new Date(a.assignedStartTime) - new Date(b.assignedStartTime);
            });
            const coachName = coach ? coach.coachName : "מאמן";
            return (
              <View key={"sched-c-" + cid} style={styles.answerCard}>
                <Text style={[styles.bubbleTextBot, { fontWeight: "700" }]}>
                  {coachName}
                </Text>
                {items.map(function (it) {
                  const horse = horseLookup[it.horseId];
                  const horseLabel = horse ? formatHorseLabel(horse) : "סוס #" + it.horseId;
                  return (
                    <Text
                      key={"item-" + it.paidTimeRequestId}
                      style={[styles.bubbleTextBot, { marginTop: 4 }]}
                    >
                      • {horseLabel} — {fmtIsoToTime(it.assignedStartTime)}
                    </Text>
                  );
                })}
              </View>
            );
          })}
        </View>
      ) : null}

      {unscheduledItems.length > 0 ? (
        <View>
          <ChatBubble
            from="bot"
            text="בקשות שלא שובצו - המזכירה תטפל ידנית:"
          />
          {unscheduledItems.map(function (item, idx) {
            const horse = horseLookup[item.horseId];
            const coach = coachLookup[item.coachFederationMemberId];
            return (
              <View key={"u-" + idx} style={styles.warningBanner}>
                <Text style={styles.warningTitle}>
                  {horse ? formatHorseLabel(horse) : "בקשה #" + item.paidTimeRequestId}
                  {coach ? " (" + coach.coachName + ")" : ""}
                </Text>
                <Text style={styles.warningText}>{item.reason}</Text>
              </View>
            );
          })}
        </View>
      ) : null}

      <View style={{ flexDirection: "row-reverse", gap: 8, marginTop: 16 }}>
        <Pressable
          style={[styles.primaryButton, { flex: 1 }]}
          onPress={props.onNewBooking}
        >
          <Text style={styles.primaryButtonText}>הזמנה חכמה נוספת</Text>
        </Pressable>
        <Pressable
          style={[styles.secondaryButton, { flex: 1 }]}
          onPress={props.onClose}
        >
          <Text style={styles.secondaryButtonText}>סיום</Text>
        </Pressable>
      </View>
    </View>
  );
}

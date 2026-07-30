import React, { useMemo } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CoachAccordion from "./CoachAccordion";
import styles, { COLORS } from "../../../styles/paidTimeChatbotStyles";
import {
  buildBulkReviewModel,
  formatHorseLabel,
} from "../../../utils/paidTimeBulkReview";

function pad2(n) {
  return String(n).padStart(2, "0");
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
  return pad2(d.getDate()) + "/" + pad2(d.getMonth() + 1) + "/" + d.getFullYear();
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

function DetailRow(props) {
  if (!props.value) return null;

  return (
    <View style={styles.requestDetailRow}>
      <Text style={styles.requestDetailLabel}>{props.label}</Text>
      <Text style={styles.requestDetailValue}>{props.value}</Text>
    </View>
  );
}

function StatusBadge(props) {
  const ok = !!props.isIncluded;

  return (
    <View
      style={[
        styles.statusBadge,
        ok ? styles.statusBadgeOk : styles.statusBadgeBlocked,
      ]}
    >
      <Text
        style={[
          styles.statusBadgeText,
          ok ? styles.statusBadgeTextOk : styles.statusBadgeTextBlocked,
        ]}
      >
        {ok ? "תישלח" : "לא תישלח"}
      </Text>
    </View>
  );
}

// כרטיס בקשה אחת בסקירה הסופית: סוס, רוכב, משלם, סלוט, סוג, משך ומחיר.
// כשהבקשה לא תיווצר, מוצג בדיוק מה חסר לה - במקום שהיא פשוט תיעלם מהספירה.
function RequestCard(props) {
  const horse = props.horse;

  return (
    <View
      style={[
        styles.requestCard,
        !horse.isIncluded ? styles.requestCardExcluded : null,
      ]}
    >
      <View style={styles.requestCardTopRow}>
        <Text style={styles.requestHorseName}>{horse.horseLabel}</Text>
        {horse.isIncluded && horse.priceLabel ? (
          <Text style={styles.requestPrice}>{horse.priceLabel}</Text>
        ) : (
          <StatusBadge isIncluded={horse.isIncluded} />
        )}
      </View>

      <DetailRow label="רוכב" value={horse.riderName} />
      <DetailRow label="משלם" value={horse.payerName} />
      <DetailRow label="סלוט" value={horse.slotLabel} />
      <DetailRow
        label="סוג"
        value={[horse.typeName, horse.durationLabel].filter(Boolean).join(" · ")}
      />
      <DetailRow label="הערות" value={horse.notes} />

      {!horse.isIncluded && horse.missingReasons.length > 0 ? (
        <View style={styles.warningBanner}>
          <Text style={styles.warningTitle}>הבקשה לא תישלח</Text>
          <Text style={styles.warningText}>
            חסר: {horse.missingReasons.join(", ")}.
          </Text>
        </View>
      ) : null}
    </View>
  );
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

  const model = useMemo(
    function () {
      return buildBulkReviewModel({
        answers: answers,
        context: ctx,
        items: chatbot.items,
      });
    },
    [answers, ctx, chatbot.items]
  );

  async function handleSubmit() {
    if (isSubmitting) return;
    await chatbot.submit({ confirmedOverflow: false });
  }

  async function handleSubmitWithOverflow() {
    if (isSubmitting) return;
    await chatbot.submit({ confirmedOverflow: true });
  }

  // ---------------- אישור חריגת קיבולת (אזהרה שניתן לאשר) ----------------
  if (warnings.length > 0 && !result) {
    return (
      <View>
        <Text style={styles.sectionHeading}>נדרש אישור לפני שליחה</Text>
        <Text style={styles.sectionHelp}>
          אין מספיק מקום בסלוט/ים הבאים, גם אם הסלוט ריק לגמרי.
        </Text>

        {warnings.map(function (w, idx) {
          const over =
            (w.newRequestMinutes || 0) - (w.totalCapacityMinutes || 0);

          return (
            <View key={"warn-" + idx} style={styles.warningBanner}>
              <Text style={styles.warningTitle}>
                סלוט #{w.requestedCompSlotId}
              </Text>
              <Text style={styles.warningText}>
                קיבולת הסלוט: {w.totalCapacityMinutes} דק׳. הבקשות שביקשת
                מצטברות ל-{w.newRequestMinutes} דק׳ (חריגה של {over} דק׳).
              </Text>
              <Text style={[styles.warningText, { marginTop: 4 }]}>
                חלק מהבקשות לא ישובצו אוטומטית ויעברו לטיפול ידני של המזכירה.
              </Text>
            </View>
          );
        })}

        <View style={styles.infoNote}>
          <Text style={styles.infoNoteText}>
            אפשר לאשר ולהמשיך (חלק מהבקשות יעברו לשיבוץ ידני), או לחזור ולהוריד
            סוסים / לבחור סלוט אחר.
          </Text>
        </View>

        {serverError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{String(serverError)}</Text>
          </View>
        ) : null}

        <View style={{ flexDirection: "row-reverse", gap: 10, marginTop: 8 }}>
          <Pressable
            style={[
              styles.bottomBarButton,
              styles.bottomBarPrimary,
              isSubmitting ? styles.bottomBarPrimaryDisabled : null,
            ]}
            disabled={isSubmitting}
            onPress={handleSubmitWithOverflow}
            accessibilityRole="button"
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.bottomBarPrimaryText}>אישור ושליחה</Text>
            )}
          </Pressable>

          <Pressable
            style={[styles.bottomBarButton, styles.bottomBarSecondary]}
            disabled={isSubmitting}
            onPress={chatbot.prev}
            accessibilityRole="button"
          >
            <Text style={styles.bottomBarSecondaryText}>חזרה לעריכה</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ------------------------------ הצלחה ------------------------------
  if (result) {
    return (
      <SuccessResult
        result={result}
        model={model}
        coachLookup={coachLookup}
        horseLookup={horseLookup}
        onNewBooking={chatbot.restart}
        onClose={onClose}
      />
    );
  }

  // --------------------------- סקירה לפני שליחה ---------------------------
  const canSubmit = !isSubmitting && model.requestCount > 0;

  return (
    <View>
      <Text style={styles.sectionHeading}>סיכום ההזמנה המרוכזת</Text>
      <Text style={styles.sectionHelp}>
        אלו הבקשות שייווצרו. עברי עליהן לפני השליחה.
      </Text>

      <View style={styles.totalsCard}>
        <View style={styles.totalsRow}>
          <Text style={styles.totalsLabel}>יום</Text>
          <Text style={styles.totalsValue}>
            {fmtDateHebrew(model.dayLabel) || "—"}
          </Text>
        </View>

        <View style={styles.totalsRow}>
          <Text style={styles.totalsLabel}>מגרש</Text>
          <Text style={styles.totalsValue}>{model.arenaName || "—"}</Text>
        </View>

        {answers.beforeOrAfterCompetition ? (
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>יחס לתחרות</Text>
            <Text style={styles.totalsValue}>
              {answers.beforeOrAfterCompetition === "before"
                ? "לפני התחרות"
                : "אחרי התחרות"}
            </Text>
          </View>
        ) : null}

        <View style={styles.totalsRow}>
          <Text style={styles.totalsLabel}>סה״כ בקשות</Text>
          <Text style={styles.totalsValueStrong}>{model.requestCount}</Text>
        </View>

        {model.totalPriceLabel ? (
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>סה״כ לתשלום</Text>
            <Text style={styles.totalsValueStrong}>
              {model.totalPriceLabel}
            </Text>
          </View>
        ) : null}
      </View>

      {model.excludedCount > 0 ? (
        <View style={styles.warningBanner}>
          <Text style={styles.warningTitle}>
            {model.excludedCount} סוסים שנבחרו לא יישלחו
          </Text>
          <Text style={styles.warningText}>
            חסרים להם פרטים. הם מסומנים בפירוט למטה, ואפשר לחזור ולתקן.
          </Text>
        </View>
      ) : null}

      {model.coaches.map(function (coach) {
        return (
          <CoachAccordion
            key={"rev-" + coach.coachId}
            title={coach.coachName}
            subtitle={
              coach.includedCount +
              " בקשות" +
              (coach.excludedCount > 0
                ? " · " + coach.excludedCount + " לא יישלחו"
                : "")
            }
            defaultOpen={true}
          >
            {coach.horses.map(function (horse) {
              return (
                <RequestCard key={"req-" + horse.horseId} horse={horse} />
              );
            })}
          </CoachAccordion>
        );
      })}

      {serverError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{String(serverError)}</Text>
        </View>
      ) : null}

      <View style={styles.infoNote}>
        <Text style={styles.infoNoteText}>
          השיבוץ בפועל מתבצע אוטומטית מיד אחרי השליחה. השעות המדויקות ייקבעו אז.
        </Text>
      </View>

      <View style={{ flexDirection: "row-reverse", gap: 10, marginTop: 8 }}>
        <Pressable
          style={[
            styles.bottomBarButton,
            styles.bottomBarPrimary,
            !canSubmit ? styles.bottomBarPrimaryDisabled : null,
          ]}
          disabled={!canSubmit}
          onPress={handleSubmit}
          accessibilityRole="button"
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.bottomBarPrimaryText}>שליחת כל הבקשות</Text>
          )}
        </Pressable>

        <Pressable
          style={[styles.bottomBarButton, styles.bottomBarSecondary]}
          onPress={chatbot.prev}
          disabled={isSubmitting}
          accessibilityRole="button"
        >
          <Text style={styles.bottomBarSecondaryText}>חזרה לעריכה</Text>
        </Pressable>
      </View>
    </View>
  );
}

function SuccessResult(props) {
  const result = props.result;
  const model = props.model;
  const coachLookup = props.coachLookup;
  const horseLookup = props.horseLookup;
  const sched = result.scheduling;
  const totalCreated = (result.createdRequestIds || []).length;
  const scheduledItems = sched ? sched.scheduledItems || [] : [];
  const unscheduledItems = sched ? sched.unscheduledItems || [] : [];

  const byCoach = {};
  for (const item of scheduledItems) {
    const cid = item.coachFederationMemberId;
    if (!byCoach[cid]) byCoach[cid] = [];
    byCoach[cid].push(item);
  }

  const coachNames = model.coaches
    .map(function (coach) {
      return coach.coachName;
    })
    .join(", ");

  return (
    <View>
      <View style={styles.successIconWrap}>
        <Ionicons name="checkmark-circle" size={36} color={COLORS.success} />
      </View>

      <Text style={styles.successTitle}>
        נוצרו {totalCreated} בקשות פייד טיים
      </Text>
      <Text style={styles.successSubtitle}>
        ההזמנה המרוכזת נשלחה בהצלחה.
      </Text>

      <View style={styles.totalsCard}>
        {coachNames ? (
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>מאמן</Text>
            <Text style={styles.totalsValue}>{coachNames}</Text>
          </View>
        ) : null}

        <View style={styles.totalsRow}>
          <Text style={styles.totalsLabel}>בקשות שנוצרו</Text>
          <Text style={styles.totalsValueStrong}>{totalCreated}</Text>
        </View>

        <View style={styles.totalsRow}>
          <Text style={styles.totalsLabel}>שובצו אוטומטית</Text>
          <Text style={styles.totalsValue}>{scheduledItems.length}</Text>
        </View>

        {unscheduledItems.length > 0 ? (
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>ממתינות לשיבוץ ידני</Text>
            <Text style={styles.totalsValue}>{unscheduledItems.length}</Text>
          </View>
        ) : null}

        {model.totalPriceLabel ? (
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>סה״כ לתשלום</Text>
            <Text style={styles.totalsValueStrong}>
              {model.totalPriceLabel}
            </Text>
          </View>
        ) : null}
      </View>

      {scheduledItems.length > 0 ? (
        <View>
          <Text style={styles.sectionHeading}>שיבוצים שבוצעו</Text>
          {Object.keys(byCoach).map(function (cid) {
            const coach = coachLookup[cid];
            const items = byCoach[cid].slice().sort(function (a, b) {
              return (
                new Date(a.assignedStartTime) - new Date(b.assignedStartTime)
              );
            });

            return (
              <View key={"sched-c-" + cid} style={styles.requestCard}>
                <Text style={styles.requestHorseName}>
                  {coach ? coach.coachName : "מאמן"}
                </Text>
                {items.map(function (it) {
                  const horse = horseLookup[it.horseId];
                  return (
                    <DetailRow
                      key={"item-" + it.paidTimeRequestId}
                      label={fmtIsoToTime(it.assignedStartTime)}
                      value={
                        horse
                          ? formatHorseLabel(horse)
                          : "סוס #" + it.horseId
                      }
                    />
                  );
                })}
              </View>
            );
          })}
        </View>
      ) : null}

      {unscheduledItems.length > 0 ? (
        <View>
          <Text style={styles.sectionHeading}>ממתינות לטיפול המזכירה</Text>
          {unscheduledItems.map(function (item, idx) {
            const horse = horseLookup[item.horseId];
            const coach = coachLookup[item.coachFederationMemberId];

            return (
              <View key={"u-" + idx} style={styles.warningBanner}>
                <Text style={styles.warningTitle}>
                  {horse
                    ? formatHorseLabel(horse)
                    : "בקשה #" + item.paidTimeRequestId}
                  {coach ? " (" + coach.coachName + ")" : ""}
                </Text>
                <Text style={styles.warningText}>{item.reason}</Text>
              </View>
            );
          })}
        </View>
      ) : null}

      <View style={{ flexDirection: "row-reverse", gap: 10, marginTop: 16 }}>
        <Pressable
          style={[styles.bottomBarButton, styles.bottomBarPrimary]}
          onPress={props.onNewBooking}
          accessibilityRole="button"
        >
          <Text style={styles.bottomBarPrimaryText}>הזמנה מרוכזת נוספת</Text>
        </Pressable>

        <Pressable
          style={[styles.bottomBarButton, styles.bottomBarSecondary]}
          onPress={props.onClose}
          accessibilityRole="button"
        >
          <Text style={styles.bottomBarSecondaryText}>סיום</Text>
        </Pressable>
      </View>
    </View>
  );
}

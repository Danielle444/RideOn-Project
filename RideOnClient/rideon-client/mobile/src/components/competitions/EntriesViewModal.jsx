import React, { useEffect, useMemo, useState } from "react";

import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { getCompetitionEntriesView } from "../../services/entriesService";
import { groupClassesByDay } from "../../utils/entriesViewGrouping";
import {
  computeClassDrawState,
  isCancelledAfterStartRow,
} from "../../utils/entriesDrawState";

function fmtDate(value) {
  if (!value) return "";
  var d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("he-IL", {
    weekday: "short",
    day: "numeric",
    month: "numeric",
  });
}

// Day-band heading only (CAP-1) - the native he-IL formatter joins weekday
// and date with ", " (e.g. "יום ד׳, 12.8"); this screen's day band wants
// "יום ד׳ • 12.8" instead. A local display-only transform on top of fmtDate,
// not a change to fmtDate itself or any shared formatter, so nothing else
// that calls fmtDate (or date formatting elsewhere in the app) is affected.
function fmtDayBandHeading(value) {
  return fmtDate(value).replace(", ", " • ");
}

// Modal צפייה בסדר כניסות. read-only.
// אם focusClassInCompId מסופק - מציג רק את המקצה ההוא.
// אחרת מציג את כל המקצים, מקובצים ומסודרים לפי תאריך/שעה/drawOrder, ומקובצים
// שוב לרצועות יום (CAP-1) - הקיבוץ/מיון המקורי לפי מקצה לא השתנה, רק נעטף
// ברצועות יום, ראו entriesViewGrouping.js.
export default function EntriesViewModal(props) {
  var isOpen = !!props.isOpen;
  var competitionId = props.competitionId;
  var ranchId = props.ranchId;
  var focusClassInCompId = props.focusClassInCompId || null;

  var [loading, setLoading] = useState(false);
  var [error, setError] = useState(null);
  var [items, setItems] = useState([]);

  useEffect(
    function () {
      if (!isOpen) return;

      var cancelled = false;
      setLoading(true);
      setError(null);
      setItems([]);

      async function load() {
        try {
          var res = await getCompetitionEntriesView(competitionId, ranchId);
          if (cancelled) return;
          setItems(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
          if (!cancelled) {
            console.log("ENTRIES VIEW LOAD ERROR", err);
            setError(
              String(err?.response?.data || err?.message || "טעינה נכשלה"),
            );
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      }

      load();
      return function () {
        cancelled = true;
      };
    },
    [isOpen, competitionId, ranchId],
  );

  var groups = useMemo(
    function () {
      var filtered = focusClassInCompId
        ? items.filter(function (it) {
            return Number(it.classInCompId) === Number(focusClassInCompId);
          })
        : items;

      var byClass = {};
      filtered.forEach(function (it) {
        var key = it.classInCompId;
        if (!byClass[key]) {
          byClass[key] = {
            classInCompId: key,
            className: it.className,
            classDate: it.classDate,
            startTime: it.startTime,
            orderInDay: it.orderInDay,
            items: [],
          };
        }
        byClass[key].items.push(it);
      });

      var groupList = Object.values(byClass);

      groupList.forEach(function (g) {
        g.items.sort(function (a, b) {
          var ao = a.drawOrder == null ? 9999 : a.drawOrder;
          var bo = b.drawOrder == null ? 9999 : b.drawOrder;
          return ao - bo;
        });
      });

      groupList.sort(function (a, b) {
        var aDate = a.classDate ? new Date(a.classDate).getTime() : 0;
        var bDate = b.classDate ? new Date(b.classDate).getTime() : 0;
        if (aDate !== bDate) return aDate - bDate;
        var aOrder = a.orderInDay || 0;
        var bOrder = b.orderInDay || 0;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return String(a.startTime || "").localeCompare(
          String(b.startTime || ""),
        );
      });

      return groupList;
    },
    [items, focusClassInCompId],
  );

  // CAP-1: purely re-nests the already-sorted class groups above into day
  // bands - never re-sorts, so the existing fetch/sort semantics are
  // unchanged. See entriesViewGrouping.js.
  var dayGroups = useMemo(
    function () {
      return groupClassesByDay(groups);
    },
    [groups],
  );

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={props.onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.4)",
          justifyContent: "center",
          padding: 12,
        }}
      >
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 14,
            padding: 14,
            maxHeight: "92%",
          }}
        >
          <View
            style={{
              flexDirection: "row-reverse",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <Text
              style={{
                fontSize: 17,
                fontWeight: "700",
                color: "#3F312B",
                textAlign: "right",
              }}
            >
              {focusClassInCompId ? "סדר כניסות במקצה" : "סדר כניסות בתחרות"}
            </Text>
            <Pressable onPress={props.onClose} hitSlop={8}>
              <Text style={{ fontSize: 22, color: "#7B5A4D" }}>×</Text>
            </Pressable>
          </View>

          {loading ? (
            <View style={{ paddingVertical: 24, alignItems: "center" }}>
              <ActivityIndicator size="large" color="#7B5A4D" />
              <Text style={{ marginTop: 8, color: "#8D6E63" }}>
                טוען הרשמות...
              </Text>
            </View>
          ) : error ? (
            <Text
              style={{
                color: "#B45454",
                fontSize: 13,
                textAlign: "right",
                marginVertical: 12,
              }}
            >
              {error}
            </Text>
          ) : dayGroups.length === 0 ? (
            <Text
              style={{
                color: "#8D6E63",
                fontSize: 13,
                textAlign: "right",
                marginVertical: 12,
              }}
            >
              אין הרשמות להצגה.
            </Text>
          ) : (
            <ScrollView style={{ maxHeight: 540 }}>
              {dayGroups.map(function (day, dayIndex) {
                return (
                  <View
                    key={"day-" + day.dayKey}
                    style={{ marginTop: dayIndex === 0 ? 0 : 14 }}
                  >
                    <View
                      style={{
                        backgroundColor: "#7B5A4D",
                        borderRadius: 8,
                        paddingVertical: 6,
                        paddingHorizontal: 10,
                        marginBottom: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "800",
                          color: "#FFFFFF",
                          textAlign: "right",
                        }}
                      >
                        {fmtDayBandHeading(day.classDate)}
                      </Text>
                    </View>

                    {day.classes.map(function (g) {
                      return (
                        <ClassGroup
                          key={"class-" + g.classInCompId}
                          group={g}
                          ranchId={ranchId}
                        />
                      );
                    })}
                  </View>
                );
              })}
            </ScrollView>
          )}

          <Pressable
            onPress={props.onClose}
            style={{
              marginTop: 12,
              paddingVertical: 10,
              borderRadius: 8,
              backgroundColor: "#7B5A4D",
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>סגור</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function ClassGroup(props) {
  var g = props.group;
  var ranchId = props.ranchId;

  // CAP-2: computed once per class, not per row - the "not drawn" note
  // renders once for the whole class, and every row's draw badge depends on
  // the same isDrawn verdict.
  var drawState = computeClassDrawState(g.items);

  return (
    <View
      style={{
        marginBottom: 14,
        borderWidth: 1,
        borderColor: "#EFE5DF",
        borderRadius: 10,
        backgroundColor: "#FFFDFB",
        padding: 10,
      }}
    >
      <Text
        style={{
          fontSize: 15,
          fontWeight: "700",
          color: "#3F312B",
          textAlign: "right",
          marginBottom: g.items.length > 0 && !drawState.isDrawn ? 2 : 8,
        }}
      >
        {g.className || "מקצה"}
      </Text>

      {g.items.length > 0 && !drawState.isDrawn ? (
        <Text
          style={{
            fontSize: 11,
            fontStyle: "italic",
            color: "#8D6E63",
            textAlign: "right",
            marginBottom: 6,
          }}
        >
          ההגרלה לא סופית ומועדת לשינויים
        </Text>
      ) : null}

      {g.items.length === 0 ? (
        <Text style={{ color: "#8D6E63", fontSize: 12, textAlign: "right" }}>
          אין הרשמות במקצה זה
        </Text>
      ) : (
        g.items.map(function (it) {
          return (
            <EntryRow
              key={"entry-" + it.entryId}
              item={it}
              ranchId={ranchId}
              isDrawn={drawState.isDrawn}
            />
          );
        })
      )}
    </View>
  );
}

function EntryRow(props) {
  var it = props.item;
  var ranchId = props.ranchId;
  var isDrawn = props.isDrawn;

  var isMine = Number(it.horseRanchId) === Number(ranchId);
  var isCancelledAfterStart = isCancelledAfterStartRow(it);

  // CAP-1: horse / רוכב/ת / optional מאמן/ת all share this one style, so
  // they render at equal bold weight on the primary row.
  var primaryTextStyle = {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "right",
    color: isCancelledAfterStart ? "#8A7A6E" : "#3F312B",
    textDecorationLine: isCancelledAfterStart ? "line-through" : "none",
  };

  return (
    <View
      style={[
        {
          flexDirection: "row-reverse",
          alignItems: "center",
          gap: 8,
          paddingVertical: 8,
          borderTopWidth: 1,
          borderTopColor: "#F3EAE4",
        },
        // CAP-3: own-ranch rows stay full-strength; other-ranch rows are
        // visibly muted (opacity only - no hiding, no replacement label).
        !isMine ? { opacity: 0.55 } : null,
      ]}
    >
      {isDrawn ? (
        <View
          style={{
            minWidth: 26,
            height: 22,
            paddingHorizontal: 6,
            borderRadius: 11,
            borderWidth: 1,
            borderColor: "#D9CFC2",
            backgroundColor: "#FFFFFF",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: "700", color: "#7B5A4D" }}>
            {it.drawOrder}
          </Text>
        </View>
      ) : null}

      <View style={{ flex: 1 }}>
        <View
          style={{
            flexDirection: "row-reverse",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
          }}
        >
          <Text style={primaryTextStyle}>
            {it.horseName}
            {it.barnName ? " (" + it.barnName + ")" : ""}
          </Text>

          <Text style={primaryTextStyle}>• רוכב/ת: {it.riderName}</Text>

          {it.coachName ? (
            <Text style={primaryTextStyle}>• מאמן/ת: {it.coachName}</Text>
          ) : null}

          {isCancelledAfterStart ? (
            <View
              style={{
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 8,
                backgroundColor: "#EFE4DD",
                borderWidth: 1,
                borderColor: "#C9B7AC",
              }}
            >
              <Text
                style={{ color: "#6B5448", fontSize: 10, fontWeight: "700" }}
              >
                בוטל
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

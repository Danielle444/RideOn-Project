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
import { getDayKey, groupClassesByDay } from "../../utils/entriesViewGrouping";
import {
  computeClassDrawState,
  isActiveEntryForDraw,
} from "../../utils/entriesDrawState";
import { buildPhysicalRunContexts } from "../../utils/entriesPhysicalRunGrouping";
import {
  DUPLICATE_WARNING_MAIN,
  formatDuplicateWarningDetails,
} from "../../utils/entriesPhysicalRunCopy";
import { getApiErrorMessage } from "../../../../shared/auth/utils/authApiErrors";

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

// Shared by the day band and the class header: mine/total over the rows
// passed in. CAP-9: Cancelled/CancelledAfterStart rows are filtered out of
// `groups` before any of this runs (see the `groups` useMemo below), so
// every row reaching this function is already Active -- no per-row status
// check is needed here.
function countRanchStats(rows, ranchId) {
  var mine = 0;
  var total = 0;

  rows.forEach(function (it) {
    total += 1;

    if (Number(it.horseRanchId) === Number(ranchId)) {
      mine += 1;
    }
  });

  return { mine: mine, total: total };
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
  var ranchName = props.ranchName || "";
  var focusClassInCompId = props.focusClassInCompId || null;
  var isFocused = !!focusClassInCompId;

  var [loading, setLoading] = useState(false);
  var [error, setError] = useState(null);
  var [items, setItems] = useState([]);

  // Collapse state is presentation-only and keyed by id so it never touches
  // sort/group order. Both sets start empty on every open: an empty
  // expanded-days set reads as "every day collapsed", an empty
  // collapsed-classes set reads as "every class expanded" - the required
  // default.
  var [expandedDayKeys, setExpandedDayKeys] = useState(new Set());
  var [collapsedClassIds, setCollapsedClassIds] = useState(new Set());

  useEffect(
    function () {
      if (!isOpen) return;

      var cancelled = false;
      setLoading(true);
      setError(null);
      setItems([]);
      setExpandedDayKeys(new Set());
      setCollapsedClassIds(new Set());

      async function load() {
        try {
          var res = await getCompetitionEntriesView(competitionId, ranchId);
          if (cancelled) return;
          setItems(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
          if (!cancelled) {
            console.log("ENTRIES VIEW LOAD ERROR", err);
            setError(
              getApiErrorMessage(err, "טעינה נכשלה"),
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

  function toggleDay(dayKey) {
    setExpandedDayKeys(function (prev) {
      var next = new Set(prev);
      if (next.has(dayKey)) {
        next.delete(dayKey);
      } else {
        next.add(dayKey);
      }
      return next;
    });
  }

  function toggleClass(classInCompId) {
    setCollapsedClassIds(function (prev) {
      var next = new Set(prev);
      if (next.has(classInCompId)) {
        next.delete(classInCompId);
      } else {
        next.add(classInCompId);
      }
      return next;
    });
  }

  // Shared physical runs: a rider+horse pair entered into several
  // classifications for the same classDate+orderInDay is one arena pass and
  // must render as ONE row, not one row per classification. Runs a physical-
  // run-key bucket that contains an invalid same-class duplicate into
  // `duplicateWarnings` INSTEAD of `displayItems` -- the whole bucket is one
  // invalid grouping context (never a merge built from a partially-
  // contaminated set), so none of its entries render as a normal row; see
  // entriesPhysicalRunGrouping.js's header comment for the reasoning.
  var runContexts = useMemo(
    function () {
      var filtered = focusClassInCompId
        ? items.filter(function (it) {
            return Number(it.classInCompId) === Number(focusClassInCompId);
          })
        : items;

      // CAP-9: Cancelled and CancelledAfterStart entries never appear in the
      // running order - filtered out here, before grouping, so nothing
      // downstream (sorting, day bands, rendering, mine/total counts) ever
      // sees one.
      filtered = filtered.filter(isActiveEntryForDraw);

      return buildPhysicalRunContexts(filtered);
    },
    [items, focusClassInCompId],
  );

  // One warning card per invalid physical-run-key bucket, filed under the
  // day it belongs to (classDate), so it renders alongside that day's class
  // groups rather than needing a class header of its own -- it may span more
  // than one classInCompId.
  var duplicateWarningsByDay = useMemo(
    function () {
      var byDay = {};

      runContexts.duplicateWarnings.forEach(function (warning) {
        var dayKey = getDayKey(warning.classDate);

        if (!byDay[dayKey]) {
          byDay[dayKey] = [];
        }

        byDay[dayKey].push(warning);
      });

      return byDay;
    },
    [runContexts],
  );

  var groups = useMemo(
    function () {
      var filtered = runContexts.displayItems;

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
    [runContexts],
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

  // A day whose entries are ENTIRELY consumed by an invalid duplicate has no
  // legitimate class group at all, so it would never appear in `dayGroups` --
  // add a synthetic empty-classes day band for it so its warning is still
  // reachable rather than silently absent from the list.
  var dayGroupsWithWarnings = useMemo(
    function () {
      var base = dayGroups.slice();
      var seenKeys = {};

      base.forEach(function (d) {
        seenKeys[d.dayKey] = true;
      });

      Object.keys(duplicateWarningsByDay).forEach(function (dayKey) {
        if (seenKeys[dayKey]) {
          return;
        }

        base.push({
          dayKey: dayKey,
          classDate: duplicateWarningsByDay[dayKey][0].classDate,
          classes: [],
        });
      });

      base.sort(function (a, b) {
        var aTime = a.classDate ? new Date(a.classDate).getTime() : 0;
        var bTime = b.classDate ? new Date(b.classDate).getTime() : 0;
        return aTime - bTime;
      });

      return base;
    },
    [dayGroups, duplicateWarningsByDay],
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
          ) : dayGroupsWithWarnings.length === 0 ? (
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
              {dayGroupsWithWarnings.map(function (day, dayIndex) {
                var isDayExpanded = isFocused || expandedDayKeys.has(day.dayKey);

                var dayRows = day.classes.reduce(function (acc, g) {
                  return acc.concat(g.items);
                }, []);
                var dayStats = countRanchStats(dayRows, ranchId);

                return (
                  <View
                    key={"day-" + day.dayKey}
                    style={{ marginTop: dayIndex === 0 ? 0 : 14 }}
                  >
                    {isFocused ? (
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
                    ) : (
                      <Pressable
                        onPress={function () {
                          toggleDay(day.dayKey);
                        }}
                        style={{
                          flexDirection: "row-reverse",
                          alignItems: "center",
                          justifyContent: "space-between",
                          backgroundColor: "#7B5A4D",
                          borderRadius: 8,
                          paddingVertical: 6,
                          paddingHorizontal: 10,
                          marginBottom: 8,
                        }}
                      >
                        <View
                          style={{
                            flexDirection: "row-reverse",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <Text style={{ fontSize: 13, color: "#FFFFFF" }}>
                            {isDayExpanded ? "▾" : "▸"}
                          </Text>
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

                        <Text style={{ fontSize: 12, color: "#FFFFFF" }}>
                          {ranchName ? ranchName + " " : ""}
                          <Text style={{ fontWeight: "700" }}>
                            {dayStats.mine + "/" + dayStats.total}
                          </Text>
                        </Text>
                      </Pressable>
                    )}

                    {isDayExpanded && (duplicateWarningsByDay[day.dayKey] || []).length > 0
                      ? (duplicateWarningsByDay[day.dayKey] || []).map(function (warning) {
                          return (
                            <DuplicateWarningCard
                              key={"dup-" + warning.runKey}
                              warning={warning}
                            />
                          );
                        })
                      : null}

                    {isDayExpanded
                      ? day.classes.map(function (g) {
                          return (
                            <ClassGroup
                              key={"class-" + g.classInCompId}
                              group={g}
                              ranchId={ranchId}
                              ranchName={ranchName}
                              isFocused={isFocused}
                              isCollapsed={collapsedClassIds.has(
                                g.classInCompId,
                              )}
                              onToggle={toggleClass}
                            />
                          );
                        })
                      : null}
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

// Shared physical runs (correction round): renders one invalid-duplicate
// grouping context. Never a numbered row, never merged -- a plain warning
// naming the affected class(es) and every entryId held back, so the data
// stays visible without being presented as a valid run. Copy is centralized
// in entriesPhysicalRunCopy.js, approved by Oren.
function DuplicateWarningCard(props) {
  var warning = props.warning;

  return (
    <View
      style={{
        marginBottom: 14,
        borderWidth: 1,
        borderColor: "#E7BABA",
        borderRadius: 10,
        backgroundColor: "#FBEDED",
        padding: 10,
      }}
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: "700",
          color: "#A54848",
          textAlign: "right",
        }}
      >
        {DUPLICATE_WARNING_MAIN}
      </Text>

      <Text
        style={{
          fontSize: 12,
          color: "#8D6E63",
          textAlign: "right",
          marginTop: 4,
        }}
      >
        {warning.riderName} • {warning.horseName}
      </Text>

      {warning.duplicates.map(function (duplicate) {
        return (
          <View key={"dup-class-" + duplicate.classInCompId} style={{ marginTop: 6 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: "#3F312B",
                textAlign: "right",
              }}
            >
              {duplicate.className}
            </Text>
            <Text style={{ fontSize: 12, color: "#A54848", textAlign: "right" }}>
              {formatDuplicateWarningDetails(duplicate.entryIds)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function ClassGroup(props) {
  var g = props.group;
  var ranchId = props.ranchId;
  var ranchName = props.ranchName;
  var isFocused = props.isFocused;
  var isCollapsed = props.isCollapsed;
  var onToggle = props.onToggle;

  // CAP-2: computed once per class, not per row - the "not drawn" note
  // renders once for the whole class, and every row's draw number depends on
  // the same isDrawn verdict.
  var drawState = computeClassDrawState(g.items);
  var classStats = countRanchStats(g.items, ranchId);

  // Focused single-class view keeps today's always-expanded rendering with
  // no collapse chrome; everywhere else the class body follows the chevron.
  var showBody = isFocused || !isCollapsed;

  var headerMarginBottom = showBody && g.items.length > 0 && !drawState.isDrawn ? 2 : 8;

  var headerRow = (
    <View
      style={{
        flexDirection: "row-reverse",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <View
        style={{ flexDirection: "row-reverse", alignItems: "center", gap: 6 }}
      >
        {isFocused ? null : (
          <Text style={{ fontSize: 12, color: "#3F312B" }}>
            {isCollapsed ? "▸" : "▾"}
          </Text>
        )}
        <Text
          style={{
            fontSize: 15,
            fontWeight: "700",
            color: "#3F312B",
            textAlign: "right",
          }}
        >
          {g.className || "מקצה"}
        </Text>
      </View>

      <Text style={{ fontSize: 12, color: "#8D6E63" }}>
        {ranchName ? ranchName + " " : ""}
        <Text style={{ fontWeight: "700", color: "#3F312B" }}>
          {classStats.mine + "/" + classStats.total}
        </Text>
      </Text>
    </View>
  );

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
      {isFocused ? (
        <View style={{ marginBottom: headerMarginBottom }}>{headerRow}</View>
      ) : (
        <Pressable
          onPress={function () {
            onToggle(g.classInCompId);
          }}
          style={{ marginBottom: headerMarginBottom }}
        >
          {headerRow}
        </Pressable>
      )}

      {showBody && g.items.length > 0 && !drawState.isDrawn ? (
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

      {!showBody ? null : g.items.length === 0 ? (
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

  // CAP-4: horse name is the primary line; רוכב/ת and מאמן/ת render lighter
  // and muted on their own line beneath it, so the row reads horse-first
  // instead of a uniform bold wall.
  var horseTextStyle = {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "right",
    color: "#3F312B",
  };

  var secondaryTextStyle = {
    fontSize: 13,
    fontWeight: "400",
    textAlign: "right",
    color: "#8D6E63",
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
        // own-ranch rows stay full-strength; other-ranch rows are visibly
        // muted (opacity only - no hiding, no replacement label).
        !isMine ? { opacity: 0.55 } : null,
      ]}
    >
      {isDrawn ? (
        <Text
          style={{
            fontSize: 23,
            fontWeight: "800",
            color: "#7B5A4D",
            minWidth: 30,
            textAlign: "center",
          }}
        >
          {it.drawOrder != null ? it.drawOrder : ""}
        </Text>
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
          <Text style={horseTextStyle}>
            {it.horseName}
            {it.barnName ? " (" + it.barnName + ")" : ""}
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row-reverse",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
            marginTop: 2,
          }}
        >
          <Text style={secondaryTextStyle}>• רוכב/ת: {it.riderName}</Text>

          {it.coachName ? (
            <Text style={secondaryTextStyle}>• מאמן/ת: {it.coachName}</Text>
          ) : null}
        </View>

        {/* Shared physical runs: this row covers more than one active
            classification (see entriesPhysicalRunGrouping.js) -- list every
            one so a run entered into several classes is never mistaken for a
            single-class entry. */}
        {Array.isArray(it.classNames) && it.classNames.length > 1 ? (
          <View
            style={{
              flexDirection: "row-reverse",
              alignItems: "center",
              gap: 6,
              flexWrap: "wrap",
              marginTop: 2,
            }}
          >
            <Text style={secondaryTextStyle}>
              • מקצים: {it.classNames.join(", ")}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

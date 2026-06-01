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

function fmtTime(value) {
  if (!value) return "";
  return String(value).slice(0, 5);
}

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

// Modal צפייה בסדר כניסות. read-only.
// אם focusClassInCompId מסופק - מציג רק את המקצה ההוא.
// אחרת מציג את כל המקצים, מקובצים ומסודרים לפי תאריך/שעה/drawOrder.
// בקשות של החווה הנוכחית מודגשות (isMine).
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
          ) : groups.length === 0 ? (
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
              {groups.map(function (g) {
                return (
                  <ClassGroup
                    key={"class-" + g.classInCompId}
                    group={g}
                    ranchId={ranchId}
                  />
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
          marginBottom: 2,
        }}
      >
        {g.className || "מקצה"}
      </Text>
      <Text
        style={{
          fontSize: 12,
          color: "#8D6E63",
          textAlign: "right",
          marginBottom: 8,
        }}
      >
        {fmtDate(g.classDate)} • {fmtTime(g.startTime)}
        {g.orderInDay ? "  •  מקצה #" + g.orderInDay + " ביום" : ""}
      </Text>

      {g.items.length === 0 ? (
        <Text style={{ color: "#8D6E63", fontSize: 12, textAlign: "right" }}>
          אין הרשמות במקצה זה
        </Text>
      ) : (
        g.items.map(function (it) {
          var isMine = Number(it.horseRanchId) === Number(ranchId);
          return (
            <View
              key={"entry-" + it.entryId}
              style={{
                flexDirection: "row-reverse",
                alignItems: "center",
                gap: 8,
                paddingVertical: 8,
                borderTopWidth: 1,
                borderTopColor: "#F3EAE4",
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: isMine ? "#7B5A4D" : "#FAF5F1",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: isMine ? "#FFFFFF" : "#5A4036",
                  }}
                >
                  {it.drawOrder != null ? it.drawOrder : "—"}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <View
                  style={{
                    flexDirection: "row-reverse",
                    alignItems: "center",
                    gap: 6,
                    flexWrap: "wrap",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "700",
                      color: isMine ? "#5A4036" : "#3F312B",
                      textAlign: "right",
                    }}
                  >
                    {it.horseName}
                    {it.barnName ? " (" + it.barnName + ")" : ""}
                  </Text>
                  {isMine ? (
                    <View
                      style={{
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 8,
                        backgroundColor: "#7B5A4D",
                      }}
                    >
                      <Text
                        style={{
                          color: "#FFFFFF",
                          fontSize: 10,
                          fontWeight: "700",
                        }}
                      >
                        שלי
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text
                  style={{
                    fontSize: 12,
                    color: "#8D6E63",
                    textAlign: "right",
                  }}
                >
                  רוכב/ת: {it.riderName}
                  {it.coachName ? "  •  מאמן/ת: " + it.coachName : ""}
                </Text>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

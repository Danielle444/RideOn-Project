import React, { useEffect, useMemo, useState } from "react";

import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import {
  getCompounds,
  getAssignments,
} from "../../services/stallMapService";

var CELL_SIZE = 56;
var CELL_GAP = 4;

// Modal לצפייה במפת תאים - גישת אדמין read-only.
// טבים לפי מתחם, גריד דו-ממדי לכל מתחם.
// תא משובץ לחווה הנוכחית מודגש ("שלי").
// תומך focusStallNumber - בעת פתיחה מתמקד באותו תא ובמתחם שלו.
export default function StallMapModal(props) {
  var isOpen = !!props.isOpen;
  var competitionId = props.competitionId;
  var ranchId = props.ranchId;
  var focusCompoundId = props.focusCompoundId || null;
  var focusStallNumber = props.focusStallNumber || null;

  var [loading, setLoading] = useState(false);
  var [error, setError] = useState(null);
  var [compounds, setCompounds] = useState([]);
  var [assignments, setAssignments] = useState([]);
  var [activeCompoundId, setActiveCompoundId] = useState(null);

  useEffect(
    function () {
      if (!isOpen) return;

      var cancelled = false;
      setLoading(true);
      setError(null);

      async function load() {
        try {
          var results = await Promise.all([
            getCompounds(ranchId),
            getAssignments(competitionId, ranchId),
          ]);

          if (cancelled) return;

          var rawCompounds = Array.isArray(results[0]?.data)
            ? results[0].data
            : [];

          var rawAssignments = Array.isArray(results[1]?.data)
            ? results[1].data
            : [];

          setCompounds(rawCompounds);
          setAssignments(rawAssignments);

          var initialCompound =
            focusCompoundId != null
              ? focusCompoundId
              : rawCompounds.length > 0
                ? rawCompounds[0].compoundId || rawCompounds[0].CompoundId
                : null;

          setActiveCompoundId(initialCompound);
        } catch (err) {
          if (!cancelled) {
            console.log("STALL MAP LOAD ERROR", err);
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
    [isOpen, competitionId, ranchId, focusCompoundId],
  );

  var assignmentsByStallNumber = useMemo(
    function () {
      var map = {};
      (assignments || []).forEach(function (a) {
        var stallNumber = a.stallNumber || a.StallNumber || a.stallnumber;
        if (!stallNumber) return;
        var brId =
          a.bookingRanchId || a.BookingRanchId || a.bookingranchid || null;
        map[stallNumber] = {
          horseName: a.horseName || a.HorseName || a.horsename || "",
          barnName: a.barnName || a.BarnName || a.barnname || "",
          bookingRanchId: brId,
          isMine: Number(brId) === Number(ranchId),
        };
      });
      return map;
    },
    [assignments, ranchId],
  );

  var activeCompound = useMemo(
    function () {
      return (compounds || []).find(function (c) {
        var cid = c.compoundId || c.CompoundId;
        return Number(cid) === Number(activeCompoundId);
      });
    },
    [compounds, activeCompoundId],
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
              מפת תאים
            </Text>
            <Pressable onPress={props.onClose} hitSlop={8}>
              <Text style={{ fontSize: 22, color: "#7B5A4D" }}>×</Text>
            </Pressable>
          </View>

          {loading ? (
            <View style={{ paddingVertical: 24, alignItems: "center" }}>
              <ActivityIndicator size="large" color="#7B5A4D" />
              <Text style={{ marginTop: 8, color: "#8D6E63" }}>
                טוען מפת תאים...
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
          ) : compounds.length === 0 ? (
            <Text
              style={{
                color: "#8D6E63",
                fontSize: 13,
                textAlign: "right",
                marginVertical: 12,
              }}
            >
              אין מתחמים במערכת.
            </Text>
          ) : (
            <>
              <CompoundTabs
                compounds={compounds}
                activeCompoundId={activeCompoundId}
                onSelect={setActiveCompoundId}
              />

              <CompoundLegend />

              <View style={{ marginTop: 10 }}>
                {activeCompound ? (
                  <CompoundGrid
                    compound={activeCompound}
                    assignmentsByStallNumber={assignmentsByStallNumber}
                    focusStallNumber={focusStallNumber}
                  />
                ) : (
                  <Text style={{ color: "#8D6E63", textAlign: "right" }}>
                    בחר מתחם
                  </Text>
                )}
              </View>
            </>
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

function CompoundTabs(props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        flexDirection: "row-reverse",
        gap: 6,
        paddingVertical: 4,
      }}
    >
      {props.compounds.map(function (c) {
        var cid = c.compoundId || c.CompoundId;
        var name = c.compoundName || c.CompoundName || "מתחם " + cid;
        var active = Number(cid) === Number(props.activeCompoundId);
        return (
          <Pressable
            key={"comp-" + cid}
            onPress={function () {
              props.onSelect(cid);
            }}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 14,
              borderRadius: 18,
              backgroundColor: active ? "#7B5A4D" : "#FFFFFF",
              borderWidth: 1,
              borderColor: "#7B5A4D",
            }}
          >
            <Text
              style={{
                color: active ? "#FFFFFF" : "#7B5A4D",
                fontWeight: "700",
                fontSize: 13,
              }}
            >
              {name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function CompoundLegend() {
  return (
    <View
      style={{
        flexDirection: "row-reverse",
        gap: 12,
        marginTop: 8,
        flexWrap: "wrap",
      }}
    >
      <LegendItem color="#FAF5F1" label="פנוי" border />
      <LegendItem color="#D9CFC2" label="תפוס" />
      <LegendItem color="#7B5A4D" label="שלי" textWhite />
      <LegendItem color="#FFF7E0" label="כניסה" border />
    </View>
  );
}

function LegendItem(props) {
  return (
    <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 4 }}>
      <View
        style={{
          width: 14,
          height: 14,
          borderRadius: 3,
          backgroundColor: props.color,
          borderWidth: props.border ? 1 : 0,
          borderColor: "#D9CFC2",
        }}
      />
      <Text style={{ fontSize: 11, color: "#5A4036" }}>{props.label}</Text>
    </View>
  );
}

function CompoundGrid(props) {
  var compound = props.compound;
  var layout = compound.layout || compound.Layout || null;
  var assignmentsByStallNumber = props.assignmentsByStallNumber;
  var focusStallNumber = props.focusStallNumber;

  if (!layout) {
    return (
      <View
        style={{
          paddingVertical: 24,
          alignItems: "center",
          borderRadius: 12,
          backgroundColor: "#FAF5F1",
          borderWidth: 1,
          borderColor: "#D9CFC2",
          borderStyle: "dashed",
        }}
      >
        <Text style={{ color: "#8D6E63", fontSize: 13 }}>
          לא הועלתה פריסה למתחם זה
        </Text>
      </View>
    );
  }

  var rows = Number(layout.rows) || 0;
  var cols = Number(layout.cols) || 0;
  var cells = Array.isArray(layout.cells) ? layout.cells : [];

  var cellMap = {};
  cells.forEach(function (cell) {
    if (cell && cell.row !== undefined && cell.col !== undefined) {
      cellMap[cell.row + "-" + cell.col] = cell;
    }
  });

  if (rows === 0 || cols === 0) {
    return (
      <Text style={{ color: "#8D6E63", fontSize: 13, textAlign: "right" }}>
        מפת המתחם ריקה
      </Text>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={true}>
      <View>
        {Array.from({ length: rows }).map(function (_, r) {
          return (
            <View
              key={"row-" + r}
              style={{
                flexDirection: "row",
                gap: CELL_GAP,
                marginBottom: CELL_GAP,
              }}
            >
              {Array.from({ length: cols }).map(function (__, c) {
                var cell = cellMap[r + "-" + c] || {
                  row: r,
                  col: c,
                  stallNumber: null,
                  isEntrance: false,
                };
                var assignment = cell.stallNumber
                  ? assignmentsByStallNumber[cell.stallNumber]
                  : null;
                var isFocused =
                  focusStallNumber &&
                  cell.stallNumber === focusStallNumber;
                return (
                  <StallCell
                    key={"cell-" + r + "-" + c}
                    cell={cell}
                    assignment={assignment}
                    isFocused={isFocused}
                  />
                );
              })}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

function StallCell(props) {
  var cell = props.cell;
  var assignment = props.assignment;
  var isFocused = props.isFocused;

  if (cell.isEntrance) {
    return (
      <View
        style={{
          width: CELL_SIZE,
          height: CELL_SIZE,
          borderRadius: 6,
          backgroundColor: "#FFF7E0",
          borderWidth: 1,
          borderColor: "#D9CFC2",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 10, color: "#5A4036" }}>כניסה</Text>
      </View>
    );
  }

  if (!cell.stallNumber) {
    return (
      <View
        style={{
          width: CELL_SIZE,
          height: CELL_SIZE,
          borderRadius: 6,
          backgroundColor: "transparent",
        }}
      />
    );
  }

  var bg = "#FAF5F1";
  var border = "#D9CFC2";
  var textColor = "#5A4036";

  if (assignment) {
    if (assignment.isMine) {
      bg = "#7B5A4D";
      border = "#5A4036";
      textColor = "#FFFFFF";
    } else {
      bg = "#D9CFC2";
      border = "#8D6E63";
      textColor = "#3F312B";
    }
  }

  return (
    <View
      style={{
        width: CELL_SIZE,
        height: CELL_SIZE,
        borderRadius: 6,
        backgroundColor: bg,
        borderWidth: isFocused ? 3 : 1,
        borderColor: isFocused ? "#D97706" : border,
        alignItems: "center",
        justifyContent: "center",
        padding: 2,
      }}
    >
      <Text
        style={{
          fontSize: 11,
          fontWeight: "700",
          color: textColor,
        }}
      >
        {cell.stallNumber}
      </Text>
      {assignment ? (
        <Text
          style={{
            fontSize: 8,
            color: textColor,
            textAlign: "center",
          }}
          numberOfLines={1}
        >
          {assignment.barnName || assignment.horseName}
        </Text>
      ) : null}
    </View>
  );
}

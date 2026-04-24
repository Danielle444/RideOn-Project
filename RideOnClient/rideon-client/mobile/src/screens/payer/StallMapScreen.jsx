import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { getCompounds, getAssignments } from "../../services/stallMapService";

export default function StallMapScreen({ route }) {
  const { competitionId, ranchId } = route.params;

  const [compounds, setCompounds] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeId, setActiveId] = useState(null);

  useEffect(
    function () {
      let isMounted = true;

      Promise.all([
        getCompounds(ranchId),
        getAssignments(competitionId, ranchId),
      ])
        .then(function ([compRes, assignRes]) {
          if (!isMounted) return;

          const compList = Array.isArray(compRes.data) ? compRes.data : [];

          setCompounds(compList);
          setAssignments(Array.isArray(assignRes.data) ? assignRes.data : []);

          if (compList.length > 0) {
            setActiveId(compList[0].compoundId);
          }
        })
        .catch(function () {
          if (!isMounted) return;
          setError("שגיאה בטעינת מפת התאים");
        })
        .finally(function () {
          if (!isMounted) return;
          setLoading(false);
        });

      return function () {
        isMounted = false;
      };
    },
    [competitionId, ranchId],
  );

  const activeCompound = compounds.find(function (c) {
    return c.compoundId === activeId;
  });

  const activeAssignments = assignments.filter(function (a) {
    return a.compoundId === activeId;
  });

  const assignmentMap = {};
  activeAssignments.forEach(function (a) {
    assignmentMap[a.stallNumber] = a;
  });

  function renderGrid() {
    if (!activeCompound?.layout) {
      return <Text style={styles.emptyText}>לא הועלתה פריסה עבור מתחם זה</Text>;
    }

    let layout;
    try {
      layout =
        typeof activeCompound.layout === "string"
          ? JSON.parse(activeCompound.layout)
          : activeCompound.layout;
    } catch {
      return <Text style={styles.emptyText}>שגיאה בטעינת הפריסה</Text>;
    }

    const cellMap = {};
    layout.cells.forEach(function (cell) {
      cellMap[`${cell.row}-${cell.col}`] = cell;
    });

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          {Array.from({ length: layout.rows }, function (_, r) {
            return r;
          }).map(function (r) {
            return (
              <View key={r} style={styles.gridRow}>
                {Array.from({ length: layout.cols }, function (_, c) {
                  return c;
                }).map(function (c) {
                  const cell = cellMap[`${r}-${c}`] || {
                    row: r,
                    col: c,
                    stallNumber: null,
                    isEntrance: false,
                  };
                  const assignment = cell.stallNumber
                    ? assignmentMap[cell.stallNumber]
                    : null;

                  if (cell.isEntrance) {
                    return (
                      <View key={c} style={[styles.cell, styles.entranceCell]}>
                        <Text style={styles.entranceIcon}>🚪</Text>
                      </View>
                    );
                  }
                  if (!cell.stallNumber) {
                    return <View key={c} style={styles.cell} />;
                  }

                  return (
                    <View
                      key={c}
                      style={[
                        styles.cell,
                        assignment ? styles.occupiedCell : styles.emptyCell,
                      ]}
                    >
                      <Text style={styles.stallNumber}>{cell.stallNumber}</Text>
                      {assignment ? (
                        <Text style={styles.horseName} numberOfLines={2}>
                          {assignment.barnName || assignment.horseName}
                        </Text>
                      ) : (
                        <Text style={styles.emptyLabel}>ריק</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>
      </ScrollView>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7B5A4D" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>מפת תאים</Text>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsRow}
      >
        {compounds.map(function (c) {
          return (
            <TouchableOpacity
              key={c.compoundId}
              onPress={function () {
                setActiveId(c.compoundId);
              }}
              style={[
                styles.tab,
                activeId === c.compoundId && styles.activeTab,
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  activeId === c.compoundId && styles.activeTabText,
                ]}
              >
                {c.compoundName}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {renderGrid()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FBF7F4" },
  content: { padding: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#3F312B",
    textAlign: "right",
    marginBottom: 12,
  },
  errorText: { color: "#B91C1C", textAlign: "right", marginBottom: 8 },
  tabsRow: { flexDirection: "row", marginBottom: 12 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D7CCC8",
    backgroundColor: "#fff",
    marginLeft: 8,
  },
  activeTab: { backgroundColor: "#7B5A4D", borderColor: "#7B5A4D" },
  tabText: { fontSize: 13, fontWeight: "600", color: "#5D4037" },
  activeTabText: { color: "#fff" },
  gridRow: { flexDirection: "row", marginBottom: 4 },
  cell: {
    width: 70,
    height: 70,
    marginHorizontal: 2,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCell: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D7CCC8",
  },
  occupiedCell: {
    backgroundColor: "#EFEBE9",
    borderWidth: 1.5,
    borderColor: "#A5836A",
  },
  entranceCell: {
    backgroundColor: "#F3ECE8",
    borderWidth: 1,
    borderColor: "#BCAAA4",
  },
  stallNumber: {
    fontSize: 10,
    fontWeight: "700",
    color: "#8D6E63",
    position: "absolute",
    top: 4,
    right: 6,
  },
  horseName: {
    fontSize: 11,
    fontWeight: "600",
    color: "#3F312B",
    textAlign: "center",
    paddingHorizontal: 4,
    marginTop: 10,
  },
  emptyLabel: { fontSize: 10, color: "#BCAAA4", marginTop: 10 },
  entranceIcon: { fontSize: 20 },
  emptyText: { color: "#BCAAA4", textAlign: "center", padding: 32 },
});

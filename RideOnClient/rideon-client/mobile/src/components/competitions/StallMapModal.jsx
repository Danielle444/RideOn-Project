import React, { useEffect, useMemo, useRef, useState } from "react";

import {
  ActivityIndicator,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import {
  getCompounds,
  getAssignments,
  getPayerMapAssignments,
  parseCompoundLayout,
} from "../../services/stallMapService";

import {
  getCompoundId,
  buildAssignmentsByCompoundAndStall,
  buildMineCountByCompoundId,
  resolveInitialCompoundId,
  ZOOM_STEP,
  clampZoom,
  computeFitZoom,
  resolveDetailLevel,
  DETAIL_LEVEL_FAR,
  DETAIL_LEVEL_MEDIUM,
  DETAIL_LEVEL_CLOSE,
} from "../../utils/stallMapViewer";
import { getApiErrorMessage } from "../../../../shared/auth/utils/authApiErrors";

var BASE_CELL_SIZE = 56;
var BASE_CELL_GAP = 4;

// "My ranch" state (2026-08-07, Payer-only): a lighter fill + a distinctive
// border, deliberately NOT another near-identical beige/brown so it reads
// clearly next to both "available" (#FAF5F1) and plain "occupied" (#D9CFC2).
// "Mine" (#7B5A4D solid) always wins visually when a stall is both.
var MY_RANCH_BG = "#EAD9C3";
var MY_RANCH_BORDER = "#B98A5E";

// Modal לצפייה במפת תאים - גישת RanchAdmin (host/guest) ו-Payer, שתיהן read-only.
// טבים לפי מתחם, גריד דו-ממדי לכל מתחם.
// תא משובץ לצופה הנוכחי מודגש ("שלי") - לפי חווה (RanchAdmin) או לפי isMine
// שחוזר מהשרת (Payer, viewerMode="payer" - ראה usp_GetStallAssignmentsForCompetitionPayer).
// תומך focusStallNumber - בעת פתיחה מתמקד באותו תא ובמתחם שלו.
export default function StallMapModal(props) {
  var isOpen = !!props.isOpen;
  var competitionId = props.competitionId;
  var ranchId = props.ranchId;
  var focusCompoundId = props.focusCompoundId || null;
  var focusStallNumber = props.focusStallNumber || null;
  // Blocker 2 (2026-08-07): payer mode calls a DIFFERENT, server-redacted
  // endpoint (never getAssignments, which returns every participant's
  // identity) and trusts its own IsMine field rather than re-deriving
  // ownership client-side. Default ("ranch" mode, no prop needed) is
  // RanchAdmin/HostSecretary and is completely unchanged.
  var viewerMode = props.viewerMode === "payer" ? "payer" : "ranch";

  var [loading, setLoading] = useState(false);
  var [error, setError] = useState(null);
  var [compounds, setCompounds] = useState([]);
  var [assignments, setAssignments] = useState([]);
  var [activeCompoundId, setActiveCompoundId] = useState(null);

  // Zoom/overview state (UX task sections A/B). zoomLevel drives cell size
  // and progressive detail; gridViewportSize is measured via onLayout on the
  // scrollable grid area so a fit-to-screen zoom can be computed for it.
  var [zoomLevel, setZoomLevel] = useState(1);
  var [gridViewportSize, setGridViewportSize] = useState({ width: 0, height: 0 });
  var [selectedStall, setSelectedStall] = useState(null);
  var verticalScrollRef = useRef(null);
  var horizontalScrollRef = useRef(null);
  var fittedCompoundIdRef = useRef(null);

  useEffect(
    function () {
      if (!isOpen) return;

      var cancelled = false;
      setLoading(true);
      setError(null);

      async function load() {
        try {
          var results = await Promise.all([
            getCompounds(ranchId, competitionId),
            viewerMode === "payer"
              ? getPayerMapAssignments(competitionId, ranchId)
              : getAssignments(competitionId, ranchId),
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

          var initialCompound = resolveInitialCompoundId(
            rawCompounds,
            rawAssignments,
            focusCompoundId,
            { ranchId: ranchId, trustServerIsMine: viewerMode === "payer" },
          );

          setActiveCompoundId(initialCompound);
        } catch (err) {
          if (!cancelled) {
            console.log("STALL MAP LOAD ERROR", err);
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
    [isOpen, competitionId, ranchId, focusCompoundId, viewerMode],
  );

  // Keyed by CompoundId + StallNumber (never StallNumber alone) - identical
  // stall numbers in two different compounds must never collide.
  var assignmentsByCompoundAndStall = useMemo(
    function () {
      var viewer = { ranchId: ranchId, trustServerIsMine: viewerMode === "payer" };
      return buildAssignmentsByCompoundAndStall(assignments, viewer);
    },
    [assignments, ranchId, viewerMode],
  );

  // Per-compound count of the viewer's own highlighted stalls, for the
  // compound tabs (badge + "contains my stalls" marker).
  var mineCountByCompoundId = useMemo(
    function () {
      return buildMineCountByCompoundId(assignmentsByCompoundAndStall);
    },
    [assignmentsByCompoundAndStall],
  );

  var activeCompound = useMemo(
    function () {
      return (compounds || []).find(function (c) {
        return Number(getCompoundId(c)) === Number(activeCompoundId);
      });
    },
    [compounds, activeCompoundId],
  );

  var activeLayout = useMemo(
    function () {
      return activeCompound ? parseCompoundLayout(activeCompound) : null;
    },
    [activeCompound],
  );

  // Largest zoom that fits the whole selected compound inside the currently
  // measured grid viewport (UX task section A - initial overview).
  var fitZoom = useMemo(
    function () {
      var rows = activeLayout ? Number(activeLayout.rows) || 0 : 0;
      var cols = activeLayout ? Number(activeLayout.cols) || 0 : 0;
      return computeFitZoom(
        rows,
        cols,
        gridViewportSize.width,
        gridViewportSize.height,
        BASE_CELL_SIZE,
        BASE_CELL_GAP,
      );
    },
    [activeLayout, gridViewportSize],
  );

  // Resets to the fit-to-screen overview exactly once per compound selection
  // (including the initial one), as soon as the viewport has been measured.
  // Does NOT re-trigger on every viewport re-measure, so it never clobbers a
  // zoom the user already chose for the compound they're looking at.
  useEffect(
    function () {
      if (!activeCompoundId) return;
      if (gridViewportSize.width === 0 || gridViewportSize.height === 0) return;
      if (fittedCompoundIdRef.current === activeCompoundId) return;

      fittedCompoundIdRef.current = activeCompoundId;
      setZoomLevel(fitZoom);
    },
    [activeCompoundId, gridViewportSize, fitZoom],
  );

  useEffect(
    function () {
      if (!isOpen) {
        fittedCompoundIdRef.current = null;
        setSelectedStall(null);
      }
    },
    [isOpen],
  );

  function handleGridLayout(event) {
    var layout = event.nativeEvent.layout;
    setGridViewportSize({ width: layout.width, height: layout.height });
  }

  function handleZoomIn() {
    setZoomLevel(function (current) {
      return clampZoom(current + ZOOM_STEP);
    });
  }

  function handleZoomOut() {
    setZoomLevel(function (current) {
      return clampZoom(current - ZOOM_STEP);
    });
  }

  function handleFitToScreen() {
    setZoomLevel(fitZoom);
    if (verticalScrollRef.current) {
      verticalScrollRef.current.scrollTo({ x: 0, y: 0, animated: true });
    }
    if (horizontalScrollRef.current) {
      horizontalScrollRef.current.scrollTo({ x: 0, y: 0, animated: true });
    }
  }

  var cellSize = Math.round(BASE_CELL_SIZE * zoomLevel);
  var cellGap = Math.max(2, Math.round(BASE_CELL_GAP * zoomLevel));
  var detailLevel = resolveDetailLevel(zoomLevel);

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={props.onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
        <View
          style={{
            flexDirection: "row-reverse",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 14,
            paddingTop: 10,
            paddingBottom: 6,
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
            <Ionicons name="close-outline" size={26} color="#7B5A4D" />
          </Pressable>
        </View>

        {loading ? (
          <View style={{ flex: 1, paddingVertical: 24, alignItems: "center" }}>
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
              paddingHorizontal: 14,
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
              paddingHorizontal: 14,
            }}
          >
            אין מתחמים במערכת.
          </Text>
        ) : (
          <>
            <View style={{ paddingHorizontal: 14 }}>
              <CompoundTabs
                compounds={compounds}
                activeCompoundId={activeCompoundId}
                onSelect={setActiveCompoundId}
                mineCountByCompoundId={mineCountByCompoundId}
              />
            </View>

            <View style={{ paddingHorizontal: 14 }}>
              <CompoundLegend viewerMode={viewerMode} />
            </View>

            <View style={{ flex: 1 }} onLayout={handleGridLayout}>
              <ScrollView
                ref={verticalScrollRef}
                style={{ marginTop: 10, flex: 1 }}
                contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 14, paddingBottom: 16 }}
                showsVerticalScrollIndicator={true}
              >
                {activeCompound ? (
                  <CompoundGrid
                    compound={activeCompound}
                    assignmentsByCompoundAndStall={assignmentsByCompoundAndStall}
                    focusStallNumber={focusStallNumber}
                    cellSize={cellSize}
                    cellGap={cellGap}
                    detailLevel={detailLevel}
                    horizontalScrollRef={horizontalScrollRef}
                    onSelectStall={setSelectedStall}
                  />
                ) : (
                  <Text style={{ color: "#8D6E63", textAlign: "right" }}>
                    בחר מתחם
                  </Text>
                )}
              </ScrollView>

              <ZoomControls
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onFitToScreen={handleFitToScreen}
              />
            </View>
          </>
        )}

        <View
          style={{
            paddingHorizontal: 14,
            paddingTop: 8,
            paddingBottom: 10,
          }}
        >
          <Pressable
            onPress={props.onClose}
            style={{
              paddingVertical: 10,
              borderRadius: 8,
              backgroundColor: "#7B5A4D",
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>סגור</Text>
          </Pressable>
        </View>

        {selectedStall ? (
          <StallDetailCard
            selection={selectedStall}
            compoundName={
              activeCompound
                ? activeCompound.compoundName || activeCompound.CompoundName
                : null
            }
            onClose={function () {
              setSelectedStall(null);
            }}
          />
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

function CompoundTabs(props) {
  var mineCountByCompoundId = props.mineCountByCompoundId || {};

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
        var cid = getCompoundId(c);
        var name = c.compoundName || c.CompoundName || "מתחם " + cid;
        var active = Number(cid) === Number(props.activeCompoundId);
        var mineCount = mineCountByCompoundId[cid] || 0;
        var hasMine = mineCount > 0;

        return (
          <Pressable
            key={"comp-" + cid}
            onPress={function () {
              props.onSelect(cid);
            }}
            style={{
              flexDirection: "row-reverse",
              alignItems: "center",
              flexShrink: 0,
              gap: 6,
              paddingVertical: 8,
              paddingHorizontal: 14,
              borderRadius: 18,
              backgroundColor: active ? "#7B5A4D" : "#FFFFFF",
              borderWidth: hasMine ? 2 : 1,
              borderColor: hasMine ? "#D97706" : "#7B5A4D",
            }}
          >
            <Text
              numberOfLines={1}
              style={{
                color: active ? "#FFFFFF" : "#7B5A4D",
                fontWeight: "700",
                fontSize: 13,
              }}
            >
              {name}
            </Text>

            {hasMine ? (
              <View
                style={{
                  minWidth: 18,
                  height: 18,
                  borderRadius: 9,
                  paddingHorizontal: 4,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: active ? "#FFFFFF" : "#D97706",
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "800",
                    color: active ? "#7B5A4D" : "#FFFFFF",
                  }}
                >
                  {mineCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function CompoundLegend(props) {
  var isPayer = props.viewerMode === "payer";

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
      {isPayer ? (
        <LegendItem color={MY_RANCH_BG} label="החווה שלי" border borderColor={MY_RANCH_BORDER} />
      ) : null}
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
          borderColor: props.borderColor || "#D9CFC2",
        }}
      />
      <Text style={{ fontSize: 11, color: "#5A4036" }}>{props.label}</Text>
    </View>
  );
}

function CompoundGrid(props) {
  var compound = props.compound;
  var layout = parseCompoundLayout(compound);
  var assignmentsByCompoundAndStall = props.assignmentsByCompoundAndStall;
  var focusStallNumber = props.focusStallNumber;
  var compoundId = getCompoundId(compound);
  var cellSize = props.cellSize || BASE_CELL_SIZE;
  var cellGap = props.cellGap != null ? props.cellGap : BASE_CELL_GAP;
  var detailLevel = props.detailLevel || DETAIL_LEVEL_MEDIUM;
  var onSelectStall = props.onSelectStall;

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
    <ScrollView
      ref={props.horizontalScrollRef}
      horizontal
      showsHorizontalScrollIndicator={true}
    >
      <View>
        {Array.from({ length: rows }).map(function (_, r) {
          return (
            <View
              key={"row-" + r}
              style={{
                flexDirection: "row",
                gap: cellGap,
                marginBottom: cellGap,
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
                  ? assignmentsByCompoundAndStall[compoundId + "::" + cell.stallNumber]
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
                    cellSize={cellSize}
                    detailLevel={detailLevel}
                    onPress={
                      cell.stallNumber && typeof onSelectStall === "function"
                        ? function () {
                            onSelectStall({ cell: cell, assignment: assignment });
                          }
                        : null
                    }
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
  var cellSize = props.cellSize || BASE_CELL_SIZE;
  var detailLevel = props.detailLevel || DETAIL_LEVEL_MEDIUM;
  var onPress = props.onPress;

  if (cell.isEntrance) {
    return (
      <View
        style={{
          width: cellSize,
          height: cellSize,
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
          width: cellSize,
          height: cellSize,
          borderRadius: 6,
          backgroundColor: "transparent",
        }}
      />
    );
  }

  var bg = "#FAF5F1";
  var border = "#D9CFC2";
  var textColor = "#5A4036";
  var borderWidth = 1;

  // Priority (business decision, 2026-08-07): "Mine" always wins visually
  // over "My ranch" when a stall satisfies both. "My ranch" only ever
  // renders for Payer (assignment.isMyRanch is always false in ranch/admin
  // mode - see resolveIsMyRanch), so no separate viewerMode check is needed
  // here.
  if (assignment) {
    if (assignment.isMine) {
      bg = "#7B5A4D";
      border = "#5A4036";
      textColor = "#FFFFFF";
    } else if (assignment.isMyRanch) {
      bg = MY_RANCH_BG;
      border = MY_RANCH_BORDER;
      textColor = "#5A4036";
      borderWidth = 2;
    } else {
      bg = "#D9CFC2";
      border = "#8D6E63";
      textColor = "#3F312B";
    }
  }

  // Progressive detail (UX task section C): far zoom shows number/color
  // only; medium adds the stall type label when relevant (e.g. tack); close
  // adds horse name (+ barn nickname, matching the app-wide "Name (Barn)"
  // convention) and ranch name, when that data exists for this viewer.
  var showTypeLabel = detailLevel !== DETAIL_LEVEL_FAR && !!assignment;
  var showNames = detailLevel === DETAIL_LEVEL_CLOSE && !!assignment;

  var horseLabel = null;
  if (showNames && !assignment.isForTack) {
    if (assignment.horseName) {
      horseLabel = assignment.barnName
        ? assignment.horseName + " (" + assignment.barnName + ")"
        : assignment.horseName;
    } else if (assignment.barnName) {
      horseLabel = assignment.barnName;
    }
  }

  return (
    <Pressable
      onPress={onPress || undefined}
      disabled={!onPress}
      style={{
        width: cellSize,
        height: cellSize,
        borderRadius: 6,
        backgroundColor: bg,
        borderWidth: isFocused ? 3 : borderWidth,
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

      {showTypeLabel && assignment.isForTack ? (
        <Text
          style={{ fontSize: 8, color: textColor, textAlign: "center" }}
          numberOfLines={1}
        >
          תא ציוד
        </Text>
      ) : null}

      {horseLabel ? (
        <Text
          style={{ fontSize: 8, color: textColor, textAlign: "center" }}
          numberOfLines={1}
        >
          {horseLabel}
        </Text>
      ) : null}

      {showNames && assignment.bookingRanchName ? (
        <Text
          style={{ fontSize: 7, color: textColor, textAlign: "center" }}
          numberOfLines={1}
        >
          {assignment.bookingRanchName}
        </Text>
      ) : null}
    </Pressable>
  );
}

function ZoomControls(props) {
  return (
    <View
      style={{
        position: "absolute",
        left: 10,
        bottom: 10,
        alignItems: "center",
        gap: 6,
      }}
    >
      <ZoomButton iconName="add" onPress={props.onZoomIn} />
      <ZoomButton iconName="scan-outline" onPress={props.onFitToScreen} />
      <ZoomButton iconName="remove" onPress={props.onZoomOut} />
    </View>
  );
}

function ZoomButton(props) {
  return (
    <Pressable
      onPress={props.onPress}
      hitSlop={6}
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#D9CFC2",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 1 },
        elevation: 2,
      }}
    >
      <Ionicons name={props.iconName} size={18} color="#7B5A4D" />
    </Pressable>
  );
}

// Tap-to-detail (UX task section D): a compact overlay card showing whatever
// fields the current viewer's assignment data actually carries. Purely
// data-driven -- payer-mode assignments never have bookingRanchName (the
// redacted endpoint never sends one, see stallMapViewer.js), so that row
// simply never renders there rather than being hidden by a viewerMode check.
function StallDetailCard(props) {
  var selection = props.selection || {};
  var cell = selection.cell || {};
  var assignment = selection.assignment;
  var compoundName = props.compoundName;

  // Same priority as the cell coloring: Mine wins over My ranch over plain
  // Occupied.
  var statusLabel = "פנוי";
  if (assignment) {
    if (assignment.isMine) {
      statusLabel = "שלי";
    } else if (assignment.isMyRanch) {
      statusLabel = "החווה שלי";
    } else {
      statusLabel = "תפוס";
    }
  }

  var horseLabel = null;
  if (assignment && !assignment.isForTack) {
    if (assignment.horseName) {
      horseLabel = assignment.barnName
        ? assignment.horseName + " (" + assignment.barnName + ")"
        : assignment.horseName;
    } else if (assignment.barnName) {
      horseLabel = assignment.barnName;
    }
  }

  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
      <Pressable
        onPress={props.onClose}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.35)",
        }}
      />

      <View
        style={{
          position: "absolute",
          left: 20,
          right: 20,
          bottom: 90,
          backgroundColor: "#FFFFFF",
          borderRadius: 14,
          padding: 16,
        }}
      >
        <View
          style={{
            flexDirection: "row-reverse",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: "#3F312B",
              textAlign: "right",
            }}
          >
            {"תא " + cell.stallNumber}
          </Text>
          <Pressable onPress={props.onClose} hitSlop={8}>
            <Ionicons name="close-outline" size={22} color="#7B5A4D" />
          </Pressable>
        </View>

        {compoundName ? <DetailRow label="מתחם" value={compoundName} /> : null}

        <DetailRow label="סטטוס" value={statusLabel} />

        {assignment && assignment.isForTack ? (
          <DetailRow label="סוג" value="תא ציוד" />
        ) : null}

        {horseLabel ? <DetailRow label="סוס" value={horseLabel} /> : null}

        {assignment && assignment.bookingRanchName ? (
          <DetailRow label="חווה" value={assignment.bookingRanchName} />
        ) : null}
      </View>
    </View>
  );
}

function DetailRow(props) {
  return (
    <View
      style={{
        flexDirection: "row-reverse",
        justifyContent: "space-between",
        marginTop: 6,
      }}
    >
      <Text style={{ fontSize: 13, color: "#8D6E63" }}>{props.label}</Text>
      <Text style={{ fontSize: 13, color: "#3F312B", fontWeight: "600" }}>
        {props.value}
      </Text>
    </View>
  );
}

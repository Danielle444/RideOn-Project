// Pure viewer logic for the shared stall-map grid (StallMapModal.jsx).
// Kept RN-free so it can be unit tested directly with plain Vitest, matching
// this repo's convention of extracting business logic out of RN component
// files (e.g. payerAccountBands.js, payerAccountLifecycle.js).

function getCompoundId(compound) {
  return compound && (compound.compoundId ?? compound.CompoundId);
}

// Reads an assignment row's fields defensively across camelCase/PascalCase
// wire shapes (see memory: rideon-api-wire-casing-is-camelcase -- UNRESOLVED,
// keep dual-casing). isMine uses "??" (not "||") so a real `false` from the
// payer-map endpoint is never coerced into "field absent".
function readAssignmentFields(assignment) {
  return {
    stallNumber:
      assignment.stallNumber || assignment.StallNumber || assignment.stallnumber,
    compoundId:
      assignment.compoundId ?? assignment.CompoundId ?? assignment.compoundid,
    bookingRanchId:
      assignment.bookingRanchId ||
      assignment.BookingRanchId ||
      assignment.bookingranchid ||
      null,
    bookingRanchName:
      assignment.bookingRanchName ||
      assignment.BookingRanchName ||
      assignment.bookingranchname ||
      null,
    horseName: assignment.horseName || assignment.HorseName || assignment.horsename || "",
    barnName: assignment.barnName || assignment.BarnName || assignment.barnname || "",
    isMine:
      assignment.isMine ?? assignment.IsMine ?? assignment.ismine ?? null,
    isForTack:
      assignment.isForTack ??
      assignment.IsForTack ??
      assignment.isfortack ??
      false,
    isMyRanch:
      assignment.isMyRanch ??
      assignment.IsMyRanch ??
      assignment.ismyranch ??
      false,
  };
}

// Two viewer modes drive "isMine":
// - ranch mode (default, RanchAdmin/HostSecretary, viewer.trustServerIsMine
//   falsy): mine = assignment's BookingRanchId matches the viewer's own
//   ranchId. Unchanged from before. Fed by the full-detail GetAssignments
//   endpoint (Admin/HostSecretary only).
// - payer mode (viewer.trustServerIsMine === true): mine = the assignment's
//   own IsMine field, exactly as computed server-side by
//   usp_GetStallAssignmentsForCompetitionPayer (ownership traced through
//   billcharge.paidbypersonid, forced to the caller's own PersonId - see
//   StallAssignmentsController.GetAssignmentsForPayer). The payer-map
//   endpoint never sends another participant's StallBookingId/ranch/identity
//   fields at all, so there is nothing left for the client to re-derive
//   ownership from even if it wanted to - trusting the server's IsMine is
//   not just simpler, it is now the ONLY option, which is the point.
function resolveIsMine(assignment, viewer) {
  var fields = readAssignmentFields(assignment);

  if (viewer.trustServerIsMine) {
    return fields.isMine === true;
  }

  return Number(fields.bookingRanchId) === Number(viewer.ranchId);
}

// "My ranch" state (2026-08-07, business decision: a boolean visual state
// only, never an identity). The payer-map endpoint computes IsMyRanch
// server-side (sb.requestingranchid = the caller's own already-authorized
// active ranch, see usp_GetStallAssignmentsForCompetitionPayer) and never
// sends this field in ranch/admin mode, so this always simply trusts what
// the server said, defaulting to false when absent - no client-side
// re-derivation, no viewer-mode branching needed (unlike resolveIsMine,
// which still has two modes for the unrelated Admin ranch-ownership rule).
function resolveIsMyRanch(assignment) {
  var fields = readAssignmentFields(assignment);
  return fields.isMyRanch === true;
}

// Keyed by CompoundId + StallNumber (never StallNumber alone) - identical
// stall numbers in two different compounds must never collide.
function buildAssignmentsByCompoundAndStall(assignments, viewer) {
  var map = {};

  (assignments || []).forEach(function (a) {
    var fields = readAssignmentFields(a);
    if (!fields.stallNumber || fields.compoundId == null) return;

    var key = fields.compoundId + "::" + fields.stallNumber;

    map[key] = {
      horseName: fields.horseName,
      barnName: fields.barnName,
      bookingRanchId: fields.bookingRanchId,
      bookingRanchName: fields.bookingRanchName,
      isForTack: fields.isForTack,
      isMine: resolveIsMine(a, viewer),
      isMyRanch: resolveIsMyRanch(a),
    };
  });

  return map;
}

// Per-compound count of the viewer's own highlighted stalls, for the
// compound tabs (badge + "contains my stalls" marker).
function buildMineCountByCompoundId(assignmentsByCompoundAndStall) {
  var counts = {};

  Object.keys(assignmentsByCompoundAndStall).forEach(function (key) {
    if (!assignmentsByCompoundAndStall[key].isMine) return;
    var compoundId = key.split("::")[0];
    counts[compoundId] = (counts[compoundId] || 0) + 1;
  });

  return counts;
}

// Default compound selection priority (business rule 6):
//   a. focusCompoundId when provided and it exists among the loaded compounds
//   b. first compound (by compoundId ascending) that contains a viewer-owned
//      stall
//   c. first compound by compoundId ascending
function resolveInitialCompoundId(rawCompounds, rawAssignments, focusCompoundId, viewer) {
  var sortedCompounds = (rawCompounds || [])
    .slice()
    .sort(function (a, b) {
      return Number(getCompoundId(a)) - Number(getCompoundId(b));
    });

  if (focusCompoundId != null) {
    var focusExists = sortedCompounds.some(function (c) {
      return Number(getCompoundId(c)) === Number(focusCompoundId);
    });
    if (focusExists) return focusCompoundId;
  }

  var compoundIdsWithMine = new Set();
  (rawAssignments || []).forEach(function (a) {
    if (!resolveIsMine(a, viewer)) return;
    var fields = readAssignmentFields(a);
    if (fields.compoundId != null) {
      compoundIdsWithMine.add(Number(fields.compoundId));
    }
  });

  var firstWithMine = sortedCompounds.find(function (c) {
    return compoundIdsWithMine.has(Number(getCompoundId(c)));
  });
  if (firstWithMine) return getCompoundId(firstWithMine);

  return sortedCompounds.length > 0 ? getCompoundId(sortedCompounds[0]) : null;
}

// Zoom range shared by StallMapModal's buttons and its fit-to-screen
// calculation, so both stay in sync with a single source of truth.
var MIN_ZOOM = 0.6;
var MAX_ZOOM = 2.2;
var ZOOM_STEP = 0.2;

function clampZoom(zoom) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

// Largest zoom (within [MIN_ZOOM, MAX_ZOOM]) that still fits the whole
// compound grid inside the given viewport, so opening/switching a compound
// starts at a readable overview instead of a fixed, often-too-tight crop
// (UX task section A/B). Falls back to 1 when layout or viewport size isn't
// known yet.
function computeFitZoom(rows, cols, viewportWidth, viewportHeight, cellSize, cellGap) {
  if (!rows || !cols || !viewportWidth || !viewportHeight || !cellSize) {
    return 1;
  }

  var neededWidth = cols * cellSize + Math.max(0, cols - 1) * cellGap;
  var neededHeight = rows * cellSize + Math.max(0, rows - 1) * cellGap;

  var widthRatio = viewportWidth / neededWidth;
  var heightRatio = viewportHeight / neededHeight;

  return clampZoom(Math.min(widthRatio, heightRatio));
}

var DETAIL_LEVEL_FAR = "far";
var DETAIL_LEVEL_MEDIUM = "medium";
var DETAIL_LEVEL_CLOSE = "close";

// Progressive detail thresholds (UX task section C): how much text a stall
// cell shows is driven by the current zoom, not a fixed per-cell size, so
// zooming in progressively reveals more without any per-cell layout logic.
function resolveDetailLevel(zoomLevel) {
  if (zoomLevel >= 1.4) return DETAIL_LEVEL_CLOSE;
  if (zoomLevel >= 0.9) return DETAIL_LEVEL_MEDIUM;
  return DETAIL_LEVEL_FAR;
}

export {
  getCompoundId,
  readAssignmentFields,
  resolveIsMine,
  resolveIsMyRanch,
  buildAssignmentsByCompoundAndStall,
  buildMineCountByCompoundId,
  resolveInitialCompoundId,
  MIN_ZOOM,
  MAX_ZOOM,
  ZOOM_STEP,
  clampZoom,
  computeFitZoom,
  DETAIL_LEVEL_FAR,
  DETAIL_LEVEL_MEDIUM,
  DETAIL_LEVEL_CLOSE,
  resolveDetailLevel,
};

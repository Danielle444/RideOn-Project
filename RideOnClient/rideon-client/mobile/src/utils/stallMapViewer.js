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
    horseName: assignment.horseName || assignment.HorseName || assignment.horsename || "",
    barnName: assignment.barnName || assignment.BarnName || assignment.barnname || "",
    isMine:
      assignment.isMine ?? assignment.IsMine ?? assignment.ismine ?? null,
    isForTack:
      assignment.isForTack ??
      assignment.IsForTack ??
      assignment.isfortack ??
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
      isForTack: fields.isForTack,
      isMine: resolveIsMine(a, viewer),
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

export {
  getCompoundId,
  readAssignmentFields,
  resolveIsMine,
  buildAssignmentsByCompoundAndStall,
  buildMineCountByCompoundId,
  resolveInitialCompoundId,
};

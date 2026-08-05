// Pure per-class draw-state + cancellation-after-start classification for
// EntriesViewModal (CAP-2). CancelledAfterStart rows are identified
// defensively via either signal the endpoint may send - a boolean flag or a
// literal status string - and are excluded from the Active set used to
// decide whether a class is "drawn". The accepted product rule: if every
// Active row currently has a drawOrder number, the client treats the class
// as drawn - no backend "draw published" flag exists or is required.

function isCancelledAfterStartRow(item) {
  if (!item) {
    return false;
  }

  return (
    item.isCancelledAfterStart === true ||
    item.entryStatus === "CancelledAfterStart"
  );
}

function isActiveEntryForDraw(item) {
  if (!item || isCancelledAfterStartRow(item)) {
    return false;
  }

  // entryStatus defaults to "Active" server-side when unset (see
  // SecretaryCompetitionEntryItem.cs) - mirrored here rather than treating a
  // missing status as excluded.
  var status = item.entryStatus || "Active";

  return status === "Active";
}

function computeClassDrawState(items) {
  var list = Array.isArray(items) ? items : [];
  var activeRows = list.filter(isActiveEntryForDraw);

  var isDrawn =
    activeRows.length > 0 &&
    activeRows.every(function (item) {
      return item.drawOrder !== null && item.drawOrder !== undefined;
    });

  return { isDrawn: isDrawn, activeRows: activeRows };
}

export { isCancelledAfterStartRow, isActiveEntryForDraw, computeClassDrawState };

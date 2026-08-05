// Pure visible-set + tally helpers for DuplicateEntriesModal (CAP-4). Rows
// with no matching class in the active competition are hidden entirely -
// never rendered as "no matching class" - while alreadyExists rows stay
// visible but ineligible/non-selectable. All three displayed counts must be
// derived from the visible set, never the raw fetch.

function getVisibleDuplicateEntries(entries) {
  var list = Array.isArray(entries) ? entries : [];

  return list.filter(function (item) {
    return !!(item && item.targetClassInCompId);
  });
}

function isDuplicateEntryEligible(item) {
  return !!(item && item.targetClassInCompId && !item.alreadyExists);
}

function getDuplicateEntryCounts(visibleEntries) {
  var list = Array.isArray(visibleEntries) ? visibleEntries : [];

  var eligible = list.filter(isDuplicateEntryEligible).length;

  return { total: list.length, eligible: eligible };
}

export {
  getVisibleDuplicateEntries,
  isDuplicateEntryEligible,
  getDuplicateEntryCounts,
};

// Central Hebrew copy for the shared-physical-run duplicate warning shown on
// the secretary draw/running-order screen. Approved by Oren during the
// shared-physical-runs correction round -- do not reword without going back
// through approval, and do not inline a copy of this string elsewhere;
// import formatDuplicateEntriesMessage from here (or from
// physicalRunGrouping.utils.js, which re-exports it for the hook's existing
// import site).

export var DUPLICATE_ENTRIES_PREFIX =
  "נמצאו הרשמות כפולות לאותו מקצה. יש לתקן אותן לפני עריכת ההגרלה — ";

export function formatDuplicateEntryDetail(duplicate) {
  return (
    duplicate.riderName +
    " / " +
    duplicate.horseName +
    " / " +
    duplicate.className +
    ": הרשמות " +
    duplicate.entryIds.join(", ")
  );
}

export function formatDuplicateEntriesMessage(duplicates) {
  if (!duplicates || duplicates.length === 0) {
    return "";
  }

  return (
    DUPLICATE_ENTRIES_PREFIX +
    duplicates.map(formatDuplicateEntryDetail).join("; ")
  );
}

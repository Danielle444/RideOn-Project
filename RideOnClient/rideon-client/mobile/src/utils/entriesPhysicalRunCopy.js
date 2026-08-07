// Central Hebrew copy for the shared-physical-run duplicate warning shown in
// EntriesViewModal. Approved by Oren during the shared-physical-runs
// correction round -- do not reword without going back through approval, and
// do not inline a copy of either string elsewhere; import from here.

export var DUPLICATE_WARNING_MAIN =
  "נמצאו הרשמות כפולות לאותו מקצה. יש לתקן אותן לפני פרסום סדר הכניסות.";

export function formatDuplicateWarningDetails(entryIds) {
  var ids = Array.isArray(entryIds) ? entryIds : [];
  return "הרשמות: " + ids.join(", ");
}

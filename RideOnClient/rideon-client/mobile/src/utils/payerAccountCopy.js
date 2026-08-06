// CAP-7: one central Hebrew copy module for the payer-account lifecycle UI -
// band headers, row chips, cancellation confirmations, and
// direct-vs-secretary-pending result copy.
//
// Nothing in this module is wired into any screen yet (Phase 1 scope).
// AdminCompetitionPayerAccountScreen.jsx and PayerCompetitionAccountScreen.jsx
// still show their own inline strings today (e.g. "בקשת ביטול נשלחה
// למזכירה" at AdminCompetitionPayerAccountScreen.jsx:291,355), and those
// remain TRUE right now because CAP-6 has not rewired their actions onto the
// direct admin-* endpoints yet. Wiring happens in a later phase, action by
// action, only once each action's backend path is confirmed rewired - never
// before, since swapping copy ahead of the backend would make the UI lie in
// the opposite direction.
//
// Every string below not already present verbatim in the approved SPEC is a
// PROPOSAL and needs Oren's sign-off before it ships anywhere, per this
// project's standing Hebrew-copy rule. Proposed strings are marked inline.

import { LIFECYCLE_STATE } from "./payerAccountLifecycle.js";

// --- Lifecycle band headers ----------------------------------------------
// "ממתין לאישור" and "מבוטל" are locked in SPEC.md (CAP-3 / CAP-8) - reused
// verbatim, not proposed. "פעיל" for the active band has no SPEC-quoted
// string and is proposed.
var LIFECYCLE_BAND_HEADER = {};
LIFECYCLE_BAND_HEADER[LIFECYCLE_STATE.ACTIVE] = "פעיל"; // proposed
LIFECYCLE_BAND_HEADER[LIFECYCLE_STATE.PENDING_CHANGE] = "ממתין לאישור"; // SPEC-locked
LIFECYCLE_BAND_HEADER[LIFECYCLE_STATE.PENDING_CANCELLATION] = "ממתין לאישור"; // SPEC-locked, same band as pendingChange
LIFECYCLE_BAND_HEADER[LIFECYCLE_STATE.CANCELLED] = "מבוטל"; // SPEC-locked

function getLifecycleBandHeader(lifecycleState) {
  return LIFECYCLE_BAND_HEADER[lifecycleState] || null;
}

// --- Shavings "needs review" fallback (CAP-4) ------------------------------
// Used only for a shavings order whose linked stallBookingIds resolve to no
// stall in the payer's own account.stalls[] - a real, reachable shape (a
// shavings order can be billed to one payer while every stall it links to is
// billed to another). Deliberately does not say "פעיל"/"מבוטל"/"ממתין
// לאישור" - none of those would be true; this says plainly that the state is
// unverified instead of guessing one.
var SHAVINGS_NEEDS_REVIEW_COPY = {
  bandHeader: "דורש בדיקה",
  stallLabel: "לא ניתן לאמת את סטטוס התא המקושר",
};

// --- Row lifecycle chips --------------------------------------------------
// Shorter, per-row text. pendingChange/pendingCancellation get distinct chip
// text even though CAP-3 bands them under one shared header. All proposed.
var LIFECYCLE_ROW_CHIP = {};
LIFECYCLE_ROW_CHIP[LIFECYCLE_STATE.ACTIVE] = "פעיל"; // proposed
LIFECYCLE_ROW_CHIP[LIFECYCLE_STATE.PENDING_CHANGE] = "ממתין לשינוי"; // proposed
LIFECYCLE_ROW_CHIP[LIFECYCLE_STATE.PENDING_CANCELLATION] = "ממתין לביטול"; // proposed
LIFECYCLE_ROW_CHIP[LIFECYCLE_STATE.CANCELLED] = "מבוטל"; // SPEC-locked

function getLifecycleRowChip(lifecycleState) {
  return LIFECYCLE_ROW_CHIP[lifecycleState] || null;
}

// --- Cancellation confirmation --------------------------------------------
// Deliberately routing-neutral: shown to the user BEFORE the mutation call
// is made, so it cannot yet know whether the server will apply directly or
// route to the secretary (that is only knowable from resultType AFTER the
// call returns - see getResultTypeCopy below). Never claims a specific
// route, unlike today's screen text.
function getCancellationConfirmationText(itemLabel) {
  return "האם לבטל את " + itemLabel + "?"; // proposed
}

var PAYER_ACCOUNT_ITEM_LABEL = {
  entry: "ההרשמה למקצה", // proposed
  paidTime: "בקשת הפייד טיים", // proposed
  stall: "הזמנת התא", // proposed
};

// --- Post-mutation result copy --------------------------------------------
var RESULT_CATEGORY = {
  DIRECT_SUCCESS: "directSuccess",
  SECRETARY_PENDING: "secretaryPending",
};

// Keyed ONLY by resultType values actually read off a live proc body during
// Phase 0 (usp_admincreateentry / usp_admineditentry, verified live via
// pg_get_functiondef, 2026-08-06). Cancel (usp_admincancelentry) has no
// resultType column at all - it is unconditionally direct - so its copy is
// looked up separately via DIRECT_CANCELLATION_COPY below, not through this
// map. Do not add an entry here for a resultType that has not been read off
// a live proc.
var RESULT_TYPE_COPY = {};
RESULT_TYPE_COPY.DirectCreated = {
  category: RESULT_CATEGORY.DIRECT_SUCCESS,
  text: "ההרשמה נוצרה", // proposed
};
RESULT_TYPE_COPY.PendingCreateApproval = {
  category: RESULT_CATEGORY.SECRETARY_PENDING,
  text: "הבקשה להוספת הרשמה ממתינה לאישור המזכירה", // proposed
};
RESULT_TYPE_COPY.DirectUpdated = {
  category: RESULT_CATEGORY.DIRECT_SUCCESS,
  text: "העדכון בוצע", // proposed
};
RESULT_TYPE_COPY.DirectReplaced = {
  category: RESULT_CATEGORY.DIRECT_SUCCESS,
  text: "השינוי בוצע", // proposed
};
RESULT_TYPE_COPY.PendingReplaceApproval = {
  category: RESULT_CATEGORY.SECRETARY_PENDING,
  text: "בקשת השינוי ממתינה לאישור המזכירה", // proposed
};

// Safe fallback for any resultType not in the map above - including one
// that doesn't exist yet, or a typo/regression on either side. Deliberately
// does NOT say "בוצע" (applied) or "נשלחה למזכירה" (sent to the secretary):
// claiming either outcome when it is actually unverified is exactly the
// kind of lie CAP-7 exists to remove. category is null on purpose - callers
// must treat a null category as "outcome unknown", never silently default
// to one route or the other.
var UNKNOWN_RESULT_TYPE_COPY = {
  category: null,
  text: "הפעולה נקלטה", // proposed - "the action was recorded"
};

function getResultTypeCopy(resultType) {
  if (
    typeof resultType === "string" &&
    Object.prototype.hasOwnProperty.call(RESULT_TYPE_COPY, resultType)
  ) {
    return RESULT_TYPE_COPY[resultType];
  }

  return UNKNOWN_RESULT_TYPE_COPY;
}

// Cancel (usp_admincancelentry, and the not-yet-built stall-cancel
// equivalent) is unconditionally direct (verified live, Phase 0) - no
// resultType branching applies. This is the direct-success copy for a
// cancellation once an action is actually rewired onto an admin-cancel
// endpoint.
var DIRECT_CANCELLATION_COPY = {
  category: RESULT_CATEGORY.DIRECT_SUCCESS,
  text: "הביטול בוצע", // proposed
};

export {
  RESULT_CATEGORY,
  PAYER_ACCOUNT_ITEM_LABEL,
  getLifecycleBandHeader,
  getLifecycleRowChip,
  getCancellationConfirmationText,
  getResultTypeCopy,
  DIRECT_CANCELLATION_COPY,
  UNKNOWN_RESULT_TYPE_COPY,
  SHAVINGS_NEEDS_REVIEW_COPY,
};

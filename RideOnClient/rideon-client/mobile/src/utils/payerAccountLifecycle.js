// CAP-2: one shared, pure lifecycle-normalizing helper for every
// payer-account item type (classes / paid time / stalls / shavings),
// replacing the per-screen inline isCancelled/hasPendingCancellation/
// entryStatus checks scattered across AdminCompetitionPayerAccountScreen.jsx
// and PayerCompetitionAccountScreen.jsx - including the class-item checks at
// AdminCompetitionPayerAccountScreen.jsx:975-977 and
// PayerCompetitionAccountScreen.jsx:608-610, which are dead code today
// because usp_getpayercompetitionaccount's classes[] array has none of the
// fields they read (verified live, Phase 0, 2026-08-06).
//
// Deliberately one shared module rather than this codebase's usual
// small-per-file-helper convention (see payerAccountAvailableDates.js's own
// header comment) - CAP-2's whole point is to stop each surface
// reimplementing this mapping independently.

var LIFECYCLE_STATE = {
  ACTIVE: "active",
  PENDING_CHANGE: "pendingChange",
  PENDING_CANCELLATION: "pendingCancellation",
  CANCELLED: "cancelled",
};

// Distinct from every value in LIFECYCLE_STATE on purpose - "cannot be
// determined yet" must never be mistaken for a real, server-verified
// "active" state by a caller that forgets to check for it explicitly.
var LIFECYCLE_STATE_UNKNOWN = "unknown";

var PAYER_ACCOUNT_ITEM_TYPE = {
  CLASS: "class",
  PAID_TIME: "paidTime",
  STALL: "stall",
  SHAVINGS: "shavings",
};

var KNOWN_LIFECYCLE_STATES = [
  LIFECYCLE_STATE.ACTIVE,
  LIFECYCLE_STATE.PENDING_CHANGE,
  LIFECYCLE_STATE.PENDING_CANCELLATION,
  LIFECYCLE_STATE.CANCELLED,
];

// Stalls carry the full signal set today: usp_getpayercompetitionaccount's
// stalls[] array returns isCancelled / hasPendingCancellation /
// hasPendingChange (verified live, Phase 0, 2026-08-06). isCancelled wins
// if a stale pending flag were ever also true. A missing/non-object item is
// not a verified real shape - it resolves to UNKNOWN, never a guessed
// Active; only an actual stall object with none of the three flags set
// resolves to Active, since "all flags false" IS a verified real shape this
// proc sends.
function resolveStallLifecycleState(stall) {
  if (!stall || typeof stall !== "object") {
    return LIFECYCLE_STATE_UNKNOWN;
  }

  if (stall.isCancelled === true) {
    return LIFECYCLE_STATE.CANCELLED;
  }

  if (stall.hasPendingCancellation === true) {
    return LIFECYCLE_STATE.PENDING_CANCELLATION;
  }

  if (stall.hasPendingChange === true) {
    return LIFECYCLE_STATE.PENDING_CHANGE;
  }

  return LIFECYCLE_STATE.ACTIVE;
}

// Paid time carries only a `status` string (verified live:
// paidTimes[].status, sourced from paidtimerequest.status). The only
// verified cancellation sentinel is the literal "Cancelled" written by
// usp_cancelpaidtimerequestbypayer and usp_cancelpaidtimerequest - both
// cancel DIRECTLY, and Phase 0 found no pending-request/approval flow for
// paid time anywhere in this repo. Status values such as Pending/Assigned
// track slot-assignment workflow, not a pendingChange/pendingCancellation
// cancellation state - there is no verified pending-lifecycle status string
// for paid time, so none is mapped here (do not invent one). A missing/
// non-object item is not a verified real shape - it resolves to UNKNOWN,
// never a guessed Active; only an actual item with a real, non-cancelled
// status resolves to Active.
function resolvePaidTimeLifecycleState(paidTime) {
  if (!paidTime || typeof paidTime !== "object") {
    return LIFECYCLE_STATE_UNKNOWN;
  }

  if (paidTime.status === "Cancelled") {
    return LIFECYCLE_STATE.CANCELLED;
  }

  return LIFECYCLE_STATE.ACTIVE;
}

// Shavings carry no lifecycle field of their own - only deliveryStatus,
// which tracks Pending/Seen/Delivered and is unrelated to cancellation
// (verified live: neither the nested stalls[].shavingsOrders[] rows nor the
// top-level shavings[] rows have isCancelled/hasPendingCancellation/
// hasPendingChange). They inherit the parent stall booking's already
// resolved lifecycle state verbatim. A parentStallLifecycleState that isn't
// one of the four known states (a caller bug, not real data - the contract
// is "always pass an already-resolved stall state") resolves to UNKNOWN
// rather than guessing Active, since there is no independent signal here to
// fall back on.
function resolveShavingsLifecycleState(parentStallLifecycleState) {
  if (KNOWN_LIFECYCLE_STATES.indexOf(parentStallLifecycleState) === -1) {
    return LIFECYCLE_STATE_UNKNOWN;
  }

  return parentStallLifecycleState;
}

// Classes carry NO lifecycle field today - usp_getpayercompetitionaccount's
// classes[] array has no isCancelled/hasPendingCancellation/entryStatus key
// at all (verified live, Phase 0, 2026-08-06). CAP-8 is expected to add an
// entryStatus-shaped field, but its exact name and value vocabulary are NOT
// yet verified against a deployed proc - this mapping is provisional and
// must be re-checked once CAP-8 ships. Only the three entry-status values
// already confirmed elsewhere in this system (Active / Cancelled /
// CancelledAfterStart, e.g. in usp_answerchangeentryrequestsecured and
// usp_getsecretarycompetitionentries) are mapped; anything else - including
// a missing field, which is every real class item today - resolves to
// LIFECYCLE_STATE_UNKNOWN rather than a guessed "active". This is the
// deliberate difference from resolveStallLifecycleState/
// resolvePaidTimeLifecycleState above: those default a missing signal to
// Active because "no flags set" is itself a verified, real shape those
// procs already send; a missing entryStatus on a class item is not a real
// shape claiming anything - it is simply absent.
function resolveClassLifecycleState(classItem) {
  if (!classItem || typeof classItem.entryStatus !== "string") {
    return LIFECYCLE_STATE_UNKNOWN;
  }

  if (classItem.entryStatus === "Active") {
    return LIFECYCLE_STATE.ACTIVE;
  }

  if (
    classItem.entryStatus === "Cancelled" ||
    classItem.entryStatus === "CancelledAfterStart"
  ) {
    return LIFECYCLE_STATE.CANCELLED;
  }

  return LIFECYCLE_STATE_UNKNOWN;
}

// Single dispatch entry point. `context.parentStallLifecycleState` is
// required for itemType "shavings" only; every other type reads its own
// item directly and ignores context.
function resolvePayerAccountItemLifecycleState(itemType, item, context) {
  if (itemType === PAYER_ACCOUNT_ITEM_TYPE.STALL) {
    return resolveStallLifecycleState(item);
  }

  if (itemType === PAYER_ACCOUNT_ITEM_TYPE.PAID_TIME) {
    return resolvePaidTimeLifecycleState(item);
  }

  if (itemType === PAYER_ACCOUNT_ITEM_TYPE.SHAVINGS) {
    return resolveShavingsLifecycleState(
      context && context.parentStallLifecycleState,
    );
  }

  if (itemType === PAYER_ACCOUNT_ITEM_TYPE.CLASS) {
    return resolveClassLifecycleState(item);
  }

  return LIFECYCLE_STATE_UNKNOWN;
}

export {
  LIFECYCLE_STATE,
  LIFECYCLE_STATE_UNKNOWN,
  PAYER_ACCOUNT_ITEM_TYPE,
  resolveStallLifecycleState,
  resolvePaidTimeLifecycleState,
  resolveShavingsLifecycleState,
  resolveClassLifecycleState,
  resolvePayerAccountItemLifecycleState,
};

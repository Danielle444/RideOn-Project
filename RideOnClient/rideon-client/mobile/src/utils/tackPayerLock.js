// CAP-5 correction: pure locked-payer resolution for the tack stall draft,
// extracted out of useAdminTackStallBookings.js / useAdminCompetitionStall
// Bookings.js so the "locked wins over both split modes, in both the
// selectable-choices list and the submitted payload" rule is testable with
// plain vitest - no hook rendering needed.

// The array of payers actually SUBMITTED with a tack booking. When locked,
// this is always exactly [lockedPayer] regardless of split mode - "equal"
// would otherwise resolve to allSelectedHorsePayers (which can include
// payers from pre-existing, unrelated bookings), and "specific" could
// otherwise carry over a stale selectedTackPayers value.
function resolveEffectiveTackPayers(params) {
  var lockedPayer = params ? params.lockedPayer : null;

  if (lockedPayer) {
    return [lockedPayer];
  }

  var tackSplitMode = params ? params.tackSplitMode : null;
  var allSelectedHorsePayers =
    (params && params.allSelectedHorsePayers) || [];
  var selectedTackPayers = (params && params.selectedTackPayers) || [];

  if (tackSplitMode === "equal") {
    return allSelectedHorsePayers;
  }

  return selectedTackPayers;
}

// The array of payers OFFERED as choices in the "specific" split mode's
// selector. Deliberately separate from allSelectedHorsePayers itself (that
// value's own merged-with-history meaning is never changed) - this is what
// a locked-account modal substitutes at the prop boundary instead.
function resolveTackPayerChoices(params) {
  var lockedPayer = params ? params.lockedPayer : null;

  if (lockedPayer) {
    return [lockedPayer];
  }

  return (params && params.allSelectedHorsePayers) || [];
}

// Whether toggleTackPayerSelection must refuse to mutate selectedTackPayers
// at all - true whenever a payer is locked, regardless of which payer or
// which direction (add/remove) was attempted.
function isTackPayerSelectionLocked(lockedPayer) {
  return !!lockedPayer;
}

export {
  resolveEffectiveTackPayers,
  resolveTackPayerChoices,
  isTackPayerSelectionLocked,
};

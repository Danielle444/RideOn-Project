// CAP-5: pure tack/equipment preview pricing, extracted so it's testable
// with plain vitest (no component rendering). Deliberately NOT
// calculateNumberOfDays from useAdminCompetitionStallsOverview.js - that
// helper is exclusive (endDate - startDate) and serves the already-verified
// saved-stall-card surface; this one is inclusive
// (endDate - startDate + 1), matching what the tack preview must show
// (same start/end date = 1 day, Aug 1 through Aug 3 = 3 days).

function parseIsoDateOnly(value) {
  if (!value) {
    return null;
  }

  var parts = String(value).slice(0, 10).split("-");

  if (parts.length !== 3) {
    return null;
  }

  var year = Number(parts[0]);
  var month = Number(parts[1]);
  var day = Number(parts[2]);

  if (!year || !month || !day) {
    return null;
  }

  // Explicit numeric y/m/d components (local time), not new Date(string) -
  // parsing a bare YYYY-MM-DD as UTC and then reading local getters can be
  // off by a day depending on the device's timezone.
  var date = new Date(year, month - 1, day);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

// Returns null (not NaN/0) for a missing, unparsable, or reversed range -
// callers decide their own fallback for "unknown".
function calculateInclusiveDayCount(startDate, endDate) {
  var start = parseIsoDateOnly(startDate);
  var end = parseIsoDateOnly(endDate);

  if (!start || !end) {
    return null;
  }

  var diffDays =
    Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  if (diffDays <= 0) {
    return null;
  }

  return diffDays;
}

// quantity × unitPrice × inclusive day count. Falls back to a single day
// (the same "unknown range defaults to 1 day" convention already used by
// calculateNumberOfDays) when the date range is missing, unparsable, or
// reversed - so the preview total is always a real number, never NaN, and
// still reflects quantity/price while the dates are incomplete.
function calculateTackPreviewTotal(params) {
  var quantity = Number((params && params.quantity) || 0);
  var unitPrice = Number((params && params.unitPrice) || 0);
  var dayCount = calculateInclusiveDayCount(
    params && params.startDate,
    params && params.endDate,
  );
  var effectiveDayCount = dayCount === null ? 1 : dayCount;

  return {
    dayCount: effectiveDayCount,
    totalPrice: quantity * unitPrice * effectiveDayCount,
  };
}

export { calculateInclusiveDayCount, calculateTackPreviewTotal };

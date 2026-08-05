// CAP-4: pure per-tab date-availability logic for the payer-account screen,
// extracted so it's testable with plain vitest (no component rendering).
// Mirrors AdminCompetitionPayerAccountScreen.jsx's own pickDateKey format
// exactly (ISO yyyy-mm-dd, or "no-date" for a missing/unparsable value) -
// duplicated here on purpose, matching this codebase's convention of small,
// self-contained per-file normalize/pick helpers rather than a shared
// kernel module.

function pickDateKey(dateValue) {
  if (!dateValue) {
    return "no-date";
  }

  try {
    return new Date(dateValue).toISOString().slice(0, 10);
  } catch (error) {
    return String(dateValue);
  }
}

var TAB_DATE_FIELDS = {
  classes: "classDateTime",
  paidTimes: "displaySlotDate",
  stalls: "startDate",
};

function getSourceListForTab(activeTab, account) {
  if (activeTab === "classes") {
    return account && account.classes;
  }

  if (activeTab === "paidTimes") {
    return account && account.paidTimes;
  }

  if (activeTab === "stalls") {
    return account && account.stalls;
  }

  return null;
}

// Returns a sorted array of date keys for the given tab ONLY, derived from
// that tab's own item list and date field - never a union across
// classes/paidTimes/stalls. An unrecognized tab (e.g. "summary", which has
// no date field at all) returns an empty array.
function getAvailableDatesForTab(activeTab, account) {
  var dateField = TAB_DATE_FIELDS[activeTab];

  if (!dateField) {
    return [];
  }

  var sourceList = getSourceListForTab(activeTab, account);

  var keys = new Set();

  (sourceList || []).forEach(function (item) {
    var key = pickDateKey(item ? item[dateField] : null);

    if (key !== "no-date") {
      keys.add(key);
    }
  });

  return Array.from(keys).sort();
}

export { pickDateKey, getAvailableDatesForTab, TAB_DATE_FIELDS };

// CAP-1: pure applied/draft filter-state helpers for the board filter
// bottom sheet, extracted so they're testable with plain vitest (no
// react-native import, no component rendering) - mirrors this codebase's
// convention of small, self-contained per-surface state helpers (see
// tackPayerLock.js, entryDuplicateMatch.js).

function emptyFilters() {
  return {
    searchText: "",
    hostRanchIds: [],
    fieldIds: [],
    statusValues: [],
    dateFrom: "",
    dateTo: "",
  };
}

function toSafeFilters(filters) {
  var base = emptyFilters();

  if (!filters) {
    return base;
  }

  return {
    searchText: filters.searchText || "",
    hostRanchIds: Array.isArray(filters.hostRanchIds) ? filters.hostRanchIds : [],
    fieldIds: Array.isArray(filters.fieldIds) ? filters.fieldIds : [],
    statusValues: Array.isArray(filters.statusValues) ? filters.statusValues : [],
    dateFrom: filters.dateFrom || "",
    dateTo: filters.dateTo || "",
  };
}

function toggleValueInArray(list, value) {
  var safeList = Array.isArray(list) ? list : [];

  var exists = safeList.some(function (item) {
    return String(item) === String(value);
  });

  if (exists) {
    return safeList.filter(function (item) {
      return String(item) !== String(value);
    });
  }

  return safeList.concat([value]);
}

export { emptyFilters, toSafeFilters, toggleValueInArray };

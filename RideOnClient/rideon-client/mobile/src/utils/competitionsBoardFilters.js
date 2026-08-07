import { getCompetitionStatusLabel } from "../../../shared/auth/utils/competitions/competitionStatus";
import { sortStatusOptionsByConfiguredOrder } from "../../../shared/auth/utils/competitions/competitionSorting";

var DRAFT_STATUS = "טיוטה";

function buildHostRanchOptions(items) {
  var map = new Map();

  (Array.isArray(items) ? items : []).forEach(function (item) {
    if (item && item.hostRanchId && item.hostRanchName && !map.has(item.hostRanchId)) {
      map.set(item.hostRanchId, {
        value: item.hostRanchId,
        label: item.hostRanchName,
      });
    }
  });

  return Array.from(map.values());
}

function buildFieldOptions(items) {
  var map = new Map();

  (Array.isArray(items) ? items : []).forEach(function (item) {
    if (item && item.fieldId && item.fieldName && !map.has(item.fieldId)) {
      map.set(item.fieldId, {
        value: item.fieldId,
        label: item.fieldName,
      });
    }
  });

  return Array.from(map.values());
}

// Draft is never offered as a filter option, regardless of what the backend returns.
function buildStatusOptions(items, statusOrder) {
  var values = Array.from(
    new Set(
      (Array.isArray(items) ? items : [])
        .map(function (item) {
          return item && item.competitionStatus;
        })
        .filter(function (status) {
          return status && status !== DRAFT_STATUS;
        }),
    ),
  );

  return sortStatusOptionsByConfiguredOrder(values, statusOrder).map(
    function (status) {
      return { value: status, label: getCompetitionStatusLabel(status) };
    },
  );
}

function competitionDateOnly(value) {
  return String(value || "").slice(0, 10);
}

// CAP-1: status/host-ranch/field are now multi-select sets rather than a
// single scalar. An empty (or missing) set means "no filtering for this
// facet"; a non-empty set matches when the row's value is contained in it.
function matchesMultiSelect(value, selectedValues) {
  if (!Array.isArray(selectedValues) || selectedValues.length === 0) {
    return true;
  }

  return selectedValues.some(function (selected) {
    return String(selected) === String(value);
  });
}

// Client-side only, mirroring the secretary web board's filter set. Draft is
// always excluded regardless of whether the source proc already excludes it.
function filterCompetitionsForBoard(items, filters) {
  var source = Array.isArray(items) ? items : [];
  var searchText = String((filters && filters.searchText) || "")
    .trim()
    .toLowerCase();
  var hostRanchFilter = filters && filters.hostRanchFilter;
  var fieldFilter = filters && filters.fieldFilter;
  var statusFilter = filters && filters.statusFilter;
  var dateFrom = filters && filters.dateFrom;
  var dateTo = filters && filters.dateTo;

  return source.filter(function (item) {
    if (!item || item.competitionStatus === DRAFT_STATUS) {
      return false;
    }

    if (
      searchText &&
      !String(item.competitionName || "")
        .toLowerCase()
        .includes(searchText)
    ) {
      return false;
    }

    if (!matchesMultiSelect(item.hostRanchId, hostRanchFilter)) {
      return false;
    }

    if (!matchesMultiSelect(item.fieldId, fieldFilter)) {
      return false;
    }

    if (!matchesMultiSelect(item.competitionStatus, statusFilter)) {
      return false;
    }

    var startDate = competitionDateOnly(item.competitionStartDate);

    if (dateFrom && startDate && startDate < dateFrom) {
      return false;
    }

    if (dateTo && startDate && startDate > dateTo) {
      return false;
    }

    return true;
  });
}

export {
  buildHostRanchOptions,
  buildFieldOptions,
  buildStatusOptions,
  matchesMultiSelect,
  filterCompetitionsForBoard,
};

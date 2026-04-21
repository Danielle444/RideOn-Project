function buildCompetitionStatusOrderMap(statusOrder) {
  var orderMap = {};

  (Array.isArray(statusOrder) ? statusOrder : []).forEach(function (
    status,
    index,
  ) {
    orderMap[status] = index + 1;
  });

  return orderMap;
}

function getCompetitionStartDateValue(item) {
  if (!item || !item.competitionStartDate) {
    return Number.MAX_SAFE_INTEGER;
  }

  var dateValue = new Date(item.competitionStartDate).getTime();

  if (Number.isNaN(dateValue)) {
    return Number.MAX_SAFE_INTEGER;
  }

  return dateValue;
}

function getCompetitionStatusOrderValue(status, statusOrder) {
  var orderMap = buildCompetitionStatusOrderMap(statusOrder);

  if (orderMap[status] !== undefined) {
    return orderMap[status];
  }

  return 999;
}

function sortCompetitionsByStatusAndDate(items, statusOrder) {
  var sourceItems = Array.isArray(items) ? items.slice() : [];

  sourceItems.sort(function (a, b) {
    var statusOrderA = getCompetitionStatusOrderValue(
      a?.competitionStatus,
      statusOrder,
    );
    var statusOrderB = getCompetitionStatusOrderValue(
      b?.competitionStatus,
      statusOrder,
    );

    if (statusOrderA !== statusOrderB) {
      return statusOrderA - statusOrderB;
    }

    var startDateA = getCompetitionStartDateValue(a);
    var startDateB = getCompetitionStartDateValue(b);

    if (startDateA !== startDateB) {
      return startDateA - startDateB;
    }

    var nameA = String(a?.competitionName || "");
    var nameB = String(b?.competitionName || "");

    return nameA.localeCompare(nameB, "he");
  });

  return sourceItems;
}

function sortStatusOptionsByConfiguredOrder(options, statusOrder) {
  var sourceOptions = Array.isArray(options) ? options.slice() : [];

  sourceOptions.sort(function (a, b) {
    var valueA = typeof a === "string" ? a : a?.value ?? a?.label ?? "";
    var valueB = typeof b === "string" ? b : b?.value ?? b?.label ?? "";

    var orderA = getCompetitionStatusOrderValue(valueA, statusOrder);
    var orderB = getCompetitionStatusOrderValue(valueB, statusOrder);

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    return String(valueA).localeCompare(String(valueB), "he");
  });

  return sourceOptions;
}

export {
  sortCompetitionsByStatusAndDate,
  sortStatusOptionsByConfiguredOrder,
};
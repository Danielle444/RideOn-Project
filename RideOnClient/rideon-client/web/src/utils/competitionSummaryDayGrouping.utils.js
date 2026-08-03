// Pure client-side grouping/roll-up/totals arithmetic for the Competition Summary breakdown
// modal (day tier for classes/paid-time, and the shared summary strip for every category).
// Everything here operates on data already fetched by useCompetitionSummaryPage /
// SummaryDetailsModal.jsx; nothing here fetches data, and none of it has a React dependency --
// that's what makes it unit-testable without a DOM.

function getValue(item, camelKey, pascalKey, fallback) {
  if (!item) {
    return fallback;
  }

  if (item[camelKey] !== null && item[camelKey] !== undefined) {
    return item[camelKey];
  }

  if (item[pascalKey] !== null && item[pascalKey] !== undefined) {
    return item[pascalKey];
  }

  return fallback;
}

function sumField(items, camelKey, pascalKey) {
  return items.reduce(function (total, item) {
    return total + Number(getValue(item, camelKey, pascalKey, 0));
  }, 0);
}

/**
 * The raw (unparsed) value of the field that defines "day" for a given category. Deliberately
 * returned as-is, not re-parsed into a Date: rows sharing a calendar day come from the same DB
 * column and serialize identically, so string equality on the raw value groups them correctly
 * without needing to know or assume the exact serialization/timezone format on the wire.
 */
function getDayGroupKey(type, item) {
  if (type === "classes") {
    return getValue(item, "classDate", "ClassDate", null);
  }

  if (type === "paid-time") {
    return getValue(item, "slotDate", "SlotDate", null);
  }

  return null;
}

/**
 * Per-product request-count breakdown for one day's paid-time rows. Products are identified by
 * productId (never by durationMinutes) and labeled with the row's own productName -- this module
 * never decides which product is "short" or "long".
 */
function buildProductBreakdown(items) {
  var byProduct = {};
  var order = [];

  items.forEach(function (item) {
    var productId = getValue(item, "productId", "ProductId", null);
    var mapKey = String(productId);

    if (!byProduct[mapKey]) {
      byProduct[mapKey] = {
        productId: productId,
        productName: getValue(item, "productName", "ProductName", "-"),
        requestCount: 0,
      };

      order.push(mapKey);
    }

    byProduct[mapKey].requestCount += Number(
      getValue(item, "requestCount", "RequestCount", 0),
    );
  });

  return order.map(function (mapKey) {
    return byProduct[mapKey];
  });
}

/**
 * Roll-up totals for one day's rows. Does not retain the source items on the returned object --
 * callers that need the day's individual rows use filterItemsByDay against the original
 * detailsItems, not this rollup.
 */
function buildDayRollup(type, dayKey, items) {
  var rollup = {
    dayKey: dayKey,
    paidAmount: sumField(items, "paidAmount", "PaidAmount"),
    unpaidAmount: sumField(items, "unpaidAmount", "UnpaidAmount"),
    expectedAmount: sumField(items, "expectedAmount", "ExpectedAmount"),
  };

  if (type === "classes") {
    rollup.classCount = items.length;
    rollup.entryCount = sumField(items, "entryCount", "EntryCount");
    rollup.fineCount = sumField(items, "fineCount", "FineCount");
  }

  if (type === "paid-time") {
    rollup.requestCount = sumField(items, "requestCount", "RequestCount");
    rollup.productBreakdown = buildProductBreakdown(items);
  }

  return rollup;
}

/**
 * One rollup per distinct day, in first-seen order. Returns [] for types with no day tier
 * (stalls/shavings/cash) so callers can call this unconditionally.
 */
function groupDetailsByDay(type, items) {
  var list = Array.isArray(items) ? items : [];

  if (type !== "classes" && type !== "paid-time") {
    return [];
  }

  var groups = {};
  var order = [];

  list.forEach(function (item) {
    var rawKey = getDayGroupKey(type, item);
    var mapKey = String(rawKey);

    if (!groups[mapKey]) {
      groups[mapKey] = { dayKey: rawKey, items: [] };
      order.push(mapKey);
    }

    groups[mapKey].items.push(item);
  });

  return order.map(function (mapKey) {
    return buildDayRollup(type, groups[mapKey].dayKey, groups[mapKey].items);
  });
}

/**
 * The original (unmodified) rows belonging to one day -- always re-derived from detailsItems, so
 * it can never go stale relative to a previously-selected day.
 */
function filterItemsByDay(type, items, dayKey) {
  var list = Array.isArray(items) ? items : [];

  if (dayKey === null || dayKey === undefined) {
    return [];
  }

  return list.filter(function (item) {
    return String(getDayGroupKey(type, item)) === String(dayKey);
  });
}

/**
 * Distinct paid-time products across the whole category (not just one day), sorted by productId
 * for a stable column order. The sort is ordering only -- a lower productId never means "short",
 * a higher one never means "long"; the actual productName is always the rendered label.
 *
 * Known limitation (accepted, flag to Oren): columns are derived only from products that actually
 * appear somewhere in detailsItems. There is no fixed per-competition product catalog to
 * cross-join against (schema.sql's paidtimeproduct table is a global, not competition-scoped,
 * catalog), and whether the backend proc emits a zero-request row for a configured-but-unbooked
 * product could not be verified from repo source alone. If a product has zero requests for the
 * ENTIRE competition, it will not get a column here -- this function cannot distinguish "product
 * wasn't offered" from "product was offered but never booked."
 */
function buildPaidTimeProductColumns(items) {
  var list = Array.isArray(items) ? items : [];
  var byProduct = {};
  var order = [];

  list.forEach(function (item) {
    var productId = getValue(item, "productId", "ProductId", null);
    var mapKey = String(productId);

    if (!byProduct[mapKey]) {
      byProduct[mapKey] = {
        productId: productId,
        productName: getValue(item, "productName", "ProductName", "-"),
      };

      order.push(mapKey);
    }
  });

  return order
    .map(function (mapKey) {
      return byProduct[mapKey];
    })
    .sort(function (a, b) {
      return Number(a.productId) - Number(b.productId);
    });
}

/**
 * The request count for one product on one day's rollup, or 0 when that product had no rows that
 * day -- for any reason (no requests that day, or the row simply wasn't returned). Pulled out as
 * its own function so the "missing product -> zero cell" behavior is directly unit-testable
 * without a DOM.
 */
function getProductRequestCountForDay(dayRollup, productId) {
  var breakdown =
    dayRollup && Array.isArray(dayRollup.productBreakdown)
      ? dayRollup.productBreakdown
      : [];

  var match = breakdown.find(function (entry) {
    return String(entry.productId) === String(productId);
  });

  return match ? match.requestCount : 0;
}

/** The shared summary strip's leftmost label -- one fixed noun per category, at every level. */
function getCategoryCountLabel(type) {
  if (type === "classes") {
    return "כניסות";
  }

  if (type === "paid-time") {
    return "בקשות";
  }

  if (type === "stalls" || type === "shavings") {
    return "הזמנות";
  }

  return "פריטים";
}

/** Which field on a detail-level (non-entries) row holds that category's natural count. */
function getDetailRowCountField(type) {
  if (type === "classes") {
    return ["entryCount", "EntryCount"];
  }

  if (type === "paid-time") {
    return ["requestCount", "RequestCount"];
  }

  if (type === "stalls") {
    return ["bookingCount", "BookingCount"];
  }

  if (type === "shavings") {
    return ["orderCount", "OrderCount"];
  }

  return null;
}

/**
 * Strip totals for a detail-level list (day-list, day-rows, or the stalls/shavings table) --
 * rows already carry paidAmount/unpaidAmount/expectedAmount directly.
 */
function computeDetailLevelTotals(type, items) {
  var list = Array.isArray(items) ? items : [];
  var countField = getDetailRowCountField(type);
  var countValue = countField
    ? sumField(list, countField[0], countField[1])
    : list.length;

  return {
    countLabel: getCategoryCountLabel(type),
    countValue: countValue,
    paidAmount: sumField(list, "paidAmount", "PaidAmount"),
    unpaidAmount: sumField(list, "unpaidAmount", "UnpaidAmount"),
    expectedAmount: sumField(list, "expectedAmount", "ExpectedAmount"),
  };
}

/**
 * Strip totals for an entries-level list. Entry rows have no separate paid/unpaid amount field --
 * money is derived from isPaid plus a single amount field, which is named differently per
 * category (amount/Amount for classes and paid-time; expectedAmount/ExpectedAmount for stalls
 * and shavings, matching EntriesTable's existing column reads).
 */
function computeEntriesLevelTotals(type, items) {
  var list = Array.isArray(items) ? items : [];
  var amountField =
    type === "stalls" || type === "shavings"
      ? ["expectedAmount", "ExpectedAmount"]
      : ["amount", "Amount"];

  var paidAmount = 0;
  var unpaidAmount = 0;

  list.forEach(function (item) {
    var amount = Number(getValue(item, amountField[0], amountField[1], 0));
    var isPaid = getValue(item, "isPaid", "IsPaid", false);

    if (isPaid) {
      paidAmount += amount;
    } else {
      unpaidAmount += amount;
    }
  });

  return {
    countLabel: getCategoryCountLabel(type),
    countValue: list.length,
    paidAmount: paidAmount,
    unpaidAmount: unpaidAmount,
    expectedAmount: paidAmount + unpaidAmount,
  };
}

export {
  getValue,
  sumField,
  getDayGroupKey,
  buildProductBreakdown,
  buildDayRollup,
  groupDetailsByDay,
  filterItemsByDay,
  buildPaidTimeProductColumns,
  getProductRequestCountForDay,
  getCategoryCountLabel,
  getDetailRowCountField,
  computeDetailLevelTotals,
  computeEntriesLevelTotals,
};

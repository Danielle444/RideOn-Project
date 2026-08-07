// Delivery-destination presentation — shared between the HostSecretary web table and the
// RanchWorker mobile card (moved here from web/src/utils/shavingsDestination.utils.js, which
// now re-exports this module, when the RanchWorker slice landed).
//
// Proc 176 (Slice 1) appends DeliveryDestinations (jsonb: [{CompoundId, CompoundName,
// Stalls: [{StallId, StallNumber, IsTackStall}]}]) and HasUnassignedStalls (bool) to every
// shavings order. This module is the ONLY place that turns that raw shape into the
// human-readable "מתחם X · תא/תאים Y" lines either app reads. Pure, no React, no React
// Native, no DOM.
//
// Tack stalls (IsTackStall) are NOT special-cased: a tack destination is a real
// compound/stall destination like any other, never a horse-name placeholder.

function getField(item, camelKey, pascalKey, fallback) {
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

export function getDeliveryDestinations(order) {
  const value = getField(order, "deliveryDestinations", "DeliveryDestinations", []);
  return Array.isArray(value) ? value : [];
}

export function getHasUnassignedStalls(order) {
  return getField(order, "hasUnassignedStalls", "HasUnassignedStalls", false) === true;
}

function getCompoundName(compound) {
  return getField(compound, "compoundName", "CompoundName", "") || "";
}

function getStalls(compound) {
  const value = getField(compound, "stalls", "Stalls", []);
  return Array.isArray(value) ? value : [];
}

function getStallNumber(stall) {
  return getField(stall, "stallNumber", "StallNumber", "");
}

// Collapses a list of stall-number strings into a compact display: a contiguous run of
// numeric stall numbers renders as "start–end", isolated numbers stay comma-separated, and
// non-numeric stall numbers (never seen live today, but not assumed away) fall back to a
// plain deduped, comma-joined list in their given order.
export function formatStallNumbers(stallNumbers) {
  const deduped = Array.from(
    new Set(
      (stallNumbers || [])
        .filter(function (n) {
          return n !== null && n !== undefined && n !== "";
        })
        .map(String),
    ),
  );

  const allNumeric =
    deduped.length > 0 &&
    deduped.every(function (n) {
      return /^\d+$/.test(n);
    });

  if (!allNumeric) {
    return deduped.join(", ");
  }

  const sorted = deduped.map(Number).sort(function (a, b) {
    return a - b;
  });

  const parts = [];
  let rangeStart = sorted[0];
  let rangeEnd = sorted[0];

  for (let i = 1; i <= sorted.length; i++) {
    const current = sorted[i];

    if (current === rangeEnd + 1) {
      rangeEnd = current;
      continue;
    }

    parts.push(
      rangeStart === rangeEnd ? String(rangeStart) : rangeStart + "–" + rangeEnd,
    );

    rangeStart = current;
    rangeEnd = current;
  }

  return parts.join(", ");
}

// One compound's line, e.g. "מתחם B2W · תאים 10–11". CompoundName is rendered VERBATIM,
// never prefixed with "מתחם" here — the live stored name already includes it
// (stallcompound.compoundname = "מתחם B2W" / "מתחם תאי תחרות" for every compound today, and
// no proc concatenates it either), so a hardcoded "מתחם " here used to double up into
// "מתחם מתחם ..." on every assigned destination. Do not reintroduce the prefix.
export function formatCompoundDestination(compound) {
  const name = getCompoundName(compound);
  const stallNumbers = getStalls(compound).map(getStallNumber);
  // Singular/plural must key off the DEDUPED stall count, not the raw row count — two
  // booking rows can (in principle) resolve to the same physical stall.
  const uniqueCount = new Set(
    stallNumbers
      .filter(function (n) {
        return n !== null && n !== undefined && n !== "";
      })
      .map(String),
  ).size;
  const label = uniqueCount === 1 ? "תא" : "תאים";

  return name + " · " + label + " " + formatStallNumbers(stallNumbers);
}

export const DELIVERY_DESTINATION_UNASSIGNED_TEXT = "טרם שובצו תאים";
export const DELIVERY_DESTINATION_PARTIAL_WARNING = "חלק מהתאים טרם שובצו";

// Full presentation model for one order's delivery destination:
// - fully unassigned (no resolved compound at all) -> emptyText only, no lines
// - partially assigned -> known lines PLUS warningText
// - fully assigned -> lines only, no warning
export function getDeliveryDestinationDisplay(order) {
  const destinations = getDeliveryDestinations(order).filter(function (compound) {
    return getStalls(compound).length > 0;
  });

  if (destinations.length === 0) {
    return {
      lines: [],
      warningText: null,
      emptyText: DELIVERY_DESTINATION_UNASSIGNED_TEXT,
    };
  }

  return {
    lines: destinations.map(formatCompoundDestination),
    warningText: getHasUnassignedStalls(order)
      ? DELIVERY_DESTINATION_PARTIAL_WARNING
      : null,
    emptyText: null,
  };
}

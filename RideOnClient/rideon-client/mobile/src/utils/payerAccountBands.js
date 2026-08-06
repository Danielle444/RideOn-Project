// CAP-3: pure grouping/sorting for payer-account lists (paid time, stalls),
// plus a date-only sort for classes and a plain sort for nested shavings
// sub-lines. Buckets each paid-time/stall item into active /
// pendingChange+pendingCancellation / cancelled using
// payerAccountLifecycle.js, then sorts within each bucket by that item
// type's own verified date/time fields - mirroring
// usp_getpayercompetitionaccount's own ORDER BY exactly (Phase 0, verified
// live 2026-08-06), so the deterministic tiebreaker matches what the server
// already guarantees.
//
// Classes are intentionally NOT banded here. CAP-8 has not yet added a
// verified lifecycle field to the classes[] array (see
// payerAccountLifecycle.js's resolveClassLifecycleState, which returns
// LIFECYCLE_STATE_UNKNOWN for every real class item today) - banding
// classes on an unknown state would mean guessing. sortClassesByVerifiedDate
// gives classes the same deterministic date/time ordering as every other
// list without attaching any lifecycle band or chip.

import {
  LIFECYCLE_STATE,
  PAYER_ACCOUNT_ITEM_TYPE,
  resolvePayerAccountItemLifecycleState,
} from "./payerAccountLifecycle.js";

// Wraps a per-field comparator so a null/undefined LIST ITEM (not field
// value - compareValues already handles that) sorts last instead of
// throwing when a sort function reads a property off it. bandItems already
// drops unknown-lifecycle items before sortPaidTimes/sortStalls ever run,
// but sortShavingsOrders/sortClassesByVerifiedDate are called directly on
// raw arrays with no such guarantee upstream.
function compareItemsSafely(compareKnownItems) {
  return function (a, b) {
    if (!a || typeof a !== "object") {
      return !b || typeof b !== "object" ? 0 : 1;
    }

    if (!b || typeof b !== "object") {
      return -1;
    }

    return compareKnownItems(a, b);
  };
}

function compareValues(a, b) {
  if (a === b) {
    return 0;
  }

  // nulls/undefined sort last, matching every ORDER BY ... NULLS LAST clause
  // in usp_getpayercompetitionaccount.
  if (a === null || a === undefined) {
    return 1;
  }

  if (b === null || b === undefined) {
    return -1;
  }

  if (a < b) {
    return -1;
  }

  if (a > b) {
    return 1;
  }

  return 0;
}

// An item whose lifecycle state cannot be determined (LIFECYCLE_STATE_UNKNOWN
// - in practice a null/undefined/non-object list entry, since a real stall/
// paid-time object always resolves to one of the four known states) is
// dropped from every band rather than falling through to "active" by
// default. There is nothing real to render for it, and silently defaulting
// an unknown state to active is exactly the guessing payerAccountLifecycle.js
// itself was built to avoid.
function bandItems(items, itemType) {
  var active = [];
  var pending = [];
  var cancelled = [];

  (Array.isArray(items) ? items : []).forEach(function (item) {
    var state = resolvePayerAccountItemLifecycleState(itemType, item);

    if (state === LIFECYCLE_STATE.CANCELLED) {
      cancelled.push(item);
      return;
    }

    if (
      state === LIFECYCLE_STATE.PENDING_CHANGE ||
      state === LIFECYCLE_STATE.PENDING_CANCELLATION
    ) {
      pending.push(item);
      return;
    }

    if (state === LIFECYCLE_STATE.ACTIVE) {
      active.push(item);
    }
  });

  return { active: active, pending: pending, cancelled: cancelled };
}

// Mirrors usp_getpayercompetitionaccount's paidTimes ORDER BY:
// displayslotdate nulls last, displaystarttime nulls last, paidtimerequestid.
function sortPaidTimes(list) {
  return list.slice().sort(
    compareItemsSafely(function (a, b) {
      return (
        compareValues(a.displaySlotDate, b.displaySlotDate) ||
        compareValues(a.displayStartTime, b.displayStartTime) ||
        compareValues(a.paidTimeRequestId, b.paidTimeRequestId)
      );
    }),
  );
}

// Mirrors usp_getpayercompetitionaccount's stalls ORDER BY:
// startdate, horsename nulls last, stallbookingid.
function sortStalls(list) {
  return list.slice().sort(
    compareItemsSafely(function (a, b) {
      return (
        compareValues(a.startDate, b.startDate) ||
        compareValues(a.horseName, b.horseName) ||
        compareValues(a.stallBookingId, b.stallBookingId)
      );
    }),
  );
}

// Mirrors usp_getpayercompetitionaccount's shavings_items ORDER BY:
// requesteddeliverytime nulls last, shavingsorderid. Used for the nested
// per-stall "נסורת לתא זה" sub-lines only - every shavings order under one
// stall shares that stall's single inherited lifecycle state (they can
// never split across bands from each other), so only sorting is needed
// here, never banding.
function sortShavingsOrders(list) {
  return (Array.isArray(list) ? list : []).slice().sort(
    compareItemsSafely(function (a, b) {
      return (
        compareValues(a.requestedDeliveryTime, b.requestedDeliveryTime) ||
        compareValues(a.shavingsOrderId, b.shavingsOrderId)
      );
    }),
  );
}

// Mirrors usp_getpayercompetitionaccount's classes ORDER BY:
// classdatetime nulls last, orderinday nulls last, starttime nulls last,
// classname - plus entryId as a final deterministic tiebreaker the proc
// doesn't need server-side but a stable React key does. No banding - see
// file header.
function sortClassesByVerifiedDate(list) {
  return (Array.isArray(list) ? list : []).slice().sort(
    compareItemsSafely(function (a, b) {
      return (
        compareValues(a.classDateTime, b.classDateTime) ||
        compareValues(a.orderInDay, b.orderInDay) ||
        compareValues(a.startTime, b.startTime) ||
        compareValues(a.className, b.className) ||
        compareValues(a.entryId, b.entryId)
      );
    }),
  );
}

function bandAndSortPaidTimes(items) {
  var banded = bandItems(items, PAYER_ACCOUNT_ITEM_TYPE.PAID_TIME);

  return {
    active: sortPaidTimes(banded.active),
    pending: sortPaidTimes(banded.pending),
    cancelled: sortPaidTimes(banded.cancelled),
  };
}

function bandAndSortStalls(items) {
  var banded = bandItems(items, PAYER_ACCOUNT_ITEM_TYPE.STALL);

  return {
    active: sortStalls(banded.active),
    pending: sortStalls(banded.pending),
    cancelled: sortStalls(banded.cancelled),
  };
}

export {
  bandAndSortPaidTimes,
  bandAndSortStalls,
  sortShavingsOrders,
  sortClassesByVerifiedDate,
};

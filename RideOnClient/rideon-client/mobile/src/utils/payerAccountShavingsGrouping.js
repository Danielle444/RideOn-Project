// CAP-4: pure, shared grouping/banding for the dedicated shavings tab on
// AdminCompetitionPayerAccountScreen.jsx and PayerCompetitionAccountScreen.jsx.
// Groups the top-level account.shavings[] (one row per shavingsOrderId) by
// the lifecycle state of the stall(s) it links to, resolved from every id in
// stallBookingIds that is actually present in account.stalls[] - not just
// the first entry. stallBookingIds[0] carries no business meaning on its
// own; the proc only guarantees the array is distinct and sorted ascending,
// so the first FOUND linked stall is used only as a deterministic display
// anchor, never to decide lifecycle.

import {
  LIFECYCLE_STATE,
  LIFECYCLE_STATE_UNKNOWN,
  resolveStallLifecycleState,
} from "./payerAccountLifecycle.js";

// Extends resolveStallLifecycleState's own single-stall precedence
// (cancelled > pendingCancellation > pendingChange > active) across every
// stall linked to one shavings order: the most urgent state among them wins,
// so a real pending/cancelled stall can never be hidden behind an active
// label just because another linked stall happens to sort first.
var LIFECYCLE_PRECEDENCE = [
  LIFECYCLE_STATE.CANCELLED,
  LIFECYCLE_STATE.PENDING_CANCELLATION,
  LIFECYCLE_STATE.PENDING_CHANGE,
  LIFECYCLE_STATE.ACTIVE,
];

function resolveMostUrgentState(states) {
  for (var i = 0; i < LIFECYCLE_PRECEDENCE.length; i++) {
    if (states.indexOf(LIFECYCLE_PRECEDENCE[i]) !== -1) {
      return LIFECYCLE_PRECEDENCE[i];
    }
  }

  return LIFECYCLE_STATE_UNKNOWN;
}

// Defensive: both payer-account hooks already dedup account.shavings by
// shavingsOrderId before this runs, but this utility does not rely on that -
// a caller passing an undeduped list still gets each order rendered once.
function dedupeShavingsOrdersById(shavingsOrders) {
  var seenIds = {};
  var deduped = [];

  (Array.isArray(shavingsOrders) ? shavingsOrders : []).forEach(function (
    order,
  ) {
    if (
      !order ||
      order.shavingsOrderId === undefined ||
      order.shavingsOrderId === null
    ) {
      deduped.push(order);
      return;
    }

    var key = String(order.shavingsOrderId);

    if (seenIds[key]) {
      return;
    }

    seenIds[key] = true;
    deduped.push(order);
  });

  return deduped;
}

function buildStallsById(stalls) {
  var byId = {};

  (Array.isArray(stalls) ? stalls : []).forEach(function (stall) {
    if (
      stall &&
      stall.stallBookingId !== undefined &&
      stall.stallBookingId !== null
    ) {
      byId[String(stall.stallBookingId)] = stall;
    }
  });

  return byId;
}

// Resolves one order's lifecycle and its display anchor (the first FOUND
// linked stall id, in the proc's own ascending-id order), in this exact
// precedence (standalone shavings cancellation):
//   1. own isCancelled              -> CANCELLED, full stop
//   2. own hasPendingCancellation   -> PENDING_CANCELLATION, full stop
//   3. inherited lifecycle from every linked stall FOUND in stallsById
//   4. needsReview, when no linked stall could be resolved at all
// Steps 1/2 are checked BEFORE step 4 on purpose: an order that is
// independently, verifiably cancelled/pending must never fall into
// needsReview just because its linked stalls happen to be unresolvable (e.g.
// billed to a different payer) - its own state is already known for
// certain. The anchor stall is still resolved the same way regardless of
// which precedence step wins, purely for display grouping.
function resolveShavingsOrderPlacement(order, stallsById) {
  var stallBookingIds = Array.isArray(order && order.stallBookingIds)
    ? order.stallBookingIds
    : [];

  var foundStalls = [];
  var anchorStall = null;

  for (var i = 0; i < stallBookingIds.length; i++) {
    var stall = stallsById[String(stallBookingIds[i])];

    if (stall) {
      foundStalls.push(stall);

      if (!anchorStall) {
        anchorStall = stall;
      }
    }
  }

  if (order && order.isCancelled === true) {
    return {
      lifecycleState: LIFECYCLE_STATE.CANCELLED,
      anchorStall: anchorStall,
      isNeedsReview: false,
      isMixedLifecycle: false,
    };
  }

  if (order && order.hasPendingCancellation === true) {
    return {
      lifecycleState: LIFECYCLE_STATE.PENDING_CANCELLATION,
      anchorStall: anchorStall,
      isNeedsReview: false,
      isMixedLifecycle: false,
    };
  }

  if (foundStalls.length === 0) {
    return {
      lifecycleState: LIFECYCLE_STATE_UNKNOWN,
      anchorStall: null,
      isNeedsReview: true,
      isMixedLifecycle: false,
    };
  }

  var states = foundStalls.map(resolveStallLifecycleState);
  var uniqueStates = states.filter(function (state, index) {
    return states.indexOf(state) === index;
  });

  return {
    lifecycleState: resolveMostUrgentState(uniqueStates),
    anchorStall: anchorStall,
    isNeedsReview: false,
    isMixedLifecycle: uniqueStates.length > 1,
  };
}

// Sorts by anchor stall -> requestedDeliveryTime (nulls last) ->
// shavingsOrderId, then chunks consecutive same-anchor entries into one
// collapsible group. Entries with no anchor (needsReview) all share one
// group key, so they render as one group rather than one row per order.
function groupEntriesByStall(entries) {
  var sorted = entries.slice().sort(function (a, b) {
    var stallA = a.anchorStall ? a.anchorStall.stallBookingId : null;
    var stallB = b.anchorStall ? b.anchorStall.stallBookingId : null;

    if (stallA !== stallB) {
      if (stallA === null || stallA === undefined) return 1;
      if (stallB === null || stallB === undefined) return -1;
      return stallA < stallB ? -1 : 1;
    }

    var timeA = a.order.requestedDeliveryTime;
    var timeB = b.order.requestedDeliveryTime;

    if (timeA !== timeB) {
      if (timeA === null || timeA === undefined) return 1;
      if (timeB === null || timeB === undefined) return -1;
      return timeA < timeB ? -1 : 1;
    }

    return a.order.shavingsOrderId - b.order.shavingsOrderId;
  });

  var groups = [];
  var currentGroup = null;

  sorted.forEach(function (entry) {
    var stallBookingId = entry.anchorStall
      ? entry.anchorStall.stallBookingId
      : null;
    var groupKey =
      "shavings-stall-" +
      (stallBookingId === null ? "needsReview" : stallBookingId);

    if (!currentGroup || currentGroup.key !== groupKey) {
      currentGroup = {
        key: groupKey,
        anchorStall: entry.anchorStall,
        isNeedsReview: entry.anchorStall === null,
        entries: [],
      };
      groups.push(currentGroup);
    }

    currentGroup.entries.push(entry.order);
  });

  return groups;
}

// Dedupes account.shavings[], resolves each order's lifecycle/anchor, then
// buckets into active/pending/cancelled/needsReview - every shavingsOrderId
// lands in exactly one bucket, grouped by its anchor stall within it.
function groupAndBandShavingsByStall(shavingsOrders, stalls) {
  var stallsById = buildStallsById(stalls);
  var dedupedOrders = dedupeShavingsOrdersById(shavingsOrders);

  var active = [];
  var pending = [];
  var cancelled = [];
  var needsReview = [];

  dedupedOrders.forEach(function (order) {
    var placement = resolveShavingsOrderPlacement(order, stallsById);
    var entry = { order: order, anchorStall: placement.anchorStall };

    if (placement.isNeedsReview) {
      needsReview.push(entry);
      return;
    }

    if (placement.lifecycleState === LIFECYCLE_STATE.CANCELLED) {
      cancelled.push(entry);
    } else if (
      placement.lifecycleState === LIFECYCLE_STATE.PENDING_CHANGE ||
      placement.lifecycleState === LIFECYCLE_STATE.PENDING_CANCELLATION
    ) {
      pending.push(entry);
    } else if (placement.lifecycleState === LIFECYCLE_STATE.ACTIVE) {
      active.push(entry);
    }
  });

  return {
    active: groupEntriesByStall(active),
    pending: groupEntriesByStall(pending),
    cancelled: groupEntriesByStall(cancelled),
    needsReview: groupEntriesByStall(needsReview),
  };
}

export {
  dedupeShavingsOrdersById,
  buildStallsById,
  resolveShavingsOrderPlacement,
  groupEntriesByStall,
  groupAndBandShavingsByStall,
};

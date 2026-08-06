import { describe, it, expect } from "vitest";
import {
  dedupeShavingsOrdersById,
  buildStallsById,
  resolveShavingsOrderPlacement,
  groupEntriesByStall,
  groupAndBandShavingsByStall,
} from "./payerAccountShavingsGrouping.js";

function makeActiveStall(stallBookingId, overrides) {
  return Object.assign(
    {
      stallBookingId: stallBookingId,
      isCancelled: false,
      hasPendingCancellation: false,
      hasPendingChange: false,
      barnName: "Barn " + stallBookingId,
    },
    overrides,
  );
}

function makeOrder(shavingsOrderId, stallBookingIds, overrides) {
  return Object.assign(
    {
      shavingsOrderId: shavingsOrderId,
      stallBookingIds: stallBookingIds,
      bagQuantity: 2,
      amountToPay: 100,
      paidAmount: 0,
      unpaidAmount: 100,
      deliveryStatus: "Pending",
      requestedDeliveryTime: null,
    },
    overrides,
  );
}

function allEntries(banded) {
  return []
    .concat(banded.active, banded.pending, banded.cancelled, banded.needsReview)
    .flatMap(function (group) {
      return group.entries;
    });
}

describe("dedupeShavingsOrdersById", () => {
  it("keeps only the first occurrence of a repeated shavingsOrderId", () => {
    var orders = [makeOrder(1, [10]), makeOrder(2, [11]), makeOrder(1, [10])];

    var deduped = dedupeShavingsOrdersById(orders);

    expect(deduped.map(function (o) { return o.shavingsOrderId; })).toEqual([1, 2]);
  });

  it("passes through non-array input as an empty list", () => {
    expect(dedupeShavingsOrdersById(undefined)).toEqual([]);
    expect(dedupeShavingsOrdersById(null)).toEqual([]);
  });
});

describe("buildStallsById", () => {
  it("indexes stalls by stallBookingId as a string key", () => {
    var byId = buildStallsById([makeActiveStall(10), makeActiveStall(20)]);

    expect(Object.keys(byId).sort()).toEqual(["10", "20"]);
    expect(byId["10"].stallBookingId).toBe(10);
  });
});

describe("resolveShavingsOrderPlacement", () => {
  it("one normal linked stall: resolves lifecycle from that stall and uses it as the display anchor", () => {
    var stallsById = { "10": makeActiveStall(10) };
    var order = makeOrder(1, [10]);

    var placement = resolveShavingsOrderPlacement(order, stallsById);

    expect(placement.isNeedsReview).toBe(false);
    expect(placement.isMixedLifecycle).toBe(false);
    expect(placement.lifecycleState).toBe("active");
    expect(placement.anchorStall.stallBookingId).toBe(10);
  });

  it("one shavings order linked to multiple stalls that share one lifecycle: uses that shared state, not just stallBookingIds[0] blindly", () => {
    var stallsById = {
      "10": makeActiveStall(10),
      "11": makeActiveStall(11),
      "12": makeActiveStall(12),
    };
    var order = makeOrder(1, [10, 11, 12]);

    var placement = resolveShavingsOrderPlacement(order, stallsById);

    expect(placement.isNeedsReview).toBe(false);
    expect(placement.isMixedLifecycle).toBe(false);
    expect(placement.lifecycleState).toBe("active");
    expect(placement.anchorStall.stallBookingId).toBe(10);
  });

  it("mixed Active/Pending across linked stalls resolves to pendingChange, the most urgent state, never the first array entry blindly", () => {
    var stallsById = {
      "33": makeActiveStall(33),
      "36": makeActiveStall(36, { hasPendingChange: true }),
    };
    var order = makeOrder(47, [33, 36]);

    var placement = resolveShavingsOrderPlacement(order, stallsById);

    expect(placement.isNeedsReview).toBe(false);
    expect(placement.isMixedLifecycle).toBe(true);
    expect(placement.lifecycleState).toBe("pendingChange");
  });

  it("cancelled wins over pending/active when mixed, matching resolveStallLifecycleState's own single-item precedence", () => {
    var stallsById = {
      "1": makeActiveStall(1),
      "2": makeActiveStall(2, { hasPendingChange: true }),
      "3": makeActiveStall(3, { isCancelled: true }),
    };
    var order = makeOrder(2, [1, 2, 3]);

    var placement = resolveShavingsOrderPlacement(order, stallsById);

    expect(placement.isMixedLifecycle).toBe(true);
    expect(placement.lifecycleState).toBe("cancelled");
  });

  it("zero linked stalls found resolves to needsReview, never a guessed active/cancelled", () => {
    var stallsById = { "99": makeActiveStall(99) };
    var order = makeOrder(3, [10, 11]);

    var placement = resolveShavingsOrderPlacement(order, stallsById);

    expect(placement.isNeedsReview).toBe(true);
    expect(placement.lifecycleState).toBe("unknown");
    expect(placement.anchorStall).toBe(null);
  });

  it("partially missing: if at least one linked id IS found, that one resolves the placement - not needsReview", () => {
    var stallsById = { "11": makeActiveStall(11) };
    var order = makeOrder(4, [10, 11]);

    var placement = resolveShavingsOrderPlacement(order, stallsById);

    expect(placement.isNeedsReview).toBe(false);
    expect(placement.lifecycleState).toBe("active");
    expect(placement.anchorStall.stallBookingId).toBe(11);
  });

  it("an order with no stallBookingIds at all resolves to needsReview", () => {
    var placement = resolveShavingsOrderPlacement(makeOrder(5, []), {});

    expect(placement.isNeedsReview).toBe(true);
  });
});

describe("groupEntriesByStall", () => {
  it("sorts by requestedDeliveryTime with nulls last within a stall group, then by shavingsOrderId", () => {
    var stall = makeActiveStall(10);
    var entries = [
      { order: makeOrder(3, [10], { requestedDeliveryTime: null }), anchorStall: stall },
      { order: makeOrder(1, [10], { requestedDeliveryTime: "2026-08-06T09:00:00" }), anchorStall: stall },
      { order: makeOrder(2, [10], { requestedDeliveryTime: null }), anchorStall: stall },
      { order: makeOrder(4, [10], { requestedDeliveryTime: "2026-08-06T08:00:00" }), anchorStall: stall },
    ];

    var groups = groupEntriesByStall(entries);

    expect(groups.length).toBe(1);
    expect(groups[0].entries.map(function (o) { return o.shavingsOrderId; })).toEqual([
      4, // 08:00 - earliest non-null time
      1, // 09:00
      2, // null, shavingsOrderId 2 tiebreaks before 3
      3, // null
    ]);
  });

  it("groups entries with no anchor stall (needsReview) into a single group rather than one row each", () => {
    var entries = [
      { order: makeOrder(1, []), anchorStall: null },
      { order: makeOrder(2, []), anchorStall: null },
    ];

    var groups = groupEntriesByStall(entries);

    expect(groups.length).toBe(1);
    expect(groups[0].key).toBe("shavings-stall-needsReview");
    expect(groups[0].isNeedsReview).toBe(true);
    expect(groups[0].entries.length).toBe(2);
  });
});

describe("groupAndBandShavingsByStall", () => {
  it("renders each shavingsOrderId exactly once across every band, even for a multi-stall link", () => {
    var stalls = [makeActiveStall(10), makeActiveStall(11)];
    var orders = [makeOrder(1, [10, 11])];

    var banded = groupAndBandShavingsByStall(orders, stalls);
    var ids = allEntries(banded).map(function (o) {
      return o.shavingsOrderId;
    });

    expect(ids).toEqual([1]);
  });

  it("dedupes a repeated shavingsOrderId in the raw input before banding", () => {
    var stalls = [makeActiveStall(10)];
    var orders = [makeOrder(1, [10]), makeOrder(1, [10])];

    var banded = groupAndBandShavingsByStall(orders, stalls);
    var ids = allEntries(banded).map(function (o) {
      return o.shavingsOrderId;
    });

    expect(ids).toEqual([1]);
  });

  it("places a normal single-stall active order in the active band as one group", () => {
    var stalls = [makeActiveStall(10)];
    var orders = [makeOrder(1, [10])];

    var banded = groupAndBandShavingsByStall(orders, stalls);

    expect(banded.active.length).toBe(1);
    expect(banded.active[0].entries.length).toBe(1);
    expect(banded.pending.length).toBe(0);
    expect(banded.cancelled.length).toBe(0);
    expect(banded.needsReview.length).toBe(0);
  });

  it("a shavings order linked to multiple simultaneous stalls (live-proven shape) is grouped once, under its anchor stall", () => {
    var stalls = [makeActiveStall(20), makeActiveStall(21)];
    var orders = [makeOrder(60, [20, 21])];

    var banded = groupAndBandShavingsByStall(orders, stalls);

    expect(banded.active.length).toBe(1);
    expect(banded.active[0].anchorStall.stallBookingId).toBe(20);
    expect(banded.active[0].entries[0].shavingsOrderId).toBe(60);
  });

  it("mixed-lifecycle multi-stall order (stall 33 Active, stall 36 PendingChange) lands in the pending band, not active", () => {
    var stalls = [makeActiveStall(33), makeActiveStall(36, { hasPendingChange: true })];
    var orders = [makeOrder(47, [33, 36])];

    var banded = groupAndBandShavingsByStall(orders, stalls);

    expect(banded.active.length).toBe(0);
    expect(banded.pending.length).toBe(1);
    expect(banded.pending[0].entries[0].shavingsOrderId).toBe(47);
  });

  it("cancelled wins over pending/active across linked stalls", () => {
    var stalls = [
      makeActiveStall(1),
      makeActiveStall(2, { hasPendingChange: true }),
      makeActiveStall(3, { isCancelled: true }),
    ];
    var orders = [makeOrder(70, [1, 2, 3])];

    var banded = groupAndBandShavingsByStall(orders, stalls);

    expect(banded.cancelled.length).toBe(1);
    expect(banded.active.length).toBe(0);
    expect(banded.pending.length).toBe(0);
  });

  it("an order with no resolvable linked stall goes to needsReview, is never dropped and never guessed active/cancelled", () => {
    var stalls = [makeActiveStall(79)];
    // Real shape: this payer's own shavings order links only to stalls
    // billed to a different payer, so none of them appear in this payer's
    // own stalls[].
    var orders = [makeOrder(39, [32, 33, 37])];

    var banded = groupAndBandShavingsByStall(orders, stalls);

    expect(banded.active.length).toBe(0);
    expect(banded.pending.length).toBe(0);
    expect(banded.cancelled.length).toBe(0);
    expect(banded.needsReview.length).toBe(1);
    expect(banded.needsReview[0].entries[0].shavingsOrderId).toBe(39);
    expect(banded.needsReview[0].anchorStall).toBe(null);
  });

  it("requestedDeliveryTime sorts ascending with nulls last across the whole active band", () => {
    var stalls = [makeActiveStall(10)];
    var orders = [
      makeOrder(1, [10], { requestedDeliveryTime: null }),
      makeOrder(2, [10], { requestedDeliveryTime: "2026-08-06T07:00:00" }),
    ];

    var banded = groupAndBandShavingsByStall(orders, stalls);

    expect(banded.active[0].entries.map(function (o) { return o.shavingsOrderId; })).toEqual([2, 1]);
  });

  it("missing/non-array inputs default to empty bands rather than throwing", () => {
    var banded = groupAndBandShavingsByStall(undefined, undefined);

    expect(banded).toEqual({ active: [], pending: [], cancelled: [], needsReview: [] });
  });
});

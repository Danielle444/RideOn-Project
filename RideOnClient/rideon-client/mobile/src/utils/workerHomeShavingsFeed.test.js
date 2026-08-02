import { describe, it, expect } from "vitest";
import {
  getWorkerHomeFeedCardFlags,
  sortWorkerHomeFeed,
} from "./workerHomeShavingsFeed.js";

var ME = 501;
var OTHER_WORKER = 502;

function makeOrder(overrides) {
  return Object.assign(
    {
      shavingsOrderId: 1,
      workerSystemUserId: null,
      requestedDeliveryTime: null,
    },
    overrides,
  );
}

function idsOf(orders) {
  return orders.map(function (o) {
    return o.shavingsOrderId;
  });
}

describe("getWorkerHomeFeedCardFlags", function () {
  it("marks an order claimed by the current worker as mine, not unclaimed", function () {
    var flags = getWorkerHomeFeedCardFlags(
      makeOrder({ workerSystemUserId: ME }),
      ME,
    );

    expect(flags).toEqual({
      isMyOrder: true,
      isUnclaimed: false,
      isTakenByOther: false,
    });
  });

  it("marks an order with no worker as unclaimed, never hardcoding isMyOrder", function () {
    var flags = getWorkerHomeFeedCardFlags(
      makeOrder({ workerSystemUserId: null }),
      ME,
    );

    expect(flags).toEqual({
      isMyOrder: false,
      isUnclaimed: true,
      isTakenByOther: false,
    });
  });

  it("treats an undefined workerSystemUserId the same as null (unclaimed)", function () {
    var flags = getWorkerHomeFeedCardFlags(
      makeOrder({ workerSystemUserId: undefined }),
      ME,
    );

    expect(flags.isUnclaimed).toBe(true);
    expect(flags.isMyOrder).toBe(false);
  });

  // The proc filters to mine-or-unclaimed only, so this should never occur in the
  // real feed - but the flag must stay honest (computed, not assumed false) in case
  // the filter ever changes or a stale row slips through a race.
  it("marks an order claimed by a different worker as taken-by-other, not mine", function () {
    var flags = getWorkerHomeFeedCardFlags(
      makeOrder({ workerSystemUserId: OTHER_WORKER }),
      ME,
    );

    expect(flags).toEqual({
      isMyOrder: false,
      isUnclaimed: false,
      isTakenByOther: true,
    });
  });
});

describe("sortWorkerHomeFeed", function () {
  it("renders mine before unclaimed even when mine has a later delivery time", function () {
    var unclaimedEarly = makeOrder({
      shavingsOrderId: 1,
      workerSystemUserId: null,
      requestedDeliveryTime: "2026-08-02T08:00:00Z",
    });
    var mineLate = makeOrder({
      shavingsOrderId: 2,
      workerSystemUserId: ME,
      requestedDeliveryTime: "2026-08-02T18:00:00Z",
    });

    var sorted = sortWorkerHomeFeed([unclaimedEarly, mineLate], ME);

    expect(idsOf(sorted)).toEqual([2, 1]);
  });

  it("orders two mine orders by RequestedDeliveryTime ascending", function () {
    var mineLate = makeOrder({
      shavingsOrderId: 10,
      workerSystemUserId: ME,
      requestedDeliveryTime: "2026-08-02T18:00:00Z",
    });
    var mineEarly = makeOrder({
      shavingsOrderId: 11,
      workerSystemUserId: ME,
      requestedDeliveryTime: "2026-08-02T08:00:00Z",
    });

    var sorted = sortWorkerHomeFeed([mineLate, mineEarly], ME);

    expect(idsOf(sorted)).toEqual([11, 10]);
  });

  it("orders two unclaimed orders by RequestedDeliveryTime ascending", function () {
    var unclaimedLate = makeOrder({
      shavingsOrderId: 20,
      workerSystemUserId: null,
      requestedDeliveryTime: "2026-08-02T18:00:00Z",
    });
    var unclaimedEarly = makeOrder({
      shavingsOrderId: 21,
      workerSystemUserId: null,
      requestedDeliveryTime: "2026-08-02T08:00:00Z",
    });

    var sorted = sortWorkerHomeFeed([unclaimedLate, unclaimedEarly], ME);

    expect(idsOf(sorted)).toEqual([21, 20]);
  });

  it("sorts mine before unclaimed, and by time within each group, in one combined feed", function () {
    var mineLate = makeOrder({
      shavingsOrderId: 1,
      workerSystemUserId: ME,
      requestedDeliveryTime: "2026-08-02T18:00:00Z",
    });
    var unclaimedEarly = makeOrder({
      shavingsOrderId: 2,
      workerSystemUserId: null,
      requestedDeliveryTime: "2026-08-02T06:00:00Z",
    });
    var mineEarly = makeOrder({
      shavingsOrderId: 3,
      workerSystemUserId: ME,
      requestedDeliveryTime: "2026-08-02T08:00:00Z",
    });
    var unclaimedLate = makeOrder({
      shavingsOrderId: 4,
      workerSystemUserId: null,
      requestedDeliveryTime: "2026-08-02T20:00:00Z",
    });

    var sorted = sortWorkerHomeFeed(
      [mineLate, unclaimedEarly, mineEarly, unclaimedLate],
      ME,
    );

    // mine group ordered 3 (08:00) then 1 (18:00); unclaimed group ordered
    // 2 (06:00) then 4 (20:00) - mine group always first regardless of time.
    expect(idsOf(sorted)).toEqual([3, 1, 2, 4]);
  });

  describe("missing or invalid RequestedDeliveryTime sorts last within its group", function () {
    it("null time sorts after a timed order in the same group", function () {
      var timed = makeOrder({
        shavingsOrderId: 1,
        workerSystemUserId: ME,
        requestedDeliveryTime: "2026-08-02T08:00:00Z",
      });
      var noTime = makeOrder({
        shavingsOrderId: 2,
        workerSystemUserId: ME,
        requestedDeliveryTime: null,
      });

      expect(idsOf(sortWorkerHomeFeed([noTime, timed], ME))).toEqual([1, 2]);
    });

    it("undefined time sorts after a timed order in the same group", function () {
      var timed = makeOrder({
        shavingsOrderId: 1,
        workerSystemUserId: null,
        requestedDeliveryTime: "2026-08-02T08:00:00Z",
      });
      var noTime = makeOrder({
        shavingsOrderId: 2,
        workerSystemUserId: null,
        requestedDeliveryTime: undefined,
      });

      expect(idsOf(sortWorkerHomeFeed([noTime, timed], ME))).toEqual([1, 2]);
    });

    it("empty-string time sorts after a timed order in the same group", function () {
      var timed = makeOrder({
        shavingsOrderId: 1,
        workerSystemUserId: ME,
        requestedDeliveryTime: "2026-08-02T08:00:00Z",
      });
      var noTime = makeOrder({
        shavingsOrderId: 2,
        workerSystemUserId: ME,
        requestedDeliveryTime: "",
      });

      expect(idsOf(sortWorkerHomeFeed([noTime, timed], ME))).toEqual([1, 2]);
    });

    it("an unparsable time string sorts after a timed order in the same group", function () {
      var timed = makeOrder({
        shavingsOrderId: 1,
        workerSystemUserId: ME,
        requestedDeliveryTime: "2026-08-02T08:00:00Z",
      });
      var garbage = makeOrder({
        shavingsOrderId: 2,
        workerSystemUserId: ME,
        requestedDeliveryTime: "not-a-real-date",
      });

      expect(idsOf(sortWorkerHomeFeed([garbage, timed], ME))).toEqual([1, 2]);
    });
  });

  it("keeps input order as a deterministic tiebreak when two orders in the same group share a time", function () {
    var firstInInput = makeOrder({
      shavingsOrderId: 99,
      workerSystemUserId: ME,
      requestedDeliveryTime: "2026-08-02T08:00:00Z",
    });
    var secondInInput = makeOrder({
      shavingsOrderId: 5,
      workerSystemUserId: ME,
      requestedDeliveryTime: "2026-08-02T08:00:00Z",
    });

    // Id 99 comes first in the input despite the higher id, so a naive
    // id-based tiebreak would get this backwards.
    expect(idsOf(sortWorkerHomeFeed([firstInInput, secondInInput], ME))).toEqual([
      99, 5,
    ]);
  });

  it("keeps input order as a deterministic tiebreak when two orders in the same group both lack a valid time", function () {
    var firstInInput = makeOrder({
      shavingsOrderId: 7,
      workerSystemUserId: null,
      requestedDeliveryTime: null,
    });
    var secondInInput = makeOrder({
      shavingsOrderId: 6,
      workerSystemUserId: null,
      requestedDeliveryTime: "garbage",
    });

    expect(idsOf(sortWorkerHomeFeed([firstInInput, secondInInput], ME))).toEqual([
      7, 6,
    ]);
  });

  it("never treats a different worker's claimed order as mine when ordering", function () {
    // Even though this should never reach the feed (the proc filters to
    // mine-or-unclaimed only), the sort must not silently fold a foreign
    // claim into the mine group just because it has an earlier time.
    var foreignEarly = makeOrder({
      shavingsOrderId: 1,
      workerSystemUserId: OTHER_WORKER,
      requestedDeliveryTime: "2026-08-02T06:00:00Z",
    });
    var mineLate = makeOrder({
      shavingsOrderId: 2,
      workerSystemUserId: ME,
      requestedDeliveryTime: "2026-08-02T20:00:00Z",
    });
    var unclaimed = makeOrder({
      shavingsOrderId: 3,
      workerSystemUserId: null,
      requestedDeliveryTime: "2026-08-02T10:00:00Z",
    });

    var sorted = sortWorkerHomeFeed([foreignEarly, mineLate, unclaimed], ME);

    // Mine (2) first, despite its later time - it must never fall behind a
    // foreign claim just because that claim has an earlier time. The foreign
    // claim (1) and the unclaimed order (3) both land in the "not mine"
    // group and are ordered by time between themselves (06:00 before 10:00).
    expect(idsOf(sorted)).toEqual([2, 1, 3]);
  });

  it("returns an empty array for an empty or missing feed without throwing", function () {
    expect(sortWorkerHomeFeed([], ME)).toEqual([]);
    expect(sortWorkerHomeFeed(undefined, ME)).toEqual([]);
  });
});

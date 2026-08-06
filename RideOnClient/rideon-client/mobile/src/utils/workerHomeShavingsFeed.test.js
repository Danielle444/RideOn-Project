import { describe, it, expect } from "vitest";
import {
  getWorkerHomeFeedCardFlags,
  sortWorkerHomeFeed,
  bucketWorkerCompetitionOrders,
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

describe("bucketWorkerCompetitionOrders", function () {
  var NOW = "2026-08-05T12:00:00Z";

  it("buckets an order requested for today into the today section", function () {
    var order = makeOrder({
      shavingsOrderId: 1,
      requestedDeliveryTime: "2026-08-05T09:00:00Z",
    });

    var buckets = bucketWorkerCompetitionOrders([order], NOW);

    expect(idsOf(buckets.today)).toEqual([1]);
    expect(buckets.older).toEqual([]);
    expect(buckets.future).toEqual([]);
  });

  it("sorts multiple today orders by requested time ascending", function () {
    var late = makeOrder({
      shavingsOrderId: 1,
      requestedDeliveryTime: "2026-08-05T18:00:00Z",
    });
    var early = makeOrder({
      shavingsOrderId: 2,
      requestedDeliveryTime: "2026-08-05T07:00:00Z",
    });

    var buckets = bucketWorkerCompetitionOrders([late, early], NOW);

    expect(idsOf(buckets.today)).toEqual([2, 1]);
  });

  it("buckets a past undelivered order into the older section", function () {
    var order = makeOrder({
      shavingsOrderId: 1,
      requestedDeliveryTime: "2026-08-03T10:00:00Z",
      deliveryStatus: "Pending",
    });

    var buckets = bucketWorkerCompetitionOrders([order], NOW);

    expect(idsOf(buckets.older)).toEqual([1]);
  });

  it("places a null-requested-time order after past-undelivered orders within the older section", function () {
    var pastUndelivered = makeOrder({
      shavingsOrderId: 1,
      requestedDeliveryTime: "2026-08-03T10:00:00Z",
      deliveryStatus: "Pending",
    });
    var nullTime = makeOrder({
      shavingsOrderId: 2,
      requestedDeliveryTime: null,
    });

    var buckets = bucketWorkerCompetitionOrders(
      [nullTime, pastUndelivered],
      NOW,
    );

    expect(idsOf(buckets.older)).toEqual([1, 2]);
  });

  it("places a past-delivered order after null-time orders within the older section", function () {
    var pastUndelivered = makeOrder({
      shavingsOrderId: 1,
      requestedDeliveryTime: "2026-08-03T10:00:00Z",
      deliveryStatus: "Pending",
    });
    var nullTime = makeOrder({
      shavingsOrderId: 2,
      requestedDeliveryTime: null,
    });
    var pastDelivered = makeOrder({
      shavingsOrderId: 3,
      requestedDeliveryTime: "2026-08-02T10:00:00Z",
      deliveryStatus: "Delivered",
    });

    var buckets = bucketWorkerCompetitionOrders(
      [pastDelivered, nullTime, pastUndelivered],
      NOW,
    );

    // Locked business rule: past-delivered orders stay visible, at the
    // bottom of the section, never dropped - undelivered first, then
    // null-time, then delivered.
    expect(idsOf(buckets.older)).toEqual([1, 2, 3]);
  });

  it("buckets a future order into the future section", function () {
    var order = makeOrder({
      shavingsOrderId: 1,
      requestedDeliveryTime: "2026-08-07T10:00:00Z",
    });

    var buckets = bucketWorkerCompetitionOrders([order], NOW);

    expect(idsOf(buckets.future)).toEqual([1]);
  });

  it("sorts multiple future orders by date then time ascending", function () {
    var laterDay = makeOrder({
      shavingsOrderId: 1,
      requestedDeliveryTime: "2026-08-09T06:00:00Z",
    });
    var soonerDayLaterTime = makeOrder({
      shavingsOrderId: 2,
      requestedDeliveryTime: "2026-08-07T20:00:00Z",
    });
    var soonerDayEarlierTime = makeOrder({
      shavingsOrderId: 3,
      requestedDeliveryTime: "2026-08-07T06:00:00Z",
    });

    var buckets = bucketWorkerCompetitionOrders(
      [laterDay, soonerDayLaterTime, soonerDayEarlierTime],
      NOW,
    );

    expect(idsOf(buckets.future)).toEqual([3, 2, 1]);
  });

  it("detects a delivered order in the older section through deliveryStatus, not just arrivalTime", function () {
    var pastUndelivered = makeOrder({
      shavingsOrderId: 1,
      requestedDeliveryTime: "2026-08-03T10:00:00Z",
      deliveryStatus: "Pending",
    });
    var pastDeliveredByStatus = makeOrder({
      shavingsOrderId: 2,
      requestedDeliveryTime: "2026-08-02T10:00:00Z",
      deliveryStatus: "Delivered",
      arrivalTime: null,
    });

    var buckets = bucketWorkerCompetitionOrders(
      [pastDeliveredByStatus, pastUndelivered],
      NOW,
    );

    expect(idsOf(buckets.older)).toEqual([1, 2]);
  });

  it("detects a delivered order in the older section through arrivalTime, even when deliveryStatus still reads Pending", function () {
    var pastUndelivered = makeOrder({
      shavingsOrderId: 1,
      requestedDeliveryTime: "2026-08-03T10:00:00Z",
      deliveryStatus: "Pending",
    });
    var pastDeliveredByArrival = makeOrder({
      shavingsOrderId: 2,
      requestedDeliveryTime: "2026-08-02T10:00:00Z",
      deliveryStatus: "Pending",
      arrivalTime: "2026-08-02T11:00:00Z",
    });

    var buckets = bucketWorkerCompetitionOrders(
      [pastDeliveredByArrival, pastUndelivered],
      NOW,
    );

    expect(idsOf(buckets.older)).toEqual([1, 2]);
  });

  // Standalone shavings cancellation lifecycle: a terminal-cancelled (isCancelled=true)
  // past order is resolved exactly like a delivered one, folding into the same
  // non-actionable "older" grouping rather than the "needs treatment" one. A PENDING
  // cancellation is NOT resolved and stays in the unresolved group.
  describe("cancellation lifecycle bucketing", function () {
    it("buckets a past terminal-cancelled order into the older section", function () {
      var order = makeOrder({
        shavingsOrderId: 1,
        requestedDeliveryTime: "2026-08-03T10:00:00Z",
        deliveryStatus: "Pending",
        isCancelled: true,
      });

      var buckets = bucketWorkerCompetitionOrders([order], NOW);

      expect(idsOf(buckets.older)).toEqual([1]);
    });

    it("places a past terminal-cancelled order after past-undelivered and null-time orders, same tier as delivered", function () {
      var pastUndelivered = makeOrder({
        shavingsOrderId: 1,
        requestedDeliveryTime: "2026-08-03T10:00:00Z",
        deliveryStatus: "Pending",
      });
      var nullTime = makeOrder({
        shavingsOrderId: 2,
        requestedDeliveryTime: null,
      });
      var pastCancelled = makeOrder({
        shavingsOrderId: 3,
        requestedDeliveryTime: "2026-08-02T10:00:00Z",
        deliveryStatus: "Pending",
        isCancelled: true,
      });

      var buckets = bucketWorkerCompetitionOrders(
        [pastCancelled, nullTime, pastUndelivered],
        NOW,
      );

      expect(idsOf(buckets.older)).toEqual([1, 2, 3]);
    });

    it("sorts a past-delivered order and a past-cancelled order together, by requested time ascending, within the resolved group", function () {
      var pastCancelledLate = makeOrder({
        shavingsOrderId: 1,
        requestedDeliveryTime: "2026-08-03T18:00:00Z",
        isCancelled: true,
      });
      var pastDeliveredEarly = makeOrder({
        shavingsOrderId: 2,
        requestedDeliveryTime: "2026-08-02T08:00:00Z",
        deliveryStatus: "Delivered",
      });

      var buckets = bucketWorkerCompetitionOrders(
        [pastCancelledLate, pastDeliveredEarly],
        NOW,
      );

      expect(idsOf(buckets.older)).toEqual([2, 1]);
    });

    it("keeps a past order with only a PENDING cancellation in the unresolved (not-yet-treated) group, not the resolved one", function () {
      var pastPendingCancellation = makeOrder({
        shavingsOrderId: 1,
        requestedDeliveryTime: "2026-08-03T10:00:00Z",
        deliveryStatus: "Pending",
        hasPendingCancellation: true,
        isCancelled: false,
      });
      var pastDelivered = makeOrder({
        shavingsOrderId: 2,
        requestedDeliveryTime: "2026-08-02T10:00:00Z",
        deliveryStatus: "Delivered",
      });

      var buckets = bucketWorkerCompetitionOrders(
        [pastDelivered, pastPendingCancellation],
        NOW,
      );

      // Pending-cancellation order (1) is unresolved -> first tier; delivered (2) -> resolved
      // tier at the end - the two must not collapse into one group.
      expect(idsOf(buckets.older)).toEqual([1, 2]);
    });

    it("buckets a today or future terminal-cancelled order into its normal date section, not a special one", function () {
      var todayCancelled = makeOrder({
        shavingsOrderId: 1,
        requestedDeliveryTime: "2026-08-05T09:00:00Z",
        isCancelled: true,
      });
      var futureCancelled = makeOrder({
        shavingsOrderId: 2,
        requestedDeliveryTime: "2026-08-07T09:00:00Z",
        isCancelled: true,
      });

      var buckets = bucketWorkerCompetitionOrders(
        [todayCancelled, futureCancelled],
        NOW,
      );

      expect(idsOf(buckets.today)).toEqual([1]);
      expect(idsOf(buckets.future)).toEqual([2]);
      expect(buckets.older).toEqual([]);
    });
  });

  it("does not mutate the input orders array", function () {
    var first = makeOrder({
      shavingsOrderId: 1,
      requestedDeliveryTime: "2026-08-07T10:00:00Z",
    });
    var second = makeOrder({
      shavingsOrderId: 2,
      requestedDeliveryTime: "2026-08-05T10:00:00Z",
    });
    var input = [first, second];

    bucketWorkerCompetitionOrders(input, NOW);

    expect(idsOf(input)).toEqual([1, 2]);
    expect(input[0]).toBe(first);
    expect(input[1]).toBe(second);
  });
});

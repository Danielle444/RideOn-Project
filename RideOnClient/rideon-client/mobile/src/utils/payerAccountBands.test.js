import { describe, it, expect } from "vitest";
import {
  bandAndSortPaidTimes,
  bandAndSortStalls,
  sortShavingsOrders,
  sortClassesByVerifiedDate,
} from "./payerAccountBands.js";

describe("bandAndSortPaidTimes", () => {
  it("buckets active, cancelled, and leaves no verified pending signal for paid time", () => {
    var result = bandAndSortPaidTimes([
      { paidTimeRequestId: 1, status: "Assigned" },
      { paidTimeRequestId: 2, status: "Cancelled" },
      { paidTimeRequestId: 3, status: "Pending" },
    ]);

    expect(result.active.map((it) => it.paidTimeRequestId)).toEqual([1, 3]);
    expect(result.pending.map((it) => it.paidTimeRequestId)).toEqual([]);
    expect(result.cancelled.map((it) => it.paidTimeRequestId)).toEqual([2]);
  });

  it("sorts within a band by displaySlotDate then displayStartTime then paidTimeRequestId, nulls last", () => {
    var result = bandAndSortPaidTimes([
      {
        paidTimeRequestId: 3,
        status: "Assigned",
        displaySlotDate: "2026-09-16",
        displayStartTime: "09:00",
      },
      {
        paidTimeRequestId: 1,
        status: "Assigned",
        displaySlotDate: "2026-09-15",
        displayStartTime: "14:00",
      },
      {
        paidTimeRequestId: 2,
        status: "Assigned",
        displaySlotDate: "2026-09-15",
        displayStartTime: "09:00",
      },
      {
        paidTimeRequestId: 4,
        status: "Assigned",
        displaySlotDate: null,
        displayStartTime: null,
      },
    ]);

    expect(result.active.map((it) => it.paidTimeRequestId)).toEqual([
      2, 1, 3, 4,
    ]);
  });

  it("missing/non-object items resolve to unknown, not active or cancelled", () => {
    var result = bandAndSortPaidTimes([null, undefined, "not-an-object"]);

    expect(result.active).toEqual([]);
    expect(result.pending).toEqual([]);
    expect(result.cancelled).toEqual([]);
  });

  it("handles a non-array input without throwing", () => {
    var result = bandAndSortPaidTimes(null);

    expect(result.active).toEqual([]);
    expect(result.pending).toEqual([]);
    expect(result.cancelled).toEqual([]);
  });
});

describe("bandAndSortStalls", () => {
  it("buckets active, pendingChange, pendingCancellation, and cancelled", () => {
    var result = bandAndSortStalls([
      { stallBookingId: 1 },
      { stallBookingId: 2, isCancelled: true },
      { stallBookingId: 3, hasPendingCancellation: true },
      { stallBookingId: 4, hasPendingChange: true },
    ]);

    expect(result.active.map((it) => it.stallBookingId)).toEqual([1]);
    expect(result.cancelled.map((it) => it.stallBookingId)).toEqual([2]);
    // pendingChange and pendingCancellation share the one pending bucket
    expect(result.pending.map((it) => it.stallBookingId).sort()).toEqual([
      3, 4,
    ]);
  });

  it("sorts within a band by startDate then horseName then stallBookingId, nulls last", () => {
    var result = bandAndSortStalls([
      { stallBookingId: 3, startDate: "2026-09-16", horseName: "Aaa" },
      { stallBookingId: 1, startDate: "2026-09-15", horseName: "Zzz" },
      { stallBookingId: 2, startDate: "2026-09-15", horseName: "Aaa" },
      { stallBookingId: 4, startDate: null, horseName: null },
    ]);

    expect(result.active.map((it) => it.stallBookingId)).toEqual([
      2, 1, 3, 4,
    ]);
  });

  it("missing/non-object items resolve to unknown, not active or cancelled", () => {
    var result = bandAndSortStalls([null, undefined]);

    expect(result.active).toEqual([]);
    expect(result.pending).toEqual([]);
    expect(result.cancelled).toEqual([]);
  });
});

describe("sortShavingsOrders", () => {
  it("sorts by requestedDeliveryTime then shavingsOrderId, nulls last", () => {
    var result = sortShavingsOrders([
      { shavingsOrderId: 3, requestedDeliveryTime: "2026-09-16T09:00:00" },
      { shavingsOrderId: 1, requestedDeliveryTime: "2026-09-15T09:00:00" },
      { shavingsOrderId: 2, requestedDeliveryTime: "2026-09-15T09:00:00" },
      { shavingsOrderId: 4, requestedDeliveryTime: null },
    ]);

    expect(result.map((it) => it.shavingsOrderId)).toEqual([1, 2, 3, 4]);
  });

  it("does not mutate the input array", () => {
    var input = [
      { shavingsOrderId: 2, requestedDeliveryTime: null },
      { shavingsOrderId: 1, requestedDeliveryTime: null },
    ];
    var inputCopy = input.slice();

    sortShavingsOrders(input);

    expect(input).toEqual(inputCopy);
  });

  it("handles a non-array input without throwing", () => {
    expect(sortShavingsOrders(null)).toEqual([]);
    expect(sortShavingsOrders(undefined)).toEqual([]);
  });

  it("sorts a null item within the list last instead of throwing", () => {
    var result = sortShavingsOrders([
      { shavingsOrderId: 1, requestedDeliveryTime: "2026-09-15T09:00:00" },
      null,
    ]);

    expect(result.map((it) => (it ? it.shavingsOrderId : null))).toEqual([
      1, null,
    ]);
  });
});

describe("sortClassesByVerifiedDate", () => {
  it("sorts by classDateTime then orderInDay then startTime then className then entryId, nulls last", () => {
    var result = sortClassesByVerifiedDate([
      { entryId: 3, classDateTime: "2026-09-16", orderInDay: 1 },
      { entryId: 1, classDateTime: "2026-09-15", orderInDay: 2 },
      { entryId: 2, classDateTime: "2026-09-15", orderInDay: 1 },
      { entryId: 4, classDateTime: null, orderInDay: null },
    ]);

    expect(result.map((it) => it.entryId)).toEqual([2, 1, 3, 4]);
  });

  it("does not attach or infer any lifecycle state - output items are untouched", () => {
    var input = [{ entryId: 1, classDateTime: "2026-09-15" }];

    var result = sortClassesByVerifiedDate(input);

    expect(result[0]).toEqual({ entryId: 1, classDateTime: "2026-09-15" });
    expect(result[0].entryStatus).toBeUndefined();
  });

  it("handles a non-array input without throwing", () => {
    expect(sortClassesByVerifiedDate(null)).toEqual([]);
  });

  it("sorts a null item within the list last instead of throwing", () => {
    var result = sortClassesByVerifiedDate([
      null,
      { entryId: 1, classDateTime: "2026-09-15" },
    ]);

    expect(result.map((it) => (it ? it.entryId : null))).toEqual([1, null]);
  });
});

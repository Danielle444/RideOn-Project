import { describe, it, expect } from "vitest";
import {
  getIsraelToday,
  getRequestedDeliveryDateOnly,
  getDeliveryUrgency,
  isActionRequired,
  groupActionRequiredOrders,
} from "./shavingsDueDate.utils";

// A UTC instant chosen so the UTC calendar date and the Israel calendar date DISAGREE:
// 2026-01-15T22:30:00Z is 2026-01-15 in UTC, but Israel (UTC+2 in January, no DST) is already
// 2026-01-16T00:30. Any comparison that used the device/UTC date instead of Asia/Jerusalem would
// get this wrong -- that's exactly the bug requirement #9 guards against.
const TZ_BOUNDARY_NOW = new Date("2026-01-15T22:30:00Z").getTime();

describe("getIsraelToday — Asia/Jerusalem boundary", () => {
  it("rolls to the next Israel calendar day before UTC midnight", () => {
    expect(getIsraelToday(TZ_BOUNDARY_NOW)).toEqual({
      year: 2026,
      month: 1,
      day: 16,
    });
  });
});

describe("getRequestedDeliveryDateOnly", () => {
  it("reads the literal date digits out of a naive (no-offset) timestamp string", () => {
    expect(
      getRequestedDeliveryDateOnly({
        requestedDeliveryTime: "2026-01-16T09:00:00",
      }),
    ).toEqual({ year: 2026, month: 1, day: 16 });
  });

  it("is casing-tolerant (PascalCase fallback)", () => {
    expect(
      getRequestedDeliveryDateOnly({
        RequestedDeliveryTime: "2026-01-16T09:00:00",
      }),
    ).toEqual({ year: 2026, month: 1, day: 16 });
  });

  it("returns null for a missing/null date", () => {
    expect(getRequestedDeliveryDateOnly({})).toBeNull();
    expect(
      getRequestedDeliveryDateOnly({ requestedDeliveryTime: null }),
    ).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(
      getRequestedDeliveryDateOnly({ requestedDeliveryTime: "" }),
    ).toBeNull();
  });

  it("returns null for a malformed date (bad shape, out-of-range month/day, non-date text)", () => {
    expect(
      getRequestedDeliveryDateOnly({ requestedDeliveryTime: "not-a-date" }),
    ).toBeNull();
    expect(
      getRequestedDeliveryDateOnly({ requestedDeliveryTime: "2026-13-01T00:00:00" }),
    ).toBeNull();
    expect(
      getRequestedDeliveryDateOnly({ requestedDeliveryTime: "2026-01-99T00:00:00" }),
    ).toBeNull();
    expect(
      getRequestedDeliveryDateOnly({ requestedDeliveryTime: "2026/01/16" }),
    ).toBeNull();
  });
});

describe("getDeliveryUrgency — classification against the Israel business date", () => {
  it("is 'dueToday' when the order's date matches Israel's current date, even though it is a different UTC day", () => {
    const order = { requestedDeliveryTime: "2026-01-16T09:00:00" };
    expect(getDeliveryUrgency(order, TZ_BOUNDARY_NOW)).toBe("dueToday");
  });

  it("is 'overdue' for a date strictly before Israel's today", () => {
    const order = { requestedDeliveryTime: "2026-01-15T09:00:00" };
    expect(getDeliveryUrgency(order, TZ_BOUNDARY_NOW)).toBe("overdue");
  });

  it("is 'future' for a date strictly after Israel's today", () => {
    const order = { requestedDeliveryTime: "2026-01-17T09:00:00" };
    expect(getDeliveryUrgency(order, TZ_BOUNDARY_NOW)).toBe("future");
  });

  it("is 'noDate' when requestedDeliveryTime is null, empty, or malformed", () => {
    expect(
      getDeliveryUrgency({ requestedDeliveryTime: null }, TZ_BOUNDARY_NOW),
    ).toBe("noDate");
    expect(
      getDeliveryUrgency({ requestedDeliveryTime: "" }, TZ_BOUNDARY_NOW),
    ).toBe("noDate");
    expect(
      getDeliveryUrgency(
        { requestedDeliveryTime: "not-a-date" },
        TZ_BOUNDARY_NOW,
      ),
    ).toBe("noDate");
  });

  it("treats midnight exactly as that calendar day, not the day before", () => {
    const order = { requestedDeliveryTime: "2026-01-16T00:00:00" };
    expect(getDeliveryUrgency(order, TZ_BOUNDARY_NOW)).toBe("dueToday");
  });
});

describe("isActionRequired", () => {
  it("includes an undelivered order due today or overdue", () => {
    expect(
      isActionRequired(
        { requestedDeliveryTime: "2026-01-16T09:00:00" },
        TZ_BOUNDARY_NOW,
      ),
    ).toBe(true);
    expect(
      isActionRequired(
        { requestedDeliveryTime: "2026-01-10T09:00:00" },
        TZ_BOUNDARY_NOW,
      ),
    ).toBe(true);
  });

  it("excludes a future undelivered order", () => {
    expect(
      isActionRequired(
        { requestedDeliveryTime: "2026-02-01T09:00:00" },
        TZ_BOUNDARY_NOW,
      ),
    ).toBe(false);
  });

  it("excludes a delivered order regardless of how overdue it is", () => {
    expect(
      isActionRequired(
        {
          requestedDeliveryTime: "2026-01-01T09:00:00",
          delivered: "2026-01-02T09:00:00",
        },
        TZ_BOUNDARY_NOW,
      ),
    ).toBe(false);
  });

  it("excludes an approved (terminal) cancellation", () => {
    expect(
      isActionRequired(
        {
          requestedDeliveryTime: "2026-01-01T09:00:00",
          isCancelled: true,
        },
        TZ_BOUNDARY_NOW,
      ),
    ).toBe(false);
  });

  it("keeps a PENDING cancellation included (audited recommendation: visible, not terminal)", () => {
    expect(
      isActionRequired(
        {
          requestedDeliveryTime: "2026-01-01T09:00:00",
          hasPendingCancellation: true,
        },
        TZ_BOUNDARY_NOW,
      ),
    ).toBe(true);
  });

  it("excludes an undelivered order with a null due date (confirmed rule: neither overdue nor due today)", () => {
    expect(
      isActionRequired({ requestedDeliveryTime: null }, TZ_BOUNDARY_NOW),
    ).toBe(false);
  });

  it("excludes an undelivered order with an empty-string due date", () => {
    expect(
      isActionRequired({ requestedDeliveryTime: "" }, TZ_BOUNDARY_NOW),
    ).toBe(false);
  });

  it("excludes an undelivered order with a malformed due date", () => {
    expect(
      isActionRequired(
        { requestedDeliveryTime: "not-a-date" },
        TZ_BOUNDARY_NOW,
      ),
    ).toBe(false);
    expect(
      isActionRequired(
        { requestedDeliveryTime: "2026-13-40T00:00:00" },
        TZ_BOUNDARY_NOW,
      ),
    ).toBe(false);
  });
});

describe("groupActionRequiredOrders", () => {
  const overdueOrder = {
    shavingsOrderId: 1,
    requestedDeliveryTime: "2026-01-10T09:00:00",
  };
  const todayOrder = {
    shavingsOrderId: 2,
    requestedDeliveryTime: "2026-01-16T09:00:00",
  };
  const futureOrder = {
    shavingsOrderId: 3,
    requestedDeliveryTime: "2026-02-01T09:00:00",
  };
  const deliveredOrder = {
    shavingsOrderId: 4,
    requestedDeliveryTime: "2026-01-05T09:00:00",
    delivered: "2026-01-06T09:00:00",
  };
  const cancelledOrder = {
    shavingsOrderId: 5,
    requestedDeliveryTime: "2026-01-05T09:00:00",
    isCancelled: true,
  };
  const noDateOrder = { shavingsOrderId: 6, requestedDeliveryTime: null };
  const emptyDateOrder = { shavingsOrderId: 7, requestedDeliveryTime: "" };
  const malformedDateOrder = {
    shavingsOrderId: 8,
    requestedDeliveryTime: "not-a-date",
  };

  const orders = [
    todayOrder,
    futureOrder,
    overdueOrder,
    deliveredOrder,
    cancelledOrder,
    noDateOrder,
    emptyDateOrder,
    malformedDateOrder,
  ];

  it("buckets overdue and due-today separately, dropping future/delivered/cancelled/no-date", () => {
    const result = groupActionRequiredOrders(orders, TZ_BOUNDARY_NOW);

    expect(result.dueToday.map((o) => o.shavingsOrderId)).toEqual([2]);
    expect(result.overdue.map((o) => o.shavingsOrderId)).toEqual([1]);
  });

  it("puts the overdue group before the due-today group in `all` (spec order)", () => {
    const result = groupActionRequiredOrders(orders, TZ_BOUNDARY_NOW);
    expect(result.all.map((o) => o.shavingsOrderId)).toEqual([1, 2]);
  });

  it("count reflects only the visible eligible rows — null/empty/malformed dates never inflate it", () => {
    const result = groupActionRequiredOrders(orders, TZ_BOUNDARY_NOW);
    expect(result.all.length).toBe(2);
  });

  it("produces no duplicate rows — every id appears at most once across all()", () => {
    const result = groupActionRequiredOrders(orders, TZ_BOUNDARY_NOW);
    const ids = result.all.map((o) => o.shavingsOrderId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("returns empty groups (not a crash) for an empty or non-array input", () => {
    expect(groupActionRequiredOrders([], TZ_BOUNDARY_NOW)).toEqual({
      overdue: [],
      dueToday: [],
      all: [],
    });
    expect(groupActionRequiredOrders(undefined, TZ_BOUNDARY_NOW)).toEqual({
      overdue: [],
      dueToday: [],
      all: [],
    });
  });
});

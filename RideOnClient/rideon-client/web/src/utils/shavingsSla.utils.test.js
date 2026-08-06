import { describe, it, expect } from "vitest";
import {
  SHAVINGS_SLA_THRESHOLD_HOURS,
  isUnclaimedTooLong,
  isUndeliveredTooLong,
  isDelayed,
  getDelayRule,
} from "./shavingsSla.utils";

// "now" fixed at an Israel wall-clock instant of 2026-08-07T12:00:00 (IDT, UTC+3) so every
// scenario below can be phrased in Israel local time without re-deriving the offset.
const NOW = new Date("2026-08-07T12:00:00+03:00").getTime();

describe("isUnclaimedTooLong — Rule A, due-date gated (bug: future orders were flagged from creation time)", () => {
  it("excludes a future order even though it was created more than 3 hours ago", () => {
    // Reproduces the QA report: an order requested for next month, created days ago, with no
    // worker assigned yet. Before the fix this compared hoursSince(created) directly and flagged
    // it "טרם נלקח לטיפול · מעל 3 שעות" despite being nowhere near due.
    expect(
      isUnclaimedTooLong(
        {
          requestedDeliveryTime: "2026-09-15T09:00:00",
          prequestDatetime: "2026-08-01T09:00:00+03:00",
        },
        NOW,
      ),
    ).toBe(false);
  });

  it("excludes a future order created only minutes ago", () => {
    expect(
      isUnclaimedTooLong(
        {
          requestedDeliveryTime: "2026-09-15T09:00:00",
          prequestDatetime: "2026-08-07T11:55:00+03:00",
        },
        NOW,
      ),
    ).toBe(false);
  });

  it("excludes an unclaimed order due today whose due moment hasn't arrived yet", () => {
    expect(
      isUnclaimedTooLong(
        { requestedDeliveryTime: "2026-08-07T18:00:00" },
        NOW,
      ),
    ).toBe(false);
  });

  it("excludes an unclaimed order due today less than the threshold past its due moment", () => {
    // Due at 10:00, now is 12:00 -- 2 hours since due, under the 3-hour threshold.
    expect(
      isUnclaimedTooLong(
        { requestedDeliveryTime: "2026-08-07T10:00:00" },
        NOW,
      ),
    ).toBe(false);
  });

  it("includes an unclaimed order due today more than the threshold past its due moment", () => {
    // Due at 08:00, now is 12:00 -- 4 hours since due, over the 3-hour threshold.
    expect(
      isUnclaimedTooLong(
        { requestedDeliveryTime: "2026-08-07T08:00:00" },
        NOW,
      ),
    ).toBe(true);
  });

  it("includes an overdue unclaimed order unconditionally, even barely past midnight", () => {
    // Due yesterday 23:59 -- overdue by calendar date, even though only ~12 hours (or, at the
    // boundary, far less) have elapsed since the due moment itself. Overdue orders must still
    // surface regardless of hour granularity.
    expect(
      isUnclaimedTooLong(
        { requestedDeliveryTime: "2026-08-06T23:59:00" },
        NOW,
      ),
    ).toBe(true);
  });

  it("includes a long-overdue unclaimed order", () => {
    expect(
      isUnclaimedTooLong(
        { requestedDeliveryTime: "2026-07-20T09:00:00" },
        NOW,
      ),
    ).toBe(true);
  });

  it("excludes a claimed order regardless of due date (Rule A only concerns unclaimed orders)", () => {
    expect(
      isUnclaimedTooLong(
        {
          requestedDeliveryTime: "2026-07-20T09:00:00",
          workerSystemUserId: 42,
        },
        NOW,
      ),
    ).toBe(false);
  });

  it("excludes an order with a missing requestedDeliveryTime (never silently overdue)", () => {
    expect(
      isUnclaimedTooLong({ requestedDeliveryTime: null }, NOW),
    ).toBe(false);
  });

  it("excludes an order with a malformed requestedDeliveryTime", () => {
    expect(
      isUnclaimedTooLong({ requestedDeliveryTime: "not-a-date" }, NOW),
    ).toBe(false);
  });

  it("is casing-tolerant (PascalCase requestedDeliveryTime/WorkerSystemUserId)", () => {
    expect(
      isUnclaimedTooLong(
        { RequestedDeliveryTime: "2026-08-07T08:00:00" },
        NOW,
      ),
    ).toBe(true);

    expect(
      isUnclaimedTooLong(
        {
          RequestedDeliveryTime: "2026-08-07T08:00:00",
          WorkerSystemUserId: 7,
        },
        NOW,
      ),
    ).toBe(false);
  });

  it("threshold stays templated from the single named constant", () => {
    expect(SHAVINGS_SLA_THRESHOLD_HOURS).toBe(3);
  });
});

describe("isUndeliveredTooLong — Rule B, deliberately unchanged by this fix", () => {
  it("still flags a claimed-but-undelivered future order from its seen time (pre-existing behavior preserved)", () => {
    // A worker claimed a delivery requested for next month, days ago, and hasn't delivered yet.
    // This is the same class of premature flag as the Rule A bug, but Rule B is explicitly out of
    // scope for this fix ("claimed order behavior unchanged") -- asserting it here pins that
    // scope boundary so a future change can't silently widen it.
    expect(
      isUndeliveredTooLong(
        {
          requestedDeliveryTime: "2026-09-15T09:00:00",
          workerSystemUserId: 42,
          seen: "2026-08-07T08:00:00+03:00",
        },
        NOW,
      ),
    ).toBe(true);
  });

  it("excludes a delivered order", () => {
    expect(
      isUndeliveredTooLong(
        {
          requestedDeliveryTime: "2026-07-01T09:00:00",
          workerSystemUserId: 42,
          seen: "2026-07-01T09:00:00+03:00",
          delivered: "2026-07-01T10:00:00+03:00",
        },
        NOW,
      ),
    ).toBe(false);
  });
});

describe("isDelayed / getDelayRule — row-highlight integration", () => {
  it("does not flag a future unclaimed order as delayed (regression for the QA report)", () => {
    const order = {
      requestedDeliveryTime: "2026-09-15T09:00:00",
      prequestDatetime: "2026-08-01T09:00:00+03:00",
    };

    expect(isDelayed(order, NOW)).toBe(false);
    expect(getDelayRule(order, NOW)).toBeNull();
  });

  it("flags an overdue unclaimed order as delayed via Rule A", () => {
    const order = { requestedDeliveryTime: "2026-07-20T09:00:00" };

    expect(isDelayed(order, NOW)).toBe(true);
    expect(getDelayRule(order, NOW)).toBe("A");
  });

  it("flags a claimed order overdue on delivery as delayed via Rule B", () => {
    const order = {
      requestedDeliveryTime: "2026-07-20T09:00:00",
      workerSystemUserId: 42,
      seen: "2026-07-20T09:30:00+03:00",
    };

    expect(isDelayed(order, NOW)).toBe(true);
    expect(getDelayRule(order, NOW)).toBe("B");
  });
});

import { describe, it, expect } from "vitest";
import {
  LIFECYCLE_STATE,
  LIFECYCLE_STATE_UNKNOWN,
  PAYER_ACCOUNT_ITEM_TYPE,
  resolveStallLifecycleState,
  resolvePaidTimeLifecycleState,
  resolveShavingsLifecycleState,
  resolveClassLifecycleState,
  resolvePayerAccountItemLifecycleState,
} from "./payerAccountLifecycle.js";

describe("resolveStallLifecycleState", () => {
  it("is active when no flags are set", () => {
    expect(
      resolveStallLifecycleState({
        isCancelled: false,
        hasPendingCancellation: false,
        hasPendingChange: false,
      }),
    ).toBe(LIFECYCLE_STATE.ACTIVE);
  });

  it("is cancelled when isCancelled is true", () => {
    expect(
      resolveStallLifecycleState({
        isCancelled: true,
        hasPendingCancellation: false,
        hasPendingChange: false,
      }),
    ).toBe(LIFECYCLE_STATE.CANCELLED);
  });

  it("is pendingCancellation when hasPendingCancellation is true", () => {
    expect(
      resolveStallLifecycleState({
        isCancelled: false,
        hasPendingCancellation: true,
        hasPendingChange: false,
      }),
    ).toBe(LIFECYCLE_STATE.PENDING_CANCELLATION);
  });

  it("is pendingChange when hasPendingChange is true", () => {
    expect(
      resolveStallLifecycleState({
        isCancelled: false,
        hasPendingCancellation: false,
        hasPendingChange: true,
      }),
    ).toBe(LIFECYCLE_STATE.PENDING_CHANGE);
  });

  it("isCancelled wins over a stale pending flag", () => {
    expect(
      resolveStallLifecycleState({
        isCancelled: true,
        hasPendingCancellation: true,
        hasPendingChange: true,
      }),
    ).toBe(LIFECYCLE_STATE.CANCELLED);
  });

  it("hasPendingCancellation wins over hasPendingChange", () => {
    expect(
      resolveStallLifecycleState({
        isCancelled: false,
        hasPendingCancellation: true,
        hasPendingChange: true,
      }),
    ).toBe(LIFECYCLE_STATE.PENDING_CANCELLATION);
  });

  it("is unknown for a missing stall item, never a guessed active", () => {
    expect(resolveStallLifecycleState(null)).toBe(LIFECYCLE_STATE_UNKNOWN);
    expect(resolveStallLifecycleState(undefined)).toBe(
      LIFECYCLE_STATE_UNKNOWN,
    );
  });

  it("is unknown for a non-object item", () => {
    expect(resolveStallLifecycleState("not-an-object")).toBe(
      LIFECYCLE_STATE_UNKNOWN,
    );
    expect(resolveStallLifecycleState(42)).toBe(LIFECYCLE_STATE_UNKNOWN);
  });

  it("is active for an existing stall object with none of the flags set", () => {
    expect(resolveStallLifecycleState({})).toBe(LIFECYCLE_STATE.ACTIVE);
  });
});

describe("resolvePaidTimeLifecycleState", () => {
  it("is cancelled for the literal status Cancelled", () => {
    expect(resolvePaidTimeLifecycleState({ status: "Cancelled" })).toBe(
      LIFECYCLE_STATE.CANCELLED,
    );
  });

  it("is active for other verified status strings (assignment workflow, not cancellation)", () => {
    expect(resolvePaidTimeLifecycleState({ status: "Pending" })).toBe(
      LIFECYCLE_STATE.ACTIVE,
    );
    expect(resolvePaidTimeLifecycleState({ status: "Assigned" })).toBe(
      LIFECYCLE_STATE.ACTIVE,
    );
  });

  it("is active for an existing item with an unrecognized or missing status", () => {
    expect(resolvePaidTimeLifecycleState({ status: undefined })).toBe(
      LIFECYCLE_STATE.ACTIVE,
    );
    expect(resolvePaidTimeLifecycleState({})).toBe(LIFECYCLE_STATE.ACTIVE);
  });

  it("is unknown for a missing paid-time item, never a guessed active", () => {
    expect(resolvePaidTimeLifecycleState(null)).toBe(LIFECYCLE_STATE_UNKNOWN);
    expect(resolvePaidTimeLifecycleState(undefined)).toBe(
      LIFECYCLE_STATE_UNKNOWN,
    );
  });

  it("is unknown for a non-object item", () => {
    expect(resolvePaidTimeLifecycleState("not-an-object")).toBe(
      LIFECYCLE_STATE_UNKNOWN,
    );
  });
});

describe("resolveShavingsLifecycleState", () => {
  it("inherits each of the four known parent stall states verbatim when the order has no own cancellation flags", () => {
    expect(resolveShavingsLifecycleState({}, LIFECYCLE_STATE.ACTIVE)).toBe(
      LIFECYCLE_STATE.ACTIVE,
    );
    expect(
      resolveShavingsLifecycleState({}, LIFECYCLE_STATE.PENDING_CHANGE),
    ).toBe(LIFECYCLE_STATE.PENDING_CHANGE);
    expect(
      resolveShavingsLifecycleState(
        {},
        LIFECYCLE_STATE.PENDING_CANCELLATION,
      ),
    ).toBe(LIFECYCLE_STATE.PENDING_CANCELLATION);
    expect(resolveShavingsLifecycleState({}, LIFECYCLE_STATE.CANCELLED)).toBe(
      LIFECYCLE_STATE.CANCELLED,
    );
  });

  it("is unknown for a missing or unrecognized parent state and no own flags (caller misuse, not real data)", () => {
    expect(resolveShavingsLifecycleState({}, undefined)).toBe(
      LIFECYCLE_STATE_UNKNOWN,
    );
    expect(resolveShavingsLifecycleState({}, null)).toBe(
      LIFECYCLE_STATE_UNKNOWN,
    );
    expect(resolveShavingsLifecycleState({}, "notARealState")).toBe(
      LIFECYCLE_STATE_UNKNOWN,
    );
  });

  it("standalone cancellation: own isCancelled wins over an Active parent stall", () => {
    expect(
      resolveShavingsLifecycleState(
        { isCancelled: true },
        LIFECYCLE_STATE.ACTIVE,
      ),
    ).toBe(LIFECYCLE_STATE.CANCELLED);
  });

  it("standalone pending cancellation: own hasPendingCancellation wins over an Active parent stall", () => {
    expect(
      resolveShavingsLifecycleState(
        { hasPendingCancellation: true },
        LIFECYCLE_STATE.ACTIVE,
      ),
    ).toBe(LIFECYCLE_STATE.PENDING_CANCELLATION);
  });

  it("own isCancelled outranks own hasPendingCancellation when both are somehow set", () => {
    expect(
      resolveShavingsLifecycleState(
        { isCancelled: true, hasPendingCancellation: true },
        LIFECYCLE_STATE.ACTIVE,
      ),
    ).toBe(LIFECYCLE_STATE.CANCELLED);
  });

  it("own isCancelled wins even with no resolvable parent state", () => {
    expect(
      resolveShavingsLifecycleState({ isCancelled: true }, undefined),
    ).toBe(LIFECYCLE_STATE.CANCELLED);
  });

  it("falls back to the parent stall state when own flags are explicitly false", () => {
    expect(
      resolveShavingsLifecycleState(
        { isCancelled: false, hasPendingCancellation: false },
        LIFECYCLE_STATE.PENDING_CHANGE,
      ),
    ).toBe(LIFECYCLE_STATE.PENDING_CHANGE);
  });
});

describe("resolveClassLifecycleState", () => {
  it("is unknown for a class item missing the entryStatus field", () => {
    expect(
      resolveClassLifecycleState({
        entryId: 1,
        className: "Open NRHA",
        organizerCost: 50,
      }),
    ).toBe(LIFECYCLE_STATE_UNKNOWN);
  });

  it("is unknown for a missing class item", () => {
    expect(resolveClassLifecycleState(null)).toBe(LIFECYCLE_STATE_UNKNOWN);
    expect(resolveClassLifecycleState(undefined)).toBe(
      LIFECYCLE_STATE_UNKNOWN,
    );
  });

  it("maps the deployed proc-212 Active value", () => {
    expect(resolveClassLifecycleState({ entryStatus: "Active" })).toBe(
      LIFECYCLE_STATE.ACTIVE,
    );
  });

  it("maps Cancelled, CancelledAfterStart, and Replaced to the cancelled band", () => {
    expect(resolveClassLifecycleState({ entryStatus: "Cancelled" })).toBe(
      LIFECYCLE_STATE.CANCELLED,
    );
    expect(
      resolveClassLifecycleState({ entryStatus: "CancelledAfterStart" }),
    ).toBe(LIFECYCLE_STATE.CANCELLED);
    expect(resolveClassLifecycleState({ entryStatus: "Replaced" })).toBe(
      LIFECYCLE_STATE.CANCELLED,
    );
  });

  it("is unknown for an unrecognized entryStatus value rather than guessing", () => {
    expect(resolveClassLifecycleState({ entryStatus: "Proposed" })).toBe(
      LIFECYCLE_STATE_UNKNOWN,
    );
    expect(resolveClassLifecycleState({ entryStatus: "" })).toBe(
      LIFECYCLE_STATE_UNKNOWN,
    );
  });

  it("is unknown when entryStatus is present but not a string", () => {
    expect(resolveClassLifecycleState({ entryStatus: null })).toBe(
      LIFECYCLE_STATE_UNKNOWN,
    );
    expect(resolveClassLifecycleState({ entryStatus: 1 })).toBe(
      LIFECYCLE_STATE_UNKNOWN,
    );
  });
});

describe("resolvePayerAccountItemLifecycleState", () => {
  it("dispatches stall items to resolveStallLifecycleState", () => {
    expect(
      resolvePayerAccountItemLifecycleState(PAYER_ACCOUNT_ITEM_TYPE.STALL, {
        isCancelled: true,
      }),
    ).toBe(LIFECYCLE_STATE.CANCELLED);
  });

  it("dispatches paidTime items to resolvePaidTimeLifecycleState", () => {
    expect(
      resolvePayerAccountItemLifecycleState(
        PAYER_ACCOUNT_ITEM_TYPE.PAID_TIME,
        { status: "Cancelled" },
      ),
    ).toBe(LIFECYCLE_STATE.CANCELLED);
  });

  it("dispatches shavings items using context.parentStallLifecycleState", () => {
    expect(
      resolvePayerAccountItemLifecycleState(
        PAYER_ACCOUNT_ITEM_TYPE.SHAVINGS,
        {},
        { parentStallLifecycleState: LIFECYCLE_STATE.PENDING_CANCELLATION },
      ),
    ).toBe(LIFECYCLE_STATE.PENDING_CANCELLATION);
  });

  it("dispatches shavings items' own isCancelled ahead of an Active parent stall", () => {
    expect(
      resolvePayerAccountItemLifecycleState(
        PAYER_ACCOUNT_ITEM_TYPE.SHAVINGS,
        { isCancelled: true },
        { parentStallLifecycleState: LIFECYCLE_STATE.ACTIVE },
      ),
    ).toBe(LIFECYCLE_STATE.CANCELLED);
  });

  it("dispatches class items to resolveClassLifecycleState", () => {
    expect(
      resolvePayerAccountItemLifecycleState(PAYER_ACCOUNT_ITEM_TYPE.CLASS, {
        entryStatus: "Active",
      }),
    ).toBe(LIFECYCLE_STATE.ACTIVE);
  });

  it("is unknown for an unrecognized item type", () => {
    expect(
      resolvePayerAccountItemLifecycleState("somethingElse", {}),
    ).toBe(LIFECYCLE_STATE_UNKNOWN);
  });
});

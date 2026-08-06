import { describe, it, expect, vi } from "vitest";
import { createInFlightGuard } from "./inFlightGuard";

describe("createInFlightGuard", () => {
  it("first acquire for a key returns true", () => {
    var guard = createInFlightGuard();
    expect(guard.tryAcquire(1)).toBe(true);
  });

  it("a duplicate acquire for the same key returns false while the first is still active", () => {
    var guard = createInFlightGuard();
    guard.tryAcquire(1);
    expect(guard.tryAcquire(1)).toBe(false);
  });

  it("release permits the key to be acquired again", () => {
    var guard = createInFlightGuard();
    guard.tryAcquire(1);
    guard.release(1);
    expect(guard.tryAcquire(1)).toBe(true);
  });

  it("two immediate invocations of a guarded async operation invoke the inner mutation exactly once", async () => {
    var guard = createInFlightGuard();
    var inner = vi.fn().mockResolvedValue(undefined);

    async function guarded(key) {
      if (!guard.tryAcquire(key)) {
        return "blocked";
      }
      try {
        return await inner(key);
      } finally {
        guard.release(key);
      }
    }

    var call1 = guarded(1);
    var call2 = guarded(1); // fired synchronously, before call1's await settles

    await Promise.all([call1, call2]);

    expect(inner).toHaveBeenCalledTimes(1);
  });

  it("different keys are independent - both proceed", () => {
    var guard = createInFlightGuard();
    expect(guard.tryAcquire(1)).toBe(true);
    expect(guard.tryAcquire(2)).toBe(true);
  });

  it("a failed inner operation still releases the guard via finally, permitting a later retry", async () => {
    var guard = createInFlightGuard();
    var inner = vi.fn().mockRejectedValue(new Error("boom"));

    var secondAcquireWhileFirstInFlight;
    var firstCallPromise = (async function () {
      if (!guard.tryAcquire(1)) return "blocked";
      try {
        await inner(1);
        return "succeeded";
      } catch (e) {
        return "failed";
      } finally {
        guard.release(1);
      }
    })();

    // While the first call is still awaiting inner(), a second acquire for
    // the same key must be rejected.
    secondAcquireWhileFirstInFlight = guard.tryAcquire(1);

    var firstResult = await firstCallPromise;

    expect(firstResult).toBe("failed");
    expect(secondAcquireWhileFirstInFlight).toBe(false);
    // Released in finally despite the rejection - a later, separate attempt
    // is allowed.
    expect(guard.tryAcquire(1)).toBe(true);
  });
});

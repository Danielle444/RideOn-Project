import { describe, it, expect } from "vitest";
import {
  getIsCancelled,
  getHasPendingCancellation,
  deriveShavingsStatus,
} from "./shavingsStatus.utils";

// Standalone shavings cancellation: getIsCancelled/getHasPendingCancellation
// read proc 176's own IsCancelled/HasPendingCancellation columns, an axis
// independent of the Pending/Seen/Delivered pipeline deriveShavingsStatus
// computes. Casing-tolerant like every other reader in this file.

describe("getIsCancelled", () => {
  it("is true only for an explicit camelCase isCancelled: true", () => {
    expect(getIsCancelled({ isCancelled: true })).toBe(true);
  });

  it("also reads the PascalCase IsCancelled fallback", () => {
    expect(getIsCancelled({ IsCancelled: true })).toBe(true);
  });

  it("is false for isCancelled: false, missing, or a non-boolean truthy value", () => {
    expect(getIsCancelled({ isCancelled: false })).toBe(false);
    expect(getIsCancelled({})).toBe(false);
    expect(getIsCancelled({ isCancelled: 1 })).toBe(false);
  });
});

describe("getHasPendingCancellation", () => {
  it("is true only for an explicit camelCase hasPendingCancellation: true", () => {
    expect(getHasPendingCancellation({ hasPendingCancellation: true })).toBe(
      true,
    );
  });

  it("also reads the PascalCase HasPendingCancellation fallback", () => {
    expect(getHasPendingCancellation({ HasPendingCancellation: true })).toBe(
      true,
    );
  });

  it("is false for hasPendingCancellation: false or missing", () => {
    expect(getHasPendingCancellation({ hasPendingCancellation: false })).toBe(
      false,
    );
    expect(getHasPendingCancellation({})).toBe(false);
  });
});

describe("cancellation flags are independent of deriveShavingsStatus", () => {
  it("a cancelled order still derives its delivery status from Seen/Delivered, unaffected by isCancelled", () => {
    var order = { isCancelled: true, workerSystemUserId: 5 };

    expect(getIsCancelled(order)).toBe(true);
    expect(deriveShavingsStatus(order)).toBe("Seen");
  });
});

import { describe, it, expect, vi } from "vitest";
import {
  applyAutoScheduleAction,
  isStalePreviewError,
  getStalePreviewMessage,
  STALE_PREVIEW_MESSAGE,
} from "./autoScheduleApply.controller.js";

// Build an axios-style error for a given status + body.
function httpError(status, data) {
  var err = new Error("request failed");
  err.response = { status: status, data: data };
  return err;
}

describe("applyAutoScheduleAction - the Apply orchestration seam", function () {
  it("calls the injected apply function with competitionId, ranchId, fingerprint only", async function () {
    var applyFn = vi.fn().mockResolvedValue({ data: {} });
    var fingerprint = "f".repeat(64);

    await applyAutoScheduleAction(applyFn, 41, 7, fingerprint);

    expect(applyFn).toHaveBeenCalledTimes(1);
    expect(applyFn).toHaveBeenCalledWith(41, 7, fingerprint);
  });

  it("returns response.data (the AutoSchedulerSummary payload) on success", async function () {
    var summary = { scheduledCount: 5, unscheduledCount: 2, frozenCount: 1 };
    var applyFn = vi.fn().mockResolvedValue({ data: summary });

    var result = await applyAutoScheduleAction(applyFn, 41, 7, "a".repeat(64));

    expect(result).toBe(summary);
  });

  it("propagates the original error so the caller can classify it", async function () {
    var err = httpError(409, { code: "STALE_PREVIEW", message: "x" });
    var applyFn = vi.fn().mockRejectedValue(err);

    await expect(
      applyAutoScheduleAction(applyFn, 41, 7, "a".repeat(64)),
    ).rejects.toBe(err);
  });

  it("throws a clear error if no apply function is provided", async function () {
    await expect(
      applyAutoScheduleAction(undefined, 41, 7, "a".repeat(64)),
    ).rejects.toThrow("applyFn is required");
  });
});

describe("isStalePreviewError - stale detection uses BOTH status and code", function () {
  it("is true for 409 WITH code STALE_PREVIEW", function () {
    var err = httpError(409, {
      code: "STALE_PREVIEW",
      message: "התצוגה המקדימה שאושרה כבר אינה עדכנית.",
    });

    expect(isStalePreviewError(err)).toBe(true);
  });

  it("is false for a 409 that lacks the STALE_PREVIEW code", function () {
    expect(isStalePreviewError(httpError(409, { code: "OTHER" }))).toBe(false);
    expect(isStalePreviewError(httpError(409, {}))).toBe(false);
    expect(isStalePreviewError(httpError(409, "conflict"))).toBe(false);
  });

  it("is false for a normal 400 (malformed fingerprint), even if a code is present", function () {
    expect(isStalePreviewError(httpError(400, "Invalid fingerprint"))).toBe(
      false,
    );
    expect(isStalePreviewError(httpError(400, { code: "STALE_PREVIEW" }))).toBe(
      false,
    );
  });

  it("is false for 403 / network / undefined errors", function () {
    expect(isStalePreviewError(httpError(403, "forbidden"))).toBe(false);
    expect(isStalePreviewError(new Error("network down"))).toBe(false);
    expect(isStalePreviewError(undefined)).toBe(false);
    expect(isStalePreviewError(null)).toBe(false);
  });
});

describe("getStalePreviewMessage - server message preferred, approved fallback", function () {
  it("returns the server-provided Hebrew message when present", function () {
    var serverMsg = "התצוגה המקדימה שאושרה כבר אינה עדכנית. יש לחשב מחדש לפני החלה.";
    var err = httpError(409, { code: "STALE_PREVIEW", message: serverMsg });

    expect(getStalePreviewMessage(err)).toBe(serverMsg);
  });

  it("falls back to the approved equivalent when no message is present", function () {
    expect(getStalePreviewMessage(httpError(409, { code: "STALE_PREVIEW" }))).toBe(
      STALE_PREVIEW_MESSAGE,
    );
    expect(getStalePreviewMessage(undefined)).toBe(STALE_PREVIEW_MESSAGE);
  });
});

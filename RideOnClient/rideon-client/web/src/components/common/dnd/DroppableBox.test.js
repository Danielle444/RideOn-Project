import { describe, it, expect } from "vitest";
import { getActiveOverClassName } from "./DroppableBox.utils";

describe("getActiveOverClassName", function () {
  it("returns the blocked class when hovering a blocked target", function () {
    expect(
      getActiveOverClassName({
        isOver: true,
        disabled: false,
        blocked: true,
        overClassName: "accept",
        blockedOverClassName: "blocked",
      }),
    ).toBe("blocked");
  });

  it("returns the accept class when hovering an unblocked target", function () {
    expect(
      getActiveOverClassName({
        isOver: true,
        disabled: false,
        blocked: false,
        overClassName: "accept",
        blockedOverClassName: "blocked",
      }),
    ).toBe("accept");
  });

  it("blocked takes precedence over the accept class even when both are set", function () {
    var result = getActiveOverClassName({
      isOver: true,
      disabled: false,
      blocked: true,
      overClassName: "accept",
      blockedOverClassName: "blocked",
    });

    expect(result).not.toBe("accept");
    expect(result).toBe("blocked");
  });

  it("returns empty when not hovering, regardless of blocked", function () {
    expect(
      getActiveOverClassName({
        isOver: false,
        disabled: false,
        blocked: true,
        overClassName: "accept",
        blockedOverClassName: "blocked",
      }),
    ).toBe("");
  });

  it("disabled suppresses hover styling even while hovering a blocked target", function () {
    expect(
      getActiveOverClassName({
        isOver: true,
        disabled: true,
        blocked: true,
        overClassName: "accept",
        blockedOverClassName: "blocked",
      }),
    ).toBe("");
  });

  it("disabled suppresses hover styling for a normal accept target too", function () {
    expect(
      getActiveOverClassName({
        isOver: true,
        disabled: true,
        blocked: false,
        overClassName: "accept",
        blockedOverClassName: "blocked",
      }),
    ).toBe("");
  });

  it("falls back to empty string when blocked but no blockedOverClassName is given", function () {
    expect(
      getActiveOverClassName({
        isOver: true,
        disabled: false,
        blocked: true,
        overClassName: "accept",
        blockedOverClassName: undefined,
      }),
    ).toBe("");
  });
});

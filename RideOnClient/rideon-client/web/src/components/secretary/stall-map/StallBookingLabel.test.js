import { describe, it, expect } from "vitest";
import {
  getStallRanchLine,
  getStallSecondaryLine,
} from "./StallBookingLabel.utils";

describe("getStallRanchLine", function () {
  it("is ranch-first: renders bookingRanchName when present", function () {
    expect(getStallRanchLine({ bookingRanchName: "רוח צפונית" })).toBe(
      "רוח צפונית",
    );
  });

  it("falls back to the unknown-ranch placeholder when bookingRanchName is missing", function () {
    expect(getStallRanchLine({ bookingRanchName: null })).toBe(
      "חווה לא ידועה",
    );
    expect(getStallRanchLine({})).toBe("חווה לא ידועה");
  });

  it("returns empty for a missing item", function () {
    expect(getStallRanchLine(null)).toBe("");
    expect(getStallRanchLine(undefined)).toBe("");
  });
});

describe("getStallSecondaryLine", function () {
  it("shows the tack placeholder for tack items regardless of barn/horse name", function () {
    expect(
      getStallSecondaryLine({
        isForTack: true,
        barnName: "רפת א",
        horseName: "ברק",
      }),
    ).toBe("תא ציוד");
  });

  it("prefers barnName over horseName for horse items", function () {
    expect(
      getStallSecondaryLine({
        isForTack: false,
        barnName: "רפת א",
        horseName: "ברק",
      }),
    ).toBe("רפת א");
  });

  it("falls back to horseName when barnName is missing", function () {
    expect(
      getStallSecondaryLine({ isForTack: false, barnName: null, horseName: "ברק" }),
    ).toBe("ברק");
  });

  it("falls back to an empty string when neither barnName nor horseName is present", function () {
    expect(getStallSecondaryLine({ isForTack: false })).toBe("");
  });

  it("returns empty for a missing item", function () {
    expect(getStallSecondaryLine(null)).toBe("");
  });
});

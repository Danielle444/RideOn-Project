import { describe, it, expect } from "vitest";
import { getAvailableDatesForTab } from "./payerAccountAvailableDates.js";

function buildAccount() {
  return {
    classes: [
      { classDateTime: "2026-08-10T09:00:00Z" },
      { classDateTime: "2026-08-11T09:00:00Z" },
    ],
    paidTimes: [{ displaySlotDate: "2026-08-12" }],
    stalls: [{ startDate: "2026-08-13" }],
  };
}

describe("getAvailableDatesForTab", () => {
  it("classes tab exposes only class dates", () => {
    var result = getAvailableDatesForTab("classes", buildAccount());

    expect(result).toEqual(["2026-08-10", "2026-08-11"]);
  });

  it("paidTimes tab exposes only paid-time dates", () => {
    var result = getAvailableDatesForTab("paidTimes", buildAccount());

    expect(result).toEqual(["2026-08-12"]);
  });

  it("stalls tab exposes only stall dates", () => {
    var result = getAvailableDatesForTab("stalls", buildAccount());

    expect(result).toEqual(["2026-08-13"]);
  });

  it("never unions across categories", () => {
    var account = buildAccount();

    var classesDates = getAvailableDatesForTab("classes", account);
    var paidTimesDates = getAvailableDatesForTab("paidTimes", account);
    var stallsDates = getAvailableDatesForTab("stalls", account);

    expect(classesDates).not.toContain("2026-08-12");
    expect(classesDates).not.toContain("2026-08-13");
    expect(paidTimesDates).not.toContain("2026-08-10");
    expect(paidTimesDates).not.toContain("2026-08-13");
    expect(stallsDates).not.toContain("2026-08-10");
    expect(stallsDates).not.toContain("2026-08-12");
  });

  it("an unrecognized tab (e.g. summary) returns no dates", () => {
    var result = getAvailableDatesForTab("summary", buildAccount());

    expect(result).toEqual([]);
  });

  it("skips items with no date value for that tab's field", () => {
    var account = {
      classes: [{ classDateTime: null }, { classDateTime: "2026-08-10" }],
    };

    var result = getAvailableDatesForTab("classes", account);

    expect(result).toEqual(["2026-08-10"]);
  });

  it("returns a sorted, de-duplicated list", () => {
    var account = {
      classes: [
        { classDateTime: "2026-08-11" },
        { classDateTime: "2026-08-10" },
        { classDateTime: "2026-08-10" },
      ],
    };

    var result = getAvailableDatesForTab("classes", account);

    expect(result).toEqual(["2026-08-10", "2026-08-11"]);
  });

  it("handles a missing/empty account gracefully", () => {
    expect(getAvailableDatesForTab("classes", null)).toEqual([]);
    expect(getAvailableDatesForTab("classes", {})).toEqual([]);
  });
});

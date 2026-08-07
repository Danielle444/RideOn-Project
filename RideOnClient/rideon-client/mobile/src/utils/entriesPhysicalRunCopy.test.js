import { describe, it, expect } from "vitest";
import {
  DUPLICATE_WARNING_MAIN,
  formatDuplicateWarningDetails,
} from "./entriesPhysicalRunCopy.js";

describe("DUPLICATE_WARNING_MAIN", () => {
  it("matches the approved copy exactly", () => {
    expect(DUPLICATE_WARNING_MAIN).toBe(
      "נמצאו הרשמות כפולות לאותו מקצה. יש לתקן אותן לפני פרסום סדר הכניסות.",
    );
  });
});

describe("formatDuplicateWarningDetails", () => {
  it("matches the approved copy exactly for a list of entry ids", () => {
    expect(formatDuplicateWarningDetails([10487, 10488, 10489])).toBe(
      "הרשמות: 10487, 10488, 10489",
    );
  });

  it("handles a non-array input safely", () => {
    expect(formatDuplicateWarningDetails(null)).toBe("הרשמות: ");
  });
});

import { describe, it, expect } from "vitest";
import {
  DUPLICATE_ENTRIES_PREFIX,
  formatDuplicateEntryDetail,
  formatDuplicateEntriesMessage,
} from "./physicalRunCopy.utils.js";

describe("formatDuplicateEntriesMessage", () => {
  it("matches the approved copy exactly for one duplicate group", () => {
    var message = formatDuplicateEntriesMessage([
      {
        riderName: "דור ברבר",
        horseName: "ספיישל רויאל גאן",
        className: "Open NRHA",
        entryIds: [10293, 10294],
      },
    ]);

    expect(message).toBe(
      "נמצאו הרשמות כפולות לאותו מקצה. יש לתקן אותן לפני עריכת ההגרלה — " +
        "דור ברבר / ספיישל רויאל גאן / Open NRHA: הרשמות 10293, 10294",
    );
  });

  it("returns an empty string when there are no duplicates", () => {
    expect(formatDuplicateEntriesMessage([])).toBe("");
    expect(formatDuplicateEntriesMessage(null)).toBe("");
  });

  it("joins multiple duplicate groups with a semicolon", () => {
    var message = formatDuplicateEntriesMessage([
      { riderName: "A", horseName: "B", className: "C", entryIds: [1, 2] },
      { riderName: "D", horseName: "E", className: "F", entryIds: [3, 4] },
    ]);

    expect(message).toBe(
      DUPLICATE_ENTRIES_PREFIX +
        "A / B / C: הרשמות 1, 2; D / E / F: הרשמות 3, 4",
    );
  });
});

describe("formatDuplicateEntryDetail", () => {
  it("formats a single duplicate group as rider / horse / class: הרשמות ids", () => {
    expect(
      formatDuplicateEntryDetail({
        riderName: "Rider",
        horseName: "Horse",
        className: "Class",
        entryIds: [1, 2],
      }),
    ).toBe("Rider / Horse / Class: הרשמות 1, 2");
  });
});

import { describe, it, expect } from "vitest";
import {
  HEBREW_MONTH_NAMES,
  HEBREW_WEEKDAY_LABELS,
  parseDateOnly,
  formatDateOnly,
  compareDateOnly,
  daysInMonth,
  getFirstWeekdayOfMonth,
  isDateWithinRange,
  shiftMonth,
  buildMonthCells,
} from "./DatePicker.utils.js";

describe("parseDateOnly", () => {
  it("parses a well-formed YYYY-MM-DD string into numeric parts", () => {
    expect(parseDateOnly("2026-08-05")).toEqual({
      year: 2026,
      month: 8,
      day: 5,
    });
  });

  it("does not shift the day for any month, including UTC-sensitive edges", () => {
    // A naive `new Date("2026-08-05")` is parsed as UTC midnight, which
    // renders as 2026-08-04 in negative-offset timezones. Parsing parts
    // directly must never reproduce that shift.
    expect(parseDateOnly("2026-01-01")).toEqual({ year: 2026, month: 1, day: 1 });
    expect(parseDateOnly("2026-12-31")).toEqual({ year: 2026, month: 12, day: 31 });
  });

  it("returns null for empty string, null and undefined", () => {
    expect(parseDateOnly("")).toBeNull();
    expect(parseDateOnly(null)).toBeNull();
    expect(parseDateOnly(undefined)).toBeNull();
  });

  it("returns null for malformed strings", () => {
    expect(parseDateOnly("2026-8-5")).toBeNull();
    expect(parseDateOnly("08/05/2026")).toBeNull();
    expect(parseDateOnly("not-a-date")).toBeNull();
    expect(parseDateOnly("2026-13-01")).toBeNull();
    expect(parseDateOnly("2026-01-32")).toBeNull();
  });
});

describe("formatDateOnly", () => {
  it("formats back to zero-padded YYYY-MM-DD", () => {
    expect(formatDateOnly({ year: 2026, month: 1, day: 5 })).toBe("2026-01-05");
    expect(formatDateOnly({ year: 2026, month: 12, day: 31 })).toBe("2026-12-31");
  });

  it("round-trips parse -> format for a range of values without drift", () => {
    var samples = ["2026-08-05", "2000-02-29", "1999-01-01", "2024-12-31"];

    samples.forEach(function (value) {
      expect(formatDateOnly(parseDateOnly(value))).toBe(value);
    });
  });
});

describe("compareDateOnly", () => {
  it("orders by year, then month, then day", () => {
    expect(
      compareDateOnly({ year: 2025, month: 1, day: 1 }, { year: 2026, month: 1, day: 1 }),
    ).toBeLessThan(0);
    expect(
      compareDateOnly({ year: 2026, month: 2, day: 1 }, { year: 2026, month: 1, day: 1 }),
    ).toBeGreaterThan(0);
    expect(
      compareDateOnly({ year: 2026, month: 8, day: 5 }, { year: 2026, month: 8, day: 5 }),
    ).toBe(0);
  });
});

describe("daysInMonth", () => {
  it("returns 29 for February in a leap year", () => {
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2000, 2)).toBe(29);
  });

  it("returns 28 for February in a non-leap year", () => {
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(1900, 2)).toBe(28);
  });

  it("returns correct lengths for 30- and 31-day months", () => {
    expect(daysInMonth(2026, 4)).toBe(30);
    expect(daysInMonth(2026, 1)).toBe(31);
    expect(daysInMonth(2026, 12)).toBe(31);
  });
});

describe("getFirstWeekdayOfMonth", () => {
  it("returns a value in the Sunday(0)..Saturday(6) range", () => {
    for (var month = 1; month <= 12; month++) {
      var weekday = getFirstWeekdayOfMonth(2026, month);
      expect(weekday).toBeGreaterThanOrEqual(0);
      expect(weekday).toBeLessThanOrEqual(6);
    }
  });
});

describe("isDateWithinRange", () => {
  var date = { year: 2026, month: 8, day: 15 };

  it("allows any date when min/max are absent", () => {
    expect(isDateWithinRange(date, null, null)).toBe(true);
  });

  it("blocks a date before min", () => {
    var min = { year: 2026, month: 8, day: 20 };
    expect(isDateWithinRange(date, min, null)).toBe(false);
  });

  it("blocks a date after max", () => {
    var max = { year: 2026, month: 8, day: 10 };
    expect(isDateWithinRange(date, null, max)).toBe(false);
  });

  it("allows a date exactly on min or max (inclusive bounds)", () => {
    expect(isDateWithinRange(date, date, date)).toBe(true);
  });
});

describe("shiftMonth", () => {
  it("moves forward within the same year", () => {
    expect(shiftMonth(2026, 8, 1)).toEqual({ year: 2026, month: 9 });
  });

  it("moves backward within the same year", () => {
    expect(shiftMonth(2026, 8, -1)).toEqual({ year: 2026, month: 7 });
  });

  it("rolls forward across a year boundary (December -> January)", () => {
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
  });

  it("rolls backward across a year boundary (January -> December)", () => {
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
  });
});

describe("buildMonthCells", () => {
  it("produces exactly daysInMonth non-null cells", () => {
    var cells = buildMonthCells(2026, 8);
    var nonNullCount = cells.filter(function (c) {
      return c !== null;
    }).length;

    expect(nonNullCount).toBe(31);
    expect(cells.slice(cells.length - 31)).toEqual(
      Array.from({ length: 31 }, function (_, i) {
        return i + 1;
      }),
    );
  });

  it("pads with the correct number of leading blanks so day 1 lands on its real weekday", () => {
    var leadingBlanks = getFirstWeekdayOfMonth(2026, 8);
    var cells = buildMonthCells(2026, 8);

    expect(cells.slice(0, leadingBlanks)).toEqual(
      Array.from({ length: leadingBlanks }, function () {
        return null;
      }),
    );
    expect(cells[leadingBlanks]).toBe(1);
  });

  it("preserves February leap-year length inside the grid", () => {
    var leapCells = buildMonthCells(2024, 2).filter(function (c) {
      return c !== null;
    });
    var nonLeapCells = buildMonthCells(2026, 2).filter(function (c) {
      return c !== null;
    });

    expect(leapCells.length).toBe(29);
    expect(nonLeapCells.length).toBe(28);
  });
});

describe("HEBREW_MONTH_NAMES", () => {
  it("has exactly 12 entries, January first", () => {
    expect(HEBREW_MONTH_NAMES).toHaveLength(12);
    expect(HEBREW_MONTH_NAMES[0]).toBe("ינואר");
    expect(HEBREW_MONTH_NAMES[7]).toBe("אוגוסט");
    expect(HEBREW_MONTH_NAMES[11]).toBe("דצמבר");
  });
});

describe("HEBREW_WEEKDAY_LABELS", () => {
  it("is Sunday through Saturday, single Hebrew letters", () => {
    expect(HEBREW_WEEKDAY_LABELS).toEqual(["א", "ב", "ג", "ד", "ה", "ו", "ש"]);
  });
});

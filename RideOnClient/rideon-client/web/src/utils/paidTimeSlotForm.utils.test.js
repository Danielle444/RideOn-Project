import { describe, it, expect } from "vitest";
import { getDefaultHoursForTimeOfDay } from "./paidTimeSlotForm.utils";

// CAP-5: seeding defaults for the paid-time start/end hour dropdowns. Only
// this new function is covered here — a scroll-position aid, never a locked
// value (every hour stays selectable; the "don't overwrite" rule lives in
// the modal's handleTimeOfDayChange, not here).
describe("getDefaultHoursForTimeOfDay", () => {
  it("בוקר defaults to 09-11", () => {
    expect(getDefaultHoursForTimeOfDay("בוקר")).toEqual({
      startHour: "09",
      endHour: "11",
    });
  });

  it("צהריים defaults to 12-14", () => {
    expect(getDefaultHoursForTimeOfDay("צהריים")).toEqual({
      startHour: "12",
      endHour: "14",
    });
  });

  it("ערב defaults to 18-20", () => {
    expect(getDefaultHoursForTimeOfDay("ערב")).toEqual({
      startHour: "18",
      endHour: "20",
    });
  });

  it("returns null for an unrecognized or empty time of day", () => {
    expect(getDefaultHoursForTimeOfDay("")).toBeNull();
    expect(getDefaultHoursForTimeOfDay(undefined)).toBeNull();
    expect(getDefaultHoursForTimeOfDay("לילה")).toBeNull();
  });
});

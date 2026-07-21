import { describe, it, expect } from "vitest";
import {
  WINDOW_STATUS_CLOSED,
  WINDOW_STATUS_ON_TRACK,
  WINDOW_STATUS_EARLY_SOFT,
  WINDOW_STATUS_BEHIND,
  WINDOW_STATUS_URGENT,
  analyzeRegistrationWindow,
} from "./registrationWindow.utils.js";

// A 30-day window, so "position in the window" is easy to read off the dates.
function window30(todayDay) {
  return {
    competition: {
      registrationOpenDate: "2026-08-01",
      registrationEndDate: "2026-08-31",
    },
    now: new Date(2026, 7, todayDay),
  };
}

describe("window boundaries", () => {
  it("is closed before the window opens", () => {
    var w = window30(1);
    var result = analyzeRegistrationWindow(
      w.competition,
      0,
      100,
      new Date(2026, 6, 25),
    );

    expect(result.status).toBe(WINDOW_STATUS_CLOSED);
    expect(result.isOpen).toBe(false);
  });

  it("is closed after the window ends", () => {
    var w = window30(1);
    var result = analyzeRegistrationWindow(
      w.competition,
      0,
      100,
      new Date(2026, 8, 5),
    );

    expect(result.status).toBe(WINDOW_STATUS_CLOSED);
  });

  it("is closed when the dates are missing entirely", () => {
    // Every historical competition in the live DB has null registration dates.
    var result = analyzeRegistrationWindow({}, 0, 100, new Date(2026, 7, 15));

    expect(result.status).toBe(WINDOW_STATUS_CLOSED);
    expect(result.isOpen).toBe(false);
  });
});

// The point of the whole file: the SAME raw percentage means different things depending on
// where in the window it lands. A flat 50% threshold cannot express this.
describe("the same shortfall is judged by position in the window", () => {
  it("treats 40% of forecast on day 2 of 30 as on track", () => {
    var w = window30(3);
    var result = analyzeRegistrationWindow(w.competition, 40, 100, w.now);

    // Window ~7% elapsed, registrations 40% -- comfortably ahead.
    expect(result.status).toBe(WINDOW_STATUS_ON_TRACK);
  });

  it("treats 40% of forecast with three days left as urgent", () => {
    var w = window30(28);
    var result = analyzeRegistrationWindow(w.competition, 40, 100, w.now);

    expect(result.status).toBe(WINDOW_STATUS_URGENT);
    expect(result.daysRemaining).toBe(3);
  });

  it("softens the wording early in the window, blaming the forecast first", () => {
    // Day 8 of 30: ~23% elapsed, 0 registrations. Behind, but too early to indict the
    // competition rather than the forecast.
    var w = window30(8);
    var result = analyzeRegistrationWindow(w.competition, 0, 100, w.now);

    expect(result.status).toBe(WINDOW_STATUS_EARLY_SOFT);
  });

  it("calls it behind in the middle of the window", () => {
    // Day 16 of 30: ~50% elapsed, 20% registered -- a 30 point gap, past the early phase
    // but with time still left to act.
    var w = window30(16);
    var result = analyzeRegistrationWindow(w.competition, 20, 100, w.now);

    expect(result.status).toBe(WINDOW_STATUS_BEHIND);
  });
});

describe("progress reporting", () => {
  it("reports window position and forecast progress separately", () => {
    var w = window30(16);
    var result = analyzeRegistrationWindow(w.competition, 25, 100, w.now);

    expect(result.windowElapsed).toBeCloseTo(0.5, 1);
    expect(result.forecastProgress).toBeCloseTo(0.25, 2);
    expect(result.actualEntries).toBe(25);
    expect(result.predictedEntries).toBe(100);
  });

  it("never reports more than a full window or more than a full forecast", () => {
    var w = window30(31);
    var result = analyzeRegistrationWindow(w.competition, 500, 100, w.now);

    expect(result.windowElapsed).toBeLessThanOrEqual(1);
    expect(result.forecastProgress).toBe(1);
    expect(result.status).toBe(WINDOW_STATUS_ON_TRACK);
  });

  it("does not claim a shortfall when there is no forecast to fall short of", () => {
    // Competitions with no cached predictions must not read as "behind".
    var w = window30(28);
    var result = analyzeRegistrationWindow(w.competition, 0, 0, w.now);

    expect(result.status).toBe(WINDOW_STATUS_ON_TRACK);
  });
});

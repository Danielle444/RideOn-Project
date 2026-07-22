import { describe, it, expect } from "vitest";
import {
  CLASSES_VIEW_FINANCIAL,
  CLASSES_VIEW_PLANNING,
  CLASSES_VIEW_ACTUALS,
  isRegistrationClosed,
  isClassesViewAvailable,
  resolveDefaultClassesView,
  isColumnVisible,
} from "./classesView.utils.js";

var TODAY = new Date(2026, 6, 21);

describe("isRegistrationClosed", () => {
  it("is open on the registration end date itself", () => {
    // The window closes at the END of its last day, so the day itself is still open.
    var competition = { registrationEndDate: "2026-07-21" };

    expect(isRegistrationClosed(competition, TODAY)).toBe(false);
  });

  it("is closed the day after the registration end date", () => {
    var competition = { registrationEndDate: "2026-07-20" };

    expect(isRegistrationClosed(competition, TODAY)).toBe(true);
  });

  it("is open when the registration end date is still ahead", () => {
    var competition = { registrationEndDate: "2026-08-01" };

    expect(isRegistrationClosed(competition, TODAY)).toBe(false);
  });

  it("falls back to the competition start date when registration end is null", () => {
    // Live shape: every historical competition (34-38, status הסתיימה) has a null
    // registrationenddate -- the column post-dates them. A competition that has already
    // begun is not still taking registrations.
    var finished = {
      registrationEndDate: null,
      competitionStartDate: "2025-12-11",
    };

    expect(isRegistrationClosed(finished, TODAY)).toBe(true);
  });

  it("treats a not-yet-started competition with no registration end as still open", () => {
    var upcoming = {
      registrationEndDate: null,
      competitionStartDate: "2026-09-01",
    };

    expect(isRegistrationClosed(upcoming, TODAY)).toBe(false);
  });

  it("treats a competition with no dates at all as still open", () => {
    // The safer default: it keeps the forecast view rather than presenting figures as final.
    expect(isRegistrationClosed({}, TODAY)).toBe(false);
    expect(isRegistrationClosed(null, TODAY)).toBe(false);
  });

  it("reads PascalCase keys too", () => {
    expect(isRegistrationClosed({ RegistrationEndDate: "2026-07-20" }, TODAY)).toBe(true);
  });
});

describe("resolveDefaultClassesView", () => {
  it("opens on actuals once registration has closed", () => {
    var competition = { registrationEndDate: "2026-07-09" };

    expect(resolveDefaultClassesView(competition, TODAY)).toBe(CLASSES_VIEW_ACTUALS);
  });

  it("opens on planning while registration is still open", () => {
    var competition = { registrationEndDate: "2026-08-01" };

    expect(resolveDefaultClassesView(competition, TODAY)).toBe(CLASSES_VIEW_PLANNING);
  });

  it("never opens on the financial view", () => {
    // Financial is a lens the secretary reaches for, not a phase she lands in.
    expect(resolveDefaultClassesView({ registrationEndDate: "2026-07-09" }, TODAY))
      .not.toBe(CLASSES_VIEW_FINANCIAL);
    expect(resolveDefaultClassesView({ registrationEndDate: "2026-08-01" }, TODAY))
      .not.toBe(CLASSES_VIEW_FINANCIAL);
  });
});

describe("isClassesViewAvailable", () => {
  it("keeps financial and planning available regardless of the registration window", () => {
    var open = { registrationEndDate: "2026-08-01" };

    expect(isClassesViewAvailable(CLASSES_VIEW_FINANCIAL, open, TODAY)).toBe(true);
    expect(isClassesViewAvailable(CLASSES_VIEW_PLANNING, open, TODAY)).toBe(true);
  });

  it("withholds actuals until registration closes", () => {
    var open = { registrationEndDate: "2026-08-01" };
    var closed = { registrationEndDate: "2026-07-09" };

    expect(isClassesViewAvailable(CLASSES_VIEW_ACTUALS, open, TODAY)).toBe(false);
    expect(isClassesViewAvailable(CLASSES_VIEW_ACTUALS, closed, TODAY)).toBe(true);
  });

  it("keeps the forecast reachable after the fact", () => {
    // Looking back at what was predicted is the whole basis of the actuals diagnosis.
    var closed = { registrationEndDate: "2026-07-09" };

    expect(isClassesViewAvailable(CLASSES_VIEW_PLANNING, closed, TODAY)).toBe(true);
  });
});

describe("column visibility", () => {
  it("shows only the financial columns in the financial view", () => {
    ["organizerCost", "federationCost", "totalCost", "prizes"].forEach(function (key) {
      expect(isColumnVisible(key, CLASSES_VIEW_FINANCIAL)).toBe(true);
    });

    ["status", "entries", "predictedEntries", "pattern", "judges", "arena", "startTime", "schedule"]
      .forEach(function (key) {
        expect(isColumnVisible(key, CLASSES_VIEW_FINANCIAL)).toBe(false);
      });
  });

  it("moves ONLY the financial columns out of planning and actuals", () => {
    ["organizerCost", "federationCost", "totalCost", "prizes"].forEach(function (key) {
      expect(isColumnVisible(key, CLASSES_VIEW_PLANNING)).toBe(false);
      expect(isColumnVisible(key, CLASSES_VIEW_ACTUALS)).toBe(false);
    });

    ["status", "entries", "predictedEntries", "pattern", "judges", "arena", "startTime"]
      .forEach(function (key) {
        expect(isColumnVisible(key, CLASSES_VIEW_PLANNING)).toBe(true);
        expect(isColumnVisible(key, CLASSES_VIEW_ACTUALS)).toBe(true);
      });
  });

  it("keeps the schedule in both time-phase views", () => {
    // It does not retire when the recommendations do -- day two of a three-day competition
    // still needs a correct day-two finish time.
    expect(isColumnVisible("schedule", CLASSES_VIEW_PLANNING)).toBe(true);
    expect(isColumnVisible("schedule", CLASSES_VIEW_ACTUALS)).toBe(true);
  });

  it("shows identity and actions everywhere", () => {
    [CLASSES_VIEW_FINANCIAL, CLASSES_VIEW_PLANNING, CLASSES_VIEW_ACTUALS].forEach(function (view) {
      expect(isColumnVisible("orderInDay", view)).toBe(true);
      expect(isColumnVisible("className", view)).toBe(true);
      expect(isColumnVisible("actions", view)).toBe(true);
    });
  });

  it("shows the planned-vs-actual diagnostic only in actuals", () => {
    expect(isColumnVisible("plannedVsActual", CLASSES_VIEW_ACTUALS)).toBe(true);
    expect(isColumnVisible("plannedVsActual", CLASSES_VIEW_PLANNING)).toBe(false);
    expect(isColumnVisible("plannedVsActual", CLASSES_VIEW_FINANCIAL)).toBe(false);
  });

  it("hides an unknown column rather than leaking it into every view", () => {
    expect(isColumnVisible("somethingNew", CLASSES_VIEW_PLANNING)).toBe(false);
  });
});

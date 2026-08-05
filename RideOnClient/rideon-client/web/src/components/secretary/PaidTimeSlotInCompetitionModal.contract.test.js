import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

// Source-level contract test for CAP-4 (RTL hour/minute order) and CAP-5
// (start/end hour defaults by time-of-day) on the paid-time slot modal. This
// repo has no DOM test environment and no React Testing Library (see
// CompetitionHealthCertificatesPage.contract.test.js, which this mirrors).
// CAP-5's pure seeding rule (only-when-empty) is also exercised behaviorally
// via handleTimeOfDayChange's shape here, and the underlying default-hours
// table via paidTimeSlotForm.utils.test.js.

const MODAL_PATH = new URL(
  "./PaidTimeSlotInCompetitionModal.jsx",
  import.meta.url,
);
const modalSource = readFileSync(MODAL_PATH, "utf8").replace(/\r\n/g, "\n");

describe("CAP-4 — hour right / minute left, both time rows", () => {
  it("both the start-time and end-time flex rows are explicitly dir=\"rtl\"", () => {
    const occurrences = (
      modalSource.match(/className="flex gap-2" dir="rtl"/g) || []
    ).length;

    expect(occurrences).toBe(2);
  });

  it("the hour dropdown is still the first child, minute second, in both rows (dir=\"rtl\" places first-child on the right)", () => {
    const startRowAt = modalSource.indexOf('className="flex gap-2" dir="rtl"');
    const startHourAt = modalSource.indexOf(
      'dropdownKey="paid-time-start-time-hour"',
      startRowAt,
    );
    const startMinuteAt = modalSource.indexOf(
      'dropdownKey="paid-time-start-time-minute"',
      startRowAt,
    );

    expect(startHourAt).toBeGreaterThan(startRowAt);
    expect(startMinuteAt).toBeGreaterThan(startHourAt);

    const endRowAt = modalSource.indexOf(
      'className="flex gap-2" dir="rtl"',
      startMinuteAt,
    );
    const endHourAt = modalSource.indexOf(
      'dropdownKey="paid-time-end-time-hour"',
      endRowAt,
    );
    const endMinuteAt = modalSource.indexOf(
      'dropdownKey="paid-time-end-time-minute"',
      endRowAt,
    );

    expect(endHourAt).toBeGreaterThan(endRowAt);
    expect(endMinuteAt).toBeGreaterThan(endHourAt);
  });
});

describe("CAP-5 — seed start/end hour only when empty", () => {
  it("imports the shared default-hours helper instead of re-implementing the mapping", () => {
    expect(modalSource).toContain(
      "getDefaultHoursForTimeOfDay,",
    );
  });

  it("the time-of-day dropdown is wired to a dedicated handler, not the generic handleChange", () => {
    expect(modalSource).toContain(
      "onChange={function (e) {\n                  handleTimeOfDayChange(e.target.value);\n                }}",
    );
  });

  it("handleTimeOfDayChange only fills startTimeHour/endTimeHour when currently empty", () => {
    const fnAt = modalSource.indexOf("function handleTimeOfDayChange(");
    const fnEndAt = modalSource.indexOf("\n  function handleSubmit(", fnAt);

    expect(fnAt).toBeGreaterThan(-1);
    expect(fnEndAt).toBeGreaterThan(fnAt);

    const body = modalSource.slice(fnAt, fnEndAt);

    expect(body).toContain("if (!prev.startTimeHour) {");
    expect(body).toContain("next.startTimeHour = defaultHours.startHour;");
    expect(body).toContain("if (!prev.endTimeHour) {");
    expect(body).toContain("next.endTimeHour = defaultHours.endHour;");

    // Always updates timeOfDay itself, regardless of the hour fields.
    expect(body).toContain("var next = { ...prev, timeOfDay: value };");
  });

  it("never unconditionally overwrites an already-picked hour", () => {
    const fnAt = modalSource.indexOf("function handleTimeOfDayChange(");
    const fnEndAt = modalSource.indexOf("\n  function handleSubmit(", fnAt);
    const body = modalSource.slice(fnAt, fnEndAt);

    // The only assignments to startTimeHour/endTimeHour in this function are
    // the two guarded ones asserted above - there is no bare
    // `next.startTimeHour = ...` outside an `if (!prev.startTimeHour)` guard.
    const startHourAssignments = (body.match(/next\.startTimeHour = /g) || [])
      .length;
    const endHourAssignments = (body.match(/next\.endTimeHour = /g) || [])
      .length;

    expect(startHourAssignments).toBe(1);
    expect(endHourAssignments).toBe(1);
  });

  it("manual hour selection still goes through the generic handleChange (every hour stays selectable)", () => {
    expect(modalSource).toContain(
      'handleChange("startTimeHour", e.target.value);',
    );
    expect(modalSource).toContain(
      'handleChange("endTimeHour", e.target.value);',
    );
  });
});

import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

// Source-level contract test for CAP-6: competitionStartDate becomes
// directly editable on an existing competition (folding in what used to be
// a separate "postpone" modal + button), while competitionEndDate stays
// read-only and is derived by preserving the original (persisted) duration.
// This repo has no DOM test environment and no React Testing Library (see
// CompetitionHealthCertificatesPage.contract.test.js, which this mirrors),
// so the component cannot be rendered or interacted with.

const SECTION_PATH = new URL(
  "./CompetitionDetailsSection.jsx",
  import.meta.url,
);

// Normalized to LF so multi-line toContain checks below are not sensitive to
// this checkout's CRLF line endings (confirmed present in this file).
const sectionSource = readFileSync(SECTION_PATH, "utf8").replace(/\r\n/g, "\n");

describe("CompetitionDetailsSection — CAP-10 date fields use the shared DatePicker", () => {
  it("imports the shared DatePicker rather than a native date input", () => {
    expect(sectionSource).toContain(
      'import DatePicker from "../../common/DatePicker";',
    );
    expect(sectionSource).not.toContain('type="date"');
  });

  it("uses DatePicker for all six date fields in this section", () => {
    const occurrences = (sectionSource.match(/<DatePicker/g) || []).length;
    expect(occurrences).toBe(6);
  });
});

describe("CompetitionDetailsSection — start date is directly editable", () => {
  it("derives isExistingCompetition from competitionId alone, not status or any other signal", () => {
    expect(sectionSource).toContain(
      "var isExistingCompetition = !!props.competitionId;",
    );
  });

  it("the start-date field is never disabled — no disabled attribute on it at all", () => {
    const startDateBlockAt = sectionSource.indexOf("תאריך התחלה");
    const endDateBlockAt = sectionSource.indexOf("תאריך סיום");

    expect(startDateBlockAt).toBeGreaterThan(-1);
    expect(endDateBlockAt).toBeGreaterThan(startDateBlockAt);

    const startDateBlock = sectionSource.slice(startDateBlockAt, endDateBlockAt);

    // CAP-10: native type="date" was replaced by the shared DatePicker
    // (component contract covered in DatePicker.contract.test.js). The
    // CAP-6 behavior this test protects -- start date always editable --
    // still holds: no disabled prop reaches this DatePicker instance.
    expect(startDateBlock).toContain("<DatePicker");
    expect(startDateBlock).toContain(
      'value={props.detailsForm.competitionStartDate}',
    );
    expect(startDateBlock).not.toContain("disabled");
  });

  it("the old reschedule button, its gate and its trigger prop are gone", () => {
    expect(sectionSource).not.toContain("canOfferReschedule");
    expect(sectionSource).not.toContain("onOpenReschedule");
    expect(sectionSource).not.toContain("דחיית התחרות");
  });

  it("shows the forward-only guard inline under the start date when the picked date isn't a forward move", () => {
    expect(sectionSource).toContain("startDateGuardError");
    expect(sectionSource).toContain(
      'var DATE_CHANGE_FORWARD_ONLY_GUARD =\n  "אפשר להזיז את התחרות רק קדימה. יש לבחור תאריך פתיחה מאוחר מהנוכחי.";',
    );

    const startDateBlockAt = sectionSource.indexOf("תאריך התחלה");
    const endDateBlockAt = sectionSource.indexOf("תאריך סיום");
    const startDateBlock = sectionSource.slice(startDateBlockAt, endDateBlockAt);

    expect(startDateBlock).toContain("{startDateGuardError ? (");
  });

  it("detects a start-date change against the PERSISTED prop, never the old detailsForm-only comparison", () => {
    expect(sectionSource).toContain("props.persistedCompetitionStartDate");
    expect(sectionSource).toContain(
      "competitionStartDate !== persistedCompetitionStartDate;",
    );
  });

  it("computes the offset via the shared pure helper, imported not re-implemented", () => {
    expect(sectionSource).toContain(
      'import { getWholeDayOffsetDays } from "../../../utils/competitionForm.utils";',
    );
    expect(sectionSource).toContain(
      "getWholeDayOffsetDays(competitionStartDate, persistedCompetitionStartDate)",
    );
  });
});

describe("CompetitionDetailsSection — end date stays read-only and derived", () => {
  it("the end-date input is still gated by isExistingCompetition, and only that", () => {
    const occurrences = (
      sectionSource.match(/disabled=\{isExistingCompetition\}/g) || []
    ).length;

    // Exactly one now: only the end-date input (the start-date input's
    // disabled attribute was removed entirely, not just its condition).
    expect(occurrences).toBe(1);
  });

  it("reuses the existing paid-time date-add helper to derive the new end date, not ad-hoc math", () => {
    expect(sectionSource).toContain(
      'import { addDaysToDateOnly } from "../../../utils/paidTimeSlotForm.utils";',
    );
    expect(sectionSource).toContain(
      "addDaysToDateOnly(\n      persistedCompetitionEndDate,\n      startDateOffsetDays,\n    )",
    );
  });

  it("shows the approved auto-update helper text under the end date, replacing the old reschedule hint", () => {
    expect(sectionSource).toContain(
      'var END_DATE_AUTO_UPDATE_HINT =\n  "תאריך הסיום מתעדכן אוטומטית לפי תאריך הפתיחה";',
    );

    // Appears once, in the constant declaration — the render site references
    // {END_DATE_AUTO_UPDATE_HINT}, not a second copy of the literal string.
    const hintOccurrences = (
      sectionSource.match(/תאריך הסיום מתעדכן אוטומטית לפי תאריך הפתיחה/g) || []
    ).length;

    expect(hintOccurrences).toBe(1);
    expect(sectionSource).toContain("{END_DATE_AUTO_UPDATE_HINT}");

    expect(sectionSource).not.toContain(
      'לשינוי תאריך יש להשתמש בפעולת "דחיית התחרות"',
    );
  });

  it("only derives (overrides) the displayed end date when an existing competition's start actually moved forward", () => {
    const derivedAt = sectionSource.indexOf("var displayedEndDate =");
    expect(derivedAt).toBeGreaterThan(-1);

    const guardAt = sectionSource.indexOf(
      "if (isExistingCompetition && startDateChanged && startDateOffsetDays > 0) {",
      derivedAt,
    );

    expect(guardAt).toBeGreaterThan(derivedAt);
  });

  it("creation mode (no competitionId) keeps both dates editable and independent", () => {
    // In create mode isExistingCompetition is false, so the end-date input's
    // only disabled condition is falsy and displayedEndDate falls back to
    // the ordinary form field.
    expect(sectionSource).toContain(
      "value={isExistingCompetition ? displayedEndDate : props.detailsForm.competitionEndDate}",
    );
  });
});

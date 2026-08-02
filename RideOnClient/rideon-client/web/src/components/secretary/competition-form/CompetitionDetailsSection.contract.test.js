import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

// Source-level contract test for CompetitionDetailsSection's ordinary-date
// bypass fix (review-gate fix #1). This repo has no DOM test environment and
// no React Testing Library (see CompetitionHealthCertificatesPage.contract.test.js,
// which this mirrors), so the component cannot be rendered or interacted
// with. What CAN be proven without a renderer is that the read-only gate is
// wired to the right signal, applied to both date inputs, and never applies
// in creation mode.

const SECTION_PATH = new URL(
  "./CompetitionDetailsSection.jsx",
  import.meta.url,
);

// Normalized to LF so multi-line toContain checks below are not sensitive to
// this checkout's CRLF line endings (confirmed present in this file).
const sectionSource = readFileSync(SECTION_PATH, "utf8").replace(/\r\n/g, "\n");

describe("CompetitionDetailsSection date read-only gate", () => {
  it("derives isExistingCompetition from competitionId alone, not status or any other signal", () => {
    expect(sectionSource).toContain(
      "var isExistingCompetition = !!props.competitionId;",
    );
  });

  it("create mode (no competitionId) keeps isExistingCompetition falsy, so both dates stay editable", () => {
    // props.competitionId is undefined/null before the first save — the
    // coercion !!undefined / !!null is false, so isExistingCompetition is
    // false and neither `disabled` prop below evaluates truthy.
    const gateAt = sectionSource.indexOf(
      "var isExistingCompetition = !!props.competitionId;",
    );

    expect(gateAt).toBeGreaterThan(-1);
  });

  it("both the start-date and end-date inputs are disabled by isExistingCompetition, and nothing else", () => {
    const startDateBlockAt = sectionSource.indexOf("תאריך התחלה");
    const endDateBlockAt = sectionSource.indexOf("תאריך סיום");

    expect(startDateBlockAt).toBeGreaterThan(-1);
    expect(endDateBlockAt).toBeGreaterThan(-1);
    expect(endDateBlockAt).toBeGreaterThan(startDateBlockAt);

    const startDateBlock = sectionSource.slice(startDateBlockAt, endDateBlockAt);
    // Searched starting at endDateBlockAt, not from 0 — "פתיחת הרשמה" also
    // appears earlier, inside the registrationEndError validation message
    // ("...לפני תאריך פתיחת הרשמה"), which would otherwise be found first
    // and produce an empty (end-before-start) slice.
    const endDateBlock = sectionSource.slice(
      endDateBlockAt,
      sectionSource.indexOf("פתיחת הרשמה", endDateBlockAt),
    );

    expect(startDateBlock).toContain('type="date"');
    expect(startDateBlock).toContain("disabled={isExistingCompetition}");

    expect(endDateBlock).toContain('type="date"');
    expect(endDateBlock).toContain("disabled={isExistingCompetition}");
  });

  it("no other field on this form (name, field, notes, registration/paid-time dates) is gated by isExistingCompetition", () => {
    const occurrences = (
      sectionSource.match(/disabled=\{isExistingCompetition\}/g) || []
    ).length;

    // Exactly two: the start-date input and the end-date input.
    expect(occurrences).toBe(2);
  });

  it("shows an explanatory hint pointing at the reschedule action only when read-only", () => {
    const hintOccurrences = (
      sectionSource.match(/לשינוי תאריך יש להשתמש בפעולת "דחיית התחרות"/g) || []
    ).length;

    expect(hintOccurrences).toBe(2);

    // Each hint is gated by the same isExistingCompetition condition — not a
    // permanent fixture, so it never shows in creation mode either.
    const hintGuardOccurrences = (
      sectionSource.match(/\{isExistingCompetition \? \(/g) || []
    ).length;

    expect(hintGuardOccurrences).toBe(2);
  });

  it("keeps the disabled input visually distinct without changing the base layout classes", () => {
    // The smallest-change requirement: same base classes, only `disabled:*`
    // variants appended — no restructuring of the grid/container.
    expect(sectionSource).toContain(
      'className="h-11 w-full rounded-xl border border-[#D7CCC8] bg-white px-4 text-right disabled:cursor-not-allowed disabled:bg-[#F3EEEA] disabled:text-[#8A7268]"',
    );
  });

  it("the reschedule button visibility gate is a SEPARATE, stricter condition than the read-only gate", () => {
    // canOfferReschedule additionally requires the competition to not have
    // started yet — a read-only (but already-started) competition must still
    // show the date fields as disabled even when the reschedule button itself
    // is hidden, since editing is never re-enabled either way.
    expect(sectionSource).toContain(
      "var canOfferReschedule = !!(\n    props.competitionId && competitionStartDate\n  );",
    );

    const isExistingAt = sectionSource.indexOf("var isExistingCompetition");
    const canOfferAt = sectionSource.indexOf("var canOfferReschedule");

    expect(isExistingAt).toBeGreaterThan(-1);
    expect(canOfferAt).toBeGreaterThan(isExistingAt);
  });
});

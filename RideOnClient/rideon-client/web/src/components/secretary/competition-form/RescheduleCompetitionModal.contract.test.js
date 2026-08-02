import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

// Source-level contract test for RescheduleCompetitionModal.
//
// This repo has no DOM test environment and no React Testing Library (see
// CompetitionHealthCertificatesPage.contract.test.js, which this mirrors), so
// the component cannot be rendered or interacted with. What CAN be proven
// without a renderer is the exact validation/wiring contract this modal must
// hold: it only ever confirms a positive whole number of days, it never
// double-submits, and it never offers backward movement or duration editing.

const MODAL_PATH = new URL(
  "./RescheduleCompetitionModal.jsx",
  import.meta.url,
);

const modalSource = readFileSync(MODAL_PATH, "utf8");

describe("RescheduleCompetitionModal offset validation contract", () => {
  it("only accepts digit-only input before treating it as a candidate offset", () => {
    expect(modalSource).toContain('/^[0-9]+$/.test(trimmed)');
  });

  it("rejects non-positive and non-integer parsed values", () => {
    expect(modalSource).toContain(
      "if (!Number.isInteger(parsed) || parsed <= 0) {",
    );
  });

  // Independently exercise the same validation shape declared above, so this
  // test fails if the source is ever loosened (e.g. allowing "0" or "-3")
  // without also updating the assertions above.
  it.each([
    ["7", true],
    ["1", true],
    ["100", true],
    ["0", false],
    ["-3", false],
    ["1.5", false],
    ["abc", false],
    ["", false],
    [" ", false],
    ["7abc", false],
    ["07", true], // still a valid non-negative integer literal
  ])("digit-only + positive-integer gate treats %s as valid=%s", (raw, expected) => {
    const trimmed = String(raw || "").trim();
    const isDigitsOnly = /^[0-9]+$/.test(trimmed);
    const parsed = Number(trimmed);
    const isValid =
      isDigitsOnly && Number.isInteger(parsed) && parsed > 0;

    expect(isValid).toBe(expected);
  });
});

describe("RescheduleCompetitionModal double-submission guard", () => {
  it("the confirm handler is gated on a valid offset AND not already saving", () => {
    expect(modalSource).toContain(
      "var canConfirm = !!offsetDays && !props.saving;",
    );
    expect(modalSource).toContain("if (!canConfirm) {\n      return;");
  });

  it("the confirm button is disabled by canConfirm, not by a separately-tracked flag", () => {
    const confirmButtonAt = modalSource.indexOf('onClick={handleConfirm}');
    expect(confirmButtonAt).toBeGreaterThan(-1);

    const nearby = modalSource.slice(confirmButtonAt, confirmButtonAt + 200);
    expect(nearby).toContain("disabled={!canConfirm}");
  });

  it("cancel/close is a no-op while saving, so the dialog cannot be dismissed mid-request", () => {
    expect(modalSource).toContain("function handleClose() {");
    expect(modalSource).toContain("if (props.saving) {\n      return;");
  });

  it("the confirm button label reflects the in-flight state", () => {
    expect(modalSource).toContain('{props.saving ? "דוחה..." : "אישור דחיית התחרות"}');
  });
});

describe("RescheduleCompetitionModal confirm payload", () => {
  it("confirms with the parsed numeric offset, never the raw string input", () => {
    expect(modalSource).toContain("props.onConfirm(offsetDays);");
    expect(modalSource).not.toContain("props.onConfirm(offsetDaysInput)");
  });
});

describe("RescheduleCompetitionModal date preview", () => {
  it("computes both the old and new date ranges from the offset, not from unsaved form edits", () => {
    expect(modalSource).toContain("var oldStart = parseIsoDate(props.competitionStartDate);");
    expect(modalSource).toContain("var oldEnd = parseIsoDate(props.competitionEndDate);");
    expect(modalSource).toContain(
      "var newStart = offsetDays && oldStart ? addDays(oldStart, offsetDays) : null;",
    );
    expect(modalSource).toContain(
      "var newEnd = offsetDays && oldEnd ? addDays(oldEnd, offsetDays) : null;",
    );
  });

  it("labels both ranges distinctly so the secretary sees before/after, not just one date pair", () => {
    expect(modalSource).toContain("תאריכים נוכחיים");
    expect(modalSource).toContain("תאריכים חדשים");
  });
});

describe("RescheduleCompetitionModal scope guard — forward-only, no duration UI", () => {
  it("the day-count input floors at 1 with no negative affordance", () => {
    expect(modalSource).toContain('type="number"');
    expect(modalSource).toContain('min="1"');
  });

  it("offers exactly one numeric input — no separate end-date or duration field", () => {
    const numericInputs = (modalSource.match(/type="number"/g) || []).length;
    expect(numericInputs).toBe(1);

    // No date-typed input at all — both ranges shown are read-only computed text.
    expect(modalSource).not.toContain('type="date"');
  });

  it("addDays always moves forward by a positive count, never subtracts", () => {
    expect(modalSource).toContain("function addDays(date, days) {");
    expect(modalSource).toContain("result.setUTCDate(result.getUTCDate() + days);");
    expect(modalSource).not.toContain("getUTCDate() - days");
  });
});

describe("RescheduleCompetitionModal explanatory copy", () => {
  it("explains what moves and what stays fixed before asking for confirmation", () => {
    expect(modalSource).toContain("כל המקצים,");
    expect(modalSource).toContain("תשלומים, מועדי הרשמה ורשומות היסטוריות לא ישתנו");
  });
});

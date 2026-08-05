import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

// Source-level contract test for CAP-10's shared DatePicker. This repo has
// no DOM test environment and no React Testing Library (see
// CompetitionHealthCertificatesPage.contract.test.js, which this mirrors),
// so the component cannot be rendered or interacted with. What CAN be
// proven without one is the exact structural contract: the onChange shape,
// RTL arrow wiring, open/close triggers, and accessibility attributes.
// Pure date math (parsing, formatting, leap years, month rollover) is
// covered separately in DatePicker.utils.test.js, which imports and calls
// real functions.

const SOURCE_PATH = new URL("./DatePicker.jsx", import.meta.url);
const source = readFileSync(SOURCE_PATH, "utf8").replace(/\r\n/g, "\n");

describe("DatePicker — onChange contract", () => {
  it("emits a native-like { target: { value } } event, matching CustomDropdown's convention", () => {
    expect(source).toContain('props.onChange({ target: { value: nextValue } });');
  });

  it("emits an empty string on clear", () => {
    const clearAt = source.indexOf("function handleClear()");
    const clearBody = source.slice(clearAt, clearAt + 200);

    expect(clearBody).toContain('emit("");');
  });

  it("emits today's local date on the today action", () => {
    const todayAt = source.indexOf("function handleToday()");
    const todayBody = source.slice(todayAt, todayAt + 250);

    expect(todayBody).toContain("emit(formatDateOnly(today));");
  });
});

describe("DatePicker — RTL month navigation", () => {
  it("imports both chevrons from lucide-react (no new dependency)", () => {
    expect(source).toContain(
      'import { ChevronLeft, ChevronRight } from "lucide-react";',
    );
  });

  it("the right-pointing chevron goes to the previous/earlier month", () => {
    const prevButtonAt = source.indexOf('aria-label="חודש קודם"');
    const block = source.slice(prevButtonAt, prevButtonAt + 300);

    expect(block).toContain("onClick={handlePrevMonth}");
    expect(block).toContain("<ChevronRight");
  });

  it("the left-pointing chevron goes to the next/later month", () => {
    const nextButtonAt = source.indexOf('aria-label="חודש הבא"');
    const block = source.slice(nextButtonAt, nextButtonAt + 300);

    expect(block).toContain("onClick={handleNextMonth}");
    expect(block).toContain("<ChevronLeft");
  });

  it("month navigation only changes the view, never emits a value change", () => {
    const prevAt = source.indexOf("function handlePrevMonth()");
    const nextAt = source.indexOf("function handleNextMonth()");
    const prevBody = source.slice(prevAt, source.indexOf("}", source.indexOf("}", prevAt) + 1));
    const nextBody = source.slice(nextAt, source.indexOf("}", source.indexOf("}", nextAt) + 1));

    expect(prevBody).not.toContain("emit(");
    expect(nextBody).not.toContain("emit(");
  });
});

describe("DatePicker — Hebrew calendar labels", () => {
  it("imports Hebrew month names and Sunday-first weekday labels from the shared utils", () => {
    expect(source).toContain("HEBREW_MONTH_NAMES");
    expect(source).toContain("HEBREW_WEEKDAY_LABELS");
    expect(source).toContain('from "./DatePicker.utils";');
  });

  it("renders the Hebrew month name followed by the Gregorian year", () => {
    expect(source).toContain(
      "{HEBREW_MONTH_NAMES[viewMonth - 1]} {viewYear}",
    );
  });
});

describe("DatePicker — open/close behavior", () => {
  it("disabled or read-only fields never open the popup", () => {
    const triggerAt = source.indexOf("function handleTriggerClick()");
    const triggerBody = source.slice(triggerAt, triggerAt + 200);

    expect(triggerBody).toContain("if (props.disabled || props.readOnly) {");
    expect(triggerBody).toContain("return;");
  });

  it("selecting a valid day closes the popup", () => {
    const selectAt = source.indexOf("function handleSelectDay(parts)");
    const selectBody = source.slice(selectAt, selectAt + 300);

    expect(selectBody).toContain("setIsOpen(false);");
  });

  it("Escape closes the popup", () => {
    expect(source).toContain('if (event.key === "Escape") {');
    expect(source).toContain("setIsOpen(false);");
  });

  it("a mousedown outside both the trigger and the popup closes it", () => {
    expect(source).toContain("function handleDocumentMouseDown(event)");
    expect(source).toContain(
      "document.addEventListener(\"mousedown\", handleDocumentMouseDown);",
    );
  });

  it("renders the popup through a portal to document.body (avoids container clipping)", () => {
    expect(source).toContain('import { createPortal } from "react-dom";');
    expect(source).toContain("createPortal(");
    expect(source).toContain("document.body,");
  });
});

describe("DatePicker — min/max", () => {
  it("uses the shared range check to disable out-of-range days", () => {
    expect(source).toContain(
      "return !isDateWithinRange(parts, minParts, maxParts);",
    );
  });

  it("disabled days carry the disabled attribute so they cannot be selected", () => {
    const dayButtonAt = source.indexOf("aria-label={formatDateOnly(parts)}");
    const block = source.slice(dayButtonAt - 200, dayButtonAt + 50);

    expect(block).toContain("disabled={disabledDay}");
  });

  it("today action is blocked when today itself falls outside min/max", () => {
    const todayAt = source.indexOf("function handleToday()");
    const todayBody = source.slice(todayAt, todayAt + 250);

    expect(todayBody).toContain("if (isDayDisabled(today)) {");
  });
});

describe("DatePicker — accessibility and no accidental form submit", () => {
  it("every button in the source is explicitly type=\"button\"", () => {
    const buttonOpens = source.match(/<button\b[^>]*/g) || [];

    expect(buttonOpens.length).toBeGreaterThan(0);
    buttonOpens.forEach(function (tag) {
      expect(tag).toContain('type="button"');
    });
  });

  it("the trigger has an aria-label and supports aria-describedby passthrough", () => {
    expect(source).toContain('aria-label={props["aria-label"] || "בחירת תאריך"}');
    expect(source).toContain('aria-describedby={props["aria-describedby"]}');
  });

  it("the visible className prop is applied verbatim to the trigger, not merged/altered", () => {
    expect(source).toContain("className={props.className}");
  });
});

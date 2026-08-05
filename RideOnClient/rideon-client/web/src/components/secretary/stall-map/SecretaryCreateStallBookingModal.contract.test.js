import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

// Source-level contract test for CAP-10's migration of the "+ Add stall"
// modal's start/end date fields off native <input type="date"> onto the
// shared DatePicker. This repo has no DOM test environment and no React
// Testing Library (see CompetitionHealthCertificatesPage.contract.test.js,
// which this mirrors), so the component cannot be rendered.

const SOURCE_PATH = new URL(
  "./SecretaryCreateStallBookingModal.jsx",
  import.meta.url,
);
const source = readFileSync(SOURCE_PATH, "utf8").replace(/\r\n/g, "\n");

describe("SecretaryCreateStallBookingModal — stall dates use the shared DatePicker", () => {
  it("imports the shared DatePicker and no longer has a native date input", () => {
    expect(source).toContain(
      'import DatePicker from "../../common/DatePicker";',
    );
    expect(source).not.toContain('type="date"');
  });

  it("renders exactly two DatePickers (מתאריך / עד תאריך)", () => {
    const occurrences = (source.match(/<DatePicker/g) || []).length;
    expect(occurrences).toBe(2);
  });

  it("startDate keeps its local-state value/onChange contract", () => {
    const labelAt = source.indexOf("מתאריך");
    const nextLabelAt = source.indexOf("עד תאריך");
    const block = source.slice(labelAt, nextLabelAt);

    expect(block).toContain("<DatePicker");
    expect(block).toContain("value={startDate}");
    expect(block).toContain("setStartDate(e.target.value);");
  });

  it("endDate keeps its local-state value/onChange contract", () => {
    const labelAt = source.indexOf("עד תאריך");
    const block = source.slice(labelAt, labelAt + 300);

    expect(block).toContain("<DatePicker");
    expect(block).toContain("value={endDate}");
    expect(block).toContain("setEndDate(e.target.value);");
  });

  it("the required-dates validation (start/end, order check) is unchanged", () => {
    expect(source).toContain('if (!startDate || !endDate) return "יש לבחור תאריכי התחלה וסיום";');
    expect(source).toContain(
      "if (new Date(endDate) < new Date(startDate))",
    );
  });

  it("still submits startDate/endDate as plain strings, unchanged payload shape", () => {
    expect(source).toContain("startDate: startDate,");
    expect(source).toContain("endDate: endDate,");
  });
});

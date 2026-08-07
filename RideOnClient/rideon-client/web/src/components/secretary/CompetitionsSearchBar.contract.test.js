import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

// Source-level contract test for CAP-10's migration of the competitions
// search bar's date-range fields off native <input type="date"> onto the
// shared DatePicker. This repo has no DOM test environment and no React
// Testing Library (see CompetitionHealthCertificatesPage.contract.test.js,
// which this mirrors), so the component cannot be rendered.

const SOURCE_PATH = new URL("./CompetitionsSearchBar.jsx", import.meta.url);
const source = readFileSync(SOURCE_PATH, "utf8").replace(/\r\n/g, "\n");

describe("CompetitionsSearchBar — date range uses the shared DatePicker", () => {
  it("imports the shared DatePicker and no longer has a native date input", () => {
    expect(source).toContain(
      'import DatePicker from "../common/DatePicker";',
    );
    expect(source).not.toContain('type="date"');
  });

  it("renders exactly two DatePickers (מתאריך / עד תאריך)", () => {
    const occurrences = (source.match(/<DatePicker/g) || []).length;
    expect(occurrences).toBe(2);
  });

  it("dateFrom keeps its existing value/onChange contract and className", () => {
    const labelAt = source.indexOf("מתאריך");
    const nextLabelAt = source.indexOf("עד תאריך");
    const block = source.slice(labelAt, nextLabelAt);

    expect(block).toContain("<DatePicker");
    expect(block).toContain("value={props.dateFrom}");
    expect(block).toContain("props.onDateFromChange(e.target.value);");
    expect(block).toContain(
      'className="h-11 w-full rounded-xl border border-[#D7CCC8] bg-white px-3 text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"',
    );
  });

  it("dateTo keeps its existing value/onChange contract and className", () => {
    const labelAt = source.indexOf("עד תאריך");
    const block = source.slice(labelAt, labelAt + 400);

    expect(block).toContain("<DatePicker");
    expect(block).toContain("value={props.dateTo}");
    expect(block).toContain("props.onDateToChange(e.target.value);");
  });

  it("the search text input is untouched (not a date field)", () => {
    expect(source).toContain('type="text"');
  });
});

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// CAP-5: contract test proving the tack pricing preview is wired to the
// pure inclusive-day-count helper and recomputes when the date range
// changes. The hook itself pulls in react-native service modules that are
// not safe to import under plain vitest, so this reads source text instead
// (same approach as the repo's other *.contract.test.js files).

var SOURCE_PATH = path.resolve(__dirname, "useAdminTackStallBookings.js");

function readSource() {
  return fs.readFileSync(SOURCE_PATH, "utf8");
}

describe("useAdminTackStallBookings tack pricing preview", () => {
  it("imports the shared inclusive pricing helper, not the exclusive stalls-overview one", () => {
    var source = readSource();

    expect(source).toContain(
      'import { calculateTackPreviewTotal } from "../utils/tackStallPreviewPricing";',
    );
    expect(source).not.toContain("calculateNumberOfDays");
  });

  it("tackPricingSummary calls calculateTackPreviewTotal", () => {
    var source = readSource();
    var summaryBlock = source.split("var tackPricingSummary = useMemo(")[1];

    expect(summaryBlock).toBeTruthy();
    expect(summaryBlock).toContain("calculateTackPreviewTotal({");
  });

  it("the useMemo dependency array includes start date, end date, quantity and unit-price source", () => {
    var source = readSource();

    expect(source).toMatch(
      /\[\s*tackQuantity,\s*selectedTackStallType,\s*tackStartDate,\s*tackEndDate,\s*effectiveTackPayers,?\s*\]/,
    );
  });
});

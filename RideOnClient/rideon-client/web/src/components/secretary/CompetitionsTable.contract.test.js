import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

// Source-level contract test for CAP-1: the board's column-header filter
// dropdown (absolute, top-9) got clipped by the card/table's overflow-hidden
// corners whenever the table had 0-1 rows, because the dropdown's clip
// ancestors shrink-wrap to the table's actual content height. This repo has
// no DOM test environment and no React Testing Library (see
// CompetitionHealthCertificatesPage.contract.test.js, which this mirrors) -
// visual verification of the fix was done via a temporary Playwright
// devtest harness (see the PR report), not here. What CAN be proven without
// a renderer is that the reserved-space mechanism exists and both
// overflow-hidden corners are still intact (never removed to "fix" this).

const TABLE_PATH = new URL("./CompetitionsTable.jsx", import.meta.url);
const tableSource = readFileSync(TABLE_PATH, "utf8").replace(/\r\n/g, "\n");

describe("CompetitionsTable — filter-dropdown clipping fix", () => {
  it("reserves room via filler rows rather than removing overflow-hidden", () => {
    expect(tableSource).toContain("const MIN_ROWS_FOR_FILTER_ROOM = 3;");
    expect(tableSource).toContain("fillerRowCount");
  });

  it("both rounded-corner overflow-hidden wrappers are untouched", () => {
    expect(tableSource).toContain(
      'className="overflow-hidden rounded-[24px] border border-[#E8DDD7] bg-white"',
    );
  });

  it("filler rows only render when there ARE real rows (the empty state already reserves its own height)", () => {
    const fillerAt = tableSource.indexOf("fillerRowCount");
    expect(fillerAt).toBeGreaterThan(-1);

    expect(tableSource).toContain(
      "rows.length > 0\n      ? Math.max(0, MIN_ROWS_FOR_FILTER_ROOM - rows.length)\n      : 0;",
    );
  });

  it("filler rows are hidden from assistive tech and carry no visible text", () => {
    const renderAt = tableSource.indexOf("Array.from({ length: fillerRowCount })");
    expect(renderAt).toBeGreaterThan(-1);

    const renderBlock = tableSource.slice(renderAt, renderAt + 300);

    expect(renderBlock).toContain('aria-hidden="true"');
  });

  it("the HeaderFilterMenu dropdown (what was getting clipped) is unchanged in position/structure", () => {
    expect(tableSource).toContain(
      'className="absolute left-0 top-9 z-20 min-w-[160px] rounded-xl border border-[#E6DCD5] bg-white p-3 shadow-lg"',
    );
    expect(tableSource).toContain("ניקוי סינון");
  });
});

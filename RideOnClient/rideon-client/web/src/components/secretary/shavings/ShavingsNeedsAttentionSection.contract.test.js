import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

// Source-level contract test for the "requires attention" section (collapse behavior, header
// count, empty state, and overdue/today ordering). This repo has no DOM test environment and no
// React Testing Library (see shavingsCancellation.contract.test.js), so wiring is verified via
// source text — the underlying classification logic itself is covered behaviorally in
// shavingsDueDate.utils.test.js.

function readNear(relativePath) {
  const url = new URL(relativePath, import.meta.url);
  return readFileSync(url, "utf8").replace(/\r\n/g, "\n");
}

const source = readNear("./ShavingsNeedsAttentionSection.jsx");

describe("ShavingsNeedsAttentionSection — collapse behavior", () => {
  it("starts collapsed by default (local state, not derived from props)", () => {
    expect(source).toContain("useState(false)");
  });

  it("has a single toggle control wired to that state, exposing aria-expanded", () => {
    expect(source).toContain("onClick={toggle}");
    expect(source).toContain("aria-expanded={isExpanded}");
  });

  it("state lives in the component itself, so a data refresh (new props) cannot reset it", () => {
    // No prop-driven remount trick (e.g. a `key` derived from the order list) and no effect
    // that re-syncs isExpanded from props -- the only setter is the toggle handler.
    expect(source).not.toMatch(/useEffect\([^)]*setIsExpanded/);
    expect(source.match(/setIsExpanded\(/g).length).toBe(1);
  });
});

describe("ShavingsNeedsAttentionSection — header count", () => {
  it("renders the count as '(N)' next to the title, per the approved copy", () => {
    expect(source).toContain("הזמנות שדורשות טיפול");
    expect(source).toContain("({count})");
  });

  it("count is the sum of the overdue and due-today groups", () => {
    expect(source).toContain(
      "overdueOrders.length + dueTodayOrders.length",
    );
  });
});

describe("ShavingsNeedsAttentionSection — grouped content", () => {
  it("renders the overdue group before the due-today group", () => {
    const overdueIndex = source.indexOf("באיחור (");
    const todayIndex = source.indexOf("היום (");
    expect(overdueIndex).toBeGreaterThan(-1);
    expect(todayIndex).toBeGreaterThan(-1);
    expect(overdueIndex).toBeLessThan(todayIndex);
  });

  it("shows an explicit empty state when the count is zero", () => {
    expect(source).toContain("count === 0");
    expect(source).toContain("אין כרגע הזמנות שדורשות טיפול");
  });

  it("forwards cancel wiring and requests the per-row urgency badge", () => {
    expect(source).toContain("onCancelOrder={props.onCancelOrder}");
    expect(source).toContain("cancellingId={props.cancellingId}");
    expect(source).toContain("showUrgencyBadge");
  });
});

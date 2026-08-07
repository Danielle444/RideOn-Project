import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

// Source-level contract test for CAP-9 (mirrors the PaidTimeSlotInCompetitionModal
// contract-test pattern - this repo has no DOM test environment / React Testing
// Library). Deliberately does not touch dnd-kit internals or animation timing:
// it only pins the CSS-class root cause (transition-all animating the drag
// transform reset back to rest position after drop) and its fix.

const SIDEBAR_PATH = new URL("./StallAssignmentSidebar.jsx", import.meta.url);
const sidebarSource = readFileSync(SIDEBAR_PATH, "utf8").replace(
  /\r\n/g,
  "\n",
);

describe("CAP-9 — queue/placed draggable card no longer animates the drag-transform reset", () => {
  it("does not use transition-all anywhere in the sidebar", () => {
    expect(sidebarSource).not.toContain("transition-all");
  });

  it("uses transition-colors on the draggable card wrapper instead", () => {
    expect(sidebarSource).toContain("transition-colors");
  });

  it("keeps the approved queue lift style as the draggingClassName", () => {
    expect(sidebarSource).toContain(
      'draggingClassName="border-[#795548] bg-[#F5EDE8] shadow-lg opacity-90 z-50"',
    );
  });
});

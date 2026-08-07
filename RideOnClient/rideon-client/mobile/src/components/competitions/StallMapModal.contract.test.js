import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// Ranch-model fix (Bug 2, 2026-08-06): StallMapModal is the shared admin +
// payer surface for viewing the competition's real physical stall map. It
// must forward competitionId into getCompounds so the server can resolve the
// venue (host) ranch instead of the caller's own active ranch -- ranchId
// keeps flowing into getCompounds/getAssignments exactly as before (it
// authorizes the caller and drives the RanchAdmin "isMine" highlight), only
// the compounds call gains the extra argument.
//
// Mobile stall-map slice 1, corrected (2026-08-07): the component is shared
// between RanchAdmin (ranch-based "isMine", unchanged, default mode) and
// Payer (viewerMode="payer" prop). Blocker 2 fix: payer mode calls a
// DIFFERENT, server-redacted endpoint (getPayerMapAssignments, never
// getAssignments) and TRUSTS the server's own IsMine field -- no client-side
// stallBookingId re-derivation, because the redacted response no longer
// carries enough identifying data to do that even if it wanted to. All the
// actual indexing/isMine/default-selection LOGIC lives in
// utils/stallMapViewer.js (a plain, RN-free module) and is covered by real
// behavioral unit tests there (stallMapViewer.test.js) -- this file stays a
// source-text contract test only for the RN-component wiring itself
// (StallMapModal renders react-native primitives, unsafe to mount under
// plain vitest), same technique as the repo's other *.contract.test.js files.

var SOURCE_PATH = path.resolve(__dirname, "StallMapModal.jsx");

function readSource() {
  return fs.readFileSync(SOURCE_PATH, "utf8").replace(/\r\n/g, "\n");
}

describe("StallMapModal host-ranch compounds wiring", () => {
  it("passes competitionId into getCompounds alongside ranchId", () => {
    var source = readSource();

    expect(source).toContain("getCompounds(ranchId, competitionId),");
  });

  it("ranch mode still requests the full-detail assignments endpoint, unchanged", () => {
    var source = readSource();

    expect(source).toContain("getAssignments(competitionId, ranchId),");
  });

  it("both calls load together in the same Promise.all as before", () => {
    var source = readSource();
    var loadBlock = source
      .split("async function load() {")[1]
      .split("if (cancelled) return;")[0];

    expect(loadBlock).toContain("var results = await Promise.all([");
    expect(loadBlock).toContain("getCompounds(ranchId, competitionId),");
  });
});

describe("StallMapModal viewer-mode branching (blocker 2 fix)", () => {
  it("defaults to ranch mode with no viewerMode prop (RanchAdmin call sites are unaffected)", () => {
    var source = readSource();

    expect(source).toContain(
      'var viewerMode = props.viewerMode === "payer" ? "payer" : "ranch";',
    );
  });

  it("payer mode calls the dedicated redacted endpoint, never the full-detail one", () => {
    var source = readSource();

    expect(source).toContain(
      'viewerMode === "payer"\n              ? getPayerMapAssignments(competitionId, ranchId)\n              : getAssignments(competitionId, ranchId),',
    );
    expect(source).toContain(
      'import {\n  getCompounds,\n  getAssignments,\n  getPayerMapAssignments,\n  parseCompoundLayout,\n} from "../../services/stallMapService";',
    );
  });

  it("never derives or accepts a myStallBookingIds prop (removed - server computes IsMine now)", () => {
    var source = readSource();

    expect(source).not.toContain("myStallBookingIds");
    expect(source).not.toContain("myStallBookingIdSet");
  });

  it("builds the viewer object with trustServerIsMine, not a client-side ownership set", () => {
    var source = readSource();

    expect(source).toContain('trustServerIsMine: viewerMode === "payer"');
  });
});

describe("StallMapModal delegates viewer logic to utils/stallMapViewer.js", () => {
  it("imports the shared indexing/isMine/default-selection helpers instead of reimplementing them", () => {
    var source = readSource();

    expect(source).toContain('from "../../utils/stallMapViewer"');
    expect(source).toContain("buildAssignmentsByCompoundAndStall");
    expect(source).toContain("buildMineCountByCompoundId");
    expect(source).toContain("resolveInitialCompoundId");
    expect(source).toContain("getCompoundId");
  });

  it("looks up a cell's assignment using the active compound's id, not a global stallNumber map", () => {
    var source = readSource();

    expect(source).toContain(
      "assignmentsByCompoundAndStall[compoundId + \"::\" + cell.stallNumber]",
    );
    expect(source).not.toContain("assignmentsByStallNumber[cell.stallNumber]");
  });

  it("passes mine counts into CompoundTabs and renders a badge", () => {
    var source = readSource();

    expect(source).toContain("mineCountByCompoundId={mineCountByCompoundId}");
    expect(source).toContain("var hasMine = mineCount > 0;");
  });
});

describe("StallMapModal 'My ranch' visual priority (business decision, 2026-08-07)", () => {
  it("checks assignment.isMine strictly before assignment.isMyRanch in the cell color branch, so Mine always wins", () => {
    var source = readSource();
    var mineIndex = source.indexOf("if (assignment.isMine) {");
    var myRanchIndex = source.indexOf("} else if (assignment.isMyRanch) {");

    expect(mineIndex).toBeGreaterThan(-1);
    expect(myRanchIndex).toBeGreaterThan(-1);
    expect(mineIndex).toBeLessThan(myRanchIndex);
  });

  it("gives 'My ranch' its own fill and border constants, distinct from Mine and plain Occupied", () => {
    var source = readSource();

    expect(source).toContain("var MY_RANCH_BG =");
    expect(source).toContain("var MY_RANCH_BORDER =");
    expect(source).not.toContain('MY_RANCH_BG = "#7B5A4D"');
    expect(source).not.toContain('MY_RANCH_BG = "#D9CFC2"');
  });

  it("only shows the 'My ranch' legend entry in payer viewer mode", () => {
    var source = readSource();

    expect(source).toContain('var isPayer = props.viewerMode === "payer";');
    expect(source).toContain("<CompoundLegend viewerMode={viewerMode} />");
  });
});

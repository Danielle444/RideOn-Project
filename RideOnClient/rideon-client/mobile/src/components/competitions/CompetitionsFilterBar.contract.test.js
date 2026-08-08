import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// CAP-1/CAP-8: structural + terminology contract for the board filter
// bottom sheet. react-native isn't importable under plain vitest in this
// worktree (no node_modules), so this reads source text - same approach as
// the repo's other *.contract.test.js files.

var SOURCE_PATH = path.resolve(__dirname, "CompetitionsFilterBar.jsx");
var SCREEN_SOURCE_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "screens/roles/admin/screens/AdminCompetitionsBoardScreen.jsx",
);
var WORKER_SCREEN_SOURCE_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "screens/roles/worker/screens/WorkerCompetitionsBoardScreen.jsx",
);
var PAYER_SCREEN_SOURCE_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "screens/roles/payer/screens/PayerCompetitionsBoardScreen.jsx",
);

function readSource() {
  return fs.readFileSync(SOURCE_PATH, "utf8");
}

function getFunctionBody(source, functionName) {
  var startIndex = source.indexOf("function " + functionName + "(");
  expect(startIndex).toBeGreaterThan(-1);

  var braceDepth = 0;
  var bodyStart = source.indexOf("{", startIndex);
  var i = bodyStart;

  for (; i < source.length; i++) {
    if (source[i] === "{") braceDepth++;
    if (source[i] === "}") {
      braceDepth--;
      if (braceDepth === 0) break;
    }
  }

  return source.slice(bodyStart, i + 1);
}

describe("CompetitionsFilterBar - compact button + bottom sheet", () => {
  it("the resting trigger is a single compact Pressable button, not the old always-inline card", () => {
    var source = readSource();

    expect(source).toContain("styles.filterButton");
    expect(source).toMatch(/<Text style=\{styles\.filterButtonText\}>סינון ▾<\/Text>/);
  });

  it("uses the shared applied/draft filter-state helpers", () => {
    var source = readSource();

    expect(source).toMatch(
      /import\s*\{\s*emptyFilters,\s*toSafeFilters,\s*toggleValueInArray,\s*\}\s*from\s*"\.\.\/\.\.\/utils\/competitionsFilterSheetState";/,
    );
  });

  it("opening the sheet seeds the draft from the applied filters, not a blank/leftover draft", () => {
    var openSheetBlock = getFunctionBody(readSource(), "openSheet");

    expect(openSheetBlock).toContain("setDraftFilters(appliedFilters)");
  });

  it("Apply commits the draft up via onApply and closes the sheet", () => {
    var applyBlock = getFunctionBody(readSource(), "handleApplyPress");

    expect(applyBlock).toContain("props.onApply(draftFilters)");
    expect(applyBlock).toContain("setIsSheetOpen(false)");
  });

  it("Reset only clears the draft - it never calls onApply or touches the board", () => {
    var resetBlock = getFunctionBody(readSource(), "handleResetPress");

    expect(resetBlock).toContain("setDraftFilters(emptyFilters())");
    expect(resetBlock).not.toContain("onApply");
    expect(resetBlock).not.toContain("setIsSheetOpen");
  });

  it("closing without applying (backdrop / X / hardware back) only closes the sheet, never calls onApply", () => {
    var source = readSource();
    var closeBlock = getFunctionBody(source, "closeWithoutApplying");

    expect(closeBlock).toContain("setIsSheetOpen(false)");
    expect(closeBlock).not.toContain("onApply");

    // Wired to backdrop tap, the header close button, and the modal's own
    // hardware-back handler.
    expect(source).toContain('<Pressable style={styles.sheetBackdrop} onPress={closeWithoutApplying} />');
    expect(source).toContain("onRequestClose={closeWithoutApplying}");
  });
});

describe("CompetitionsFilterBar - multi-select chip facets", () => {
  it("status, host ranch, and field/discipline all render as ChipFacet (chip wrap), not a Picker", () => {
    var source = readSource();

    expect(source).not.toContain("Picker");
    expect(source).toMatch(/<ChipFacet\s+label="סטטוס"/);
    expect(source).toMatch(/<ChipFacet\s+label="חווה מארחת"/);
    expect(source).toMatch(/<ChipFacet\s+label="ענף"/);
  });

  it("chips toggle membership via the shared toggleValueInArray helper", () => {
    var source = readSource();

    expect(source).toContain("toggleValueInArray(prev.hostRanchIds, value)");
    expect(source).toContain("toggleValueInArray(prev.fieldIds, value)");
    expect(source).toContain("toggleValueInArray(prev.statusValues, value)");
  });

  it("search stays a plain text input", () => {
    var source = readSource();

    expect(source).toMatch(/<TextInput[\s\S]*?value=\{draftFilters\.searchText\}/);
  });
});

describe("CompetitionsFilterBar - terminology (CAP-8)", () => {
  it("the discipline facet is labeled ענף / כל הענפים, never מתחם", () => {
    var source = readSource();

    expect(source).toContain('label="ענף"');
    expect(source).toContain('emptyLabel="כל הענפים"');
    expect(source).not.toContain("מתחם");
    expect(source).not.toContain("כל המתחמים");
  });
});

describe("CompetitionsFilterBar - layout (date range not crowded beside Clear)", () => {
  it("the date-range block and the footer (איפוס/החל) are separate sections, not the same row", () => {
    var source = readSource();

    var dateBlockIndex = source.indexOf("טווח תאריכים");
    var scrollViewCloseIndex = source.indexOf("</ScrollView>");
    var footerIndex = source.indexOf("styles.sheetFooter");

    expect(dateBlockIndex).toBeGreaterThan(-1);
    expect(scrollViewCloseIndex).toBeGreaterThan(dateBlockIndex);
    expect(footerIndex).toBeGreaterThan(scrollViewCloseIndex);
  });

  it("the footer holds exactly Reset (איפוס) and Apply (החל)", () => {
    var source = readSource();
    var footerBlock = source.split("styles.sheetFooter")[1].split("</View>\n      </Modal>")[0];

    expect(footerBlock).toContain("איפוס");
    expect(footerBlock).toContain("החל");
  });
});

describe("AdminCompetitionsBoardScreen wiring", () => {
  it("passes appliedFilters + onApply, no more scalar per-field setters", () => {
    var screenSource = fs.readFileSync(SCREEN_SOURCE_PATH, "utf8");

    expect(screenSource).toContain("appliedFilters={{");
    expect(screenSource).toContain("onApply={handleApplyFilters}");
    expect(screenSource).not.toContain("onSearchTextChange");
    expect(screenSource).not.toContain("onHostRanchFilterChange");
    expect(screenSource).not.toContain("onFieldFilterChange");
    expect(screenSource).not.toContain("onStatusFilterChange");
  });

  it("board filter state is initialized as arrays for status/host-ranch/field", () => {
    var screenSource = fs.readFileSync(SCREEN_SOURCE_PATH, "utf8");

    expect(screenSource).toContain(
      "var [hostRanchFilter, setHostRanchFilter] = useState([]);",
    );
    expect(screenSource).toContain(
      "var [fieldFilter, setFieldFilter] = useState([]);",
    );
    expect(screenSource).toContain(
      "var [statusFilter, setStatusFilter] = useState([]);",
    );
  });
});

// Regression coverage for the old-prop-contract bug: Worker (and Payer,
// below) once still passed searchText/onSearchTextChange/hostRanchFilter/
// onHostRanchFilterChange/... - the dead per-field prop contract from
// before CompetitionsFilterBar switched to appliedFilters/onApply - which
// silently no-ops the filter UI since the shared component no longer reads
// those props. Pinned against AdminCompetitionsBoardScreen, the verified
// working reference for the current contract.
describe("WorkerCompetitionsBoardScreen wiring", () => {
  it("passes appliedFilters + onApply, no more scalar per-field setters", () => {
    var screenSource = fs.readFileSync(WORKER_SCREEN_SOURCE_PATH, "utf8");

    expect(screenSource).toContain("appliedFilters={{");
    expect(screenSource).toContain("onApply={handleApplyFilters}");
    expect(screenSource).not.toContain("onSearchTextChange");
    expect(screenSource).not.toContain("onHostRanchFilterChange");
    expect(screenSource).not.toContain("onFieldFilterChange");
    expect(screenSource).not.toContain("onStatusFilterChange");
    expect(screenSource).not.toContain("onDateFromChange");
    expect(screenSource).not.toContain("onDateToChange");
    expect(screenSource).not.toContain("onReset={handleResetFilters}");
  });

  it("board filter state is initialized as arrays for status/host-ranch/field", () => {
    var screenSource = fs.readFileSync(WORKER_SCREEN_SOURCE_PATH, "utf8");

    expect(screenSource).toContain(
      "var [hostRanchFilter, setHostRanchFilter] = useState([]);",
    );
    expect(screenSource).toContain(
      "var [fieldFilter, setFieldFilter] = useState([]);",
    );
    expect(screenSource).toContain(
      "var [statusFilter, setStatusFilter] = useState([]);",
    );
  });
});

describe("PayerCompetitionsBoardScreen wiring", () => {
  it("passes appliedFilters + onApply, no more scalar per-field setters", () => {
    var screenSource = fs.readFileSync(PAYER_SCREEN_SOURCE_PATH, "utf8");

    expect(screenSource).toContain("appliedFilters={{");
    expect(screenSource).toContain("onApply={handleApplyFilters}");
    expect(screenSource).not.toContain("onSearchTextChange");
    expect(screenSource).not.toContain("onHostRanchFilterChange");
    expect(screenSource).not.toContain("onFieldFilterChange");
    expect(screenSource).not.toContain("onStatusFilterChange");
    expect(screenSource).not.toContain("onDateFromChange");
    expect(screenSource).not.toContain("onDateToChange");
    expect(screenSource).not.toContain("onReset={handleResetFilters}");
  });

  it("board filter state is initialized as arrays for status/host-ranch/field", () => {
    var screenSource = fs.readFileSync(PAYER_SCREEN_SOURCE_PATH, "utf8");

    expect(screenSource).toContain(
      "var [hostRanchFilter, setHostRanchFilter] = useState([]);",
    );
    expect(screenSource).toContain(
      "var [fieldFilter, setFieldFilter] = useState([]);",
    );
    expect(screenSource).toContain(
      "var [statusFilter, setStatusFilter] = useState([]);",
    );
  });
});

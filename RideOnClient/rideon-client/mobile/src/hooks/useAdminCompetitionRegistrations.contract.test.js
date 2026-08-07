import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// CAP-3: contract test proving every new-entries-tab dropdown source
// (classes, payers, riders, trainers, horses) is fetched on the same
// activation path (this hook's useFocusEffect), instead of horses staying
// lazy-loaded only when the picker opens. The hook pulls in react-native
// service modules not safe to import under plain vitest, so this reads
// source text (same approach as the repo's other *.contract.test.js files).

var SOURCE_PATH = path.resolve(__dirname, "useAdminCompetitionRegistrations.js");

function readSource() {
  return fs.readFileSync(SOURCE_PATH, "utf8");
}

function getFocusEffectBlock(source) {
  var match = source.match(/useFocusEffect\(\s*useCallback\(\s*function \(\) \{/);
  expect(match).toBeTruthy();

  var start = match.index;
  var end = source.indexOf("async function loadScreenData()");
  expect(end).toBeGreaterThan(start);

  return source.slice(start, end);
}

describe("useAdminCompetitionRegistrations dropdown-source inventory", () => {
  it("loadScreenData fetches classes (invitation details), payers, riders and trainers together", () => {
    var source = readSource();
    var loadScreenDataBlock = source
      .split("async function loadScreenData() {")[1]
      .split("// Fetches the bounded, real-horse-only list")[0];

    expect(loadScreenDataBlock).toContain("getCompetitionInvitationDetails(");
    expect(loadScreenDataBlock).toContain("getManagedPayers(");
    expect(loadScreenDataBlock).toContain("getRidersByRanch(");
    expect(loadScreenDataBlock).toContain("getTrainersByRanch(");
  });

  it("loadHorsesForPicker fetches the bounded real-horse list via getRealHorsesByRanch", () => {
    var source = readSource();
    var horsesLoaderBlock = source
      .split("var loadHorsesForPicker = useCallback(")[1]
      .split("function handleToggleLock(fieldKey)")[0];

    expect(horsesLoaderBlock).toContain("getRealHorsesByRanch(");
  });

  it("the tab-activation focus effect calls loadScreenData AND loadHorsesForPicker together, guarded by the same activeRole/competitionId check", () => {
    var focusEffectBlock = getFocusEffectBlock(readSource());

    expect(focusEffectBlock).toContain("loadScreenData();");
    expect(focusEffectBlock).toContain("loadHorsesForPicker();");

    // Both calls must be reachable only past the guard's early return, not
    // hoisted above it.
    var guardIndex = focusEffectBlock.indexOf("return;");
    expect(focusEffectBlock.indexOf("loadScreenData();")).toBeGreaterThan(
      guardIndex,
    );
    expect(focusEffectBlock.indexOf("loadHorsesForPicker();")).toBeGreaterThan(
      guardIndex,
    );
  });

  it("horses are no longer only fetched from an open/search handler - the picker's onSearch wiring is unchanged (still supports search-after-load)", () => {
    var source = readSource();

    // loadHorsesForPicker is still exposed as onSearchHorses for the picker's
    // own debounced search - CAP-3 only adds an eager call, it doesn't
    // remove the existing search path.
    expect(source).toContain("loadHorsesForPicker,");
  });

  it("does not introduce an unguarded effect that would refetch on every render", () => {
    var source = readSource();
    var focusEffectAndDeps = source.split("async function loadScreenData()")[0];

    expect(focusEffectAndDeps).toMatch(
      /\[activeRole, competitionId\],\s*\),\s*\);/,
    );
  });
});

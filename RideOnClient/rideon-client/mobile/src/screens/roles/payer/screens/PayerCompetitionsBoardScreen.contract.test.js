import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// PayerCompetitionsBoardScreen imports react-native/context modules, not safe to
// import under plain vitest - same reason as every other *.contract.test.js file in
// this codebase (see WorkerHomeScreen.contract.test.js). This pins the focus-reset
// fix for the stale board menuMode/selectedCompetition state against the source text
// instead of rendering it. Shared root cause with WorkerCompetitionsBoardScreen - see
// that screen's own .contract.test.js for the parallel assertions.

var SOURCE_PATH = path.resolve(__dirname, "PayerCompetitionsBoardScreen.jsx");

function readSource() {
  return fs.readFileSync(SOURCE_PATH, "utf8").replace(/\r\n/g, "\n");
}

describe("PayerCompetitionsBoardScreen - stale competition-menu reset on focus", () => {
  it("imports useFocusEffect from @react-navigation/native and useCallback from react", () => {
    var source = readSource();

    expect(source).toContain(
      'import { useFocusEffect } from "@react-navigation/native";',
    );
    expect(source).toContain(
      'import { useCallback, useEffect, useMemo, useState } from "react";',
    );
  });

  it("wires a useFocusEffect that calls exitCompetitionMenu on every focus", () => {
    var source = readSource();

    var focusEffectAt = source.indexOf("useFocusEffect(");
    expect(focusEffectAt).toBeGreaterThan(-1);

    // Slice to the closing "});" of the whole useFocusEffect(...) call - not the
    // first ");" in the source, which matches inside "exitCompetitionMenu();" itself.
    var focusEffectEnd = source.indexOf("}, []),\n  );", focusEffectAt);
    expect(focusEffectEnd).toBeGreaterThan(focusEffectAt);
    var focusEffectBlock = source.substring(focusEffectAt, focusEffectEnd);

    expect(focusEffectBlock).toContain("useCallback(function () {");
    expect(focusEffectBlock).toContain("exitCompetitionMenu();");
  });

  it("exitCompetitionMenu resets menuMode to general, clears selectedCompetition, and clears the competition context", () => {
    var source = readSource();

    var fnAt = source.indexOf("async function exitCompetitionMenu() {");
    expect(fnAt).toBeGreaterThan(-1);
    var fnEnd = source.indexOf("\n  }\n", fnAt);
    var fnBody = source.substring(fnAt, fnEnd);

    expect(fnBody).toContain("setSelectedCompetition(null);");
    expect(fnBody).toContain('setMenuMode("general");');
    expect(fnBody).toContain("await competitionContext.clearCompetition();");
  });

  it("the useFocusEffect wiring is declared after exitCompetitionMenu, and before handleLogout", () => {
    var source = readSource();

    var exitFnAt = source.indexOf("async function exitCompetitionMenu() {");
    var focusEffectAt = source.indexOf("useFocusEffect(");
    var handleLogoutAt = source.indexOf("async function handleLogout() {");

    expect(exitFnAt).toBeGreaterThan(-1);
    expect(focusEffectAt).toBeGreaterThan(exitFnAt);
    expect(handleLogoutAt).toBeGreaterThan(focusEffectAt);
  });
});

describe("PayerCompetitionsBoardScreen - load-error styled feedback", () => {
  it("imports showToast and shows an error toast on loadCompetitions failure", () => {
    var source = readSource();

    expect(source).toContain(
      'import { showToast } from "../../../../services/toastService";',
    );
    expect(source).toContain(
      'showToast("אירעה שגיאה בטעינת התחרויות", "error");',
    );
  });

  it("no native Alert remains", () => {
    var source = readSource();

    expect(source).not.toMatch(/\bAlert\b/);
  });
});

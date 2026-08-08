import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// CompetitionMenuTemplate.jsx cannot be imported/rendered under vitest
// (react-native deps) - same convention as every other
// *.contract.test.js file in this repo: read the source as text.
//
// This file was rewritten for the nested-Modal fix: the exit-confirmation
// AppDialog used to be rendered here, nested inside MobileSideMenu's own
// native Modal (see MobileScreenLayout.jsx), which caused the exit flow to
// close two native Modals in the same event cycle right as navigation
// unmounted the screen - the bottom nav went dead afterward. AppDialog now
// lives in MobileScreenLayout, outside MobileSideMenu; this template only
// requests it.

var SOURCE_PATH = path.resolve(__dirname, "CompetitionMenuTemplate.jsx");

function readSource() {
  return fs.readFileSync(SOURCE_PATH, "utf8").replace(/\r\n/g, "\n");
}

describe("CompetitionMenuTemplate - exit-competition confirmation", () => {
  it("no native Alert is used anywhere", () => {
    var source = readSource();
    expect(source).not.toMatch(/\bAlert\b/);
  });

  it("does not import or render AppDialog - the exit-confirmation dialog must never be a native Modal nested inside MobileSideMenu's native Modal", () => {
    var source = readSource();
    expect(source).not.toMatch(/import AppDialog/);
    expect(source).not.toMatch(/<AppDialog\b/);
    expect(source).not.toMatch(/<Modal\b/);
  });

  it("has no local exit-dialog visibility state - that state now lives in MobileScreenLayout, outside MobileSideMenu", () => {
    var source = readSource();
    expect(source).not.toContain("useState");
    expect(source).not.toContain("exitDialogVisible");
  });

  it("exit-competition requires confirmation - the menu Pressable only requests confirmation, never calls onExitCompetition directly", () => {
    var source = readSource();
    var fnStart = source.indexOf("function handleExitPress()");
    var fnEnd = source.indexOf("\n  }\n", fnStart);
    var fnBody = source.slice(fnStart, fnEnd);

    expect(fnBody).toContain("props.requestExitConfirm(props.onExitCompetition);");
    expect(fnBody).not.toContain("props.onExitCompetition()");
    expect(fnBody).not.toContain("props.closeMenu");

    expect(source).toContain("onPress={handleExitPress}");
  });

  it("requestExitConfirm is invoked exactly once in the file, passed onExitCompetition as a plain unwrapped reference", () => {
    var source = readSource();
    var occurrences = (
      source.match(/props\.requestExitConfirm\(/g) || []
    ).length;
    expect(occurrences).toBe(1);

    expect(source).toContain(
      "props.requestExitConfirm(props.onExitCompetition);",
    );
    // Never wrapped in an extra function/await here - whatever MobileScreenLayout
    // eventually calls must be the caller's own callback, unaltered.
    expect(source).not.toMatch(/requestExitConfirm\(\s*(async\s*)?function/);
    expect(source).not.toMatch(/requestExitConfirm\(\s*\(\)\s*=>/);
  });

  it("no timing workaround exists anywhere in this file", () => {
    var source = readSource();
    expect(source).not.toContain("setTimeout");
    expect(source).not.toContain("setInterval");
    expect(source).not.toContain("requestAnimationFrame");
  });

  it("focus-driven cleanup cannot accidentally trigger the exit flow - the template has no lifecycle/focus hooks at all", () => {
    var source = readSource();
    // Some callers' onExitCompetition (e.g. WorkerCompetitionsBoardScreen's
    // exitCompetitionMenu) are also invoked automatically from their own
    // useFocusEffect - this template must stay confined to the explicit
    // menu-tap handler and never reach into that shared function itself.
    expect(source).not.toContain("useFocusEffect");
    expect(source).not.toContain("useEffect");
    expect(source).not.toContain("exitCompetitionMenu");
    expect(source).not.toContain("handleExitCompetition");
  });

  it("other menu items (item press) are unaffected by the exit-confirmation change", () => {
    var source = readSource();
    expect(source).toContain("props.onItemPress(item);");
    expect(source).toContain("if (props.closeMenu) {");
  });
});

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// CompetitionMenuTemplate.jsx cannot be imported/rendered under vitest
// (react-native deps) - same convention as every other
// *.contract.test.js file in this repo: read the source as text.
//
// Business rule (P0 fix): Exit Competition has NO confirmation dialog.
// The previous AppDialog-based confirmation (owned by MobileScreenLayout via
// requestExitConfirm) was removed entirely - even after the confirmation was
// moved outside MobileSideMenu's Modal to fix a nested-Modal issue, closing
// two native Modals (AppDialog + MobileSideMenu) in the same event cycle as
// an async onExitCompetition() navigated away still left the bottom nav on
// the destination screen visible but not clickable on real devices. Exit now
// goes straight through this component's own closeMenu/onExitCompetition
// props, with only MobileSideMenu's Modal ever in play.

var SOURCE_PATH = path.resolve(__dirname, "CompetitionMenuTemplate.jsx");

function readSource() {
  return fs.readFileSync(SOURCE_PATH, "utf8").replace(/\r\n/g, "\n");
}

describe("CompetitionMenuTemplate - direct exit-competition (no confirmation)", () => {
  it("no native Alert is used anywhere", () => {
    var source = readSource();
    expect(source).not.toMatch(/\bAlert\b/);
  });

  it("does not import or render AppDialog - exit has no confirmation dialog at all", () => {
    var source = readSource();
    expect(source).not.toMatch(/import AppDialog/);
    expect(source).not.toMatch(/<AppDialog\b/);
    expect(source).not.toMatch(/<Modal\b/);
  });

  it("has no local exit-dialog visibility state", () => {
    var source = readSource();
    expect(source).not.toContain("useState");
    expect(source).not.toContain("exitDialogVisible");
    expect(source).not.toContain("exitConfirmVisible");
  });

  it("does not depend on requestExitConfirm anywhere", () => {
    var source = readSource();
    expect(source).not.toContain("requestExitConfirm");
  });

  it("exit press closes the menu first, then invokes onExitCompetition exactly once, with no confirmation step", () => {
    var source = readSource();
    var fnStart = source.indexOf("function handleExitPress()");
    var fnEnd = source.indexOf("\n  }\n", fnStart);
    var fnBody = source.slice(fnStart, fnEnd);

    expect(fnStart).toBeGreaterThan(-1);

    var closeMenuAt = fnBody.indexOf("props.closeMenu()");
    var exitAt = fnBody.indexOf("props.onExitCompetition()");

    expect(closeMenuAt).toBeGreaterThan(-1);
    expect(exitAt).toBeGreaterThan(-1);
    // closeMenu must run before onExitCompetition - some callers' callback
    // navigates synchronously with no internal await (e.g.
    // AdminCompetitionHealthCertificatesScreen), so the Modal must already
    // be told to close before navigation can happen.
    expect(closeMenuAt).toBeLessThan(exitAt);

    var exitOccurrences = (
      fnBody.match(/props\.onExitCompetition\(\)/g) || []
    ).length;
    expect(exitOccurrences).toBe(1);

    expect(source).toContain("onPress={handleExitPress}");
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

  it("other menu items also close the menu before invoking onItemPress, matching the exit-press ordering", () => {
    var source = readSource();
    var fnStart = source.indexOf("onPress={function () {");
    var fnEnd = source.indexOf("}}", fnStart);
    var fnBody = source.slice(fnStart, fnEnd);

    expect(fnStart).toBeGreaterThan(-1);
    expect(fnBody).toContain("props.onItemPress(item);");
    expect(fnBody).toContain("if (props.closeMenu) {");

    var closeMenuAt = fnBody.indexOf("props.closeMenu();");
    var itemPressAt = fnBody.indexOf("props.onItemPress(item);");

    expect(closeMenuAt).toBeGreaterThan(-1);
    expect(itemPressAt).toBeGreaterThan(-1);
    // closeMenu must run before onItemPress for the same reason exit does -
    // some callers' onItemPress navigates synchronously with no internal
    // await, so the Modal must already be told to close before navigation
    // can happen.
    expect(closeMenuAt).toBeLessThan(itemPressAt);
  });
});

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// CompetitionMenuTemplate.jsx cannot be imported/rendered under vitest
// (react-native deps) - same convention as every other
// *.contract.test.js file in this repo: read the source as text.

var SOURCE_PATH = path.resolve(__dirname, "CompetitionMenuTemplate.jsx");

function readSource() {
  return fs.readFileSync(SOURCE_PATH, "utf8").replace(/\r\n/g, "\n");
}

describe("CompetitionMenuTemplate - exit-competition confirmation", () => {
  it("no native Alert is used anywhere", () => {
    var source = readSource();
    expect(source).not.toMatch(/\bAlert\b/);
  });

  it("imports AppDialog from the styled alert foundation", () => {
    var source = readSource();
    expect(source).toContain('import AppDialog from "../common/AppDialog";');
  });

  it("exit-competition requires confirmation - the menu Pressable only opens a dialog, never calls onExitCompetition directly", () => {
    var source = readSource();
    var fnStart = source.indexOf("function handleExitPress()");
    var fnEnd = source.indexOf("\n  }\n", fnStart);
    var fnBody = source.slice(fnStart, fnEnd);

    expect(fnBody).toContain("setExitDialogVisible(true);");
    expect(fnBody).not.toContain("onExitCompetition");

    expect(source).toContain("onPress={handleExitPress}");
  });

  it("onExitCompetition is invoked exactly once in the file, only from the confirm handler, preserving each caller's implementation exactly (called as a plain reference, not wrapped/altered)", () => {
    var source = readSource();
    var occurrences = (
      source.match(/props\.onExitCompetition\(\)/g) || []
    ).length;
    expect(occurrences).toBe(1);

    var confirmStart = source.indexOf("function handleExitConfirm()");
    var confirmEnd = source.indexOf("\n  }\n", confirmStart);
    var confirmBody = source.slice(confirmStart, confirmEnd);

    expect(confirmBody).toContain("setExitDialogVisible(false);");
    expect(confirmBody).toContain("props.onExitCompetition();");
    // Not awaited - matches the pre-existing fire-and-forget call shape, so
    // whatever the caller passed in (sync or async, board-reset or full
    // clearCompetition()) behaves exactly as it did before this dialog
    // existed.
    expect(confirmBody).not.toContain("await props.onExitCompetition");
  });

  it("focus-driven cleanup cannot accidentally open this dialog - the template has no lifecycle/focus hooks at all", () => {
    var source = readSource();
    // The dialog's visibility is driven only by the explicit tap
    // (handleExitPress -> setExitDialogVisible(true)). This file must not
    // wire any useEffect/useFocusEffect that could set that state, because
    // some callers' onExitCompetition (e.g. WorkerCompetitionsBoardScreen's
    // exitCompetitionMenu) are also invoked automatically from their own
    // useFocusEffect - the dialog logic must stay confined to this
    // template's explicit menu-tap handler and never reach into that shared
    // function.
    expect(source).not.toContain("useFocusEffect");
    expect(source).not.toContain("useEffect");
    expect(source).not.toContain("exitCompetitionMenu");
    expect(source).not.toContain("handleExitCompetition");
  });

  it("renders the dialog wired to press/confirm/cancel handlers", () => {
    var source = readSource();
    expect(source).toContain("visible={exitDialogVisible}");
    expect(source).toContain("onConfirm={handleExitConfirm}");
    expect(source).toContain("onCancel={handleExitCancel}");
  });
});

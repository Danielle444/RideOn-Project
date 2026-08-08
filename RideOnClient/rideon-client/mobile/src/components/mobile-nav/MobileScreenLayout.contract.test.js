import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// MobileScreenLayout.jsx cannot be imported/rendered under vitest
// (react-native deps) - same convention as every other
// *.contract.test.js file in this repo: read the source as text.
//
// This structural invariant is the actual fix for the exit-competition
// touch-lockup regression: the exit-confirmation AppDialog used to be
// rendered inside CompetitionMenuTemplate, which is itself rendered as
// MobileSideMenu's `children` - i.e. nested inside MobileSideMenu's own
// native Modal. Confirming exit closed both native Modals in the same
// event cycle right as an async onExitCompetition() call navigated the
// screen away, and the bottom nav on the destination screen stopped
// responding to touches afterward. AppDialog now lives here, as a sibling
// of MobileSideMenu, never nested inside its Modal.

var SOURCE_PATH = path.resolve(__dirname, "MobileScreenLayout.jsx");

function readSource() {
  return fs.readFileSync(SOURCE_PATH, "utf8").replace(/\r\n/g, "\n");
}

describe("MobileScreenLayout - exit-confirmation dialog is not nested in MobileSideMenu", () => {
  it("imports AppDialog", () => {
    var source = readSource();
    expect(source).toContain('import AppDialog from "../common/AppDialog";');
  });

  it("renders AppDialog after MobileSideMenu's closing tag, not as its child", () => {
    var source = readSource();
    var sideMenuOpen = source.indexOf("<MobileSideMenu");
    var sideMenuClose = source.indexOf("</MobileSideMenu>");
    var appDialogOpen = source.indexOf("<AppDialog");

    expect(sideMenuOpen).toBeGreaterThan(-1);
    expect(sideMenuClose).toBeGreaterThan(-1);
    expect(appDialogOpen).toBeGreaterThan(-1);

    // AppDialog must not appear between MobileSideMenu's opening and
    // closing tags - that would make it a React child of MobileSideMenu's
    // Modal again, reintroducing the nested-Modal regression.
    expect(appDialogOpen).toBeGreaterThan(sideMenuClose);
  });

  it("menuContent is called with both closeMenu and requestExitConfirm", () => {
    var source = readSource();
    expect(source).toMatch(
      /props\.menuContent\(\{\s*closeMenu:\s*closeMenu,\s*requestExitConfirm:\s*requestExitConfirm,?\s*\}\)/,
    );
  });

  it("requestExitConfirm stores the caller's callback and opens the dialog, without invoking it", () => {
    var source = readSource();
    var fnStart = source.indexOf("function requestExitConfirm(onExitCompetition)");
    var fnEnd = source.indexOf("\n  }\n", fnStart);
    var fnBody = source.slice(fnStart, fnEnd);

    expect(fnBody).toContain("setExitConfirmVisible(true);");
    expect(fnBody).not.toContain("onExitCompetition();");
  });

  it("confirm closes the dialog, invokes the stored callback exactly once, then closes the side menu", () => {
    var source = readSource();
    var fnStart = source.indexOf("function handleExitConfirmConfirm()");
    var fnEnd = source.indexOf("\n  }\n", fnStart);
    var fnBody = source.slice(fnStart, fnEnd);

    expect(fnBody).toContain("setExitConfirmVisible(false);");
    expect(fnBody).toContain("pendingExitCallback();");
    expect(fnBody).toContain("closeMenu();");

    var occurrences = (fnBody.match(/pendingExitCallback\(\)/g) || []).length;
    expect(occurrences).toBe(1);
  });

  it("cancel closes only the dialog - it never invokes the pending callback or closes the side menu", () => {
    var source = readSource();
    var fnStart = source.indexOf("function handleExitConfirmCancel()");
    var fnEnd = source.indexOf("\n  }\n", fnStart);
    var fnBody = source.slice(fnStart, fnEnd);

    expect(fnBody).toContain("setExitConfirmVisible(false);");
    expect(fnBody).not.toContain("pendingExitCallback()");
    expect(fnBody).not.toContain("closeMenu()");
  });

  it("no timing workaround exists anywhere in this file", () => {
    var source = readSource();
    expect(source).not.toContain("setTimeout");
    expect(source).not.toContain("setInterval");
    expect(source).not.toContain("requestAnimationFrame");
  });

  it("AppDialog is wired to the exit-confirmation state and handlers, preserving the existing Hebrew copy", () => {
    var source = readSource();
    expect(source).toContain("visible={exitConfirmVisible}");
    expect(source).toContain("onConfirm={handleExitConfirmConfirm}");
    expect(source).toContain("onCancel={handleExitConfirmCancel}");
    expect(source).toContain("title=\"יציאה מהתחרות\"");
    expect(source).toContain(
      "message=\"האם לצאת מהתחרות ולחזור ללוח התחרויות?\"",
    );
  });
});

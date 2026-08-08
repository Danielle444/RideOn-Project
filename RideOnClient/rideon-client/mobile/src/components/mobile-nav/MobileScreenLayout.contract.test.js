import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// MobileScreenLayout.jsx cannot be imported/rendered under vitest
// (react-native deps) - same convention as every other
// *.contract.test.js file in this repo: read the source as text.
//
// Business rule (P0 fix): Exit Competition has NO confirmation dialog.
// This file previously pinned an AppDialog-based exit confirmation
// (exitConfirmVisible/pendingExitCallback/requestExitConfirm) that was
// introduced here specifically to keep the confirmation dialog from being a
// native Modal nested inside MobileSideMenu's own native Modal. That fix did
// not solve the real-device bug (bottom nav visible but not clickable after
// exit) - closing two native Modals in the same event cycle as an async
// onExitCompetition() navigated away was still unsafe. The confirmation is
// now removed entirely, so this infrastructure has no reason to exist here.

var SOURCE_PATH = path.resolve(__dirname, "MobileScreenLayout.jsx");

function readSource() {
  return fs.readFileSync(SOURCE_PATH, "utf8").replace(/\r\n/g, "\n");
}

describe("MobileScreenLayout - no exit-confirmation infrastructure", () => {
  it("does not import or render AppDialog", () => {
    var source = readSource();
    expect(source).not.toMatch(/import AppDialog/);
    expect(source).not.toMatch(/<AppDialog\b/);
  });

  it("has no exit-confirmation state or handlers", () => {
    var source = readSource();
    expect(source).not.toContain("exitConfirmVisible");
    expect(source).not.toContain("pendingExitCallback");
    expect(source).not.toContain("requestExitConfirm");
    expect(source).not.toContain("handleExitConfirmCancel");
    expect(source).not.toContain("handleExitConfirmConfirm");
  });

  it("MobileSideMenu is the only Modal this file renders", () => {
    var source = readSource();
    var modalOccurrences = (source.match(/<Modal\b/g) || []).length;
    expect(modalOccurrences).toBe(0);
    expect(source).toContain("<MobileSideMenu");
  });

  it("menuContent is called with only closeMenu", () => {
    var source = readSource();
    expect(source).toMatch(
      /props\.menuContent\(\{\s*closeMenu:\s*closeMenu,?\s*\}\)/,
    );
  });

  it("closeMenu only sets isMenuOpen false - no side effects, no dialog state", () => {
    var source = readSource();
    var fnStart = source.indexOf("function closeMenu()");
    var fnEnd = source.indexOf("\n  }\n", fnStart);
    var fnBody = source.slice(fnStart, fnEnd);

    expect(fnBody).toContain("setIsMenuOpen(false);");
  });

  it("no timing workaround exists anywhere in this file", () => {
    var source = readSource();
    expect(source).not.toContain("setTimeout");
    expect(source).not.toContain("setInterval");
    expect(source).not.toContain("requestAnimationFrame");
  });
});

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// SideMenuTemplate.jsx cannot be imported/rendered under vitest
// (react-native deps) - same convention as every other
// *.contract.test.js file in this repo: read the source as text.

var SOURCE_PATH = path.resolve(__dirname, "SideMenuTemplate.jsx");

function readSource() {
  return fs.readFileSync(SOURCE_PATH, "utf8").replace(/\r\n/g, "\n");
}

describe("SideMenuTemplate - logout/switch-role confirmation", () => {
  it("no native Alert is used anywhere", () => {
    var source = readSource();
    expect(source).not.toMatch(/\bAlert\b/);
  });

  it("imports AppDialog from the styled alert foundation", () => {
    var source = readSource();
    expect(source).toContain('import AppDialog from "../common/AppDialog";');
  });

  it("switch-role requires confirmation - the menu Pressable only opens a dialog, never calls onSwitchRole directly", () => {
    var source = readSource();
    var fnStart = source.indexOf("function handleSwitchRolePress()");
    var fnEnd = source.indexOf("\n  }\n", fnStart);
    var fnBody = source.slice(fnStart, fnEnd);

    expect(fnBody).toContain("setSwitchRoleDialogVisible(true);");
    expect(fnBody).not.toContain("onSwitchRole");
  });

  it("switch-role confirm preserves the original callback exactly (fire-and-forget, no await added)", () => {
    var source = readSource();
    var fnStart = source.indexOf("function handleSwitchRoleConfirm()");
    var fnEnd = source.indexOf("function handleLogoutPress()");
    var fnBody = source.slice(fnStart, fnEnd);

    expect(fnBody).not.toContain("await props.onSwitchRole");
    expect(fnBody).toContain("props.onSwitchRole();");
    expect(fnBody).toContain("if (props.closeMenu) {");
    expect(fnBody).toContain("props.closeMenu();");

    // props.onSwitchRole is invoked exactly once in the whole file - only
    // from this confirm handler.
    var occurrences = (source.match(/props\.onSwitchRole\(\)/g) || []).length;
    expect(occurrences).toBe(1);
  });

  it("logout requires confirmation and invokes onLogout exactly once, only from the confirm handler", () => {
    var source = readSource();
    var pressStart = source.indexOf("function handleLogoutPress()");
    var pressEnd = source.indexOf("function handleLogoutCancel()");
    expect(source.slice(pressStart, pressEnd)).not.toContain("onLogout");

    var occurrences = (source.match(/props\.onLogout\(\)/g) || []).length;
    expect(occurrences).toBe(1);

    var confirmStart = source.indexOf("async function handleLogoutConfirm()");
    var confirmEnd = source.indexOf("\n  }\n", confirmStart);
    var confirmBody = source.slice(confirmStart, confirmEnd);
    expect(confirmBody).toContain("await props.onLogout();");
  });

  it("logout has busy protection so confirm cannot fire twice", () => {
    var source = readSource();
    var confirmStart = source.indexOf("async function handleLogoutConfirm()");
    var confirmEnd = source.indexOf("\n  }\n", confirmStart);
    var confirmBody = source.slice(confirmStart, confirmEnd);

    expect(confirmBody).toContain("if (isLoggingOut) {");
    expect(confirmBody).toContain("setIsLoggingOut(true);");
    expect(confirmBody).toContain("setIsLoggingOut(false);");

    var cancelStart = source.indexOf("function handleLogoutCancel()");
    var cancelEnd = source.indexOf("async function handleLogoutConfirm()");
    expect(source.slice(cancelStart, cancelEnd)).toContain(
      "if (isLoggingOut) {",
    );

    expect(source).toContain("isBusy={isLoggingOut}");
  });

  it("renders both dialogs wired to their press/confirm/cancel handlers", () => {
    var source = readSource();

    expect(source).toContain("visible={switchRoleDialogVisible}");
    expect(source).toContain("onConfirm={handleSwitchRoleConfirm}");
    expect(source).toContain("onCancel={handleSwitchRoleCancel}");

    expect(source).toContain("visible={logoutDialogVisible}");
    expect(source).toContain("destructive={true}");
    expect(source).toContain("onConfirm={handleLogoutConfirm}");
    expect(source).toContain("onCancel={handleLogoutCancel}");

    expect(source).toContain("onPress={handleSwitchRolePress}");
    expect(source).toContain("onPress={handleLogoutPress}");
  });

  it("AuthContext.logout() internals are not touched by this file (no import of AuthContext at all)", () => {
    var source = readSource();
    expect(source).not.toContain("AuthContext");
  });
});

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// SelectActiveRoleScreen.jsx cannot be imported/rendered under vitest
// (react-native deps) - same convention as every other
// *.contract.test.js screen test in this repo: read the source as text.

var SOURCE_PATH = path.resolve(__dirname, "SelectActiveRoleScreen.jsx");

function readSource() {
  return fs.readFileSync(SOURCE_PATH, "utf8").replace(/\r\n/g, "\n");
}

describe("SelectActiveRoleScreen - styled alert migration", () => {
  it("no longer imports or calls the native Alert", () => {
    var source = readSource();
    expect(source).not.toMatch(/\bAlert\b/);
  });

  it("imports showToast from the styled alert foundation", () => {
    var source = readSource();
    expect(source).toContain(
      'import { showToast } from "../../services/toastService";',
    );
  });

  it("role-selection failure and the catch-block failure both show error toasts", () => {
    var source = readSource();
    expect(source).toContain('showToast(result.message, "error");');
    expect(source).toContain(
      'showToast("אירעה שגיאה במעבר לתפקיד שנבחר", "error");',
    );
  });

  it("preserves the isNavigating guard and the setTimeout-wrapped navigation.replace on success", () => {
    var source = readSource();
    var fnStart = source.indexOf("async function handleRolePress(item)");
    var fnEnd = source.indexOf("async function handleLogout()");
    var fnBody = source.slice(fnStart, fnEnd);

    expect(fnBody).toContain("if (isNavigating) {");
    expect(fnBody).toContain("setIsNavigating(true);");
    expect(fnBody).toContain(
      "await setActiveRoleAndPersist(result.activeRole);",
    );
    expect(fnBody).toContain("props.navigation.replace(result.destination);");
    expect(fnBody).toContain("setIsNavigating(false);");
  });
});

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// AdminHomeScreen imports react-native/context modules not safe to import
// under plain vitest, so this reads source text - same approach as every
// other *.contract.test.js file in this codebase.

var SOURCE_PATH = path.resolve(__dirname, "AdminHomeScreen.jsx");

function readSource() {
  return fs.readFileSync(SOURCE_PATH, "utf8").replace(/\r\n/g, "\n");
}

describe("AdminHomeScreen - restored-session home retry", () => {
  it("imports withTransientRetry from the shared retry helper", () => {
    var source = readSource();

    expect(source).toContain(
      'import { withTransientRetry } from "../../../../utils/transientRequestRetry";',
    );
  });

  it("wraps the home-competitions fetch in withTransientRetry, not a bare call", () => {
    var source = readSource();

    expect(source).toContain(
      "var response = await withTransientRetry(function () {\n" +
        "        return getMobileAdminHomeCompetitions(activeRole.ranchId);\n" +
        "      });",
    );
    // The bare, unwrapped call must be gone - only reachable through the
    // retry wrapper now.
    expect(source).not.toContain(
      "var response = await getMobileAdminHomeCompetitions(activeRole.ranchId);",
    );
  });

  it("preserves the existing error notice text and empty-state fallback, now via AppToast", () => {
    var source = readSource();

    expect(source).toContain("console.error(error);");
    expect(source).toContain("setCompetitions([]);");
    expect(source).toContain(
      'showToast("אירעה שגיאה בטעינת דף הבית", "error");',
    );
  });

  it("no longer uses the native Alert.alert", () => {
    var source = readSource();

    expect(source).not.toContain("Alert.alert");
    expect(source).not.toMatch(/from ["']react-native["'][\s\S]{0,200}Alert/);
  });

  it("handleRefresh still calls loadHomeCompetitions - pull-to-refresh path is untouched", () => {
    var source = readSource();

    expect(source).toContain("async function handleRefresh() {");
    expect(source).toContain("await loadHomeCompetitions();");
  });
});

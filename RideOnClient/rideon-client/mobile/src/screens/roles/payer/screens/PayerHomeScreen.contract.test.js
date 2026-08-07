import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// PayerHomeScreen imports react-native/context modules not safe to import
// under plain vitest, so this reads source text - same approach as every
// other *.contract.test.js file in this codebase.

var SOURCE_PATH = path.resolve(__dirname, "PayerHomeScreen.jsx");

function readSource() {
  return fs.readFileSync(SOURCE_PATH, "utf8").replace(/\r\n/g, "\n");
}

describe("PayerHomeScreen - restored-session home retry", () => {
  it("imports withTransientRetry from the shared retry helper", () => {
    var source = readSource();

    expect(source).toContain(
      'import { withTransientRetry } from "../../../../utils/transientRequestRetry";',
    );
  });

  it("wraps the payer competitions-board fetch in withTransientRetry, not a bare call", () => {
    var source = readSource();

    expect(source).toContain(
      "var response = await withTransientRetry(function () {\n" +
        "        return getMobilePayerCompetitionsBoard(activeRole.ranchId);\n" +
        "      });",
    );
    expect(source).not.toContain(
      "var response = await getMobilePayerCompetitionsBoard(activeRole.ranchId);",
    );
  });

  it("preserves the existing error alert and empty-state fallback unchanged", () => {
    var source = readSource();

    expect(source).toContain("console.error(error);");
    expect(source).toContain("setCompetitions([]);");
    expect(source).toContain(
      'Alert.alert("שגיאה", "אירעה שגיאה בטעינת דף הבית");',
    );
  });

  it("handleRefresh still calls loadHomeCompetitions - pull-to-refresh path is untouched", () => {
    var source = readSource();

    expect(source).toContain("async function handleRefresh() {");
    expect(source).toContain("await loadHomeCompetitions();");
  });
});

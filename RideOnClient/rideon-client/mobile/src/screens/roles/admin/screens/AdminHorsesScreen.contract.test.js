import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// AdminHorsesScreen imports react-native/context modules not safe to import
// under plain vitest, so this reads source text - same approach as every
// other *.contract.test.js file in this codebase.

var SOURCE_PATH = path.resolve(__dirname, "AdminHorsesScreen.jsx");

function readSource() {
  return fs.readFileSync(SOURCE_PATH, "utf8").replace(/\r\n/g, "\n");
}

describe("AdminHorsesScreen - alert migration to AppToast", () => {
  it("no longer uses the native Alert.alert", () => {
    var source = readSource();

    expect(source).not.toContain("Alert.alert");
    expect(source).not.toMatch(/from ["']react-native["'][\s\S]{0,200}Alert/);
  });

  it("imports showToast from the shared toast service", () => {
    var source = readSource();

    expect(source).toContain(
      'import { showToast } from "../../../../services/toastService";',
    );
  });

  it("barn-name save success notice keeps its original text and success type", () => {
    var source = readSource();

    expect(source).toContain('showToast("הכינוי עודכן בהצלחה", "success");');
  });

  it("barn-name save error notice keeps the original getApiErrorMessage fallback text", () => {
    var source = readSource();

    expect(source).toContain(
      'getApiErrorMessage(error, "אירעה שגיאה בעדכון הכינוי")',
    );
    var errorCallIndex = source.indexOf(
      'getApiErrorMessage(error, "אירעה שגיאה בעדכון הכינוי")',
    );
    var surrounding = source.slice(
      Math.max(0, errorCallIndex - 40),
      errorCallIndex + 60,
    );
    expect(surrounding).toContain("showToast(");
  });

  it("the success notice still fires only after the modal closes and the list reloads (unchanged ordering)", () => {
    var source = readSource();
    var fnStart = source.indexOf("async function handleSaveBarnName()");
    var fnEnd = source.indexOf("async function handleLogout()");
    var fnBody = source.slice(fnStart, fnEnd);

    var closeIndex = fnBody.indexOf("closeEditModal();");
    var reloadIndex = fnBody.indexOf("await loadHorses(searchText);");
    var toastIndex = fnBody.indexOf(
      'showToast("הכינוי עודכן בהצלחה", "success");',
    );

    expect(closeIndex).toBeGreaterThan(-1);
    expect(reloadIndex).toBeGreaterThan(closeIndex);
    expect(toastIndex).toBeGreaterThan(reloadIndex);
  });
});

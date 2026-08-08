import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// useProfileScreen.js pulls in react-native/context deps, not safe to
// import/render under vitest - same convention as every other
// *.contract.test.js file in this repo: read the source as text.

var SOURCE_PATH = path.resolve(__dirname, "useProfileScreen.js");

function readSource() {
  return fs.readFileSync(SOURCE_PATH, "utf8").replace(/\r\n/g, "\n");
}

describe("useProfileScreen - styled alert migration", () => {
  it("no longer imports or calls the native Alert", () => {
    var source = readSource();
    expect(source).not.toMatch(/\bAlert\b/);
  });

  it("imports showToast from the styled alert foundation", () => {
    var source = readSource();
    expect(source).toContain('import { showToast } from "../services/toastService";');
  });

  it("all 14 acknowledgement-only alerts became showToast calls (none dropped, none duplicated)", () => {
    var source = readSource();
    var matches = source.match(/showToast\(/g) || [];
    expect(matches.length).toBe(14);
  });

  it("success toasts use the success type", () => {
    var source = readSource();
    expect(source).toContain('showToast("פרטי המשתמש עודכנו בהצלחה", "success");');
    expect(source).toContain('showToast("פרטי החווה עודכנו בהצלחה", "success");');
    expect(source).toContain('showToast("הבקשה להוספת פרופיל נשלחה בהצלחה", "success");');
    expect(source).toContain('showToast("המנהל נוסף בהצלחה", "success");');
    expect(source).toContain('showToast("המנהל הוסר בהצלחה", "success");');
    expect(source).toContain(
      '? "בקשת הניהול אושרה"\n          : "בקשת הניהול נדחתה",\n        "success",\n      );',
    );
  });

  it("every catch-block toast uses the error type", () => {
    var source = readSource();
    var errorCallCount = (
      source.match(/\n\s*"error",\n\s*\);/g) || []
    ).length;
    expect(errorCallCount).toBe(8);
  });

  it("preserves refresh/state sequencing - loadPage still runs right after the save-success toast", () => {
    var source = readSource();
    var toastIndex = source.indexOf('showToast("פרטי המשתמש עודכנו בהצלחה", "success");');
    var reloadIndex = source.indexOf("await loadPage();", toastIndex);

    expect(toastIndex).toBeGreaterThan(-1);
    expect(reloadIndex).toBeGreaterThan(toastIndex);
    expect(reloadIndex - toastIndex).toBeLessThan(100);
  });

  it("preserves refresh sequencing for manager add/remove - reload calls still precede their success toast", () => {
    var source = readSource();
    var addManagerFnStart = source.indexOf("async function handleAddManager(adminPersonId)");
    var addManagerFnEnd = source.indexOf("async function handleRemoveManager(adminPersonId)");
    var addManagerBody = source.slice(addManagerFnStart, addManagerFnEnd);

    var loadManagersIndex = addManagerBody.indexOf("await loadManagers();");
    var toastIndex = addManagerBody.indexOf('showToast("המנהל נוסף בהצלחה", "success");');

    expect(loadManagersIndex).toBeGreaterThan(-1);
    expect(toastIndex).toBeGreaterThan(loadManagersIndex);
  });

  it("no manager-flow business logic changed - handlers still call the same service functions", () => {
    var source = readSource();
    expect(source).toContain("await addPayerManager(user.personId, adminPersonId);");
    expect(source).toContain("await removePayerManager(user.personId, adminPersonId);");
    expect(source).toContain(
      "await answerPayerManagerRequest(\n        user.personId,\n        adminPersonId,\n        answerStatus,\n      );",
    );
  });
});

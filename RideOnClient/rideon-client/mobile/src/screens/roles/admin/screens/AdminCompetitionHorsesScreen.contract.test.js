import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// AdminCompetitionHorsesScreen imports react-native/context modules not safe
// to import under plain vitest, so this reads source text - same approach as
// every other *.contract.test.js file in this codebase.

var SOURCE_PATH = path.resolve(__dirname, "AdminCompetitionHorsesScreen.jsx");

function readSource() {
  return fs.readFileSync(SOURCE_PATH, "utf8").replace(/\r\n/g, "\n");
}

function handleSaveBarnNameBody(source) {
  var fnAt = source.indexOf("async function handleSaveBarnName() {");
  expect(fnAt).toBeGreaterThan(-1);
  var fnEnd = source.indexOf("\n  }\n", fnAt);
  return source.substring(fnAt, fnEnd);
}

describe("AdminCompetitionHorsesScreen - barn-name save styled feedback", () => {
  it("imports showToast from the shared toast service", () => {
    var source = readSource();

    expect(source).toContain(
      'import { showToast } from "../../../../services/toastService";',
    );
  });

  it("the two defensive guards show an error toast and return before calling the API", () => {
    var source = readSource();
    var body = handleSaveBarnNameBody(source);

    var missingHorseAt = body.indexOf(
      'showToast("לא נמצאו פרטי סוס לעדכון", "error");',
    );
    var missingRanchAt = body.indexOf(
      'showToast("לא נמצאה חווה פעילה", "error");',
    );
    var apiCallAt = body.indexOf("await updateHorseBarnName(");

    expect(missingHorseAt).toBeGreaterThan(-1);
    expect(missingRanchAt).toBeGreaterThan(missingHorseAt);
    expect(apiCallAt).toBeGreaterThan(missingRanchAt);

    // Each guard returns immediately - never falls through to the API call.
    expect(body).toContain(
      'showToast("לא נמצאו פרטי סוס לעדכון", "error");\n        return;',
    );
    expect(body).toContain(
      'showToast("לא נמצאה חווה פעילה", "error");\n        return;',
    );
  });

  it("success toast fires after the modal is already closed", () => {
    var source = readSource();
    var body = handleSaveBarnNameBody(source);

    var closeAt = body.indexOf("closeEditBarnNameModal();");
    var successToastAt = body.indexOf(
      'showToast("כינוי הסוס עודכן בהצלחה", "success");',
    );

    expect(closeAt).toBeGreaterThan(-1);
    expect(successToastAt).toBeGreaterThan(closeAt);
  });

  it("API failure still shows the getApiErrorMessage-derived text as an error toast", () => {
    var source = readSource();
    var body = handleSaveBarnNameBody(source);

    expect(body).toContain(
      'showToast(\n        getApiErrorMessage(error, "אירעה שגיאה בעדכון כינוי הסוס"),\n        "error",\n      );',
    );
  });

  it("closeEditBarnNameModal still blocks dismissal while saving (isSavingBarnName guard untouched)", () => {
    var source = readSource();

    var fnAt = source.indexOf("function closeEditBarnNameModal() {");
    expect(fnAt).toBeGreaterThan(-1);
    var fnEnd = source.indexOf("\n  }\n", fnAt);
    var fnBody = source.substring(fnAt, fnEnd);

    expect(fnBody).toContain("if (isSavingBarnName) {\n      return;\n    }");
  });

  it("no native Alert remains", () => {
    var source = readSource();

    expect(source).not.toMatch(/\bAlert\b/);
  });
});

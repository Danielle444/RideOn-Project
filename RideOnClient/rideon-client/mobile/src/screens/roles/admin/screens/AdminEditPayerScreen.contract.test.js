import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// AdminEditPayerScreen imports react-native/context modules not safe to
// import under plain vitest, so this reads source text - same approach as
// every other *.contract.test.js file in this codebase.

var SOURCE_PATH = path.resolve(__dirname, "AdminEditPayerScreen.jsx");

function readSource() {
  return fs.readFileSync(SOURCE_PATH, "utf8").replace(/\r\n/g, "\n");
}

describe("AdminEditPayerScreen - alert migration to AppToast/AppDialog", () => {
  it("no longer uses the native Alert.alert", () => {
    var source = readSource();

    expect(source).not.toContain("Alert.alert");
    expect(source).not.toMatch(/from ["']react-native["'][\s\S]{0,200}Alert/);
  });

  it("imports showToast and AppDialog", () => {
    var source = readSource();

    expect(source).toContain(
      'import { showToast } from "../../../../services/toastService";',
    );
    expect(source).toContain(
      'import AppDialog from "../../../../components/common/AppDialog";',
    );
  });

  describe("validation remains early-return, same order, same text", () => {
    it("handleSubmit still returns immediately after the missing-payer check, before the name check", () => {
      var source = readSource();
      var fnStart = source.indexOf("async function handleSubmit()");
      var fnEnd = source.indexOf("\n  }\n", fnStart);
      var fnBody = source.slice(fnStart, fnEnd);

      var missingPayerIdx = fnBody.indexOf(
        'showToast("לא נמצאו פרטי משלם לעריכה", "error");',
      );
      var nameIdx = fnBody.indexOf(
        'showToast("יש להזין שם פרטי ושם משפחה", "error");',
      );

      expect(missingPayerIdx).toBeGreaterThan(-1);
      expect(nameIdx).toBeGreaterThan(missingPayerIdx);

      expect(fnBody.slice(missingPayerIdx, missingPayerIdx + 90)).toContain(
        "return;",
      );
      expect(fnBody.slice(nameIdx, nameIdx + 90)).toContain("return;");
    });

    it("keeps the combined first+last name message as a single check, not split per-field (out of scope to normalize)", () => {
      var source = readSource();
      expect(source).toContain(
        'showToast("יש להזין שם פרטי ושם משפחה", "error");',
      );
      expect(source).not.toContain('showToast("יש להזין שם פרטי", "error")');
      expect(source).not.toContain('showToast("יש להזין שם משפחה", "error")');
    });
  });

  describe("navigation-gating success flow waits for acknowledgement", () => {
    it("goBack() is called only inside handleSuccessDialogConfirm, not directly inside handleSubmit", () => {
      var source = readSource();
      var occurrences = source.split("props.navigation.goBack();").length - 1;
      expect(occurrences).toBe(2); // handleSuccessDialogConfirm + the plain back button

      var confirmFnStart = source.indexOf("function handleSuccessDialogConfirm()");
      var confirmFnEnd = source.indexOf("\n  }\n", confirmFnStart);
      var confirmFnBody = source.slice(confirmFnStart, confirmFnEnd);
      expect(confirmFnBody).toContain("props.navigation.goBack();");

      var submitStart = source.indexOf("async function handleSubmit()");
      var submitEnd = source.indexOf("\n  return (", submitStart);
      var submitBody = source.slice(submitStart, submitEnd);
      expect(submitBody).not.toContain("props.navigation.goBack();");
      expect(submitBody).toContain("setShowSuccessDialog(true);");
    });

    it("confirming the dialog clears it and navigates back, in that order", () => {
      var source = readSource();
      var fnStart = source.indexOf("function handleSuccessDialogConfirm()");
      var fnEnd = source.indexOf("\n  }\n", fnStart);
      var fnBody = source.slice(fnStart, fnEnd);

      var clearIdx = fnBody.indexOf("setShowSuccessDialog(false);");
      var backIdx = fnBody.indexOf("props.navigation.goBack();");

      expect(clearIdx).toBeGreaterThan(-1);
      expect(backIdx).toBeGreaterThan(clearIdx);
    });

    it("preserves the original save-success title and message text", () => {
      var source = readSource();
      var dialogStart = source.indexOf("<AppDialog");
      var dialogEnd = source.indexOf("/>", dialogStart);
      var dialogJsx = source.slice(dialogStart, dialogEnd);

      expect(dialogJsx).toContain('title="נשמר"');
      expect(dialogJsx).toContain('message="פרטי המשלם עודכנו בהצלחה"');
    });
  });

  describe("single-button AppDialog for the success flow", () => {
    it("the success AppDialog does not receive an onCancel prop (single-button mode)", () => {
      var source = readSource();
      var dialogStart = source.indexOf("<AppDialog");
      var dialogEnd = source.indexOf("/>", dialogStart);
      var dialogJsx = source.slice(dialogStart, dialogEnd);

      expect(dialogJsx).toContain("onConfirm={handleSuccessDialogConfirm}");
      expect(dialogJsx).not.toContain("onCancel");
    });
  });

  it("preserves the getApiErrorMessage fallback text for the update-error notice", () => {
    var source = readSource();

    expect(source).toContain(
      'getApiErrorMessage(error, "אירעה שגיאה בעדכון המשלם")',
    );
  });
});

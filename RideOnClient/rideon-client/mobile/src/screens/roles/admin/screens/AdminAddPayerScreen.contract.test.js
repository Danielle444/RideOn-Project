import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// AdminAddPayerScreen imports react-native/context modules not safe to
// import under plain vitest, so this reads source text - same approach as
// every other *.contract.test.js file in this codebase.

var SOURCE_PATH = path.resolve(__dirname, "AdminAddPayerScreen.jsx");

function readSource() {
  return fs.readFileSync(SOURCE_PATH, "utf8").replace(/\r\n/g, "\n");
}

describe("AdminAddPayerScreen - alert migration to AppToast/AppDialog", () => {
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
    it("validateForm still returns false immediately after each failed check, first-name, then last-name, then phone-or-email", () => {
      var source = readSource();
      var fnStart = source.indexOf("function validateForm()");
      var fnEnd = source.indexOf("\n  }\n", fnStart);
      var fnBody = source.slice(fnStart, fnEnd);

      var firstNameIdx = fnBody.indexOf('showToast("יש להזין שם פרטי", "error");');
      var lastNameIdx = fnBody.indexOf('showToast("יש להזין שם משפחה", "error");');
      var phoneEmailIdx = fnBody.indexOf(
        'showToast("יש להזין לפחות טלפון או אימייל", "error");',
      );

      expect(firstNameIdx).toBeGreaterThan(-1);
      expect(lastNameIdx).toBeGreaterThan(firstNameIdx);
      expect(phoneEmailIdx).toBeGreaterThan(lastNameIdx);

      // each notice is immediately followed by its early return
      expect(fnBody.slice(firstNameIdx, firstNameIdx + 80)).toContain(
        "return false;",
      );
      expect(fnBody.slice(lastNameIdx, lastNameIdx + 80)).toContain(
        "return false;",
      );
      expect(fnBody.slice(phoneEmailIdx, phoneEmailIdx + 80)).toContain(
        "return false;",
      );
    });

    it("handleSubmit's pre-check (no active ranch) still returns immediately with the original text", () => {
      var source = readSource();
      var fnStart = source.indexOf("async function handleSubmit()");
      var checkIdx = source.indexOf(
        'showToast("לא נמצאה חווה פעילה", "error");',
        fnStart,
      );

      expect(checkIdx).toBeGreaterThan(fnStart);
      expect(source.slice(checkIdx, checkIdx + 60)).toContain("return;");
    });

    it("handleCreateWithCredentials repeats its own 4 checks in the original order: ranch, first name, last name, email", () => {
      var source = readSource();
      var fnStart = source.indexOf("async function handleCreateWithCredentials()");
      var fnEnd = source.indexOf("\n  }\n", fnStart);
      var fnBody = source.slice(fnStart, fnEnd);

      var ranchIdx = fnBody.indexOf('showToast("לא נמצאה חווה פעילה", "error");');
      var firstNameIdx = fnBody.indexOf('showToast("יש להזין שם פרטי", "error");');
      var lastNameIdx = fnBody.indexOf('showToast("יש להזין שם משפחה", "error");');
      var emailIdx = fnBody.indexOf(
        'showToast("יש להזין כתובת אימייל תקינה (חובה לשליחת פרטי התחברות)", "error");',
      );

      expect(ranchIdx).toBeGreaterThan(-1);
      expect(firstNameIdx).toBeGreaterThan(ranchIdx);
      expect(lastNameIdx).toBeGreaterThan(firstNameIdx);
      expect(emailIdx).toBeGreaterThan(lastNameIdx);
    });

    it("does not normalize the two independent validation code paths into a shared helper", () => {
      var source = readSource();
      // both handlers still each contain their own first/last-name checks -
      // i.e. the messages appear twice in the file (once per handler), not
      // once behind a single shared function call.
      var firstNameOccurrences = source.split(
        'showToast("יש להזין שם פרטי", "error");',
      ).length - 1;
      var lastNameOccurrences = source.split(
        'showToast("יש להזין שם משפחה", "error");',
      ).length - 1;

      expect(firstNameOccurrences).toBe(2);
      expect(lastNameOccurrences).toBe(2);
    });
  });

  describe("navigation-gating success flows wait for acknowledgement", () => {
    it("goBack() is called exactly twice: once in handleSuccessDialogConfirm, once in the plain unconditional 'חזרה' button", () => {
      var source = readSource();
      var occurrences = source.split("props.navigation.goBack();").length - 1;
      expect(occurrences).toBe(2);

      var confirmFnStart = source.indexOf("function handleSuccessDialogConfirm()");
      var confirmFnEnd = source.indexOf("\n  }\n", confirmFnStart);
      var confirmFnBody = source.slice(confirmFnStart, confirmFnEnd);
      expect(confirmFnBody).toContain("props.navigation.goBack();");

      var backButtonJsxStart = source.indexOf("styles.backButton,");
      if (backButtonJsxStart === -1) {
        backButtonJsxStart = source.indexOf("style={styles.backButton}");
      }
      var backButtonJsxEnd = source.indexOf("</Pressable>", backButtonJsxStart);
      var backButtonJsx = source.slice(backButtonJsxStart, backButtonJsxEnd);
      expect(backButtonJsx).toContain("props.navigation.goBack();");
    });

    it("handleSubmit and handleCreateWithCredentials never call goBack() directly - only through the dialog", () => {
      var source = readSource();
      var submitStart = source.indexOf("async function handleSubmit()");
      var submitEnd = source.indexOf("async function handleCreateWithCredentials()");
      var createEnd = source.indexOf("\n  return (", submitEnd);

      var submitBody = source.slice(submitStart, submitEnd);
      var createBody = source.slice(submitEnd, createEnd);

      expect(submitBody).not.toContain("props.navigation.goBack();");
      expect(createBody).not.toContain("props.navigation.goBack();");
    });

    it("handleSubmit's two success branches set successDialog instead of navigating directly", () => {
      var source = readSource();
      var fnStart = source.indexOf("async function handleSubmit()");
      var fnEnd = source.indexOf("async function handleCreateWithCredentials()");
      var fnBody = source.slice(fnStart, fnEnd);

      var occurrences = fnBody.split("setSuccessDialog({").length - 1;
      expect(occurrences).toBe(2);
      expect(fnBody).not.toContain("props.navigation.goBack()");
    });

    it("handleCreateWithCredentials sets successDialog instead of navigating directly", () => {
      var source = readSource();
      var fnStart = source.indexOf("async function handleCreateWithCredentials()");
      var fnEnd = source.indexOf("\n  return (", fnStart);
      var fnBody = source.slice(fnStart, fnEnd);

      expect(fnBody).toContain("setSuccessDialog({");
      expect(fnBody).not.toContain("props.navigation.goBack()");
    });

    it("the success dialog messages preserve the original text for all three flows", () => {
      var source = readSource();

      expect(source).toContain(
        '"נמצא אדם קיים במערכת ונשלחה עבורו בקשת ניהול לאישור."',
      );
      expect(source).toContain(
        '"נוצרה רשומה חלקית ונשלחה בקשת ניהול. בהמשך יחובר תהליך אימות והשלמת פרטים."',
      );
      expect(source).toContain(
        '"נשלח מייל למשלם עם פרטי ההתחברות הזמניים. המשלם יתחבר ויחליף סיסמה בכניסה הראשונה."',
      );
    });
  });

  describe("single-button AppDialog for the success flows", () => {
    it("the success AppDialog does not receive an onCancel prop (single-button mode)", () => {
      var source = readSource();
      var dialogStart = source.indexOf("<AppDialog");
      var dialogEnd = source.indexOf("/>", dialogStart);
      var dialogJsx = source.slice(dialogStart, dialogEnd);

      expect(dialogJsx).toContain("onConfirm={handleSuccessDialogConfirm}");
      expect(dialogJsx).not.toContain("onCancel");
    });

    it("confirming the dialog clears it and navigates back, in that order", () => {
      var source = readSource();
      var fnStart = source.indexOf("function handleSuccessDialogConfirm()");
      var fnEnd = source.indexOf("\n  }\n", fnStart);
      var fnBody = source.slice(fnStart, fnEnd);

      var clearIdx = fnBody.indexOf("setSuccessDialog(null);");
      var backIdx = fnBody.indexOf("props.navigation.goBack();");

      expect(clearIdx).toBeGreaterThan(-1);
      expect(backIdx).toBeGreaterThan(clearIdx);
    });
  });

  describe("other error notices", () => {
    it("preserves the getApiErrorMessage fallback text for both submit flows", () => {
      var source = readSource();

      expect(source).toContain(
        'getApiErrorMessage(error, "אירעה שגיאה בשליחת בקשת הוספת משלם")',
      );
      expect(source).toContain(
        'getApiErrorMessage(error, "אירעה שגיאה ביצירת המשלם")',
      );
    });
  });
});

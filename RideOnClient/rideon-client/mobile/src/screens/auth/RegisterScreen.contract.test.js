import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// RegisterScreen.jsx cannot be imported/rendered under vitest (react-native +
// @react-navigation deps) - same convention as every other
// *.contract.test.js screen test in this repo: read the source as text.

var SOURCE_PATH = path.resolve(__dirname, "RegisterScreen.jsx");

function readSource() {
  return fs.readFileSync(SOURCE_PATH, "utf8").replace(/\r\n/g, "\n");
}

describe("RegisterScreen - styled alert migration", () => {
  it("no longer imports or calls the native Alert", () => {
    var source = readSource();
    expect(source).not.toMatch(/\bAlert\b/);
  });

  it("imports AppDialog from the styled alert foundation", () => {
    var source = readSource();
    expect(source).toContain(
      'import AppDialog from "../../components/common/AppDialog";',
    );
  });

  it("ranch-request success no longer shows a popup that duplicates the inline banner", () => {
    var source = readSource();
    var handleCreateRanchStart = source.indexOf(
      "async function handleCreateRanchRequest",
    );
    var handleCreateRanchEnd = source.indexOf(
      "async function handleSubmit()",
    );
    var handlerBody = source.slice(handleCreateRanchStart, handleCreateRanchEnd);

    // The inline banner (the real, non-duplicated success feedback) stays.
    expect(handlerBody).toContain(
      'setSuccess("בקשת חווה נשלחה בהצלחה. החווה תופיע לאחר אישור מנהל.");',
    );
    // The short duplicate popup text is gone from this handler entirely.
    expect(handlerBody).not.toContain("בקשת החווה נשלחה בהצלחה");
    expect(handlerBody).not.toContain("showToast");
  });

  it("registration success sets dialog state instead of firing navigation inline", () => {
    var source = readSource();
    var handleSubmitStart = source.indexOf("async function handleSubmit()");
    var handleSubmitEnd = source.indexOf("\n  }\n", handleSubmitStart);
    var handlerBody = source.slice(handleSubmitStart, handleSubmitEnd);

    expect(handlerBody).toContain('setSuccess("הבקשה נשלחה בהצלחה");');
    expect(handlerBody).toContain("setShowRegisterSuccessDialog(true);");
    // Navigation must NOT fire directly inside handleSubmit - only via the
    // dialog's onConfirm, proven below.
    expect(handlerBody).not.toContain("navigation.navigate");
  });

  it("navigation to Login is gated behind the success dialog's confirm handler", () => {
    var source = readSource();
    var fnStart = source.indexOf("function handleRegisterSuccessConfirm()");
    var fnEnd = source.indexOf("\n  }\n", fnStart);
    var fnBody = source.slice(fnStart, fnEnd);

    expect(fnBody).toContain("setShowRegisterSuccessDialog(false);");
    expect(fnBody).toContain('navigation.navigate("Login");');
  });

  it("renders the single-button success AppDialog wired to the gated confirm handler", () => {
    var source = readSource();
    expect(source).toContain("visible={showRegisterSuccessDialog}");
    expect(source).toContain("onConfirm={handleRegisterSuccessConfirm}");
  });

  it("Register's own error handling (inline banners via getApiErrorMessage) is unchanged", () => {
    var source = readSource();
    expect(source).toContain(
      'var message = getApiErrorMessage(err, "שגיאה בהרשמה");',
    );
    expect(source).toContain(
      'var message = getApiErrorMessage(err, "שגיאה ביצירת בקשת חווה");',
    );
  });
});

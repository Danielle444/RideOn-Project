import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// ChangePasswordScreen.jsx cannot be imported/rendered under vitest
// (react-native deps) - same convention as every other
// *.contract.test.js screen test in this repo: read the source as text.

var SOURCE_PATH = path.resolve(__dirname, "ChangePasswordScreen.jsx");

function readSource() {
  return fs.readFileSync(SOURCE_PATH, "utf8").replace(/\r\n/g, "\n");
}

describe("ChangePasswordScreen - styled alert migration", () => {
  it("no longer imports or calls the native Alert", () => {
    var source = readSource();
    expect(source).not.toMatch(/\bAlert\b/);
  });

  it("imports showToast and AppDialog from the styled alert foundation", () => {
    var source = readSource();
    expect(source).toContain(
      'import { showToast } from "../../services/toastService";',
    );
    expect(source).toContain(
      'import AppDialog from "../../components/common/AppDialog";',
    );
  });

  it("validation and server failures show error toasts", () => {
    var source = readSource();
    expect(source).toContain('showToast(validationError, "error");');
    expect(source).toContain('showToast(result.message, "error");');
  });

  it("success sets dialog state instead of navigating inline - navigation is gated", () => {
    var source = readSource();
    var fnStart = source.indexOf("async function handleChangePassword()");
    var fnEnd = source.indexOf("function handleSuccessConfirm()");
    var fnBody = source.slice(fnStart, fnEnd);

    expect(fnBody).toContain("setShowSuccessDialog(true);");
    expect(fnBody).not.toContain("navigation.replace");
  });

  it("preserves the exact setTimeout(...,0) wrapper around the MobileEntryGate navigation", () => {
    var source = readSource();
    var fnStart = source.indexOf("function handleSuccessConfirm()");
    var fnEnd = source.indexOf("\n  }\n", fnStart);
    var fnBody = source.slice(fnStart, fnEnd);

    expect(fnBody).toContain("setShowSuccessDialog(false);");
    expect(fnBody).toContain("setTimeout(function () {");
    expect(fnBody).toContain('props.navigation.replace("MobileEntryGate");');
    expect(fnBody).toContain("}, 0);");
  });

  it("renders the single-button success AppDialog wired to the gated confirm handler", () => {
    var source = readSource();
    expect(source).toContain("visible={showSuccessDialog}");
    expect(source).toContain("onConfirm={handleSuccessConfirm}");
  });
});

// P0 fix (2026-08-08): validateForm() used to accept any 6-character new
// password, weaker than the 8-char/upper/lower/digit policy enforced at
// registration. It now delegates to the same shared validator registration
// uses, so mobile change-password can no longer be a weaker path than
// registration.
describe("ChangePasswordScreen - password policy", () => {
  it("imports getPasswordValidationMessage from the shared password validator", () => {
    var source = readSource();
    expect(source).toContain(
      'import { getPasswordValidationMessage } from "../../../../shared/auth/validations/passwordValidation";',
    );
  });

  it("validateForm calls the shared validator instead of a local length check", () => {
    var source = readSource();
    var fnStart = source.indexOf("function validateForm()");
    var fnEnd = source.indexOf("\n  }\n", fnStart);
    var fnBody = source.slice(fnStart, fnEnd);

    expect(fnBody).toContain("getPasswordValidationMessage(newPassword)");
  });

  it("no longer contains the old weaker 6-character inline rule", () => {
    var source = readSource();
    expect(source).not.toMatch(/newPassword\.length\s*<\s*6/);
    expect(source).not.toContain("לפחות 6 תווים");
  });

  it("still requires the current password before validating the new one", () => {
    var source = readSource();
    var fnStart = source.indexOf("function validateForm()");
    var fnEnd = source.indexOf("\n  }\n", fnStart);
    var fnBody = source.slice(fnStart, fnEnd);

    var currentRequiredAt = fnBody.indexOf('"יש להזין סיסמה נוכחית"');
    var policyCheckAt = fnBody.indexOf("getPasswordValidationMessage(newPassword)");

    expect(currentRequiredAt).toBeGreaterThan(-1);
    expect(policyCheckAt).toBeGreaterThan(-1);
    expect(currentRequiredAt).toBeLessThan(policyCheckAt);
  });

  it("still rejects a new password that does not match its confirmation", () => {
    var source = readSource();
    expect(source).toContain("newPassword !== confirmPassword");
    expect(source).toContain('"אימות הסיסמה אינו תואם"');
  });

  it("still rejects a new password identical to the current password", () => {
    var source = readSource();
    expect(source).toContain("newPassword === currentPassword");
    expect(source).toContain(
      '"הסיסמה החדשה חייבת להיות שונה מהסיסמה הנוכחית"',
    );
  });
});

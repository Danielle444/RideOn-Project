import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// LoginScreen.jsx pulls in react-native/@react-navigation, not safe to
// import/render under vitest - same convention as AppDialog.contract.test.js
// and every other *.contract.test.js screen test in this repo: read the
// source as text and assert on it.

var SOURCE_PATH = path.resolve(__dirname, "LoginScreen.jsx");

function readSource() {
  return fs.readFileSync(SOURCE_PATH, "utf8").replace(/\r\n/g, "\n");
}

describe("LoginScreen - styled alert migration", () => {
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

  it("client-side validation failure shows an error toast, not a blocking dialog", () => {
    var source = readSource();
    expect(source).toContain('showToast(validationError, "error");');
  });

  it("login failure shows an error toast with the server/auth message", () => {
    var source = readSource();
    expect(source).toContain('showToast(result.message, "error");');
  });

  it("forgot-password stub shows an info toast", () => {
    var source = readSource();
    expect(source).toContain('showToast("נחבר אחר כך", "info");');
  });

  it("none of the toasts gate navigation - handleLogin has no navigation call in its body", () => {
    var source = readSource();
    var fnStart = source.indexOf("async function handleLogin()");
    var fnEnd = source.indexOf("\n  }\n", fnStart);
    var fnBody = source.slice(fnStart, fnEnd);

    expect(fnBody).not.toContain("navigation.navigate");
    expect(fnBody).not.toContain("navigation.replace");
  });
});

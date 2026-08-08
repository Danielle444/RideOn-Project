import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// usePayerMyCompetitionAccount imports react-native/@react-navigation modules
// not safe to import under plain vitest, so this reads source text - same
// approach as every other *.contract.test.js file in this codebase.

var SOURCE_PATH = path.resolve(__dirname, "usePayerMyCompetitionAccount.js");

function readSource() {
  return fs.readFileSync(SOURCE_PATH, "utf8").replace(/\r\n/g, "\n");
}

function loadAccountBody(source) {
  var fnAt = source.indexOf("async function () {");
  expect(fnAt).toBeGreaterThan(-1);
  var fnEnd = source.indexOf("[competitionId, ranchId],", fnAt);
  return source.substring(fnAt, fnEnd);
}

describe("usePayerMyCompetitionAccount - load-error feedback (no native alert, no duplicate toast)", () => {
  it("no native Alert import or call remains", () => {
    var source = readSource();

    expect(source).not.toMatch(/\bAlert\b/);
  });

  it("does not import showToast - the persistent inline screenError card stays the sole feedback", () => {
    var source = readSource();

    expect(source).not.toMatch(/toastService/);
    expect(source).not.toContain("showToast(");
  });

  it("catch block still sets screenError from getApiErrorMessage and clears account, unchanged", () => {
    var source = readSource();
    var body = loadAccountBody(source);

    expect(body).toContain("setAccount(null);");
    expect(body).toContain(
      'var msg = getApiErrorMessage(error, "אירעה שגיאה בטעינת החשבון שלך");',
    );
    expect(body).toContain("setScreenError(msg);");
  });

  it("finally still clears loading, and screenError is cleared at the start of a fresh attempt", () => {
    var source = readSource();
    var body = loadAccountBody(source);

    expect(body).toContain('setScreenError("");');
    expect(source).toContain("setLoading(false);");
  });

  it("useFocusEffect still reloads the account on every focus - reload wiring untouched", () => {
    var source = readSource();

    expect(source).toContain("useFocusEffect(");
    expect(source).toContain("loadAccount();");
  });
});

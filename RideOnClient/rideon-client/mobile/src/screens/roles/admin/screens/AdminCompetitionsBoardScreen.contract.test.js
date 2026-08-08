import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// AdminCompetitionsBoardScreen imports react-native/context modules not safe
// to import under plain vitest, so this reads source text - same approach as
// every other *.contract.test.js file in this codebase.

var SOURCE_PATH = path.resolve(__dirname, "AdminCompetitionsBoardScreen.jsx");

function readSource() {
  return fs.readFileSync(SOURCE_PATH, "utf8").replace(/\r\n/g, "\n");
}

describe("AdminCompetitionsBoardScreen - load-error styled feedback", () => {
  it("imports showToast from the shared toast service", () => {
    var source = readSource();

    expect(source).toContain(
      'import { showToast } from "../../../../services/toastService";',
    );
  });

  it("loadCompetitions catch shows an error toast and clears the list, same as before", () => {
    var source = readSource();

    var fnAt = source.indexOf("async function loadCompetitions() {");
    expect(fnAt).toBeGreaterThan(-1);
    var fnEnd = source.indexOf("\n  }\n", fnAt);
    var fnBody = source.substring(fnAt, fnEnd);

    expect(fnBody).toContain(
      'showToast("אירעה שגיאה בטעינת התחרויות", "error");',
    );
    expect(fnBody).toContain("setCompetitions([]);");
  });

  it("no native Alert remains", () => {
    var source = readSource();

    expect(source).not.toMatch(/\bAlert\b/);
  });
});

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// This fix targets only the restored-session home-load call sites. It must
// not touch fresh login (its own deliberate 30s cold-start timeout), the
// auth interceptor's 401 handling, or the global axios timeout. Read as
// source text - same convention as every other *.contract.test.js file in
// this codebase, since these modules pull in AsyncStorage/react-native.

function readSource(relativePath) {
  return fs
    .readFileSync(path.resolve(__dirname, relativePath), "utf8")
    .replace(/\r\n/g, "\n");
}

describe("fresh login and the auth/axios layer are unaffected by the retry fix", () => {
  it("authService.js still budgets 30000ms for login, unchanged", () => {
    var source = readSource("../services/authService.js");

    expect(source).toContain("const LOGIN_TIMEOUT_MS = 30000;");
    expect(source).toContain("timeout: LOGIN_TIMEOUT_MS,");
    expect(source).not.toContain("transientRequestRetry");
  });

  it("axiosInstance.js still uses the plain 8000ms default and untouched 401 handling", () => {
    var source = readSource("../services/axiosInstance.js");

    expect(source).toContain("timeout: 8000,");
    expect(source).toContain('error.response.status === 401');
    expect(source).toContain("await clearAuthStorage();");
    expect(source).not.toContain("transientRequestRetry");
  });

  it("AuthContext.js's session-restore hydration logic is untouched by this fix", () => {
    var source = readSource("../context/AuthContext.js");

    expect(source).toContain("async function loadAuthState() {");
    expect(source).not.toContain("transientRequestRetry");
    expect(source).not.toContain("withTransientRetry");
  });
});

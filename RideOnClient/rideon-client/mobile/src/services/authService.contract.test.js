import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// P0 mobile-registration-OTP fix: adds sendOtp (POST /SystemUsers/send-otp),
// the mobile sibling of web's authService.js sendOtp wrapper. Same
// source-text-matching approach as the repo's other *.contract.test.js files
// (authService.js pulls in axiosInstance -> storageService -> AsyncStorage,
// which cannot be imported under vitest).

var SOURCE_PATH = path.resolve(__dirname, "authService.js");

function readSource() {
  return fs.readFileSync(SOURCE_PATH, "utf8").replace(/\r\n/g, "\n");
}

function getFunctionBlock(source, signature) {
  var start = source.indexOf(signature);
  var end = source.indexOf("\n}", start);

  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);

  return source.slice(start, end);
}

describe("authService - registration OTP contract", () => {
  it("sendOtp POSTs /SystemUsers/send-otp with a normalized email body", () => {
    var block = getFunctionBlock(readSource(), "function sendOtp(email) {");

    expect(block).toContain("`${API_BASE_URL}/SystemUsers/send-otp`");
    expect(block).toContain("email: normalizeIdentifier(email)");
  });

  it("exports sendOtp", () => {
    var source = readSource();
    var exportsStart = source.indexOf("export {");
    var exportsBlock = source.slice(exportsStart);

    expect(exportsBlock).toContain("sendOtp,");
  });

  it("register's existing endpoint/normalization is untouched by this addition", () => {
    var block = getFunctionBlock(readSource(), "function register(data) {");

    expect(block).toContain("`${API_BASE_URL}/SystemUsers/register`");
    expect(block).toContain("username: normalizeIdentifier(data.username)");
    expect(block).toContain("email: normalizeIdentifier(data.email)");
  });
});

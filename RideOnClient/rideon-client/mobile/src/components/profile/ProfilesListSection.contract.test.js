import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// ProfilesListSection.jsx cannot be imported/rendered under vitest
// (react-native deps) - same convention as every other
// *.contract.test.js file in this repo: read the source as text.

var SOURCE_PATH = path.resolve(__dirname, "ProfilesListSection.jsx");

function readSource() {
  return fs.readFileSync(SOURCE_PATH, "utf8").replace(/\r\n/g, "\n");
}

function getFunctionBody(source, signature) {
  var fnStart = source.indexOf(signature);
  var fnEnd = source.indexOf("\n  }\n", fnStart);
  return source.slice(fnStart, fnEnd);
}

describe("ProfilesListSection - Rejected role status display", () => {
  it("getStatusText: Pending still maps to 'ממתין', ahead of any fallback", () => {
    var body = getFunctionBody(readSource(), "function getStatusText(roleStatus) {");

    var pendingIndex = body.indexOf('if (normalized === "pending") {');
    expect(pendingIndex).toBeGreaterThan(-1);
    expect(body.slice(pendingIndex, pendingIndex + 60)).toContain('"ממתין"');
  });

  it("getStatusText: Rejected has its own explicit branch returning 'נדחה', not the raw-string fallback", () => {
    var body = getFunctionBody(readSource(), "function getStatusText(roleStatus) {");

    var rejectedIndex = body.indexOf('if (normalized === "rejected") {');
    var fallbackIndex = body.indexOf('return roleStatus || "לא ידוע";');

    expect(rejectedIndex).toBeGreaterThan(-1);
    expect(body.slice(rejectedIndex, rejectedIndex + 60)).toContain('"נדחה"');
    // The explicit branch must be checked before the generic fallback runs.
    expect(fallbackIndex).toBeGreaterThan(rejectedIndex);
  });

  it("getStatusText: Approved branch is untouched", () => {
    var body = getFunctionBody(readSource(), "function getStatusText(roleStatus) {");

    var approvedIndex = body.indexOf('if (normalized === "approved") {');
    expect(approvedIndex).toBeGreaterThan(-1);
    expect(body.slice(approvedIndex, approvedIndex + 60)).toContain('"מאושר"');
  });

  it("getPlatformText is unchanged by this fix: 'pending' still renders 'ממתין לאישור', 'mobile' still renders 'זמין במובייל'", () => {
    var body = getFunctionBody(readSource(), "function getPlatformText(platformType) {");

    expect(body).toContain('if (platformType === "pending") {');
    expect(body).toContain('return "ממתין לאישור";');
    expect(body).toContain('if (platformType === "mobile") {');
    expect(body).toContain('return "זמין במובייל";');
    // Every other platformType (including the "unsupported" value a
    // Rejected row now carries) falls through to this line - a Rejected
    // row must never reach the "pending" branch above to get here.
    expect(body).toContain('return "לא זמין במובייל";');
  });
});

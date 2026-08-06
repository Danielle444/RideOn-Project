import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// Phase 3C: pins the exact endpoint/method shape of the two new admin-direct
// entry service functions. entriesService.js imports axiosInstance.js, which
// pulls in AsyncStorage (react-native) via storageService - not safe under
// plain vitest - so this reads source text, same approach as the repo's
// other *.contract.test.js files.

var SOURCE_PATH = path.resolve(__dirname, "entriesService.js");

function readSource() {
  return fs.readFileSync(SOURCE_PATH, "utf8").replace(/\r\n/g, "\n");
}

describe("entriesService - Phase 3C admin-direct entry functions", () => {
  it("adminEditEntry POSTs the caller's payload unchanged to /Entries/admin-edit", () => {
    var source = readSource();
    var start = source.indexOf("function adminEditEntry(payload) {");
    var end = source.indexOf("}", start);

    expect(start).toBeGreaterThan(-1);

    var block = source.slice(start, end);
    expect(block).toContain('axios.post("/Entries/admin-edit", payload);');
  });

  it("adminCancelEntry DELETEs /Entries/admin-cancel/{entryId} with competitionId/ranchId as query params, no body", () => {
    var source = readSource();
    var start = source.indexOf(
      "function adminCancelEntry(entryId, competitionId, ranchId) {",
    );
    var end = source.indexOf("\n}", start);

    expect(start).toBeGreaterThan(-1);

    var block = source.slice(start, end);
    expect(block).toContain(
      'axios.delete("/Entries/admin-cancel/" + entryId, {',
    );
    expect(block).toContain("competitionId: competitionId,");
    expect(block).toContain("ranchId: ranchId,");
  });

  it("both new functions are exported", () => {
    var source = readSource();
    var exportsBlock = source.slice(source.indexOf("export {"));

    expect(exportsBlock).toContain("adminEditEntry,");
    expect(exportsBlock).toContain("adminCancelEntry,");
  });
});

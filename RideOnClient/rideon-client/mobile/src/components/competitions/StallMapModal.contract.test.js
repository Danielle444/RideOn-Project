import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// Ranch-model fix (Bug 2, 2026-08-06): StallMapModal is the admin surface a
// non-host RanchAdmin opens ("צפה במפת תאים") to view the competition's real
// physical stall map. It must forward competitionId into getCompounds so the
// server can resolve the venue (host) ranch instead of the caller's own
// active ranch -- ranchId keeps flowing into getCompounds/getAssignments
// exactly as before (it authorizes the caller and drives the "isMine"
// highlight), only the compounds call gains the extra argument. Same
// source-text-matching approach as the repo's other *.contract.test.js
// files (StallMapModal renders react-native primitives, unsafe to mount
// under plain vitest).

var SOURCE_PATH = path.resolve(__dirname, "StallMapModal.jsx");

function readSource() {
  return fs.readFileSync(SOURCE_PATH, "utf8").replace(/\r\n/g, "\n");
}

describe("StallMapModal host-ranch compounds wiring", () => {
  it("passes competitionId into getCompounds alongside ranchId", () => {
    var source = readSource();

    expect(source).toContain("getCompounds(ranchId, competitionId),");
  });

  it("still authorizes/highlights with ranchId, unchanged", () => {
    var source = readSource();

    expect(source).toContain("getAssignments(competitionId, ranchId),");
    expect(source).toContain("isMine: Number(brId) === Number(ranchId),");
  });

  it("both calls load together in the same Promise.all as before", () => {
    var source = readSource();
    var loadBlock = source
      .split("async function load() {")[1]
      .split("if (cancelled) return;")[0];

    expect(loadBlock).toContain("var results = await Promise.all([");
    expect(loadBlock).toContain("getCompounds(ranchId, competitionId),");
    expect(loadBlock).toContain("getAssignments(competitionId, ranchId),");
  });
});

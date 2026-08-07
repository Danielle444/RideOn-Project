import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// Ranch-model fix (Bug 2, 2026-08-06): getCompounds gains an optional
// competitionId param so the server can resolve the competition's real
// host/venue ranch for a non-host RanchAdmin, instead of being told to fetch
// compounds for the caller's own active ranch. Same source-text-matching
// approach as the repo's other *.contract.test.js files.

var SOURCE_PATH = path.resolve(__dirname, "stallMapService.js");

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

describe("stallMapService - getCompounds host-ranch contract", () => {
  it("accepts an optional competitionId as a second argument", () => {
    var source = readSource();

    expect(source).toContain("function getCompounds(ranchId, competitionId) {");
  });

  it("always sends ranchId (used server-side for authorization only)", () => {
    var block = getFunctionBlock(
      readSource(),
      "function getCompounds(ranchId, competitionId) {",
    );

    expect(block).toContain("ranchId: ranchId");
  });

  it("forwards competitionId as a query param only when supplied", () => {
    var block = getFunctionBlock(
      readSource(),
      "function getCompounds(ranchId, competitionId) {",
    );

    expect(block).toContain("if (competitionId != null)");
    expect(block).toContain("params.competitionId = competitionId;");
  });

  it("still gets /StallAssignments/compounds", () => {
    var block = getFunctionBlock(
      readSource(),
      "function getCompounds(ranchId, competitionId) {",
    );

    expect(block).toContain('apiClient.get("/StallAssignments/compounds"');
  });
});

describe("stallMapService - unrelated exports untouched by this fix", () => {
  it("getAssignedStallPrices and getStallMapPublishStatus still send only competitionId/ranchId (server resolves host ranch)", () => {
    var source = readSource();

    var pricesBlock = getFunctionBlock(
      source,
      "function getAssignedStallPrices(competitionId, ranchId) {",
    );
    expect(pricesBlock).toContain("competitionId: competitionId");
    expect(pricesBlock).toContain("ranchId: ranchId");

    var publishBlock = getFunctionBlock(
      source,
      "function getStallMapPublishStatus(competitionId, ranchId) {",
    );
    expect(publishBlock).toContain("competitionId: competitionId");
    expect(publishBlock).toContain("ranchId: ranchId");
  });
});

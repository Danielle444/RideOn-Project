import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// Admin-direct-stall-cancellation slice: adds adminCancelStallBooking
// (DELETE /StallBookings/admin-cancel/{stallBookingId}), the stall sibling of
// entriesService.js's adminCancelEntry. Same source-text-matching approach as
// the repo's other *.contract.test.js files.

var SOURCE_PATH = path.resolve(__dirname, "stallBookingsService.js");

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

describe("stallBookingsService - admin direct cancel contract", () => {
  it("adminCancelStallBooking DELETEs /StallBookings/admin-cancel/{stallBookingId} with ranchId as the only query param, no body, no competitionId", () => {
    var block = getFunctionBlock(
      readSource(),
      "function adminCancelStallBooking(stallBookingId, ranchId) {",
    );

    expect(block).toContain(
      'axios.delete("/StallBookings/admin-cancel/" + stallBookingId,',
    );
    expect(block).toContain("ranchId: ranchId,");
    expect(block).not.toContain("competitionId");
  });

  it("exports adminCancelStallBooking", () => {
    var source = readSource();
    var exportsStart = source.indexOf("export {");
    var exportsBlock = source.slice(exportsStart);

    expect(exportsBlock).toContain("adminCancelStallBooking,");
  });

  it("the old cancel-request path is untouched by this addition (out of scope)", () => {
    var source = readSource();

    expect(source).toContain(
      'axios.post("/StallBookings/cancel-request", payload);',
    );
  });
});

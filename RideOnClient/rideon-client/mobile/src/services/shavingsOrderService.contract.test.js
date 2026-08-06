import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// Standalone-shavings-cancellation slice: adds
// createShavingsOrderCancelRequest (POST /ShavingsOrders/cancel-request,
// Payer-gated) and adminCancelShavingsOrder (DELETE
// /ShavingsOrders/admin-cancel/{shavingsOrderId}, RanchAdmin-direct) -- the
// shavings siblings of stallBookingsService.js's
// createStallBookingCancelRequest / adminCancelStallBooking. Same
// source-text-matching approach as the repo's other *.contract.test.js files.

var SOURCE_PATH = path.resolve(__dirname, "shavingsOrderService.js");

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

describe("shavingsOrderService - standalone cancellation contract", () => {
  it("createShavingsOrderCancelRequest POSTs /ShavingsOrders/cancel-request with the payload object as-is", () => {
    var block = getFunctionBlock(
      readSource(),
      "function createShavingsOrderCancelRequest(payload) {",
    );

    expect(block).toContain(
      'axios.post("/ShavingsOrders/cancel-request", payload);',
    );
  });

  it("adminCancelShavingsOrder DELETEs /ShavingsOrders/admin-cancel/{shavingsOrderId} with ranchId as the only query param, no body", () => {
    var block = getFunctionBlock(
      readSource(),
      "function adminCancelShavingsOrder(shavingsOrderId, ranchId) {",
    );

    expect(block).toContain(
      'axios.delete("/ShavingsOrders/admin-cancel/" + shavingsOrderId,',
    );
    expect(block).toContain("ranchId: ranchId,");
  });

  it("exports both new functions", () => {
    var source = readSource();
    var exportsStart = source.indexOf("export {");
    var exportsBlock = source.slice(exportsStart);

    expect(exportsBlock).toContain("createShavingsOrderCancelRequest,");
    expect(exportsBlock).toContain("adminCancelShavingsOrder,");
  });

  it("the read-only listing/creation paths are untouched by this addition (out of scope)", () => {
    var source = readSource();

    expect(source).toContain(
      'axios.get("/ShavingsOrders/by-competition-and-ranch", {',
    );
    expect(source).toContain('axios.post("/ShavingsOrders", payload);');
  });
});

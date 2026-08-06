import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// WorkerCompetitionShavingsOrdersScreen imports react-native/expo-image-picker/supabase,
// not safe to import under plain vitest - same reason as every other *.contract.test.js
// file in this codebase (see WorkerHomeScreen.contract.test.js). This pins the shavings
// cancellation-lifecycle prop wiring against the source text instead of rendering it.

var SOURCE_PATH = path.resolve(__dirname, "WorkerCompetitionShavingsOrdersScreen.jsx");

function readSource() {
  return fs.readFileSync(SOURCE_PATH, "utf8").replace(/\r\n/g, "\n");
}

describe("WorkerCompetitionShavingsOrdersScreen - shavings cancellation lifecycle wiring", () => {
  it("passes isCancelled and hasPendingCancellation through to the shared order card", () => {
    var source = readSource();

    expect(source).toContain("isCancelled={order.isCancelled}");
    expect(source).toContain(
      "hasPendingCancellation={order.hasPendingCancellation}",
    );
  });

  it("passes the two cancellation fields inside renderOrderCard, on the same card instance", () => {
    var source = readSource();

    var renderFnAt = source.indexOf("function renderOrderCard(order) {");
    expect(renderFnAt).toBeGreaterThan(-1);

    var renderFnEnd = source.indexOf("function renderOrderSection", renderFnAt);
    expect(renderFnEnd).toBeGreaterThan(-1);

    var renderFnBody = source.substring(renderFnAt, renderFnEnd);

    expect(renderFnBody).toContain("isCancelled={order.isCancelled}");
    expect(renderFnBody).toContain(
      "hasPendingCancellation={order.hasPendingCancellation}",
    );
  });

  it("still buckets orders through bucketWorkerCompetitionOrders, unchanged", () => {
    var source = readSource();

    expect(source).toContain(
      "import { bucketWorkerCompetitionOrders } from \"../../../../utils/workerHomeShavingsFeed\";",
    );
    expect(source).toContain("bucketWorkerCompetitionOrders(orders, new Date())");
  });
});

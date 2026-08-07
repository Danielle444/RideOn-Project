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

  it("still buckets each status tab's own order subset through bucketWorkerCompetitionOrders", () => {
    var source = readSource();

    expect(source).toContain(
      "  bucketWorkerCompetitionOrders,\n  groupWorkerShavingsBoardOrders,\n} from \"../../../../utils/workerHomeShavingsFeed\";",
    );
    expect(source).toContain("bucketWorkerCompetitionOrders(tabOrders, new Date())");
  });
});

describe("WorkerCompetitionShavingsOrdersScreen - status tab wiring", () => {
  it("groups orders into the three status tabs via groupWorkerShavingsBoardOrders", () => {
    var source = readSource();

    expect(source).toContain(
      "return groupWorkerShavingsBoardOrders(orders, currentUserId);",
    );
  });

  it("defines exactly the three preferred-direction tabs with the correct Hebrew labels", () => {
    var source = readSource();

    expect(source).toContain(
      '{ key: "requiresAttention", label: "דורש טיפול" }',
    );
    // The middle tab is "בטיפול", never "בטיפול שלי" - it also contains a foreign worker's
    // claims (read-only), and "my care" would misdescribe that section. Not
    // "בטיפול שלי" anywhere in the tab label itself.
    expect(source).toContain('{ key: "inMyCare", label: "בטיפול" }');
    expect(source).not.toContain('{ key: "inMyCare", label: "בטיפול שלי" }');
    expect(source).toContain('{ key: "completed", label: "הושלם" }');
  });

  it("folds a foreign in-progress claim into the inMyCare tab's count, not a hidden fourth bucket", () => {
    var source = readSource();

    expect(source).toContain(
      "count: orderGroups.myCare.length + orderGroups.otherCare.length,",
    );
  });

  it("resets the active tab back to requiresAttention whenever a new competition is selected", () => {
    var source = readSource();

    var selectFnAt = source.indexOf("function handleSelectCompetition(competition) {");
    expect(selectFnAt).toBeGreaterThan(-1);

    var selectFnEnd = source.indexOf("}", selectFnAt);
    var selectFnBody = source.substring(selectFnAt, selectFnEnd);

    expect(selectFnBody).toContain('setActiveTab("requiresAttention");');
  });

  it("renders two explicitly labeled sub-sections inside the inMyCare tab - בטיפול שלי and בטיפול של עובד אחר", () => {
    var source = readSource();

    expect(source).toContain("<Text style={roleSharedStyles.sectionTitle}>בטיפול שלי</Text>");
    expect(source).toContain("בטיפול של עובד אחר");
    expect(source).not.toContain("בטיפול על ידי עובדים אחרים");
    expect(source).toContain("orderGroups.myCare.length > 0 && (");
    expect(source).toContain("orderGroups.otherCare.length > 0 && (");
  });

  it("forwards the delivery-destination fields to the card, same as the cancellation fields", () => {
    var source = readSource();

    var renderFnAt = source.indexOf("function renderOrderCard(order) {");
    var renderFnEnd = source.indexOf("function renderOrderSection", renderFnAt);
    var renderFnBody = source.substring(renderFnAt, renderFnEnd);

    expect(renderFnBody).toContain(
      "deliveryDestinations={order.deliveryDestinations}",
    );
    expect(renderFnBody).toContain(
      "hasUnassignedStalls={order.hasUnassignedStalls}",
    );
  });
});

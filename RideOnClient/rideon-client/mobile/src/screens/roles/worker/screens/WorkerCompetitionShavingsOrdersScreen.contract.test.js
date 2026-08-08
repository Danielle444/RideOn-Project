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

    var importAt = source.indexOf("} from \"../../../../utils/workerHomeShavingsFeed\";");
    expect(importAt).toBeGreaterThan(-1);
    var importBlockStart = source.lastIndexOf("import {", importAt);
    var importBlock = source.substring(importBlockStart, importAt);

    expect(importBlock).toContain("bucketWorkerCompetitionOrders");
    expect(importBlock).toContain("groupWorkerShavingsBoardOrders");
    expect(source).toContain("bucketWorkerCompetitionOrders(tabOrders, new Date())");
  });
});

describe("WorkerCompetitionShavingsOrdersScreen - status tab wiring", () => {
  it("groups orders into the base status groups via groupWorkerShavingsBoardOrders", () => {
    var source = readSource();

    expect(source).toContain(
      "return groupWorkerShavingsBoardOrders(orders, currentUserId);",
    );
  });

  it("defines exactly the four tabs, in order, with the correct Hebrew labels", () => {
    var source = readSource();

    expect(source).toContain(
      '{ key: "requiresAttention", label: "דורש טיפול" }',
    );
    // The middle tab is "בטיפול", never "בטיפול שלי" - it also contains a foreign worker's
    // claims (read-only), and "my care" would misdescribe that section. Not
    // "בטיפול שלי" anywhere in the tab label itself.
    expect(source).toContain('{ key: "inMyCare", label: "בטיפול" }');
    expect(source).not.toContain('{ key: "inMyCare", label: "בטיפול שלי" }');
    expect(source).toContain('{ key: "future", label: "הוזמנו להמשך" }');
    expect(source).toContain('{ key: "completed", label: "הושלם" }');

    // Order matters for the pill row: future sits between inMyCare and completed.
    var inMyCareAt = source.indexOf('{ key: "inMyCare"');
    var futureAt = source.indexOf('{ key: "future"');
    var completedAt = source.indexOf('{ key: "completed"');
    expect(inMyCareAt).toBeLessThan(futureAt);
    expect(futureAt).toBeLessThan(completedAt);
  });

  it("resets the active tab back to requiresAttention whenever a new competition is selected", () => {
    var source = readSource();

    var selectFnAt = source.indexOf("function handleSelectCompetition(competition) {");
    expect(selectFnAt).toBeGreaterThan(-1);

    var selectFnEnd = source.indexOf("}", selectFnAt);
    var selectFnBody = source.substring(selectFnAt, selectFnEnd);

    expect(selectFnBody).toContain('setActiveTab("requiresAttention");');
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

describe("WorkerCompetitionShavingsOrdersScreen - future-tab rescoping (הוזמנו להמשך)", () => {
  it("imports splitFutureDatedShavingsBoardOrders and isFutureDatedOrder from the shared feed util", () => {
    var source = readSource();

    expect(source).toContain("splitFutureDatedShavingsBoardOrders");
    expect(source).toContain("isFutureDatedOrder");
    expect(source).toContain(
      '} from "../../../../utils/workerHomeShavingsFeed";',
    );
  });

  it("derives dateSplitGroups from orderGroups via splitFutureDatedShavingsBoardOrders", () => {
    var source = readSource();

    expect(source).toContain(
      "return splitFutureDatedShavingsBoardOrders(orderGroups, new Date());",
    );
  });

  it("scopes the requiresAttention tab to dateSplitGroups (excludes future-dated orders)", () => {
    var source = readSource();

    expect(source).toContain(
      "count: dateSplitGroups.requiresAttention.length",
    );
    expect(source).toContain(
      "return renderDateSections(dateSplitGroups.requiresAttention);",
    );
    // The stale pre-fix source read orderGroups.requiresAttention directly for this tab.
    expect(source).not.toContain(
      "return renderDateSections(orderGroups.requiresAttention);",
    );
  });

  it("scopes the inMyCare tab to dateSplitGroups.myCare/otherCare (excludes future-dated orders)", () => {
    var source = readSource();

    expect(source).toContain(
      "count: dateSplitGroups.myCare.length + dateSplitGroups.otherCare.length,",
    );
    expect(source).toContain("{renderDateSections(dateSplitGroups.myCare)}");
    expect(source).toContain("{renderDateSections(dateSplitGroups.otherCare)}");
  });

  it("keeps the completed tab reading from orderGroups.completed directly, unscoped by date", () => {
    var source = readSource();

    // Locked business rule: a future-dated delivered/cancelled order still shows under
    // "הושלם" at any date - only the two actionable tabs above get date-rescoped.
    expect(source).toContain(
      "if (orderGroups.completed.length === 0) {",
    );
    expect(source).toContain(
      "return renderDateSections(orderGroups.completed);",
    );
  });

  it("renders the future tab's three sub-sections split by classification, mirroring inMyCare's own labels", () => {
    var source = readSource();

    expect(source).toContain('renderFutureSection("דורש טיפול", future.requiresAttention)');
    expect(source).toContain('renderFutureSection("בטיפול שלי", future.myCare)');
    expect(source).toContain(
      'renderFutureSection("בטיפול של עובד אחר", future.otherCare)',
    );
  });

  it("computes the future tab's count as the sum of its three sub-groups", () => {
    var source = readSource();

    expect(source).toContain("dateSplitGroups.future.requiresAttention.length +");
    expect(source).toContain("dateSplitGroups.future.myCare.length +");
    expect(source).toContain("dateSplitGroups.future.otherCare.length,");
  });

  it("still renders two explicitly labeled sub-sections inside the inMyCare tab - בטיפול שלי and בטיפול של עובד אחר", () => {
    var source = readSource();

    expect(source).toContain('<CollapsibleCareSection title="בטיפול שלי"');
    expect(source).toContain('title="בטיפול של עובד אחר"');
    expect(source).not.toContain("בטיפול על ידי עובדים אחרים");
    expect(source).toContain("dateSplitGroups.myCare.length > 0 && (");
    expect(source).toContain("dateSplitGroups.otherCare.length > 0 && (");
  });
});

describe("WorkerCompetitionShavingsOrdersScreen - inMyCare collapsible sections (בטיפול שלי / בטיפול של עובד אחר)", () => {
  it("defines a local CollapsibleCareSection component, not an import from a shared/component file", () => {
    var source = readSource();

    expect(source).toContain("function CollapsibleCareSection(props) {");
    expect(source).not.toContain("import CollapsibleCareSection");
  });

  it("tracks its own expanded state, defaulted from props.defaultExpanded, toggled by a Pressable press", () => {
    var source = readSource();

    var fnAt = source.indexOf("function CollapsibleCareSection(props) {");
    var fnEnd = source.indexOf("\n}\n", fnAt);
    var fnBody = source.substring(fnAt, fnEnd);

    expect(fnBody).toContain(
      "const [expanded, setExpanded] = useState(props.defaultExpanded);",
    );
    expect(fnBody).toContain("setExpanded(!expanded);");
    expect(fnBody).toContain("{expanded && props.children}");
  });

  it("renders בטיפול שלי EXPANDED by default and בטיפול של עובד אחר COLLAPSED by default", () => {
    var source = readSource();

    expect(source).toContain(
      '<CollapsibleCareSection title="בטיפול שלי" defaultExpanded={true}>',
    );
    var otherBlockAt = source.indexOf('title="בטיפול של עובד אחר"');
    expect(otherBlockAt).toBeGreaterThan(-1);
    var otherBlockEnd = source.indexOf(">", otherBlockAt);
    var otherOpenTag = source.substring(otherBlockAt, otherBlockEnd);
    expect(otherOpenTag).toContain("defaultExpanded={false}");
  });

  it("both sections still render their content through renderDateSections, unchanged by the collapse wrapper", () => {
    var source = readSource();

    var myCareAt = source.indexOf('<CollapsibleCareSection title="בטיפול שלי"');
    var otherCareAt = source.indexOf('title="בטיפול של עובד אחר"');
    var inMyCareBlock = source.substring(myCareAt, source.indexOf("</>", otherCareAt));

    expect(inMyCareBlock).toContain("{renderDateSections(dateSplitGroups.myCare)}");
    expect(inMyCareBlock).toContain("{renderDateSections(dateSplitGroups.otherCare)}");
  });
});

describe("WorkerCompetitionShavingsOrdersScreen - future-order action confirmation", () => {
  it("wraps onClaim, onCapturePhoto, and onMarkDelivered with confirmIfFutureDated", () => {
    var source = readSource();

    var renderFnAt = source.indexOf("function renderOrderCard(order) {");
    var renderFnEnd = source.indexOf("function renderOrderSection", renderFnAt);
    var renderFnBody = source.substring(renderFnAt, renderFnEnd);

    expect(renderFnBody).toContain("onCapturePhoto={confirmIfFutureDated(order, function () {");
    expect(renderFnBody).toContain("onClaim={confirmIfFutureDated(order, function () {");
    expect(renderFnBody).toContain("onMarkDelivered={confirmIfFutureDated(order, function () {");
  });

  it("runs the action immediately for a non-future order, with no confirmation dialog", () => {
    var source = readSource();

    var fnAt = source.indexOf("function confirmIfFutureDated(order, action) {");
    expect(fnAt).toBeGreaterThan(-1);
    var fnEnd = source.indexOf("\n  }\n", fnAt);
    var fnBody = source.substring(fnAt, fnEnd);

    expect(fnBody).toContain("if (!isFutureDatedOrder(order, new Date())) {");
    expect(fnBody).toContain("action();");
    expect(fnBody).toContain("return;");
  });

  it("shows a cancel/confirm Alert for a future-dated order, where cancel is a no-op and confirm runs the exact same action", () => {
    var source = readSource();

    var fnAt = source.indexOf("function confirmIfFutureDated(order, action) {");
    var fnEnd = source.indexOf("\n  }\n", fnAt);
    var fnBody = source.substring(fnAt, fnEnd);

    expect(fnBody).toContain(
      "Alert.alert(FUTURE_ORDER_CONFIRM_TITLE, FUTURE_ORDER_CONFIRM_MESSAGE, [",
    );
    expect(fnBody).toContain('{ text: "ביטול", style: "cancel" },');
    expect(fnBody).toContain('{ text: "המשך", onPress: action },');
  });
});

describe("WorkerCompetitionShavingsOrdersScreen - successful claim switches to the inMyCare tab", () => {
  function getClaimFnBody(source) {
    var fnAt = source.indexOf("async function handleClaimOrder(order) {");
    expect(fnAt).toBeGreaterThan(-1);
    var fnEnd = source.indexOf("\n  }\n", fnAt);
    return source.substring(fnAt, fnEnd);
  }

  it("sets activeTab to inMyCare only after a successful claim + reload, before the try block ends", () => {
    var source = readSource();
    var fnBody = getClaimFnBody(source);

    var tryAt = fnBody.indexOf("try {");
    var catchAt = fnBody.indexOf("} catch (err) {");
    expect(tryAt).toBeGreaterThan(-1);
    expect(catchAt).toBeGreaterThan(tryAt);

    var trySlice = fnBody.substring(tryAt, catchAt);
    expect(trySlice).toContain("await claimShavingsOrder(order.shavingsOrderId);");
    expect(trySlice).toContain("await loadOrders(selectedCompetition);");
    expect(trySlice).toContain('setActiveTab("inMyCare");');

    // The tab-switch must come after the reload, not before it - claiming a future-dated
    // order still switches tabs (no date/future special-case here), but only once the
    // freshly-claimed order is actually in `orders`.
    var reloadIndex = trySlice.indexOf("await loadOrders(selectedCompetition);");
    var switchIndex = trySlice.indexOf('setActiveTab("inMyCare");');
    expect(switchIndex).toBeGreaterThan(reloadIndex);
  });

  it("never sets activeTab to inMyCare inside the catch block - a failed claim must not switch tabs", () => {
    var source = readSource();
    var fnBody = getClaimFnBody(source);

    var catchAt = fnBody.indexOf("} catch (err) {");
    var financeAt = fnBody.indexOf("} finally {");
    expect(financeAt).toBeGreaterThan(catchAt);

    var catchSlice = fnBody.substring(catchAt, financeAt);
    expect(catchSlice).not.toContain('setActiveTab("inMyCare")');
    // Both the 409 branch and the generic-failure branch still reach this slice - confirms
    // the assertion above covers the whole catch, not just one branch.
    expect(catchSlice).toContain("err?.response?.status === 409");
    expect(catchSlice).toContain(
      'Alert.alert("שגיאה", getApiErrorMessage(err, "לא ניתן לקחת את ההזמנה לטיפול"));',
    );
  });
});

describe("WorkerCompetitionShavingsOrdersScreen - getApiErrorMessage notification normalization", () => {
  it("imports getApiErrorMessage from the shared auth-error helper", () => {
    var source = readSource();

    expect(source).toContain(
      'import { getApiErrorMessage } from "../../../../../../shared/auth/utils/authApiErrors";',
    );
  });

  it("routes every generic (non-409) shavings-action failure through getApiErrorMessage", () => {
    var source = readSource();

    expect(source).toContain(
      'Alert.alert("שגיאה", getApiErrorMessage(err, "לא ניתן לטעון את התחרויות"));',
    );
    expect(source).toContain(
      'Alert.alert("שגיאה", getApiErrorMessage(err, "לא ניתן לטעון את ההזמנות"));',
    );
    expect(source).toContain(
      'Alert.alert("שגיאה", getApiErrorMessage(err, "לא ניתן לקחת את ההזמנה לטיפול"));',
    );
    expect(source).toContain(
      'getApiErrorMessage(err, "ניתן לסמן את ההזמנה כסופקה גם ללא תמונה.")',
    );
    expect(source).toContain(
      'Alert.alert("שגיאה", getApiErrorMessage(err, "לא ניתן לסמן את ההזמנה כסופקה"));',
    );
  });

  it("preserves the two 409-specific business-copy alerts verbatim, untouched by the normalization", () => {
    var source = readSource();

    expect(source).toContain(
      'Alert.alert("לא ניתן", "ההזמנה כבר נלקחה לטיפול על ידי עובד אחר");',
    );
    expect(source).toContain('Alert.alert("לא ניתן", "ההזמנה כבר סופקה");');
  });

  it("preserves the two success alerts verbatim - no standardized success helper exists in this codebase", () => {
    var source = readSource();

    var successCount = source.split('Alert.alert("בוצע", "ההזמנה סופקה");').length - 1;
    expect(successCount).toBe(2);
  });
});

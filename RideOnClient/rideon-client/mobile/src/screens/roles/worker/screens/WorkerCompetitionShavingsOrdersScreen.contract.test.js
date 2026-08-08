import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { isFutureDatedOrder } from "../../../../utils/workerHomeShavingsFeed";

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

  it("stashes the pending action and opens the shared AppDialog for a future-dated order, instead of calling action() directly", () => {
    var source = readSource();

    var fnAt = source.indexOf("function confirmIfFutureDated(order, action) {");
    var fnEnd = source.indexOf("\n  }\n", fnAt);
    var fnBody = source.substring(fnAt, fnEnd);

    expect(fnBody).toContain(
      "setFutureConfirmState({ visible: true, pendingAction: action });",
    );

    // The immediate (non-future) branch above still returns before reaching this line -
    // opening the dialog and running the action immediately must stay mutually exclusive.
    var immediateBranchEnd = fnBody.indexOf(
      "setFutureConfirmState({ visible: true, pendingAction: action });",
    );
    var immediateBranch = fnBody.substring(0, immediateBranchEnd);
    expect(immediateBranch).toContain("action();");
    expect(immediateBranch).toContain("return;");
  });

  it("imports AppDialog from the shared common components", () => {
    var source = readSource();

    expect(source).toContain(
      'import AppDialog from "../../../../components/common/AppDialog";',
    );
  });

  it("renders one AppDialog for the future-order confirmation, with the title/message preserved verbatim and the same button labels as before", () => {
    var source = readSource();

    var dialogAt = source.indexOf("visible={futureConfirmState.visible}");
    expect(dialogAt).toBeGreaterThan(-1);
    var dialogBlockStart = source.lastIndexOf("<AppDialog", dialogAt);
    var dialogBlockEnd = source.indexOf("/>", dialogAt);
    var dialogBlock = source.substring(dialogBlockStart, dialogBlockEnd);

    expect(dialogBlock).toContain("title={FUTURE_ORDER_CONFIRM_TITLE}");
    expect(dialogBlock).toContain("message={FUTURE_ORDER_CONFIRM_MESSAGE}");
    expect(dialogBlock).toContain('confirmLabel="המשך"');
    expect(dialogBlock).toContain('cancelLabel="ביטול"');
    expect(dialogBlock).toContain("onConfirm={handleFutureConfirm}");
    expect(dialogBlock).toContain("onCancel={handleFutureCancel}");
  });

  it("handleFutureCancel closes the dialog and clears the pending action without ever invoking it", () => {
    var source = readSource();

    var fnAt = source.indexOf("function handleFutureCancel() {");
    expect(fnAt).toBeGreaterThan(-1);
    var fnEnd = source.indexOf("\n  }\n", fnAt);
    var fnBody = source.substring(fnAt, fnEnd);

    expect(fnBody).toContain(
      "setFutureConfirmState({ visible: false, pendingAction: null });",
    );
    expect(fnBody).not.toContain("pendingAction()");
  });

  it("handleFutureConfirm closes the dialog BEFORE invoking the pending action exactly once", () => {
    var source = readSource();

    var fnAt = source.indexOf("function handleFutureConfirm() {");
    expect(fnAt).toBeGreaterThan(-1);
    var fnEnd = source.indexOf("\n  }\n", fnAt);
    var fnBody = source.substring(fnAt, fnEnd);

    var closeIndex = fnBody.indexOf(
      "setFutureConfirmState({ visible: false, pendingAction: null });",
    );
    var invokeIndex = fnBody.indexOf("pendingAction();");
    expect(closeIndex).toBeGreaterThan(-1);
    expect(invokeIndex).toBeGreaterThan(closeIndex);

    // Guarded by "if (pendingAction)" so a stray confirm with no pending action never throws.
    expect(fnBody).toContain("if (pendingAction) {");

    // Exactly one call site invokes the pending action - never fires it twice per confirm.
    var invokeCount = fnBody.split("pendingAction();").length - 1;
    expect(invokeCount).toBe(1);
  });
});

describe("WorkerCompetitionShavingsOrdersScreen - camera permission denied (app-owned message, not the OS prompt)", () => {
  it("never calls the native Alert.alert for the permission-denied message", () => {
    var source = readSource();

    var fnAt = source.indexOf("async function handleCapturePhoto(order) {");
    expect(fnAt).toBeGreaterThan(-1);
    var permissionBlockEnd = source.indexOf(
      "const result = await ImagePicker.launchCameraAsync",
      fnAt,
    );
    var permissionBlock = source.substring(fnAt, permissionBlockEnd);

    expect(permissionBlock).not.toContain("Alert.alert");
    expect(permissionBlock).toContain("if (!permission.granted) {");
    expect(permissionBlock).toContain("setPermissionDialogVisible(true);");
    expect(permissionBlock).toContain("return;");
  });

  it("still calls the real requestCameraPermissionsAsync - the OS prompt itself is untouched", () => {
    var source = readSource();

    expect(source).toContain(
      "const permission = await ImagePicker.requestCameraPermissionsAsync();",
    );
  });

  it("renders a single-button AppDialog (no onCancel/cancelLabel) with the original title/message, acknowledgement-only", () => {
    var source = readSource();

    var dialogAt = source.indexOf("visible={permissionDialogVisible}");
    expect(dialogAt).toBeGreaterThan(-1);
    var dialogBlockStart = source.lastIndexOf("<AppDialog", dialogAt);
    var dialogBlockEnd = source.indexOf("/>", dialogAt);
    var dialogBlock = source.substring(dialogBlockStart, dialogBlockEnd);

    expect(dialogBlock).toContain('title="הרשאה נדרשת"');
    expect(dialogBlock).toContain('message="נא לאשר גישה למצלמה בהגדרות הטלפון"');
    expect(dialogBlock).not.toContain("onCancel");
    expect(dialogBlock).not.toContain("cancelLabel");
    expect(dialogBlock).toContain("onConfirm={function () {");
    expect(dialogBlock).toContain("setPermissionDialogVisible(false);");
  });
});

describe("WorkerCompetitionShavingsOrdersScreen - successful claim switches to the correct tab", () => {
  function getClaimFnBody(source) {
    var fnAt = source.indexOf("async function handleClaimOrder(order) {");
    expect(fnAt).toBeGreaterThan(-1);
    var fnEnd = source.indexOf("\n  }\n", fnAt);
    return source.substring(fnAt, fnEnd);
  }

  it("sets activeTab via the future-aware ternary only after a successful claim + reload, before the try block ends", () => {
    var source = readSource();
    var fnBody = getClaimFnBody(source);

    var tryAt = fnBody.indexOf("try {");
    var catchAt = fnBody.indexOf("} catch (err) {");
    expect(tryAt).toBeGreaterThan(-1);
    expect(catchAt).toBeGreaterThan(tryAt);

    var trySlice = fnBody.substring(tryAt, catchAt);
    expect(trySlice).toContain("await claimShavingsOrder(order.shavingsOrderId);");
    expect(trySlice).toContain("await loadOrders(selectedCompetition);");
    // A future-dated order is pulled out of "inMyCare" into "future" by
    // splitFutureDatedShavingsBoardOrders regardless of who claimed it (see
    // workerHomeShavingsFeed.js), so the tab we switch to after a claim must match - an
    // unconditional setActiveTab("inMyCare") would land on a tab that never renders a
    // future-dated claim.
    expect(trySlice).toContain(
      'setActiveTab(isFutureDatedOrder(order, new Date()) ? "future" : "inMyCare");',
    );

    // The tab-switch must come after the reload, not before it - only once the freshly-claimed
    // order is actually in `orders` does its classification (and this ternary) mean anything.
    var reloadIndex = trySlice.indexOf("await loadOrders(selectedCompetition);");
    var switchIndex = trySlice.indexOf("setActiveTab(isFutureDatedOrder(");
    expect(switchIndex).toBeGreaterThan(reloadIndex);
  });

  it("never calls setActiveTab inside the catch block - a failed claim must not switch tabs", () => {
    var source = readSource();
    var fnBody = getClaimFnBody(source);

    var catchAt = fnBody.indexOf("} catch (err) {");
    var financeAt = fnBody.indexOf("} finally {");
    expect(financeAt).toBeGreaterThan(catchAt);

    var catchSlice = fnBody.substring(catchAt, financeAt);
    expect(catchSlice).not.toContain("setActiveTab(");
    // Both the 409 branch and the generic-failure branch still reach this slice - confirms
    // the assertion above covers the whole catch, not just one branch.
    expect(catchSlice).toContain("err?.response?.status === 409");
    expect(catchSlice).toContain(
      'showToast(getApiErrorMessage(err, "לא ניתן לקחת את ההזמנה לטיפול"), "error");',
    );
  });

  // Regression coverage for the bug this ternary fixes: setActiveTab("inMyCare") was
  // unconditional, but splitFutureDatedShavingsBoardOrders always moves a future-dated claim
  // into the "future" bucket - so switching to "inMyCare" for a future-dated claim landed on a
  // tab whose content never included the order the worker just claimed. This exercises the
  // REAL isFutureDatedOrder used by the ternary above (not a re-implementation), proving the
  // exact expression resolves to the tab that will actually display the claimed order.
  it("resolves to the future tab for a future-dated claim, and inMyCare for a today/past claim", () => {
    var now = new Date(2026, 0, 15, 12, 0, 0);

    function resolveClaimTab(order) {
      return isFutureDatedOrder(order, now) ? "future" : "inMyCare";
    }

    var futureOrder = { requestedDeliveryTime: "2026-01-20T09:00:00" };
    var todayOrder = { requestedDeliveryTime: "2026-01-15T09:00:00" };
    var pastOrder = { requestedDeliveryTime: "2026-01-10T09:00:00" };

    expect(resolveClaimTab(futureOrder)).toBe("future");
    expect(resolveClaimTab(todayOrder)).toBe("inMyCare");
    expect(resolveClaimTab(pastOrder)).toBe("inMyCare");
  });
});

describe("WorkerCompetitionShavingsOrdersScreen - \"חזור לבחירת תחרות\" returns to the canonical board", () => {
  function getBackButtonHandlerBody(source) {
    var labelAt = source.indexOf('"< חזור לבחירת תחרות"');
    expect(labelAt).toBeGreaterThan(-1);

    var pressableAt = source.lastIndexOf("<Pressable", labelAt);
    expect(pressableAt).toBeGreaterThan(-1);

    var onPressAt = source.indexOf("onPress={async function () {", pressableAt);
    expect(onPressAt).toBeGreaterThan(-1);
    expect(onPressAt).toBeLessThan(labelAt);

    var onPressEnd = source.indexOf("}}", onPressAt);
    return source.substring(onPressAt, onPressEnd);
  }

  it("imports useCompetition from CompetitionContext", () => {
    var source = readSource();

    expect(source).toContain(
      'import { useCompetition } from "../../../../context/CompetitionContext";',
    );
    expect(source).toContain("const competitionContext = useCompetition();");
  });

  it("clears the active competition via the existing CompetitionContext API, not a re-implementation", () => {
    var source = readSource();
    var handlerBody = getBackButtonHandlerBody(source);

    expect(handlerBody).toContain("await competitionContext.clearCompetition();");
  });

  it("navigates to WorkerCompetitionsBoard - it does not merely reset local state and stay on this route", () => {
    var source = readSource();
    var handlerBody = getBackButtonHandlerBody(source);

    expect(handlerBody).toContain(
      'props.navigation.navigate("WorkerCompetitionsBoard");',
    );
  });

  it("still resets the screen-local selectedCompetition/orders, as defensive cleanup for this mounted-but-blurred stack screen", () => {
    var source = readSource();
    var handlerBody = getBackButtonHandlerBody(source);

    expect(handlerBody).toContain("setSelectedCompetition(null);");
    expect(handlerBody).toContain("setOrders([]);");
  });

  it("clears context and navigates BEFORE the local reset, so this screen never re-renders its {selectedCompetition && (...)} content as empty while still the focused top-of-stack screen", () => {
    var source = readSource();
    var handlerBody = getBackButtonHandlerBody(source);

    // Order matters: setSelectedCompetition(null) flipping this screen's own
    // {selectedCompetition && (...)} guard to empty while it's still the visible focused screen
    // is exactly what produced the reported flash. Deferring the local reset until after
    // navigate() has been dispatched means the re-render lands on a screen that is no longer the
    // visible top of the stack (see WorkerCompetitionsBoardScreen's exitCompetitionMenu for the
    // same reset pattern, used there without this ordering constraint since it never renders
    // that same branch).
    var clearIndex = handlerBody.indexOf("await competitionContext.clearCompetition();");
    var navigateIndex = handlerBody.indexOf(
      'props.navigation.navigate("WorkerCompetitionsBoard");',
    );
    var resetIndex = handlerBody.indexOf("setSelectedCompetition(null);");
    expect(clearIndex).toBeLessThan(navigateIndex);
    expect(navigateIndex).toBeLessThan(resetIndex);
  });
});

describe("WorkerCompetitionShavingsOrdersScreen - embedded competition picker removed", () => {
  it("no longer renders the picker's prompt/empty copy or per-competition status label", () => {
    var source = readSource();

    expect(source).not.toContain("בחר תחרות להצגת הזמנות");
    expect(source).not.toContain("לא נמצאו תחרויות");
    expect(source).not.toContain("getCompetitionStatusLabel");
  });

  it("no longer fetches the Worker competitions board for its own internal picker", () => {
    var source = readSource();

    expect(source).not.toContain("getMobileWorkerCompetitionsBoard");
    expect(source).not.toContain("loadCompetitions");
  });

  it("no longer declares competitions/loadingCompetitions state - no stale loadingCompetitions references remain", () => {
    var source = readSource();

    expect(source).not.toContain("[competitions, setCompetitions]");
    expect(source).not.toContain("loadingCompetitions");
  });

  it("passes only loadingOrders as the screen's loading prop, not the old combined flag", () => {
    var source = readSource();

    expect(source).toContain("loading={loadingOrders}");
    expect(source).not.toContain("loading={loadingCompetitions || loadingOrders}");
  });

  it("gates the shavings content on selectedCompetition alone, with no picker fallback branch", () => {
    var source = readSource();

    expect(source).toContain("{selectedCompetition && (");
    expect(source).not.toContain("{!selectedCompetition ? (");
  });
});

describe("WorkerCompetitionShavingsOrdersScreen - route-param hydration and missing-competitionId redirect", () => {
  function getHydrationEffectBody(source) {
    var marker = "// Route-param hydration runs once on mount only.";
    var effectAt = source.indexOf(marker);
    expect(effectAt).toBeGreaterThan(-1);

    var effectEnd = source.indexOf("}, []);", effectAt);
    expect(effectEnd).toBeGreaterThan(-1);

    return source.substring(effectAt, effectEnd);
  }

  it("hydrates selectedCompetition via handleSelectCompetition when a competitionId route param is present - the valid-path entry still reaches the shavings workflow", () => {
    var source = readSource();
    var effectBody = getHydrationEffectBody(source);

    expect(effectBody).toContain("const pid = props.route?.params?.competitionId;");
    expect(effectBody).toContain("if (pid) {");
    expect(effectBody).toContain("handleSelectCompetition({");
    expect(effectBody).toContain("competitionId: pid,");
  });

  it("redirects to WorkerCompetitionsBoard when no competitionId route param is present", () => {
    var source = readSource();
    var effectBody = getHydrationEffectBody(source);

    expect(effectBody).toContain("} else {");
    expect(effectBody).toContain(
      'props.navigation.navigate("WorkerCompetitionsBoard");',
    );

    // The redirect must live in the else branch of the same if(pid), not a second unconditional
    // call - otherwise every valid entry would also bounce through the board.
    var ifIndex = effectBody.indexOf("if (pid) {");
    var elseIndex = effectBody.indexOf("} else {");
    var redirectIndex = effectBody.indexOf(
      'props.navigation.navigate("WorkerCompetitionsBoard");',
    );
    expect(ifIndex).toBeLessThan(elseIndex);
    expect(elseIndex).toBeLessThan(redirectIndex);
  });

  it("runs the hydration/redirect effect once on mount only - empty dependency array, no render-loop risk", () => {
    var source = readSource();
    var marker = "// Route-param hydration runs once on mount only.";
    var effectAt = source.indexOf(marker);
    var closeAt = source.indexOf("}, []);", effectAt);
    expect(closeAt).toBeGreaterThan(effectAt);

    // Exactly one empty-deps effect exists in the whole file - the old ranch-keyed effect
    // (which used to fetch the picker's competitions list on [activeRole?.ranchId]) is gone.
    var allEmptyDepsEffects = source.split("}, []);").length - 1;
    expect(allEmptyDepsEffects).toBe(1);
    expect(source).not.toContain("[activeRole?.ranchId]");
  });
});

describe("WorkerCompetitionShavingsOrdersScreen - getApiErrorMessage notification normalization", () => {
  it("imports getApiErrorMessage from the shared auth-error helper", () => {
    var source = readSource();

    expect(source).toContain(
      'import { getApiErrorMessage } from "../../../../../../shared/auth/utils/authApiErrors";',
    );
  });

  it("routes every generic (non-409) shavings-action failure through getApiErrorMessage, as an error-type toast", () => {
    var source = readSource();

    expect(source).toContain(
      'showToast(getApiErrorMessage(err, "לא ניתן לטעון את ההזמנות"), "error");',
    );
    expect(source).toContain(
      'showToast(getApiErrorMessage(err, "לא ניתן לקחת את ההזמנה לטיפול"), "error");',
    );
    expect(source).toContain(
      'getApiErrorMessage(err, "ניתן לסמן את ההזמנה כסופקה גם ללא תמונה.")',
    );
    expect(source).toContain(
      'showToast(getApiErrorMessage(err, "לא ניתן לסמן את ההזמנה כסופקה"), "error");',
    );
  });

  it("preserves the two 409-specific business-copy toasts verbatim, untouched by the normalization - now warning-type, since nothing broke", () => {
    var source = readSource();

    expect(source).toContain(
      'showToast("ההזמנה כבר נלקחה לטיפול על ידי עובד אחר", "warning");',
    );
    expect(source).toContain('showToast("ההזמנה כבר סופקה", "warning");');
  });

  it("preserves the two success toasts verbatim - no standardized success helper exists in this codebase", () => {
    var source = readSource();

    var successCount = source.split('showToast("ההזמנה סופקה", "success");').length - 1;
    expect(successCount).toBe(2);
  });

  it("the upload-failure toast keeps its distinct title framing folded into the message, not silently dropped like the generic \"שגיאה\" titles elsewhere", () => {
    var source = readSource();

    expect(source).toContain(
      '"העלאת התמונה נכשלה: " +\n          getApiErrorMessage(err, "ניתן לסמן את ההזמנה כסופקה גם ללא תמונה."),',
    );
  });

  it("the upload-failure catch still sets photoFailedOrderId, preserving the existing in-card no-photo recovery control - the toast migration must not touch this", () => {
    var source = readSource();

    var fnAt = source.indexOf("async function handleCapturePhoto(order) {");
    expect(fnAt).toBeGreaterThan(-1);
    var catchAt = source.indexOf("} catch (err) {", fnAt);
    var catchEnd = source.indexOf("} finally {", catchAt);
    var catchBody = source.substring(catchAt, catchEnd);

    expect(catchBody).toContain("setPhotoFailedOrderId(order.shavingsOrderId);");
    // The toast fires after the recovery flag is set, and does not itself carry the
    // recovery action - showNoPhotoFallback on the card is what surfaces it.
    var flagIndex = catchBody.indexOf("setPhotoFailedOrderId(order.shavingsOrderId);");
    var toastIndex = catchBody.indexOf("showToast(");
    expect(toastIndex).toBeGreaterThan(flagIndex);
  });

  it("showNoPhotoFallback on the rendered card is still driven by photoFailedOrderId, unchanged by the toast migration", () => {
    var source = readSource();

    expect(source).toContain(
      "showNoPhotoFallback={photoFailedOrderId === order.shavingsOrderId}",
    );
  });
});

describe("WorkerCompetitionShavingsOrdersScreen - no native Alert.alert remains", () => {
  it("does not import Alert from react-native", () => {
    var source = readSource();

    var reactNativeImportAt = source.indexOf('from "react-native";');
    var reactNativeImportStart = source.lastIndexOf("import {", reactNativeImportAt);
    var reactNativeImportBlock = source.substring(
      reactNativeImportStart,
      reactNativeImportAt,
    );
    expect(reactNativeImportBlock).not.toContain("Alert");
  });

  it("never calls Alert.alert anywhere in the file", () => {
    var source = readSource();

    expect(source).not.toContain("Alert.alert");
  });

  it("imports showToast from the shared toast service", () => {
    var source = readSource();

    expect(source).toContain(
      'import { showToast } from "../../../../services/toastService";',
    );
  });
});

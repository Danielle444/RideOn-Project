import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// SH-1: source-text contract test. ShavingsHistoryModal.jsx imports react-native
// (Modal/Pressable/ScrollView/Text/View) at module scope, which is not safe to
// import under plain vitest - same constraint documented in
// useAdminCompetitionStallsOverview.contract.test.js. The underlying resolver's
// actual precedence math (own isCancelled wins, etc.) is unit-tested directly in
// payerAccountLifecycle.test.js and re-verified against the hook's exact reduce
// predicate in useAdminCompetitionStallsOverview.contract.test.js; this file only
// proves the modal's status-display functions are wired to check lifecycleState.

var SOURCE_PATH = path.resolve(__dirname, "ShavingsHistoryModal.jsx");

function readSource() {
  return fs.readFileSync(SOURCE_PATH, "utf8");
}

function getFunctionBlock(source, startMarker, endMarker) {
  return source.split(startMarker)[1].split(endMarker)[0];
}

describe("ShavingsHistoryModal status display (SH-1)", () => {
  it("imports LIFECYCLE_STATE from the shared payer-account lifecycle resolver", () => {
    var source = readSource();

    expect(source).toContain(
      'import { LIFECYCLE_STATE } from "../../utils/payerAccountLifecycle";',
    );
  });

  it("getStatusText renders 'בוטל' for a terminally cancelled order, before checking deliveryStatus", () => {
    var source = readSource();
    var block = getFunctionBlock(
      source,
      "function getStatusText(order) {",
      "function getStatusBadgeStyle(order) {",
    );

    expect(block).toMatch(
      /order\.lifecycleState === LIFECYCLE_STATE\.CANCELLED\)\s*\{\s*return "בוטל";/,
    );
  });

  it("getStatusText renders 'ממתין לביטול' for a pending cancellation", () => {
    var source = readSource();
    var block = getFunctionBlock(
      source,
      "function getStatusText(order) {",
      "function getStatusBadgeStyle(order) {",
    );

    expect(block).toMatch(
      /order\.lifecycleState === LIFECYCLE_STATE\.PENDING_CANCELLATION\)\s*\{\s*return "ממתין לביטול";/,
    );
  });

  it("getStatusText preserves the existing Pending/Delivered/normal-state branches", () => {
    var source = readSource();
    var block = getFunctionBlock(
      source,
      "function getStatusText(order) {",
      "function getStatusBadgeStyle(order) {",
    );

    expect(block).toContain('return "ממתין";');
    expect(block).toContain('return "נמסר";');
    expect(block).toContain('return "בטיפול";');
  });

  it("getStatusBadgeStyle maps cancelled/pending-cancellation to the existing danger/warning styles", () => {
    var source = readSource();
    var block = getFunctionBlock(
      source,
      "function getStatusBadgeStyle(order) {",
      "export default function ShavingsHistoryModal(props) {",
    );

    expect(block).toMatch(
      /order\.lifecycleState === LIFECYCLE_STATE\.CANCELLED\)\s*\{\s*return styles\.historyStatusDanger;/,
    );
    expect(block).toMatch(
      /order\.lifecycleState === LIFECYCLE_STATE\.PENDING_CANCELLATION\)\s*\{\s*return styles\.historyStatusWarning;/,
    );
  });

  it("both status helpers are called with the whole order, not order.deliveryStatus", () => {
    var source = readSource();

    expect(source).toContain("getStatusBadgeStyle(order)");
    expect(source).toContain("getStatusText(order)");
    expect(source).not.toContain("getStatusBadgeStyle(order.deliveryStatus)");
    expect(source).not.toContain("getStatusText(order.deliveryStatus)");
  });
});

describe("ShavingsHistoryModal summary total (SH-2 consistency)", () => {
  it("excludes a terminally cancelled order's amount from the modal's own total", () => {
    var source = readSource();
    var block = getFunctionBlock(
      source,
      "var summary = useMemo(",
      "[orders],\n  );",
    );

    expect(block).toMatch(
      /order\.lifecycleState === LIFECYCLE_STATE\.CANCELLED/,
    );
    expect(block).toMatch(
      /isTerminallyCancelled \? 0 : getOrderAmount\(order\)/,
    );
  });

  it("does not filter the bag count by lifecycle state (historical count stays unfiltered)", () => {
    var source = readSource();
    var block = getFunctionBlock(
      source,
      "var summary = useMemo(",
      "[orders],\n  );",
    );
    var totalBagsLine = block
      .split("totalBags:")[1]
      .split("totalAmount:")[0];

    expect(totalBagsLine).toContain(
      "acc.totalBags + Number(order.bagQuantityPerStall || 0)",
    );
    expect(totalBagsLine).not.toContain("lifecycleState");
  });
});

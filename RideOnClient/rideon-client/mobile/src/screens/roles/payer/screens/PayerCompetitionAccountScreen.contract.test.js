import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// The screen imports react-native/context modules not safe to import under
// plain vitest, so this reads source text - same approach as
// AdminCompetitionPayerAccountScreen.contract.test.js and every other
// *.contract.test.js file in this codebase.

var SOURCE_PATH = path.resolve(__dirname, "PayerCompetitionAccountScreen.jsx");

function readSource() {
  return fs.readFileSync(SOURCE_PATH, "utf8").replace(/\r\n/g, "\n");
}

describe("PayerCompetitionAccountScreen - CAP-4 shavings tab", () => {
  it("exposes a נסורת tab button alongside the existing four", () => {
    var source = readSource();

    expect(source).toContain('{renderTabButton("shavings", "נסורת")}');
  });

  it("dispatches activeTab === \"shavings\" to renderShavingsTab", () => {
    var source = readSource();

    expect(source).toContain(
      'if (activeTab === "shavings") return renderShavingsTab();',
    );
  });

  it("bands account.shavings via the shared groupAndBandShavingsByStall utility, keyed off account.shavings and account.stalls", () => {
    var source = readSource();

    expect(source).toContain(
      'import { groupAndBandShavingsByStall } from "../../../../utils/payerAccountShavingsGrouping";',
    );
    expect(source).toContain(
      "return groupAndBandShavingsByStall(account.shavings, account.stalls);",
    );
    expect(source).toContain("[account.shavings, account.stalls]");
  });

  it("renders all four bands - active/pending/cancelled via getLifecycleBandHeader, needsReview via SHAVINGS_NEEDS_REVIEW_COPY.bandHeader - never a fifth guessed band", () => {
    var source = readSource();

    expect(source).toContain(
      'import {\n  getLifecycleBandHeader,\n  SHAVINGS_NEEDS_REVIEW_COPY,\n} from "../../../../utils/payerAccountCopy";',
    );
    expect(source).toContain("header: getLifecycleBandHeader(LIFECYCLE_STATE.ACTIVE),");
    expect(source).toContain("header: getLifecycleBandHeader(LIFECYCLE_STATE.PENDING_CHANGE),");
    expect(source).toContain("header: getLifecycleBandHeader(LIFECYCLE_STATE.CANCELLED),");
    expect(source).toContain("header: SHAVINGS_NEEDS_REVIEW_COPY.bandHeader,");
  });

  it("renders each band's groups through the shared ShavingsGroupCard component, keyed by group.key", () => {
    var source = readSource();

    expect(source).toContain(
      'import ShavingsGroupCard from "../../../../components/payerAccount/ShavingsGroupCard";',
    );
    expect(source).toContain("<ShavingsGroupCard");
    expect(source).toContain("key={group.key}");
    expect(source).toContain("group={group}");
  });

  it("standalone shavings cancellation (payer-gated): the cancel action is wired only on the active section, via confirmCancelShavings and the shared cancellingId", () => {
    var source = readSource();

    expect(source).toContain('var isActiveSection = section.key === "active";');
    expect(source).toContain(
      "onCancelOrder={isActiveSection ? confirmCancelShavings : undefined}",
    );
    expect(source).toContain(
      "cancellingId={isActiveSection ? cancellingId : undefined}",
    );
  });

  it("shows a dedicated empty state when account.shavings is empty, distinct from the stalls-tab empty state", () => {
    var source = readSource();

    expect(source).toContain(
      'return renderEmpty("אין לך הזמנות נסורת בתחרות זו");',
    );
  });

  it("the nested per-stall shavings lines inside the stalls tab are untouched by this slice", () => {
    var source = readSource();

    expect(source).toContain("var shavingsOrders = sortShavingsOrders(item.shavingsOrders);");
    expect(source).toContain("נסורת לתא זה:");
  });
});

function countOccurrences(haystack, needle) {
  var count = 0;
  var index = 0;

  while ((index = haystack.indexOf(needle, index)) !== -1) {
    count++;
    index += needle.length;
  }

  return count;
}

function getFunctionBlock(source, signature, nextSignature) {
  var start = source.indexOf(signature);
  var end = source.indexOf(nextSignature, start);

  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);

  return source.slice(start, end);
}

describe("PayerCompetitionAccountScreen - terminal class-entry cancellation lock", () => {
  it("imports resolveClassLifecycleState alongside LIFECYCLE_STATE", () => {
    var source = readSource();

    expect(source).toContain(
      'import {\n  LIFECYCLE_STATE,\n  resolveClassLifecycleState,\n} from "../../../../utils/payerAccountLifecycle";',
    );
  });

  it("renderClassCard's isLocked uses the shared lifecycle resolver, not the dead isCancelled/hasPendingCancellation fields or a lowercase literal compare", () => {
    var source = readSource();
    var block = getFunctionBlock(
      source,
      "function renderClassCard(item) {",
      "var lockedLabel",
    );

    expect(block).toContain(
      "resolveClassLifecycleState(item) === LIFECYCLE_STATE.CANCELLED",
    );
    expect(block).not.toContain("item.hasPendingCancellation");
    expect(block).not.toContain("item.isCancelled");
    expect(block).not.toContain('.toLowerCase() === "cancelled"');
  });

  it("isLocked still locks a paid entry regardless of lifecycle state", () => {
    var source = readSource();
    var block = getFunctionBlock(
      source,
      "function renderClassCard(item) {",
      "var lockedLabel",
    );

    expect(block).toContain("item.isPaid === true");
  });
});

describe("PayerCompetitionAccountScreen - independent in-flight guards for account mutations", () => {
  it("declares a separate guard ref per action namespace (entry/paidTime/stall/stallChange), each lazily initialized", () => {
    var source = readSource();

    ["entryCancelGuardRef", "paidTimeCancelGuardRef", "stallCancelGuardRef", "stallChangeGuardRef"].forEach(
      function (refName) {
        expect(source).not.toContain("useRef(createInFlightGuard())");
        expect(source).toContain("var " + refName + " = useRef(null);");
        expect(source).toContain(
          "if (" + refName + ".current === null) {\n    " +
            refName +
            ".current = createInFlightGuard();\n  }",
        );
      },
    );
  });

  function getDoBlock(source, signature, nextSignature) {
    return getFunctionBlock(source, signature, nextSignature);
  }

  it("doStallChangeRequest acquires stallChangeGuardRef before setCancellingId and the service call, and releases it in finally", () => {
    var source = readSource();
    var block = getDoBlock(
      source,
      "async function doStallChangeRequest(dates) {",
      "function confirmCancelEntry(item) {",
    );

    var guardCheckIndex = block.indexOf(
      "if (!stallChangeGuardRef.current.tryAcquire(guardKey)) {",
    );
    var returnIndex = block.indexOf("return;", guardCheckIndex);
    var setCancellingIdIndex = block.indexOf("setCancellingId(guardKey);");
    var serviceCallIndex = block.indexOf(
      "await createStallChangeRequestByPayer(",
    );

    expect(block).toContain('var guardKey = "stall-change:" + item.stallBookingId;');
    expect(guardCheckIndex).toBeGreaterThan(-1);
    expect(returnIndex).toBeGreaterThan(guardCheckIndex);
    expect(returnIndex).toBeLessThan(setCancellingIdIndex);
    expect(setCancellingIdIndex).toBeLessThan(serviceCallIndex);

    var finallyIndex = block.lastIndexOf("} finally {");
    var finallyBlock = block.slice(finallyIndex);
    expect(finallyBlock).toContain("setCancellingId(null);");
    expect(finallyBlock).toContain("stallChangeGuardRef.current.release(guardKey);");
  });

  it("doCancelEntry acquires entryCancelGuardRef before setCancellingId and the service call, and releases it in finally", () => {
    var source = readSource();
    var block = getDoBlock(
      source,
      "async function doCancelEntry(item) {",
      "function confirmCancelPaidTime(item) {",
    );

    var guardCheckIndex = block.indexOf(
      "if (!entryCancelGuardRef.current.tryAcquire(guardKey)) {",
    );
    var returnIndex = block.indexOf("return;", guardCheckIndex);
    var setCancellingIdIndex = block.indexOf("setCancellingId(guardKey);");
    var serviceCallIndex = block.indexOf("await cancelEntryByPayer(");

    expect(block).toContain('var guardKey = "entry:" + item.entryId;');
    expect(guardCheckIndex).toBeGreaterThan(-1);
    expect(returnIndex).toBeGreaterThan(guardCheckIndex);
    expect(returnIndex).toBeLessThan(setCancellingIdIndex);
    expect(setCancellingIdIndex).toBeLessThan(serviceCallIndex);

    var finallyIndex = block.lastIndexOf("} finally {");
    var finallyBlock = block.slice(finallyIndex);
    expect(finallyBlock).toContain("setCancellingId(null);");
    expect(finallyBlock).toContain("entryCancelGuardRef.current.release(guardKey);");
  });

  it("doCancelPaidTime acquires paidTimeCancelGuardRef before setCancellingId and the service call, and releases it in finally", () => {
    var source = readSource();
    var block = getDoBlock(
      source,
      "async function doCancelPaidTime(item) {",
      "function confirmCancelStall(item) {",
    );

    var guardCheckIndex = block.indexOf(
      "if (!paidTimeCancelGuardRef.current.tryAcquire(guardKey)) {",
    );
    var returnIndex = block.indexOf("return;", guardCheckIndex);
    var setCancellingIdIndex = block.indexOf("setCancellingId(guardKey);");
    var serviceCallIndex = block.indexOf("await cancelPaidTimeRequestByPayer(");

    expect(block).toContain('var guardKey = "paidTime:" + item.paidTimeRequestId;');
    expect(guardCheckIndex).toBeGreaterThan(-1);
    expect(returnIndex).toBeGreaterThan(guardCheckIndex);
    expect(returnIndex).toBeLessThan(setCancellingIdIndex);
    expect(setCancellingIdIndex).toBeLessThan(serviceCallIndex);

    var finallyIndex = block.lastIndexOf("} finally {");
    var finallyBlock = block.slice(finallyIndex);
    expect(finallyBlock).toContain("setCancellingId(null);");
    expect(finallyBlock).toContain("paidTimeCancelGuardRef.current.release(guardKey);");
  });

  it("doCancelStall acquires stallCancelGuardRef before setCancellingId and the service call, and releases it in finally", () => {
    var source = readSource();
    var block = getDoBlock(
      source,
      "async function doCancelStall(item) {",
      "function confirmCancelShavings(order) {",
    );

    var guardCheckIndex = block.indexOf(
      "if (!stallCancelGuardRef.current.tryAcquire(guardKey)) {",
    );
    var returnIndex = block.indexOf("return;", guardCheckIndex);
    var setCancellingIdIndex = block.indexOf("setCancellingId(guardKey);");
    var serviceCallIndex = block.indexOf("await cancelStallBookingByPayer(");

    expect(block).toContain('var guardKey = "stall:" + item.stallBookingId;');
    expect(guardCheckIndex).toBeGreaterThan(-1);
    expect(returnIndex).toBeGreaterThan(guardCheckIndex);
    expect(returnIndex).toBeLessThan(setCancellingIdIndex);
    expect(setCancellingIdIndex).toBeLessThan(serviceCallIndex);

    var finallyIndex = block.lastIndexOf("} finally {");
    var finallyBlock = block.slice(finallyIndex);
    expect(finallyBlock).toContain("setCancellingId(null);");
    expect(finallyBlock).toContain("stallCancelGuardRef.current.release(guardKey);");
  });

  it("each guardKey matches the string previously (and still) used as the cancellingId busy-state key, so visible busy copy is unchanged", () => {
    var source = readSource();

    expect(source).toContain('setCancellingId(guardKey);');
    // All five guarded actions (the four newly guarded here, plus the
    // pre-existing doCancelShavings) now assign setCancellingId the same
    // guardKey they acquire the guard with - not a hardcoded prefix string
    // re-typed separately (which could silently drift from the key the
    // guard was acquired under).
    expect(countOccurrences(source, "setCancellingId(guardKey);")).toBe(5);
  });

  it("the pre-existing standalone shavings guard (doCancelShavings/shavingsCancelGuardRef) is untouched by this change", () => {
    var source = readSource();
    var block = getDoBlock(
      source,
      "async function doCancelShavings(order) {",
      "function renderCancelButton(",
    );

    expect(source).toContain("var shavingsCancelGuardRef = useRef(null);");
    expect(block).toContain('var guardKey = "shavings:" + order.shavingsOrderId;');
    expect(block).toContain(
      "if (!shavingsCancelGuardRef.current.tryAcquire(guardKey)) {",
    );
    expect(block).toContain("shavingsCancelGuardRef.current.release(guardKey);");
  });
});

describe("PayerCompetitionAccountScreen - mobile stall-map slice 1 entry point (corrected, blocker 2)", () => {
  it("imports the shared StallMapModal and the publish-status read (never the removed orphaned screen)", () => {
    var source = readSource();

    expect(source).toContain(
      'import StallMapModal from "../../../../components/competitions/StallMapModal";',
    );
    expect(source).toContain(
      'import { getStallMapPublishStatus } from "../../../../services/stallMapService";',
    );
    expect(source).not.toContain("StallMapScreen");
  });

  it("gates the entry point strictly on stallMapPublished === true (hidden while unknown/loading/false)", () => {
    var source = readSource();
    var block = getFunctionBlock(
      source,
      "function renderStallMapEntryPoint() {",
      "function renderStallsTab() {",
    );

    expect(block).toContain("if (stallMapPublished !== true) {");
    expect(block).toContain("return null;");
  });

  it("fetches publish status via getStallMapPublishStatus keyed on competitionId/ranchId, defaulting to not-published on any failure", () => {
    var source = readSource();
    var block = getFunctionBlock(
      source,
      "useEffect(\n    function () {\n      var cancelled = false;\n\n      if (!competitionId || !ranchId) {",
      "var bandedClasses = useMemo(",
    );

    expect(block).toContain("getStallMapPublishStatus(competitionId, ranchId)");
    expect(block).toContain(
      "setStallMapPublished(!!(data && (data.isPublished ?? data.IsPublished)));",
    );
    expect(block).toContain(".catch(function () {");
    expect(block).toContain("if (!cancelled) setStallMapPublished(null);");
  });

  it("never derives myStallBookingIds - blocker 2's redacted payer-map endpoint computes IsMine server-side now", () => {
    var source = readSource();

    expect(source).not.toContain("myStallBookingIds");
  });

  it("renders the entry point both when stalls is empty and when it has rows", () => {
    var source = readSource();
    var block = getFunctionBlock(
      source,
      "function renderStallsTab() {",
      "function renderShavingsTab() {",
    );

    expect(block).toContain("var mapEntryPoint = renderStallMapEntryPoint();");
    expect(countOccurrences(block, "{mapEntryPoint}")).toBe(2);
  });

  it("mounts one StallMapModal wired to isStallMapOpen, competitionId, ranchId, and viewerMode=\"payer\"", () => {
    var source = readSource();

    expect(source).toContain("<StallMapModal");
    expect(source).toContain("isOpen={isStallMapOpen}");
    expect(source).toContain("competitionId={competitionId}");
    expect(source).toContain("ranchId={ranchId}");
    expect(source).toContain('viewerMode="payer"');
    expect(source).toContain("setIsStallMapOpen(false);");
  });
});

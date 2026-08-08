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

describe("PayerCompetitionAccountScreen - styled alert migration (AppDialog/AppToast)", () => {
  it("no native Alert remains - not imported from react-native, not called anywhere", () => {
    var source = readSource();

    expect(source).not.toContain("Alert.alert");
    expect(source).not.toMatch(/from ["']react-native["'][\s\S]{0,300}\bAlert\b/);
  });

  it("imports AppDialog and showToast from the styled-alert foundation (PR #363)", () => {
    var source = readSource();

    expect(source).toContain(
      'import AppDialog from "../../../../components/common/AppDialog";',
    );
    expect(source).toContain(
      'import { showToast } from "../../../../services/toastService";',
    );
  });

  it("renders exactly one AppDialog, driven by a single shared confirmDialog state slot", () => {
    var source = readSource();

    expect(countOccurrences(source, "<AppDialog")).toBe(1);
    expect(source).toContain(
      "var [confirmDialog, setConfirmDialog] = useState(null);",
    );
    expect(source).toContain("visible={!!confirmDialog}");
  });

  it("AppDialog's isBusy reflects cancellingId (existing UI state) without touching the in-flight guards", () => {
    var source = readSource();

    expect(source).toContain(
      "isBusy={!!confirmDialog && cancellingId === confirmDialog.key}",
    );
  });

  it("AppDialog's onCancel is wired only to closeConfirmDialog, which is a pure state-clear - cancel can never reach a service call or a guard", () => {
    var source = readSource();

    expect(source).toContain("onCancel={closeConfirmDialog}");

    var fnStart = source.indexOf("function closeConfirmDialog() {");
    var fnBody = source.slice(fnStart, source.indexOf("\n  }\n", fnStart));

    expect(fnBody).toContain("setConfirmDialog(null);");
    [
      "cancelEntryByPayer",
      "cancelPaidTimeRequestByPayer",
      "cancelStallBookingByPayer",
      "createShavingsOrderCancelRequest",
      "GuardRef",
    ].forEach(function (fragment) {
      expect(fnBody).not.toContain(fragment);
    });
  });

  it("AppDialog's onConfirm handler only ever invokes the stored confirmDialog.onConfirm callback, never a do* mutation directly", () => {
    var source = readSource();
    var dialogStart = source.indexOf("<AppDialog");
    var dialogEnd = source.indexOf("/>", dialogStart);
    var dialogBlock = source.slice(dialogStart, dialogEnd);

    expect(dialogBlock).toContain("confirmDialog.onConfirm();");
    [
      "doCancelEntry(",
      "doCancelPaidTime(",
      "doCancelStall(",
      "doCancelShavings(",
    ].forEach(function (fragment) {
      expect(dialogBlock).not.toContain(fragment);
    });
  });

  [
    {
      confirmFn: "confirmCancelEntry",
      doFn: "doCancelEntry",
      key: '"entry:" + item.entryId',
      title: '"ביטול הרשמה"',
      message: '"האם לשלוח בקשת ביטול למזכירה? יתבצע רק לאחר אישור."',
    },
    {
      confirmFn: "confirmCancelPaidTime",
      doFn: "doCancelPaidTime",
      key: '"paidTime:" + item.paidTimeRequestId',
      title: '"ביטול פייד טיים"',
      message: '"האם לבטל? ניתן לבטל רק עד 24 שעות לפני המועד."',
    },
    {
      confirmFn: "confirmCancelStall",
      doFn: "doCancelStall",
      key: '"stall:" + item.stallBookingId',
      title: '"ביטול תא"',
      message: '"האם לשלוח בקשת ביטול תא למזכירה? יתבצע רק לאחר אישור."',
    },
    {
      confirmFn: "confirmCancelShavings",
      doFn: "doCancelShavings",
      key: '"shavings:" + order.shavingsOrderId',
      title: '"ביטול הזמנת נסורת"',
      message:
        '"האם לשלוח בקשת ביטול להזמנת הנסורת למזכירה? הביטול יתבצע רק לאחר אישור."',
    },
  ].forEach(function (c) {
    it(
      c.confirmFn +
        " gates " +
        c.doFn +
        " behind an AppDialog confirmation - the mutation is only reachable from inside onConfirm, never called eagerly, and the exact prior wording/labels are preserved",
      () => {
        var source = readSource();
        var block = getFunctionBlock(
          source,
          "function " + c.confirmFn + "(",
          "async function " + c.doFn + "(",
        );

        expect(block).toContain("setConfirmDialog({");
        expect(block).toContain("key: " + c.key + ",");
        expect(block).toContain("title: " + c.title + ",");
        expect(block).toContain(c.message);
        expect(block).toContain("destructive: true,");
        expect(block).toContain('confirmLabel: "כן",');
        expect(block).toContain('cancelLabel: "לא",');

        var onConfirmIndex = block.indexOf("onConfirm: function () {");
        var doCallIndex = block.indexOf(c.doFn + "(", onConfirmIndex);

        expect(onConfirmIndex).toBeGreaterThan(-1);
        expect(doCallIndex).toBeGreaterThan(onConfirmIndex);

        // the mutation name appears exactly once in this block (inside
        // onConfirm) - proving confirmCancelX itself never fires it
        expect(countOccurrences(block, c.doFn + "(")).toBe(1);
      },
    );
  });

  [
    { doFn: "doCancelEntry", nextSignature: "function confirmCancelPaidTime(item) {" },
    { doFn: "doCancelPaidTime", nextSignature: "function confirmCancelStall(item) {" },
    { doFn: "doCancelStall", nextSignature: "function confirmCancelShavings(order) {" },
    { doFn: "doCancelShavings", nextSignature: "function renderCancelButton(" },
  ].forEach(function (c) {
    it(
      c.doFn +
        " closes the confirmation dialog on both the success and the error path, right where the outcome becomes known - success/error feedback is the styled AppToast, not the native Alert",
      () => {
        var source = readSource();
        var block = getFunctionBlock(
          source,
          "async function " + c.doFn + "(",
          c.nextSignature,
        );

        var tryIndex = block.indexOf("try {");
        var catchIndex = block.indexOf("} catch (err) {");
        var finallyIndex = block.lastIndexOf("} finally {");

        var tryBlock = block.slice(tryIndex, catchIndex);
        var catchBlock = block.slice(catchIndex, finallyIndex);

        expect(tryBlock).toContain("closeConfirmDialog();");
        expect(tryBlock).toContain('showToast(');
        expect(tryBlock).toContain('"success"');
        expect(tryBlock.indexOf("closeConfirmDialog();")).toBeLessThan(
          tryBlock.indexOf("showToast("),
        );

        expect(catchBlock).toContain("closeConfirmDialog();");
        expect(catchBlock).toContain("showToast(extractErrorMessage(err), \"error\");");
        expect(catchBlock.indexOf("closeConfirmDialog();")).toBeLessThan(
          catchBlock.indexOf("showToast("),
        );

        // guard release / cancellingId cleanup stays in finally, untouched
        // by the dialog-close change (same assertion style as the
        // "independent in-flight guards" suite above)
        var finallyBlock = block.slice(finallyIndex);
        expect(finallyBlock).toContain("setCancellingId(null);");
        expect(finallyBlock).toContain("GuardRef.current.release(guardKey);");
      },
    );
  });

  it("savePaidTimeEdit and doStallChangeRequest (non-destructive success/error notices) use showToast, not AppDialog", () => {
    var source = readSource();

    var editBlock = getFunctionBlock(
      source,
      "async function savePaidTimeEdit() {",
      "function confirmStallChangeRequest(item) {",
    );
    expect(editBlock).toContain('showToast("ההערות עודכנו", "success");');
    expect(editBlock).toContain(
      'showToast(extractErrorMessage(err), "error");',
    );
    expect(editBlock).not.toContain("setConfirmDialog");

    var stallChangeBlock = getFunctionBlock(
      source,
      "async function doStallChangeRequest(dates) {",
      "function confirmCancelEntry(item) {",
    );
    expect(stallChangeBlock).toContain(
      'showToast("בקשת שינוי התא נשלחה למזכירה", "success");',
    );
    expect(stallChangeBlock).toContain(
      'showToast(extractErrorMessage(err), "error");',
    );
    expect(stallChangeBlock).not.toContain("setConfirmDialog");
  });

  it("every success/error notice routes through showToast with the correct type - exactly 12 calls (the 4 destructive confirmations became AppDialog instead)", () => {
    var source = readSource();

    expect(countOccurrences(source, "showToast(")).toBe(12);
    expect(countOccurrences(source, 'showToast(extractErrorMessage(err), "error");')).toBe(6);
    expect(countOccurrences(source, ', "success");')).toBe(6);
  });

  it("preserves the exact prior pending-request and 24h paid-time wording, unchanged by the migration", () => {
    var source = readSource();

    [
      "האם לבטל? ניתן לבטל רק עד 24 שעות לפני המועד.",
      "ניתן לבטל עד 24 שעות לפני מועד הפייד טיים",
      "בקשת הביטול נשלחה למזכירה",
      "בקשת שינוי התא נשלחה למזכירה",
      "האם לשלוח בקשת ביטול להזמנת הנסורת למזכירה? הביטול יתבצע רק לאחר אישור.",
      "הבקשה בוטלה",
    ].forEach(function (fragment) {
      expect(source).toContain(fragment);
    });
  });

  it("extractErrorMessage (the hardened, shared error extractor) still backs every error toast - server error messages are preserved verbatim", () => {
    var source = readSource();

    expect(source).toContain(
      'import { getApiErrorMessage } from "../../../../../../shared/auth/utils/authApiErrors";',
    );
    expect(source).toContain(
      'return getApiErrorMessage(err, "אירעה שגיאה");',
    );
    // "extractErrorMessage(err)," (trailing comma) only matches call sites,
    // not the "function extractErrorMessage(err) {" declaration itself
    expect(countOccurrences(source, "extractErrorMessage(err),")).toBe(6);
  });
});

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// Phase 3C: rewires this screen's entry edit/cancel actions onto the
// existing admin-direct endpoints (POST /Entries/admin-edit via the shared
// CompetitionEntryCreateModal, DELETE /Entries/admin-cancel/{entryId} via
// doCancelEntry below). The screen imports react-native/context modules not
// safe to import under plain vitest, so this reads source text - same
// approach as the repo's other *.contract.test.js files.

var SOURCE_PATH = path.resolve(__dirname, "AdminCompetitionPayerAccountScreen.jsx");

function readSource() {
  return fs.readFileSync(SOURCE_PATH, "utf8").replace(/\r\n/g, "\n");
}

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

function getDoCancelEntryBlock(source) {
  return getFunctionBlock(
    source,
    "async function doCancelEntry(item) {",
    "function confirmCancelPaidTime(item) {",
  );
}

// The mutation itself: setCancellingId(busy), the API call, and its own
// try/catch/finally. Ends right after the finally block closes.
function getMutationStepBlock(doCancelEntryBlock) {
  var finallyOpenIndex = doCancelEntryBlock.indexOf("} finally {");
  expect(finallyOpenIndex).toBeGreaterThan(-1);

  var finallyBodyStart = finallyOpenIndex + "} finally {".length;
  var finallyCloseIndex = doCancelEntryBlock.indexOf("}", finallyBodyStart);

  expect(finallyCloseIndex).toBeGreaterThan(finallyBodyStart);

  return doCancelEntryBlock.slice(0, finallyCloseIndex + 1);
}

// Everything after the mutation's try/catch/finally: copy selection, the
// success alert, and the separate refresh step.
function getPostMutationBlock(doCancelEntryBlock) {
  var mutationBlock = getMutationStepBlock(doCancelEntryBlock);

  return doCancelEntryBlock.slice(mutationBlock.length);
}

function getRefreshStepBlock(doCancelEntryBlock) {
  var start = doCancelEntryBlock.indexOf("try {\n      await account.reload();");

  expect(start).toBeGreaterThan(-1);

  return doCancelEntryBlock.slice(start);
}

function getEditModalInstance(source) {
  var start = source.indexOf("<CompetitionEntryCreateModal\n        visible={!!editEntryItem}");
  var end = source.indexOf("/>", start);

  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);

  return source.slice(start, end);
}

function getCreateModalInstance(source) {
  var start = source.indexOf("<CompetitionEntryCreateModal\n        visible={showEntryCreateModal}");
  var end = source.indexOf("/>", start);

  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);

  return source.slice(start, end);
}

describe("AdminCompetitionPayerAccountScreen - Phase 3C direct admin edit/cancel", () => {
  it("no longer imports createChangeEntryRequest - the old request-based path is gone from this screen", () => {
    expect(readSource()).not.toContain("createChangeEntryRequest");
  });

  it("imports adminCancelEntry from entriesService", () => {
    expect(readSource()).toContain(
      'import { adminCancelEntry } from "../../../../services/entriesService";',
    );
  });

  it("doCancelEntry calls adminCancelEntry(entryId, competitionId, ranchId) directly, not a ChangeEntryRequest", () => {
    var block = getDoCancelEntryBlock(readSource());

    expect(block).toContain("await adminCancelEntry(\n        item.entryId,");
    expect(block).toContain("activeCompetition?.competitionId,");
    expect(block).toContain("activeRole?.ranchId,");
    expect(block).not.toContain("createChangeEntryRequest");
    expect(block).not.toContain("isCancelled");
    expect(block).not.toContain("originalEntryId");
  });

  it("confirmCancelEntry's dialog no longer promises a secretary-bound request", () => {
    var source = readSource();
    var block = getFunctionBlock(
      source,
      "function confirmCancelEntry(item) {",
      "async function doCancelEntry(item) {",
    );

    expect(block).toContain('"האם לבטל את ההרשמה?"');
    expect(block).not.toContain("האם לשלוח בקשת ביטול למזכירה");
  });

  it("the edit-mode modal instance opts into useDirectAdminEdit; the create-mode instance does not", () => {
    var source = readSource();

    var editInstance = getEditModalInstance(source);
    var createInstance = getCreateModalInstance(source);

    expect(editInstance).toContain("useDirectAdminEdit={true}");
    expect(createInstance).not.toContain("useDirectAdminEdit");
  });

  it("cancellingId busy-state still disables both actions during any in-flight cancel (duplicate-submit guard, pre-existing and unchanged)", () => {
    var source = readSource();

    expect(source).toContain('var isBusy = cancellingId === idKey;');
    expect(source).toContain("disabled={isBusy}");
  });

  it("stall and paid-time cancellation flows are untouched by this change (out of scope)", () => {
    var source = readSource();

    expect(source).toContain(
      'import { cancelPaidTimeRequest } from "../../../../services/paidTimeRequestsService";',
    );
    expect(source).toContain(
      'import { createStallBookingCancelRequest } from "../../../../services/stallBookingsService";',
    );

    var paidTimeBlock = getFunctionBlock(
      source,
      "async function doCancelPaidTime(item) {",
      "function confirmCancelStall(item) {",
    );
    expect(paidTimeBlock).toContain('Alert.alert("בוטל", "הבקשה בוטלה");');

    var stallBlock = getFunctionBlock(
      source,
      "async function doCancelStall(item) {",
      "function renderActions(",
    );
    expect(stallBlock).toContain(
      'Alert.alert("נשלח", "בקשת הביטול נשלחה למזכירה");',
    );
  });

  describe("copy-selection boundary (Blocker 2)", () => {
    it("no local cancel-copy helper remains - payerAccountCopy.js is the single source of truth", () => {
      var source = readSource();

      expect(source).not.toContain("getDirectCancelSuccessCopy");
      expect(source).not.toContain("ההרשמה בוטלה בהצלחה");
    });

    it("imports DIRECT_CANCELLATION_COPY from payerAccountCopy.js", () => {
      var source = readSource();

      expect(source).toContain(
        'import {\n  getLifecycleBandHeader,\n  DIRECT_CANCELLATION_COPY,\n} from "../../../../utils/payerAccountCopy";',
      );
    });

    it("doCancelEntry's success alert uses the SPEC title and DIRECT_CANCELLATION_COPY.text, never the send-to-secretary wording", () => {
      var block = getDoCancelEntryBlock(readSource());

      expect(block).toContain('Alert.alert("בוטל", DIRECT_CANCELLATION_COPY.text);');
      expect(block).not.toContain("נשלח למזכירה");
    });
  });

  describe("mutation success is decoupled from refresh (Blocker 1)", () => {
    it("doCancelEntry's mutation try/catch/finally never awaits account.reload() - refresh is strictly a separate step", () => {
      var doCancelEntryBlock = getDoCancelEntryBlock(readSource());
      var mutationStep = getMutationStepBlock(doCancelEntryBlock);

      expect(mutationStep).not.toContain("account.reload");
    });

    it("on mutation failure: shows the mapped error alert, returns before any success/refresh code, cancellingId still resets via finally", () => {
      var doCancelEntryBlock = getDoCancelEntryBlock(readSource());

      var catchStart = doCancelEntryBlock.indexOf("} catch (err) {");
      var finallyStart = doCancelEntryBlock.indexOf("} finally {", catchStart);
      var catchBlock = doCancelEntryBlock.slice(catchStart, finallyStart);

      expect(catchBlock).toContain(
        'Alert.alert("שגיאה", extractErrorMessage(err));',
      );
      expect(catchBlock).toContain("return;");
      expect(catchBlock).not.toContain("DIRECT_CANCELLATION_COPY");
      expect(catchBlock).not.toContain("account.reload");

      expect(doCancelEntryBlock).toContain("setCancellingId(null);");
    });

    it("cancellingId resets in the mutation's own finally - not deferred until after refresh", () => {
      var doCancelEntryBlock = getDoCancelEntryBlock(readSource());
      var mutationStep = getMutationStepBlock(doCancelEntryBlock);

      expect(mutationStep).toContain("setCancellingId(null);");
      expect(
        countOccurrences(doCancelEntryBlock, "setCancellingId(null);"),
      ).toBe(1);
    });

    it("the success alert happens strictly after the mutation's finally settles, before refresh starts", () => {
      var doCancelEntryBlock = getDoCancelEntryBlock(readSource());

      var finallyIndex = doCancelEntryBlock.indexOf("} finally {");
      var alertIndex = doCancelEntryBlock.indexOf(
        'Alert.alert("בוטל", DIRECT_CANCELLATION_COPY.text);',
      );
      var refreshIndex = doCancelEntryBlock.indexOf(
        "await account.reload();",
      );

      expect(alertIndex).toBeGreaterThan(finallyIndex);
      expect(refreshIndex).toBeGreaterThan(alertIndex);
    });

    it("the success alert is NOT inside the refresh's try/catch - it already ran before refresh starts", () => {
      var doCancelEntryBlock = getDoCancelEntryBlock(readSource());
      var refreshBlock = getRefreshStepBlock(doCancelEntryBlock);

      expect(refreshBlock).not.toContain("DIRECT_CANCELLATION_COPY");
    });

    it("refresh (account.reload) runs in its own try/catch, isolated from the mutation's error handling", () => {
      var doCancelEntryBlock = getDoCancelEntryBlock(readSource());
      var refreshBlock = getRefreshStepBlock(doCancelEntryBlock);

      expect(refreshBlock).toContain("try {");
      expect(refreshBlock).toContain("await account.reload();");
      expect(refreshBlock).toContain("} catch (refreshError) {");
      // Not swallowed silently - logged, matching the codebase's existing
      // console.log-on-catch convention (see loadAccount itself).
      expect(refreshBlock).toContain(
        'console.log("CANCEL ENTRY REFRESH ERROR", refreshError);',
      );
    });

    it("a refresh failure cannot be reported as a cancel failure - the refresh catch never shows the mutation's error alert and never re-throws", () => {
      var doCancelEntryBlock = getDoCancelEntryBlock(readSource());
      var refreshBlock = getRefreshStepBlock(doCancelEntryBlock);

      var refreshCatchStart = refreshBlock.indexOf("} catch (refreshError) {");
      var refreshCatchBlock = refreshBlock.slice(refreshCatchStart);

      expect(refreshCatchBlock).not.toContain("Alert.alert");
      expect(refreshCatchBlock).not.toContain("throw");
    });

    it("account.reload() itself is documented as owning its own refresh-error UX (never rejects, sets its own screenError/Alert) - the screen's existing convention, not duplicated here", () => {
      var source = readSource();
      var block = getPostMutationBlock(getDoCancelEntryBlock(source));

      expect(block).toContain("account.reload() already owns its own failure UX");
    });
  });
});

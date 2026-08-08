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

function getConfirmCancelStallBlock(source) {
  return getFunctionBlock(
    source,
    "function confirmCancelStall(item) {",
    "async function doCancelStall(item) {",
  );
}

function getDoCancelStallBlock(source) {
  return getFunctionBlock(
    source,
    "async function doCancelStall(item) {",
    // Ends at the next function (confirmCancelShavings, added by the
    // standalone-shavings-cancellation slice, now sits immediately after
    // doCancelStall) - NOT "function renderActions(" any more, since that
    // boundary would swallow the new shavings functions in between and
    // corrupt every block-scoped assertion below (e.g. lastIndexOf("} finally {")
    // would then find doCancelShavings's own finally block instead of
    // doCancelStall's).
    "function confirmCancelShavings(",
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

  it("paid-time cancellation keeps its own divergent success copy - not unified with DIRECT_CANCELLATION_COPY by the AppDialog/AppToast migration", () => {
    var source = readSource();

    expect(source).toContain(
      'import { cancelPaidTimeRequest } from "../../../../services/paidTimeRequestsService";',
    );

    var paidTimeBlock = getFunctionBlock(
      source,
      "async function doCancelPaidTime(item) {",
      "function confirmCancelStall(item) {",
    );
    expect(paidTimeBlock).toContain('showToast("הבקשה בוטלה", "success");');
  });

  // The stall flow was the "untouched/out of scope" case Phase 3C locked in
  // (createStallBookingCancelRequest, "נשלח"/"בקשת הביטול נשלחה למזכירה").
  // The admin-direct-stall-cancellation slice deliberately supersedes that -
  // see the "admin direct stall cancellation" describe block below for its
  // replacement coverage.
  it("the old request-based stall path is gone from this screen", () => {
    var source = readSource();

    expect(source).not.toContain("createStallBookingCancelRequest");
    expect(source).not.toContain("בקשת הביטול נשלחה למזכירה");
  });

  describe("copy-selection boundary (Blocker 2)", () => {
    it("no local cancel-copy helper remains - payerAccountCopy.js is the single source of truth", () => {
      var source = readSource();

      expect(source).not.toContain("getDirectCancelSuccessCopy");
      expect(source).not.toContain("ההרשמה בוטלה בהצלחה");
    });

    it("imports DIRECT_CANCELLATION_COPY, getCancellationConfirmationText and PAYER_ACCOUNT_ITEM_LABEL from payerAccountCopy.js", () => {
      var source = readSource();

      expect(source).toContain(
        'import {\n  getLifecycleBandHeader,\n  getCancellationConfirmationText,\n  PAYER_ACCOUNT_ITEM_LABEL,\n  DIRECT_CANCELLATION_COPY,\n  SHAVINGS_NEEDS_REVIEW_COPY,\n} from "../../../../utils/payerAccountCopy";',
      );
    });

    it("doCancelEntry's success notice uses DIRECT_CANCELLATION_COPY.text via showToast, never the send-to-secretary wording", () => {
      var block = getDoCancelEntryBlock(readSource());

      expect(block).toContain('showToast(DIRECT_CANCELLATION_COPY.text, "success");');
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
        'showToast(getApiErrorMessage(err, "אירעה שגיאה בביטול ההרשמה"), "error");',
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
      var noticeIndex = doCancelEntryBlock.indexOf(
        'showToast(DIRECT_CANCELLATION_COPY.text, "success");',
      );
      var refreshIndex = doCancelEntryBlock.indexOf(
        "await account.reload();",
      );

      expect(noticeIndex).toBeGreaterThan(finallyIndex);
      expect(refreshIndex).toBeGreaterThan(noticeIndex);
    });

    it("the success notice is NOT inside the refresh's try/catch - it already ran before refresh starts", () => {
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

    it("a refresh failure cannot be reported as a cancel failure - the refresh catch never shows the mutation's error notice and never re-throws", () => {
      var doCancelEntryBlock = getDoCancelEntryBlock(readSource());
      var refreshBlock = getRefreshStepBlock(doCancelEntryBlock);

      var refreshCatchStart = refreshBlock.indexOf("} catch (refreshError) {");
      var refreshCatchBlock = refreshBlock.slice(refreshCatchStart);

      expect(refreshCatchBlock).not.toContain("showToast");
      expect(refreshCatchBlock).not.toContain("throw");
    });

    it("account.reload() itself is documented as owning its own refresh-error UX (never rejects, sets its own screenError/Alert) - the screen's existing convention, not duplicated here", () => {
      var source = readSource();
      var block = getPostMutationBlock(getDoCancelEntryBlock(source));

      expect(block).toContain("account.reload() already owns its own failure UX");
    });
  });

  describe("admin direct stall cancellation", () => {
    it("imports adminCancelStallBooking from stallBookingsService, and createInFlightGuard", () => {
      var source = readSource();

      expect(source).toContain(
        'import { adminCancelStallBooking } from "../../../../services/stallBookingsService";',
      );
      expect(source).toContain(
        'import { createInFlightGuard } from "../../../../utils/inFlightGuard";',
      );
    });

    it("the guard ref is lazily initialized - createInFlightGuard() is only called inside a current === null check, never as the useRef argument itself", () => {
      var source = readSource();

      expect(source).not.toContain("useRef(createInFlightGuard())");
      expect(source).toContain("var stallCancelGuardRef = useRef(null);");
      expect(source).toContain(
        "if (stallCancelGuardRef.current === null) {\n    stallCancelGuardRef.current = createInFlightGuard();\n  }",
      );
    });

    it("confirmCancelStall's dialog uses getCancellationConfirmationText/PAYER_ACCOUNT_ITEM_LABEL.stall, never the send-to-secretary wording", () => {
      var block = getConfirmCancelStallBlock(readSource());

      expect(block).toContain(
        "getCancellationConfirmationText(PAYER_ACCOUNT_ITEM_LABEL.stall)",
      );
      expect(block).not.toContain("האם לשלוח בקשת ביטול למזכירה");
    });

    it("doCancelStall calls adminCancelStallBooking(item.stallBookingId, activeRole?.ranchId) directly, not a cancel request", () => {
      var block = getDoCancelStallBlock(readSource());

      expect(block).toContain(
        "await adminCancelStallBooking(item.stallBookingId, activeRole?.ranchId);",
      );
      expect(block).not.toContain("createStallBookingCancelRequest");
      expect(block).not.toContain("stallBookingId: item.stallBookingId,");
    });

    it("the guard key is 'stall:' + item.stallBookingId, matching the cancellingId UI key", () => {
      var block = getDoCancelStallBlock(readSource());

      expect(block).toContain(
        'var guardKey = "stall:" + item.stallBookingId;',
      );
      expect(block).toContain("setCancellingId(guardKey);");
    });

    it("the guard is acquired synchronously before the service call, and before setCancellingId - a failed acquire returns immediately", () => {
      var block = getDoCancelStallBlock(readSource());

      var guardCheckIndex = block.indexOf(
        "if (!stallCancelGuardRef.current.tryAcquire(guardKey)) {",
      );
      var returnIndex = block.indexOf("return;", guardCheckIndex);
      var setCancellingIdIndex = block.indexOf("setCancellingId(guardKey);");
      var serviceCallIndex = block.indexOf("await adminCancelStallBooking(");

      expect(guardCheckIndex).toBeGreaterThan(-1);
      expect(returnIndex).toBeGreaterThan(guardCheckIndex);
      expect(returnIndex).toBeLessThan(setCancellingIdIndex);
      expect(setCancellingIdIndex).toBeLessThan(serviceCallIndex);
    });

    it("the guard is released only in the outer finally, alongside setCancellingId(null) - never released between mutation success and refresh completion", () => {
      var block = getDoCancelStallBlock(readSource());

      var outerFinallyIndex = block.lastIndexOf("} finally {");
      var outerFinallyBlock = block.slice(outerFinallyIndex);

      expect(outerFinallyBlock).toContain("setCancellingId(null);");
      expect(outerFinallyBlock).toContain(
        "stallCancelGuardRef.current.release(guardKey);",
      );

      // The release call appears exactly once in the whole function - not
      // duplicated into the mutation catch or the refresh's nested catch.
      var releaseCount = block.split(
        "stallCancelGuardRef.current.release(guardKey);",
      ).length - 1;
      expect(releaseCount).toBe(1);
    });

    it("the success notice (DIRECT_CANCELLATION_COPY) fires strictly after the mutation resolves and before the refresh attempt starts", () => {
      var block = getDoCancelStallBlock(readSource());

      var serviceCallIndex = block.indexOf("await adminCancelStallBooking(");
      var noticeIndex = block.indexOf(
        'showToast(DIRECT_CANCELLATION_COPY.text, "success");',
      );
      var reloadIndex = block.indexOf("await account.reload();");

      expect(noticeIndex).toBeGreaterThan(serviceCallIndex);
      expect(reloadIndex).toBeGreaterThan(noticeIndex);
    });

    it("account.reload() runs in its own nested try/catch inside the mutation's try - a refresh failure only logs, never shows a toast, never rethrows, and cannot suppress the success notice that already ran", () => {
      var block = getDoCancelStallBlock(readSource());

      var reloadTryIndex = block.indexOf("try {\n        await account.reload();");
      expect(reloadTryIndex).toBeGreaterThan(-1);

      var reloadCatchIndex = block.indexOf("} catch (refreshError) {", reloadTryIndex);
      var outerCatchIndex = block.indexOf("} catch (err) {");

      expect(reloadCatchIndex).toBeGreaterThan(reloadTryIndex);
      // The nested reload catch closes before the outer mutation catch opens.
      expect(outerCatchIndex).toBeGreaterThan(reloadCatchIndex);

      var reloadCatchBlock = block.slice(
        reloadCatchIndex,
        outerCatchIndex,
      );
      expect(reloadCatchBlock).toContain(
        'console.log("CANCEL STALL REFRESH ERROR", refreshError);',
      );
      expect(reloadCatchBlock).not.toContain("showToast");
      expect(reloadCatchBlock).not.toContain("throw");
    });

    it("on mutation failure: shows the mapped error notice, and setCancellingId/guard release still happen via the outer finally", () => {
      var block = getDoCancelStallBlock(readSource());

      var outerCatchIndex = block.indexOf("} catch (err) {");
      var outerFinallyIndex = block.indexOf("} finally {", outerCatchIndex);
      var outerCatchBlock = block.slice(outerCatchIndex, outerFinallyIndex);

      expect(outerCatchBlock).toContain(
        'showToast(getApiErrorMessage(err, "אירעה שגיאה בביטול הזמנת התא"), "error");',
      );
      expect(outerCatchBlock).not.toContain("DIRECT_CANCELLATION_COPY");
      expect(outerCatchBlock).not.toContain("account.reload");
    });
  });
});

describe("AdminCompetitionPayerAccountScreen - CE-4/PT-8 entry and paid-time in-flight guards", () => {
  it("imports createInFlightGuard and lazily initializes independent entryCancelGuardRef and paidTimeCancelGuardRef, alongside the existing stallCancelGuardRef", () => {
    var source = readSource();

    expect(source).toContain(
      'import { createInFlightGuard } from "../../../../utils/inFlightGuard";',
    );

    expect(source).toContain("var entryCancelGuardRef = useRef(null);");
    expect(source).toContain(
      "if (entryCancelGuardRef.current === null) {\n    entryCancelGuardRef.current = createInFlightGuard();\n  }",
    );

    expect(source).toContain("var paidTimeCancelGuardRef = useRef(null);");
    expect(source).toContain(
      "if (paidTimeCancelGuardRef.current === null) {\n    paidTimeCancelGuardRef.current = createInFlightGuard();\n  }",
    );

    expect(source).toContain("var stallCancelGuardRef = useRef(null);");
  });

  describe("doCancelEntry guard (CE-4)", () => {
    it("acquires the guard synchronously, key 'entry:' + entryId, before setCancellingId and before the service call - a failed acquire returns immediately", () => {
      var block = getDoCancelEntryBlock(readSource());

      var guardKeyIndex = block.indexOf(
        'var guardKey = "entry:" + item.entryId;',
      );
      var guardCheckIndex = block.indexOf(
        "if (!entryCancelGuardRef.current.tryAcquire(guardKey)) {",
      );
      var returnIndex = block.indexOf("return;", guardCheckIndex);
      var setCancellingIdIndex = block.indexOf("setCancellingId(guardKey);");
      var serviceCallIndex = block.indexOf("await adminCancelEntry(");

      expect(guardKeyIndex).toBeGreaterThan(-1);
      expect(guardCheckIndex).toBeGreaterThan(guardKeyIndex);
      expect(returnIndex).toBeGreaterThan(guardCheckIndex);
      expect(returnIndex).toBeLessThan(setCancellingIdIndex);
      expect(setCancellingIdIndex).toBeLessThan(serviceCallIndex);
    });

    it("on mutation failure, releases the guard inside the catch block, before the notice's outer finally resets cancellingId", () => {
      var block = getDoCancelEntryBlock(readSource());

      var catchStart = block.indexOf("} catch (err) {");
      var finallyStart = block.indexOf("} finally {", catchStart);
      var catchBlock = block.slice(catchStart, finallyStart);

      expect(catchBlock).toContain(
        'showToast(getApiErrorMessage(err, "אירעה שגיאה בביטול ההרשמה"), "error");',
      );
      expect(catchBlock).toContain(
        "entryCancelGuardRef.current.release(guardKey);",
      );
      expect(catchBlock).toContain("return;");
    });

    it("on success, releases the guard only after the refresh attempt settles - not immediately when the mutation resolves", () => {
      var block = getDoCancelEntryBlock(readSource());
      var refreshBlock = getRefreshStepBlock(block);

      expect(refreshBlock).toContain(
        "} finally {\n      entryCancelGuardRef.current.release(guardKey);\n    }",
      );
    });

    it("the guard releases exactly twice - once on the failure path, once after refresh settles - never a stray third release", () => {
      var block = getDoCancelEntryBlock(readSource());

      expect(
        countOccurrences(
          block,
          "entryCancelGuardRef.current.release(guardKey);",
        ),
      ).toBe(2);
    });

    it("a different entry's guard key is independent - the guard is keyed per entryId, not a single shared key", () => {
      var block = getDoCancelEntryBlock(readSource());

      expect(block).toContain('"entry:" + item.entryId');
    });
  });

  describe("doCancelPaidTime guard (PT-8, AdminCompetitionPayerAccountScreen)", () => {
    function getDoCancelPaidTimeBlock(source) {
      return getFunctionBlock(
        source,
        "async function doCancelPaidTime(item) {",
        "function confirmCancelStall(item) {",
      );
    }

    it("acquires the guard synchronously, key 'paidTime:' + paidTimeRequestId, before setCancellingId and before the service call", () => {
      var block = getDoCancelPaidTimeBlock(readSource());

      var guardKeyIndex = block.indexOf(
        'var guardKey = "paidTime:" + item.paidTimeRequestId;',
      );
      var guardCheckIndex = block.indexOf(
        "if (!paidTimeCancelGuardRef.current.tryAcquire(guardKey)) {",
      );
      var returnIndex = block.indexOf("return;", guardCheckIndex);
      var setCancellingIdIndex = block.indexOf("setCancellingId(guardKey);");
      var serviceCallIndex = block.indexOf("await cancelPaidTimeRequest(");

      expect(guardKeyIndex).toBeGreaterThan(-1);
      expect(guardCheckIndex).toBeGreaterThan(guardKeyIndex);
      expect(returnIndex).toBeGreaterThan(guardCheckIndex);
      expect(returnIndex).toBeLessThan(setCancellingIdIndex);
      expect(setCancellingIdIndex).toBeLessThan(serviceCallIndex);
    });

    it("releases the guard in the outer finally, alongside setCancellingId(null), on both success and failure", () => {
      var block = getDoCancelPaidTimeBlock(readSource());

      var finallyIndex = block.lastIndexOf("} finally {");
      var finallyBlock = block.slice(finallyIndex);

      expect(finallyBlock).toContain("setCancellingId(null);");
      expect(finallyBlock).toContain(
        "paidTimeCancelGuardRef.current.release(guardKey);",
      );

      expect(
        countOccurrences(
          block,
          "paidTimeCancelGuardRef.current.release(guardKey);",
        ),
      ).toBe(1);
    });

    it("is entirely independent of the entry cancel guard - different ref, different key namespace", () => {
      var block = getDoCancelPaidTimeBlock(readSource());

      expect(block).not.toContain("entryCancelGuardRef");
    });
  });
});

function getRenderFinesSectionBlock(source) {
  return getFunctionBlock(
    source,
    "function renderFinesSection() {",
    "function renderClassesTab() {",
  );
}

describe("AdminCompetitionPayerAccountScreen - Phase 3E Slice D class banding + fines", () => {
  it("imports bandAndSortClasses; no longer imports sortClassesByVerifiedDate", () => {
    var source = readSource();

    expect(source).toContain(
      'import {\n  bandAndSortPaidTimes,\n  bandAndSortStalls,\n  bandAndSortClasses,\n  sortShavingsOrders,\n} from "../../../../utils/payerAccountBands";',
    );
    expect(source).not.toContain("sortClassesByVerifiedDate");
  });

  it("bands classes via bandAndSortClasses and renders every band (active/pending/cancelled - which covers Cancelled and Replaced, since both map into the cancelled band) through the shared renderBandedSections helper", () => {
    var source = readSource();

    expect(source).toContain("bandAndSortClasses(filteredClasses)");
    expect(source).toContain(
      "renderBandedSections(bandedClasses, renderClassCard)",
    );
  });

  it("classes reuse the one shared renderBandedSections/getLifecycleBandHeader helpers already used for paid time and stalls - no per-tab duplicate banding logic", () => {
    var source = readSource();

    expect(countOccurrences(source, "function renderBandedSections(")).toBe(
      1,
    );
    expect(
      countOccurrences(source, "renderBandedSections(bandedClasses,"),
    ).toBe(1);
    expect(
      countOccurrences(source, "renderBandedSections(bandedPaidTimes,"),
    ).toBe(1);
    expect(
      countOccurrences(source, "renderBandedSections(bandedStalls,"),
    ).toBe(1);
  });

  it("unknown/missing entryStatus classes are never rendered in a lifecycle band - bandAndSortClasses drops them (see payerAccountBands.test.js); the screen never falls back to rendering account.classes directly", () => {
    var source = readSource();

    expect(source).not.toContain("account.classes.map(");
    expect(source).not.toContain("filteredClasses.map(");
  });

  it("no duplicate class rows - classes are read from account.classes (deduped by entryId inside the hook) exactly once, never re-derived from a second raw source", () => {
    var source = readSource();

    expect(
      countOccurrences(
        source,
        "Array.isArray(account.classes) ? account.classes : []",
      ),
    ).toBe(1);
  });

  it("renders a fines section reading account.fines, defaulting to an empty array", () => {
    var source = readSource();

    expect(source).toContain("function renderFinesSection() {");
    expect(source).toContain(
      "var fines = Array.isArray(account.fines) ? account.fines : [];",
    );
    expect(source).toContain("{renderFinesSection()}");
  });

  it("fines section renders null (nothing) when there are no fines", () => {
    var block = getRenderFinesSectionBlock(readSource());

    expect(block).toContain(
      "if (fines.length === 0) {\n      return null;\n    }",
    );
  });

  it("fines section renders a card per fine, with a קנסות header, when fines exist", () => {
    var block = getRenderFinesSectionBlock(readSource());

    expect(block).toContain('<Text style={styles.sectionTitle}>קנסות</Text>');
    expect(block).toContain("{fines.map(function (fine) {");
    expect(block).toContain('key={String(fine.billChargeId)}');
  });

  it("each fine card reads only fields from the deployed proc-212 fines[] shape - never an invented field", () => {
    var block = getRenderFinesSectionBlock(readSource());

    expect(block).toContain("fine.billChargeId");
    expect(block).toContain("fine.className");
    expect(block).toContain("fine.amountToPay");
    expect(block).toContain('fine.chargeStatus === "Paid"');
    expect(block).toContain("fine.notes");
  });

  it("useAdminCompetitionPayerAccount hook passes fines through, deduped by billChargeId like every other list", () => {
    var hookSource = fs
      .readFileSync(
        path.resolve(
          __dirname,
          "../../../../hooks/useAdminCompetitionPayerAccount.js",
        ),
        "utf8",
      )
      .replace(/\r\n/g, "\n");

    expect(hookSource).toContain(
      "fines: dedupBy(safeArray(safeAccount.fines), function (it) {\n          return it.billChargeId;\n        }),",
    );
    expect(hookSource).toContain("fines: normalized.fines,");
  });

  it("existing class edit/cancel action wiring is untouched - same renderActions call as before this slice", () => {
    var source = readSource();

    expect(source).toContain(
      'renderActions(\n            "entry:" + item.entryId,',
    );
    expect(source).toContain(
      "setEditEntryItem(item);",
    );
  });
});

describe("AdminCompetitionPayerAccountScreen - terminal class-entry cancellation lock", () => {
  function getFunctionBlock(source, signature, nextSignature) {
    var start = source.indexOf(signature);
    var end = source.indexOf(nextSignature, start);

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);

    return source.slice(start, end);
  }

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

describe("AdminCompetitionPayerAccountScreen - CAP-4 shavings tab", () => {
  it("exposes a נסורת tab button alongside the existing four", () => {
    var source = readSource();

    expect(source).toContain('{renderTabButton("shavings", "נסורת")}');
  });

  it("dispatches activeTab === \"shavings\" to renderShavingsTab", () => {
    var source = readSource();

    expect(source).toContain(
      'if (activeTab === "shavings") {\n      return renderShavingsTab();\n    }',
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
      'import {\n  getLifecycleBandHeader,\n  getCancellationConfirmationText,\n  PAYER_ACCOUNT_ITEM_LABEL,\n  DIRECT_CANCELLATION_COPY,\n  SHAVINGS_NEEDS_REVIEW_COPY,\n} from "../../../../utils/payerAccountCopy";',
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

  it("standalone shavings cancellation: the cancel action is wired only on the active section, via confirmCancelShavings and the shared cancellingId", () => {
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
      'return renderEmpty("לא נמצאו הזמנות נסורת בחשבון של משלם זה");',
    );
  });

  it("the nested per-stall shavings lines inside the stalls tab are untouched by this slice", () => {
    var source = readSource();

    expect(source).toContain("var shavingsOrders = sortShavingsOrders(item.shavingsOrders);");
    expect(source).toContain("נסורת לתא זה:");
  });
});

describe("AdminCompetitionPayerAccountScreen - AppDialog/AppToast migration", () => {
  it("no longer imports or calls the native Alert.alert anywhere in the screen", () => {
    var source = readSource();

    expect(source).not.toContain("Alert");
  });

  it("imports showToast and AppDialog from the styled-alert foundation", () => {
    var source = readSource();

    expect(source).toContain(
      'import { showToast } from "../../../../services/toastService";',
    );
    expect(source).toContain(
      'import AppDialog from "../../../../components/common/AppDialog";',
    );
  });

  it("owns a single confirmDialog state slot, lazily null, shared by all four cancel confirmations", () => {
    var source = readSource();

    expect(source).toContain("var [confirmDialog, setConfirmDialog] = useState(null);");
  });

  it("renders exactly one AppDialog instance, wired to confirmDialog and cleared via onCancel", () => {
    var source = readSource();

    expect(countOccurrences(source, "<AppDialog")).toBe(1);
    expect(source).toContain("visible={!!confirmDialog}");
    expect(source).toContain("title={confirmDialog?.title}");
    expect(source).toContain("message={confirmDialog?.message}");
    expect(source).toContain("onConfirm={confirmDialog?.onConfirm}");
    expect(source).toContain(
      "onCancel={function () {\n          setConfirmDialog(null);\n        }}",
    );
  });

  it("every confirm* function sets confirmDialog instead of calling Alert.alert, and its onConfirm clears the dialog before running the mutation", () => {
    var source = readSource();

    [
      { fn: "confirmCancelEntry(item)", mutation: "doCancelEntry(item)" },
      { fn: "confirmCancelPaidTime(item)", mutation: "doCancelPaidTime(item)" },
      { fn: "confirmCancelStall(item)", mutation: "doCancelStall(item)" },
      { fn: "confirmCancelShavings(order)", mutation: "doCancelShavings(order)" },
    ].forEach(function (pair) {
      var start = source.indexOf("function " + pair.fn + " {");
      var end = source.indexOf("\n  }\n", start);
      var block = source.slice(start, end);

      expect(start).toBeGreaterThan(-1);
      expect(block).toContain("setConfirmDialog({");
      expect(block).toContain("setConfirmDialog(null);");
      expect(block).toContain(pair.mutation);
    });
  });

  it("preserves the exact pre-migration dialog copy - titles and messages are unchanged, only the mechanism moved", () => {
    var source = readSource();

    expect(source).toContain('title: "ביטול הרשמה"');
    expect(source).toContain('message: "האם לבטל את ההרשמה?"');
    expect(source).toContain('title: "ביטול פייד טיים"');
    expect(source).toContain('message: "האם לבטל את הבקשה?"');
    expect(source).toContain('title: "ביטול תא"');
    expect(source).toContain(
      "message: getCancellationConfirmationText(PAYER_ACCOUNT_ITEM_LABEL.stall)",
    );
    expect(source).toContain('title: "ביטול הזמנת נסורת"');
    expect(source).toContain(
      "message: getCancellationConfirmationText(PAYER_ACCOUNT_ITEM_LABEL.shavings)",
    );
  });
});

describe("AdminCompetitionPayerAccountScreen - doCancelPaidTime refresh isolation hardening (structural gap fix)", () => {
  function getDoCancelPaidTimeBlock(source) {
    return getFunctionBlock(
      source,
      "async function doCancelPaidTime(item) {",
      "function confirmCancelStall(item) {",
    );
  }

  it("account.reload() is nested inside the mutation's own try, not left bare after the success notice - matching doCancelStall/doCancelShavings, not doCancelEntry's separate-step shape", () => {
    var block = getDoCancelPaidTimeBlock(readSource());

    var noticeIndex = block.indexOf('showToast("הבקשה בוטלה", "success");');
    var nestedTryIndex = block.indexOf(
      "try {\n        await account.reload();",
      noticeIndex,
    );

    expect(noticeIndex).toBeGreaterThan(-1);
    expect(nestedTryIndex).toBeGreaterThan(noticeIndex);
  });

  it("a refresh failure is caught by its own nested catch, logs only, never shows an error toast, and never rethrows into the outer catch", () => {
    var block = getDoCancelPaidTimeBlock(readSource());

    var nestedTryIndex = block.indexOf("try {\n        await account.reload();");
    var nestedCatchIndex = block.indexOf("} catch (refreshError) {", nestedTryIndex);
    var outerCatchIndex = block.indexOf("} catch (err) {");

    expect(nestedTryIndex).toBeGreaterThan(-1);
    expect(nestedCatchIndex).toBeGreaterThan(nestedTryIndex);
    expect(outerCatchIndex).toBeGreaterThan(nestedCatchIndex);

    var nestedCatchBlock = block.slice(nestedCatchIndex, outerCatchIndex);
    expect(nestedCatchBlock).toContain(
      'console.log("CANCEL PAID TIME REFRESH ERROR", refreshError);',
    );
    expect(nestedCatchBlock).not.toContain("showToast");
    expect(nestedCatchBlock).not.toContain("throw");
  });

  it("a successful cancellation can never be reported as failed by a refresh error - the outer (mutation) catch is unreachable once the nested reload catch has already handled it", () => {
    var block = getDoCancelPaidTimeBlock(readSource());

    var outerCatchIndex = block.indexOf("} catch (err) {");
    var outerFinallyIndex = block.indexOf("} finally {", outerCatchIndex);
    var outerCatchBlock = block.slice(outerCatchIndex, outerFinallyIndex);

    expect(outerCatchBlock).toContain(
      'showToast(getApiErrorMessage(err, "אירעה שגיאה"), "error");',
    );
    expect(outerCatchBlock).not.toContain("account.reload");
  });

  it("stays structurally symmetric with doCancelStall/doCancelShavings: exactly one guard release, in the single outer finally, regardless of refresh outcome", () => {
    var block = getDoCancelPaidTimeBlock(readSource());

    var finallyIndex = block.lastIndexOf("} finally {");
    var finallyBlock = block.slice(finallyIndex);

    expect(finallyBlock).toContain("setCancellingId(null);");
    expect(finallyBlock).toContain(
      "paidTimeCancelGuardRef.current.release(guardKey);",
    );
    expect(
      countOccurrences(
        block,
        "paidTimeCancelGuardRef.current.release(guardKey);",
      ),
    ).toBe(1);
  });

  it("does not unify doCancelPaidTime's success copy with DIRECT_CANCELLATION_COPY - the hardening is structural only, copy is out of scope", () => {
    var block = getDoCancelPaidTimeBlock(readSource());

    expect(block).toContain('showToast("הבקשה בוטלה", "success");');
    expect(block).not.toContain("DIRECT_CANCELLATION_COPY");
  });
});

// P3.3: replaces the screen-local extractErrorMessage (which could surface a
// raw backend JSON body, a "Database error: ..." string, or a bare SQLSTATE
// prefix straight to the user) with the shared, hardened getApiErrorMessage
// from shared/auth/utils/authApiErrors.js - same helper already adopted by
// AdminCompetitionPaidTimesScreen and AdminCompetitionStallsShavingsScreen.
describe("AdminCompetitionPayerAccountScreen - P3.3 safe error parsing (getApiErrorMessage migration)", () => {
  function getDoCancelPaidTimeBlock(source) {
    return getFunctionBlock(
      source,
      "async function doCancelPaidTime(item) {",
      "function confirmCancelStall(item) {",
    );
  }

  it("no longer defines a local extractErrorMessage helper - it was fully replaced, not left dead", () => {
    var source = readSource();

    expect(source).not.toContain("function extractErrorMessage(");
    expect(source).not.toContain("extractErrorMessage(");
  });

  it("imports getApiErrorMessage from the shared, hardened error helper", () => {
    var source = readSource();

    expect(source).toContain(
      'import { getApiErrorMessage } from "../../../../../../shared/auth/utils/authApiErrors";',
    );
  });

  it("the old unsafe escape hatches (raw JSON.stringify, err.response.data.error, bare err.message fallback) are gone from this screen", () => {
    var source = readSource();

    expect(source).not.toContain("JSON.stringify(data)");
    expect(source).not.toContain("data.error");
  });

  it("all four cancellation catch blocks call getApiErrorMessage(err, <established fallback>) instead of the old local helper", () => {
    var source = readSource();

    expect(
      countOccurrences(source, "showToast(getApiErrorMessage(err,"),
    ).toBe(4);

    // Entry cancel (doCancelEntry) - fallback matches the established copy
    // already used for this exact action in AdminCompetitionClassesScreen.
    expect(
      getDoCancelEntryBlock(source),
    ).toContain(
      'showToast(getApiErrorMessage(err, "אירעה שגיאה בביטול ההרשמה"), "error");',
    );

    // Paid-time cancel (doCancelPaidTime) - generic fallback, matching
    // AdminCompetitionPaidTimesScreen's own getApiErrorMessage call for the
    // same cancelPaidTimeRequest action.
    expect(
      getDoCancelPaidTimeBlock(source),
    ).toContain(
      'showToast(getApiErrorMessage(err, "אירעה שגיאה"), "error");',
    );

    // Stall cancel (doCancelStall) - fallback matches
    // AdminCompetitionStallsShavingsScreen's identical adminCancelStallBooking flow.
    expect(
      getDoCancelStallBlock(source),
    ).toContain(
      'showToast(getApiErrorMessage(err, "אירעה שגיאה בביטול הזמנת התא"), "error");',
    );

    // Shavings cancel (doCancelShavings) - fallback matches
    // AdminCompetitionStallsShavingsScreen's identical adminCancelShavingsOrder flow.
    var doCancelShavingsBlock = getFunctionBlock(
      source,
      "async function doCancelShavings(order) {",
      "function renderActions(",
    );
    expect(doCancelShavingsBlock).toContain(
      'showToast(getApiErrorMessage(err, "אירעה שגיאה בביטול הזמנת הנסורת"), "error");',
    );
  });

  it("success/cancellation flow is unchanged - success toasts and refresh calls are untouched by this migration", () => {
    var source = readSource();

    expect(source).toContain('showToast(DIRECT_CANCELLATION_COPY.text, "success");');
    expect(source).toContain('showToast("הבקשה בוטלה", "success");');
    expect(countOccurrences(source, "await account.reload();")).toBeGreaterThan(0);
  });

  it("no unrelated error path in this screen was touched - account.screenError rendering and the retry button are unchanged", () => {
    var source = readSource();

    expect(source).toContain("{account.screenError}");
    expect(source).toContain('onPress={account.reload}');
  });
});

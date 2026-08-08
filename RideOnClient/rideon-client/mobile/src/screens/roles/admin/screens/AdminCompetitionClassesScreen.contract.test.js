import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// CAP-6: rewires this screen's entry edit/cancel actions onto the same
// admin-direct endpoints AdminCompetitionPayerAccountScreen already uses
// (POST /Entries/admin-edit via the shared CompetitionEntryCreateModal's
// useDirectAdminEdit prop, DELETE /Entries/admin-cancel/{entryId} via
// handleCancelEntryDialogConfirm below) - no ChangeEntryRequest is created
// from this screen anymore. Styled-alert migration: cancel is now a
// state-driven <AppDialog>, success/error notices are showToast() calls -
// no native Alert.alert remains. The screen imports react-native/context
// modules not safe to import under plain vitest, so this reads source text -
// same approach as the repo's other *.contract.test.js files.

var SOURCE_PATH = path.resolve(__dirname, "AdminCompetitionClassesScreen.jsx");

function readSource() {
  return fs.readFileSync(SOURCE_PATH, "utf8").replace(/\r\n/g, "\n");
}

function getFunctionBlock(source, signature, nextSignature) {
  var start = source.indexOf(signature);
  var end = source.indexOf(nextSignature, start);

  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);

  return source.slice(start, end);
}

function getCancelHandlersBlock(source) {
  return getFunctionBlock(
    source,
    "function handleCancelEntry(item) {",
    "function renderFilterChip(",
  );
}

function getConfirmHandlerBlock(source) {
  return getFunctionBlock(
    source,
    "async function handleCancelEntryDialogConfirm() {",
    "function renderFilterChip(",
  );
}

function getEditModalInstance(source) {
  var start = source.indexOf(
    "<CompetitionEntryCreateModal\n          visible={showCreateModal",
  );
  var end = source.indexOf("/>", start);

  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);

  return source.slice(start, end);
}

describe("AdminCompetitionClassesScreen - CAP-6 direct admin edit/cancel", () => {
  it("no longer imports createChangeEntryRequest - the old request-based path is gone from this screen", () => {
    expect(readSource()).not.toContain("createChangeEntryRequest");
  });

  it("imports adminCancelEntry from entriesService", () => {
    expect(readSource()).toContain(
      'import { adminCancelEntry } from "../../../../services/entriesService";',
    );
  });

  it("the single CompetitionEntryCreateModal instance opts into useDirectAdminEdit (it serves both create and edit)", () => {
    var instance = getEditModalInstance(readSource());

    expect(instance).toContain("useDirectAdminEdit={true}");
  });

  it("handleCancelEntry's confirmation dialog no longer promises a secretary-bound request", () => {
    var source = readSource();

    expect(source).toContain(
      "getCancellationConfirmationText(PAYER_ACCOUNT_ITEM_LABEL.entry)",
    );
    expect(source).not.toContain("האם לשלוח בקשת ביטול למזכירה");
  });

  it("handleCancelEntryDialogConfirm calls adminCancelEntry(entryId, competitionId, ranchId) directly, not a ChangeEntryRequest", () => {
    var block = getConfirmHandlerBlock(readSource());

    expect(block).toContain("await adminCancelEntry(\n        item.entryId,");
    expect(block).toContain("activeCompetition?.competitionId,");
    expect(block).toContain("activeRole?.ranchId,");
    expect(block).not.toContain("createChangeEntryRequest");
    expect(block).not.toContain("isCancelled");
    expect(block).not.toContain("originalEntryId");
  });

  it("the success notice uses DIRECT_CANCELLATION_COPY.text via showToast, never the send-to-secretary wording", () => {
    var block = getConfirmHandlerBlock(readSource());

    expect(block).toContain(
      'showToast(DIRECT_CANCELLATION_COPY.text, "success");',
    );
    expect(block).not.toContain("נשלח למזכירה");
    expect(block).not.toContain('"נשלח"');
  });

  it("imports DIRECT_CANCELLATION_COPY, getCancellationConfirmationText and PAYER_ACCOUNT_ITEM_LABEL from payerAccountCopy.js", () => {
    expect(readSource()).toContain(
      'import {\n  getCancellationConfirmationText,\n  PAYER_ACCOUNT_ITEM_LABEL,\n  DIRECT_CANCELLATION_COPY,\n} from "../../../../utils/payerAccountCopy";',
    );
  });

  it("guards the cancel mutation with the existing reusable createInFlightGuard helper, lazily initialized", () => {
    var source = readSource();

    expect(source).toContain(
      'import { createInFlightGuard } from "../../../../utils/inFlightGuard";',
    );
    expect(source).not.toContain("useRef(createInFlightGuard())");
    expect(source).toContain("var cancelGuardRef = useRef(null);");
    expect(source).toContain(
      "if (cancelGuardRef.current === null) {\n    cancelGuardRef.current = createInFlightGuard();\n  }",
    );
  });

  it("the guard key is 'entry:' + item.entryId, and is released only in the outer finally", () => {
    var block = getConfirmHandlerBlock(readSource());

    expect(block).toContain('var guardKey = "entry:" + item.entryId;');

    var finallyIndex = block.lastIndexOf("} finally {");
    var finallyBlock = block.slice(finallyIndex);

    expect(finallyBlock).toContain(
      "cancelGuardRef.current.release(guardKey);",
    );

    var releaseCount =
      block.split("cancelGuardRef.current.release(guardKey);").length - 1;
    expect(releaseCount).toBe(1);
  });

  it("the guard is acquired synchronously before the service call - a failed acquire returns immediately", () => {
    var block = getConfirmHandlerBlock(readSource());

    var guardCheckIndex = block.indexOf(
      "if (!cancelGuardRef.current.tryAcquire(guardKey)) {",
    );
    var returnIndex = block.indexOf("return;", guardCheckIndex);
    var serviceCallIndex = block.indexOf("await adminCancelEntry(");

    expect(guardCheckIndex).toBeGreaterThan(-1);
    expect(returnIndex).toBeGreaterThan(guardCheckIndex);
    expect(returnIndex).toBeLessThan(serviceCallIndex);
  });

  it("a refresh failure cannot be reported as a cancel failure - the refresh runs in its own nested try/catch that only logs, never toasts, never rethrows", () => {
    var block = getConfirmHandlerBlock(readSource());

    var refreshTryIndex = block.indexOf(
      "try {\n        await entries.handleRefresh();",
    );
    expect(refreshTryIndex).toBeGreaterThan(-1);

    var refreshCatchIndex = block.indexOf(
      "} catch (refreshError) {",
      refreshTryIndex,
    );
    var outerCatchIndex = block.indexOf("} catch (error) {");

    expect(refreshCatchIndex).toBeGreaterThan(refreshTryIndex);
    expect(outerCatchIndex).toBeGreaterThan(refreshCatchIndex);

    var refreshCatchBlock = block.slice(refreshCatchIndex, outerCatchIndex);
    expect(refreshCatchBlock).toContain(
      'console.log("CANCEL ENTRY REFRESH ERROR", refreshError);',
    );
    expect(refreshCatchBlock).not.toContain("showToast");
    expect(refreshCatchBlock).not.toContain("throw");
  });

  it("on mutation failure: shows a plain error toast, not the old 'sending the request' wording, and never claims direct-cancel success", () => {
    var block = getConfirmHandlerBlock(readSource());

    var outerCatchIndex = block.indexOf("} catch (error) {");
    var outerFinallyIndex = block.indexOf("} finally {", outerCatchIndex);
    var outerCatchBlock = block.slice(outerCatchIndex, outerFinallyIndex);

    expect(outerCatchBlock).toContain(
      'showToast("אירעה שגיאה בביטול ההרשמה", "error");',
    );
    expect(outerCatchBlock).not.toContain("שליחת בקשת הביטול");
    expect(outerCatchBlock).not.toContain("DIRECT_CANCELLATION_COPY");
  });

  it("existing Model-C availability guard (registrationStepStatus.availability.classes.isEnabled) is preserved at both the dialog-open and dialog-confirm checkpoints", () => {
    var block = getCancelHandlersBlock(readSource());

    var occurrences =
      block.split("availability.classes.isEnabled").length - 1;
    // One check in handleCancelEntry (dialog-open) and one in
    // handleCancelEntryDialogConfirm (before the mutation runs).
    expect(occurrences).toBe(2);
  });

  it("no native Alert import or Alert.alert call remains in this screen", () => {
    var source = readSource();

    expect(source).not.toMatch(/\bAlert\b/);
  });

  it("imports AppDialog and showToast for the styled-alert replacements", () => {
    var source = readSource();

    expect(source).toContain(
      'import AppDialog from "../../../../components/common/AppDialog";',
    );
    expect(source).toContain(
      'import { showToast } from "../../../../services/toastService";',
    );
  });

  it("cancel-entry confirmation renders as a destructive AppDialog gated on cancelEntryTarget, not an auto-firing action", () => {
    var source = readSource();

    var dialogStart = source.indexOf('<AppDialog\n          visible={!!cancelEntryTarget}');
    expect(dialogStart).toBeGreaterThan(-1);

    var dialogEnd = source.indexOf("/>", dialogStart);
    var dialogBlock = source.slice(dialogStart, dialogEnd);

    expect(dialogBlock).toContain("destructive={true}");
    expect(dialogBlock).toContain("onConfirm={handleCancelEntryDialogConfirm}");
    expect(dialogBlock).toContain("onCancel={handleCancelEntryDialogCancel}");
  });

  it("handleCancelEntry only opens the dialog (sets state) - it does not call adminCancelEntry itself", () => {
    var source = readSource();
    var start = source.indexOf("function handleCancelEntry(item) {");
    var end = source.indexOf("function handleCancelEntryDialogCancel() {");
    var block = source.slice(start, end);

    expect(block).toContain("setCancelEntryTarget(item);");
    expect(block).not.toContain("adminCancelEntry");
  });

  it("cancelling the dialog clears the target without ever calling adminCancelEntry", () => {
    var source = readSource();
    var start = source.indexOf("function handleCancelEntryDialogCancel() {");
    var end = source.indexOf("async function handleCancelEntryDialogConfirm() {");
    var block = source.slice(start, end);

    expect(block).toContain("setCancelEntryTarget(null);");
    expect(block).not.toContain("adminCancelEntry");
  });
});

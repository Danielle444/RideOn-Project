import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// CAP-6: rewires this screen's entry edit/cancel actions onto the same
// admin-direct endpoints AdminCompetitionPayerAccountScreen already uses
// (POST /Entries/admin-edit via the shared CompetitionEntryCreateModal's
// useDirectAdminEdit prop, DELETE /Entries/admin-cancel/{entryId} via
// handleCancelEntry below) - no ChangeEntryRequest is created from this
// screen anymore. The screen imports react-native/context modules not safe
// to import under plain vitest, so this reads source text - same approach as
// the repo's other *.contract.test.js files.

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

function getHandleCancelEntryBlock(source) {
  return getFunctionBlock(
    source,
    "function handleCancelEntry(item) {",
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
    var block = getHandleCancelEntryBlock(readSource());

    expect(block).toContain(
      "getCancellationConfirmationText(PAYER_ACCOUNT_ITEM_LABEL.entry)",
    );
    expect(block).not.toContain("האם לשלוח בקשת ביטול למזכירה");
  });

  it("handleCancelEntry calls adminCancelEntry(entryId, competitionId, ranchId) directly, not a ChangeEntryRequest", () => {
    var block = getHandleCancelEntryBlock(readSource());

    expect(block).toContain(
      "await adminCancelEntry(\n                item.entryId,",
    );
    expect(block).toContain("activeCompetition?.competitionId,");
    expect(block).toContain("activeRole?.ranchId,");
    expect(block).not.toContain("createChangeEntryRequest");
    expect(block).not.toContain("isCancelled");
    expect(block).not.toContain("originalEntryId");
  });

  it("the success alert uses DIRECT_CANCELLATION_COPY.text, never the send-to-secretary wording", () => {
    var block = getHandleCancelEntryBlock(readSource());

    expect(block).toContain(
      'Alert.alert("בוטל", DIRECT_CANCELLATION_COPY.text);',
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
    var block = getHandleCancelEntryBlock(readSource());

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
    var block = getHandleCancelEntryBlock(readSource());

    var guardCheckIndex = block.indexOf(
      "if (!cancelGuardRef.current.tryAcquire(guardKey)) {",
    );
    var returnIndex = block.indexOf("return;", guardCheckIndex);
    var serviceCallIndex = block.indexOf("await adminCancelEntry(");

    expect(guardCheckIndex).toBeGreaterThan(-1);
    expect(returnIndex).toBeGreaterThan(guardCheckIndex);
    expect(returnIndex).toBeLessThan(serviceCallIndex);
  });

  it("a refresh failure cannot be reported as a cancel failure - the refresh runs in its own nested try/catch that only logs, never alerts, never rethrows", () => {
    var block = getHandleCancelEntryBlock(readSource());

    var refreshTryIndex = block.indexOf(
      "try {\n                await entries.handleRefresh();",
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
    expect(refreshCatchBlock).not.toContain("Alert.alert");
    expect(refreshCatchBlock).not.toContain("throw");
  });

  it("on mutation failure: shows a plain error alert, not the old 'sending the request' wording, and never claims direct-cancel success", () => {
    var block = getHandleCancelEntryBlock(readSource());

    var outerCatchIndex = block.indexOf("} catch (error) {");
    var outerFinallyIndex = block.indexOf("} finally {", outerCatchIndex);
    var outerCatchBlock = block.slice(outerCatchIndex, outerFinallyIndex);

    expect(outerCatchBlock).toContain(
      'Alert.alert("שגיאה", "אירעה שגיאה בביטול ההרשמה");',
    );
    expect(outerCatchBlock).not.toContain("שליחת בקשת הביטול");
    expect(outerCatchBlock).not.toContain("DIRECT_CANCELLATION_COPY");
  });

  it("existing Model-C availability guard (registrationStepStatus.availability.classes.isEnabled) is preserved at both the dialog-open and onPress checkpoints", () => {
    var block = getHandleCancelEntryBlock(readSource());

    var occurrences =
      block.split("if (!availability.classes.isEnabled) {").length - 1;
    expect(occurrences).toBe(2);
  });
});

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// Phase 3C: rewires CompetitionEntryCreateModal's edit-mode submit, but only
// when the caller opts in via useDirectAdminEdit (only the admin
// payer-account screen does). The component imports react-native/context
// modules not safe to import under plain vitest, so this reads source text -
// same approach as the repo's other *.contract.test.js files (see
// useAdminCompetitionRegistrations.contract.test.js).

var SOURCE_PATH = path.resolve(__dirname, "CompetitionEntryCreateModal.jsx");

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

function getDirectEditBlock(source) {
  var start = source.indexOf("async function handleDirectAdminEdit() {");
  var end = source.indexOf("async function handleSubmit() {");

  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);

  return source.slice(start, end);
}

function getAdminEditEntryCallBlock(directEditBlock) {
  var start = directEditBlock.indexOf("response = await adminEditEntry({");
  var end = directEditBlock.indexOf("});", start);

  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);

  return directEditBlock.slice(start, end);
}

// The mutation itself: guard, setIsSubmittingDirect(true), the API call, and
// its own try/catch/finally. Ends right after the finally block closes.
function getMutationStepBlock(directEditBlock) {
  var finallyOpenIndex = directEditBlock.indexOf("} finally {");
  expect(finallyOpenIndex).toBeGreaterThan(-1);

  var finallyBodyStart = finallyOpenIndex + "} finally {".length;
  var finallyCloseIndex = directEditBlock.indexOf("}", finallyBodyStart);

  expect(finallyCloseIndex).toBeGreaterThan(finallyBodyStart);

  return directEditBlock.slice(0, finallyCloseIndex + 1);
}

function getCatchBlock(fnBlock) {
  var start = fnBlock.indexOf("} catch (error) {");
  var end = fnBlock.indexOf("} finally {", start);

  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);

  return fnBlock.slice(start, end);
}

function getRefreshStepBlock(directEditBlock) {
  var start = directEditBlock.indexOf(
    'if (typeof props.onCreated === "function") {',
  );
  var end = directEditBlock.length;

  expect(start).toBeGreaterThan(-1);

  return directEditBlock.slice(start, end);
}

function getNonDirectEditBlock(source) {
  var handleSubmitStart = source.indexOf("async function handleSubmit() {");
  expect(handleSubmitStart).toBeGreaterThan(-1);

  var start = source.indexOf("if (isEditMode) {", handleSubmitStart);
  var end = source.indexOf(
    'if (typeof props.onCreated === "function") {',
    start,
  );

  expect(start).toBeGreaterThan(handleSubmitStart);
  expect(end).toBeGreaterThan(start);

  return source.slice(start, end);
}

describe("CompetitionEntryCreateModal - Phase 3C direct admin edit", () => {
  it("useDirectAdminEdit is strict-equality gated, so omitting the prop keeps it falsy for every other caller", () => {
    expect(readSource()).toContain(
      'var useDirectAdminEdit = props.useDirectAdminEdit === true;',
    );
  });

  it("handleSubmit routes to handleDirectAdminEdit only when isEditMode AND useDirectAdminEdit are both true", () => {
    var source = readSource();
    var handleSubmitStart = source.indexOf("async function handleSubmit() {");
    var handleSubmitGuard = source.slice(
      handleSubmitStart,
      handleSubmitStart + 200,
    );

    expect(handleSubmitGuard).toContain(
      "if (isEditMode && useDirectAdminEdit) {",
    );
    expect(handleSubmitGuard).toContain("await handleDirectAdminEdit();");
    expect(handleSubmitGuard).toContain("return;");
  });

  it("calls adminEditEntry (POST /Entries/admin-edit) with exactly the AdminEditEntryRequest fields, no old-path fields", () => {
    var block = getAdminEditEntryCallBlock(getDirectEditBlock(readSource()));

    [
      "entryId: editItem.entryId",
      "competitionId: activeCompetition?.competitionId",
      "ranchId: activeRole?.ranchId",
      "classInCompId: registrations.selectedClass?.classInCompId",
      "horseId: registrations.selectedHorse?.horseId",
      "riderFederationMemberId:",
      "coachFederationMemberId:",
      "prizeRecipientName:",
    ].forEach(function (fragment) {
      expect(block).toContain(fragment);
    });

    // Old create+change-request path fields must never appear in the new
    // admin-edit payload - proves this isn't a relabeled copy of the old flow.
    [
      "paidByPersonId",
      "orderedBySystemUserId",
      "isCancelled",
      "originalEntryId",
      "newEntryId",
    ].forEach(function (fragment) {
      expect(block).not.toContain(fragment);
    });
  });

  it("the direct-edit path never creates a new entry and never calls createChangeEntryRequest", () => {
    var directEditBlock = getDirectEditBlock(readSource());

    expect(directEditBlock).not.toContain("createEntry(");
    expect(directEditBlock).not.toContain("handleCreateEntry(");
    expect(directEditBlock).not.toContain("createChangeEntryRequest(");
  });

  it("reads resultType defensively across camelCase/PascalCase wire casing", () => {
    var directEditBlock = getDirectEditBlock(readSource());

    expect(directEditBlock).toContain(
      "response?.data?.resultType || response?.data?.ResultType",
    );
  });

  it("guards against duplicate submission with an isSubmittingDirect early return, set/reset around the mutation only", () => {
    var directEditBlock = getDirectEditBlock(readSource());

    var guardIndex = directEditBlock.indexOf("if (isSubmittingDirect) {");
    var setTrueIndex = directEditBlock.indexOf("setIsSubmittingDirect(true);");
    var finallyIndex = directEditBlock.indexOf("} finally {");
    var setFalseIndex = directEditBlock.indexOf(
      "setIsSubmittingDirect(false);",
    );

    expect(guardIndex).toBeGreaterThan(-1);
    expect(setTrueIndex).toBeGreaterThan(guardIndex);
    expect(finallyIndex).toBeGreaterThan(setTrueIndex);
    expect(setFalseIndex).toBeGreaterThan(finallyIndex);

    // Exactly one reset, scoped to the mutation's own finally - not deferred
    // until after the refresh step, so a legitimate retry is never blocked
    // by a slow/failed refresh.
    expect(
      countOccurrences(directEditBlock, "setIsSubmittingDirect(false);"),
    ).toBe(1);
  });

  it("wires isSubmittingDirect into canSubmit/isSaving so the submit button disables mid-flight", () => {
    var source = readSource();

    expect(source).toContain(
      "canSubmit={registrations.canSubmit && !isSubmittingDirect}",
    );
    expect(source).toContain(
      "isSaving={registrations.isSaving || isSubmittingDirect}",
    );
  });

  it("on mutation failure: shows a mapped error alert, returns before any success/refresh code, and leaves the modal open", () => {
    var directEditBlock = getDirectEditBlock(readSource());
    var catchBlock = getCatchBlock(directEditBlock);

    expect(catchBlock).toContain('Alert.alert(\n        "שגיאה",');
    expect(catchBlock).toContain("return;");
    expect(catchBlock).not.toContain("props.onClose");
    expect(catchBlock).not.toContain("props.onCreated");
    expect(catchBlock).not.toContain("getResultTypeCopy");
  });

  describe("copy-selection boundary (Blocker 2)", () => {
    it("no local edit-result copy helper remains - payerAccountCopy.js is the single source of truth", () => {
      var source = readSource();

      expect(source).not.toContain("getDirectEditResultCopy");
      expect(source).not.toContain("ההרשמה עודכנה בהצלחה");
      expect(source).not.toContain("בקשת השינוי נשלחה למזכירה לאישור");
    });

    it("imports getResultTypeCopy and RESULT_CATEGORY from payerAccountCopy.js", () => {
      var source = readSource();

      expect(source).toContain(
        'import {\n  getResultTypeCopy,\n  RESULT_CATEGORY,\n} from "../../utils/payerAccountCopy";',
      );
    });

    it("handleDirectAdminEdit selects copy via getResultTypeCopy(resultType) exactly once, and derives the Alert title from category", () => {
      var block = getDirectEditBlock(readSource());

      expect(countOccurrences(block, "getResultTypeCopy(")).toBe(1);
      expect(block).toContain("var copy = getResultTypeCopy(resultType);");
      expect(block).toContain(
        'copy.category === RESULT_CATEGORY.SECRETARY_PENDING ? "נשלח" : "עודכן"',
      );
      expect(block).toContain("Alert.alert(alertTitle, copy.text);");
    });
  });

  describe("mutation success is decoupled from refresh (Blocker 1)", () => {
    it("resultType/copy selection/success alert/close all happen strictly after the mutation's own finally settles", () => {
      var directEditBlock = getDirectEditBlock(readSource());

      var finallyIndex = directEditBlock.indexOf("} finally {");
      var resultTypeIndex = directEditBlock.indexOf("var resultType =");
      var copyIndex = directEditBlock.indexOf(
        "var copy = getResultTypeCopy(resultType);",
      );
      var alertIndex = directEditBlock.indexOf("Alert.alert(alertTitle, copy.text);");
      var closeIndex = directEditBlock.indexOf("props.onClose();");
      var refreshGuardIndex = directEditBlock.indexOf(
        'if (typeof props.onCreated === "function") {',
      );

      expect(resultTypeIndex).toBeGreaterThan(finallyIndex);
      expect(copyIndex).toBeGreaterThan(resultTypeIndex);
      expect(alertIndex).toBeGreaterThan(copyIndex);
      expect(closeIndex).toBeGreaterThan(alertIndex);
      expect(refreshGuardIndex).toBeGreaterThan(closeIndex);
    });

    it("the success alert and modal close are NOT inside the refresh's try/catch - they already ran before refresh starts", () => {
      var directEditBlock = getDirectEditBlock(readSource());
      var refreshBlock = getRefreshStepBlock(directEditBlock);

      expect(refreshBlock).not.toContain("Alert.alert(alertTitle");
      expect(refreshBlock).not.toContain("props.onClose();");
    });

    it("refresh (props.onCreated) runs in its own try/catch, isolated from the mutation's error handling", () => {
      var directEditBlock = getDirectEditBlock(readSource());
      var refreshBlock = getRefreshStepBlock(directEditBlock);

      expect(refreshBlock).toContain("try {");
      expect(refreshBlock).toContain("await props.onCreated();");
      expect(refreshBlock).toContain("} catch (refreshError) {");
      // Not swallowed silently - logged, per the screen's existing
      // console.log-on-catch convention (see loadAccount).
      expect(refreshBlock).toContain(
        'console.log("DIRECT ADMIN EDIT REFRESH ERROR", refreshError);',
      );
    });

    it("a refresh failure cannot be reported as an edit failure - the refresh catch never shows the mutation's error alert and never re-throws", () => {
      var directEditBlock = getDirectEditBlock(readSource());
      var refreshBlock = getRefreshStepBlock(directEditBlock);

      var refreshCatchStart = refreshBlock.indexOf("} catch (refreshError) {");
      var refreshCatchBlock = refreshBlock.slice(refreshCatchStart);

      expect(refreshCatchBlock).not.toContain("Alert.alert");
      expect(refreshCatchBlock).not.toContain("throw");
    });

    it("the mutation's own try/catch/finally never awaits props.onCreated - refresh is strictly a separate step", () => {
      var directEditBlock = getDirectEditBlock(readSource());
      var mutationStep = getMutationStepBlock(directEditBlock);

      expect(mutationStep).not.toContain("props.onCreated");
      expect(mutationStep).not.toContain("props.onClose");
    });
  });

  it("the pre-existing non-direct edit path (classes-screen caller) is untouched: still creates a replacement entry then a change request", () => {
    var nonDirectBlock = getNonDirectEditBlock(readSource());

    expect(nonDirectBlock).toContain(
      "registrations.handleCreateEntry({\n          suppressSuccess: true,\n        });",
    );
    expect(nonDirectBlock).toContain("await createChangeEntryRequest({");
    expect(nonDirectBlock).toContain("originalEntryId: editItem.entryId,");
  });
});

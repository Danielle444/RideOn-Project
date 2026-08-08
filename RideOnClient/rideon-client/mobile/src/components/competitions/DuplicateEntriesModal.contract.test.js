import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// Styled-alert migration: this component's 4 native Alert.alert call sites
// become AppDialog (bulk-confirm, post-duplicate summary) or showToast
// (empty-selection, submit failure). The component is off-design and
// currently unreachable from AdminCompetitionClassesScreen.jsx
// (DUPLICATE_ENTRIES_ENABLED = false there), but the migration must still
// preserve its decision semantics exactly - per the migration's explicit
// instruction, the post-duplicate summary MUST stay a single-button
// AppDialog whose acknowledgement gates onDuplicated()+onClose(), not become
// an auto-dismiss toast. The component imports react-native modules not
// safe to import under plain vitest, so this reads source text - same
// approach as the repo's other *.contract.test.js files.

var SOURCE_PATH = path.resolve(__dirname, "DuplicateEntriesModal.jsx");

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

describe("DuplicateEntriesModal - styled-alert migration", () => {
  it("no native Alert import or Alert.alert call remains", () => {
    var source = readSource();

    expect(source).not.toMatch(/\bAlert\.alert\b/);
    expect(source).not.toMatch(/from "react-native"[\s\S]{0,120}Alert/);
  });

  it("imports AppDialog and showToast", () => {
    var source = readSource();

    expect(source).toContain('import AppDialog from "../common/AppDialog";');
    expect(source).toContain(
      'import { showToast } from "../../services/toastService";',
    );
  });

  it("empty-selection guard shows a toast and returns before opening the bulk-confirm dialog", () => {
    var block = getFunctionBlock(
      readSource(),
      "function handleSubmit() {",
      "function handleConfirmDuplicateCancel() {",
    );

    expect(block).toContain(
      'showToast("סמן לפחות הרשמה אחת לשכפול", "warning");',
    );
    var toastIndex = block.indexOf("showToast(");
    var returnIndex = block.indexOf("return;", toastIndex);
    var openDialogIndex = block.indexOf("setConfirmDuplicateOpen(true);");

    expect(returnIndex).toBeGreaterThan(toastIndex);
    expect(returnIndex).toBeLessThan(openDialogIndex);
  });

  it("bulk-duplicate confirmation opens an AppDialog instead of calling doSubmit synchronously", () => {
    var block = getFunctionBlock(
      readSource(),
      "function handleSubmit() {",
      "function handleConfirmDuplicateCancel() {",
    );

    expect(block).toContain("setConfirmDuplicateOpen(true);");
    expect(block).not.toContain("doSubmit()");
  });

  it("cancelling the bulk-confirm dialog only closes it - doSubmit never runs", () => {
    var block = getFunctionBlock(
      readSource(),
      "function handleConfirmDuplicateCancel() {",
      "function handleConfirmDuplicateConfirm() {",
    );

    expect(block).toContain("setConfirmDuplicateOpen(false);");
    expect(block).not.toContain("doSubmit");
  });

  it("confirming the bulk-confirm dialog closes it and runs doSubmit exactly once", () => {
    var block = getFunctionBlock(
      readSource(),
      "function handleConfirmDuplicateConfirm() {",
      "function handleSummaryDialogAcknowledge() {",
    );

    expect(block).toContain("setConfirmDuplicateOpen(false);");
    expect(block).toContain("doSubmit();");

    var closeIndex = block.indexOf("setConfirmDuplicateOpen(false);");
    var submitIndex = block.indexOf("doSubmit();");
    expect(submitIndex).toBeGreaterThan(closeIndex);
  });

  it("the post-duplicate summary stays a single-button AppDialog whose acknowledgement gates onDuplicated()+onClose() - not an auto-dismiss toast", () => {
    var block = getFunctionBlock(
      readSource(),
      "function handleSummaryDialogAcknowledge() {",
      "function doSubmit() {",
    );

    expect(block).toContain("setSummaryDialogOpen(false);");
    expect(block).toContain("onDuplicated();");
    expect(block).toContain("onClose();");

    // onDuplicated/onClose must run only from the acknowledgement handler,
    // not unconditionally when the summary is computed in doSubmit.
    var source = readSource();
    var doSubmitBlock = getFunctionBlock(
      source,
      "function doSubmit() {",
      "function renderHeader() {",
    );
    expect(doSubmitBlock).not.toContain("onDuplicated()");
    expect(doSubmitBlock).not.toContain("onClose()");
  });

  it("doSubmit stores the summary message and opens the dialog on success, without calling showToast for success", () => {
    var block = getFunctionBlock(
      readSource(),
      "function doSubmit() {",
      "function renderHeader() {",
    );

    var thenIndex = block.indexOf(".then(function (response) {");
    var catchIndex = block.indexOf(".catch(function (err) {");
    var successBlock = block.slice(thenIndex, catchIndex);

    expect(successBlock).toContain("setSummaryMessage(message);");
    expect(successBlock).toContain("setSummaryDialogOpen(true);");
    expect(successBlock).not.toContain("showToast");
  });

  it("submit failure shows an error toast via the shared extractErrorMessage helper", () => {
    var block = getFunctionBlock(
      readSource(),
      "function doSubmit() {",
      "function renderHeader() {",
    );

    var catchIndex = block.indexOf(".catch(function (err) {");
    var financeIndex = block.indexOf(".finally(function () {", catchIndex);
    var catchBlock = block.slice(catchIndex, financeIndex);

    expect(catchBlock).toContain(
      'showToast(extractErrorMessage(err), "error");',
    );
  });

  it("resetState clears both new dialog states so reopening the modal never shows a stale confirm/summary dialog", () => {
    var block = getFunctionBlock(
      readSource(),
      "function resetState() {",
      "function loadPastComps() {",
    );

    expect(block).toContain("setConfirmDuplicateOpen(false);");
    expect(block).toContain("setSummaryDialogOpen(false);");
    expect(block).toContain('setSummaryMessage("");');
  });

  it("renders the bulk-confirm AppDialog with both onConfirm and onCancel wired", () => {
    var source = readSource();
    var start = source.indexOf("<AppDialog\n        visible={confirmDuplicateOpen}");
    expect(start).toBeGreaterThan(-1);

    var end = source.indexOf("/>", start);
    var block = source.slice(start, end);

    expect(block).toContain("onConfirm={handleConfirmDuplicateConfirm}");
    expect(block).toContain("onCancel={handleConfirmDuplicateCancel}");
  });

  it("renders the summary AppDialog with only onConfirm - no onCancel, so it cannot be dismissed without acknowledging", () => {
    var source = readSource();
    var start = source.indexOf("<AppDialog\n        visible={summaryDialogOpen}");
    expect(start).toBeGreaterThan(-1);

    var end = source.indexOf("/>", start);
    var block = source.slice(start, end);

    expect(block).toContain("onConfirm={handleSummaryDialogAcknowledge}");
    expect(block).not.toContain("onCancel=");
  });
});

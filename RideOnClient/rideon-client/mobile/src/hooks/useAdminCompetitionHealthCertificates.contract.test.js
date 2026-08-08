import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// The hook imports react-native (Alert) and expo-document-picker, not safe
// to import under plain vitest, so this reads source text - same approach as
// the repo's other *.contract.test.js files (e.g.
// useAdminCompetitionRegistrations.contract.test.js).
//
// What this must guarantee, per the health-certificate upload audit:
//   * a rapid double-tap on the same horse's upload button cannot start two
//     uploads (the createInFlightGuard acquire/release pair);
//   * an unsupported file type or an oversized file is rejected BEFORE any
//     network call, with its own clear message;
//   * neither error path (list load, upload) ever echoes
//     error?.response?.data or a bare error?.message into the alert -
//     both must route through resolveHealthCertificateErrorMessage;
//   * success still refreshes the list via loadCertificates().

var SOURCE_PATH = path.resolve(
  __dirname,
  "useAdminCompetitionHealthCertificates.js",
);

function readSource() {
  return fs.readFileSync(SOURCE_PATH, "utf8");
}

function getUploadFunctionBody(source) {
  var start = source.indexOf("async function uploadHealthCertificate(horse) {");
  expect(start).toBeGreaterThan(-1);

  var end = source.indexOf("\n  return {", start);
  expect(end).toBeGreaterThan(start);

  return source.slice(start, end);
}

describe("useAdminCompetitionHealthCertificates double-submit prevention", () => {
  it("imports the shared in-flight guard rather than relying on React state timing", () => {
    expect(readSource()).toContain(
      'import { createInFlightGuard } from "../utils/inFlightGuard";',
    );
  });

  it("acquires a per-horse guard as the very first statement, before the picker or any validation runs", () => {
    var body = getUploadFunctionBody(readSource());

    var acquireIndex = body.indexOf("uploadGuardRef.current.tryAcquire(guardKey)");
    var pickerIndex = body.indexOf("DocumentPicker.getDocumentAsync(");

    expect(acquireIndex).toBeGreaterThan(-1);
    expect(pickerIndex).toBeGreaterThan(-1);
    expect(acquireIndex).toBeLessThan(pickerIndex);
  });

  it("releases the guard in a finally block so a failed or cancelled upload can be retried", () => {
    var body = getUploadFunctionBody(readSource());
    var financeBlock = body.slice(body.indexOf("} finally {"));

    expect(financeBlock).toContain("uploadGuardRef.current.release(guardKey);");
  });
});

describe("useAdminCompetitionHealthCertificates client-side validation", () => {
  it("checks file type and size before calling uploadHealthCertificateFile", () => {
    var body = getUploadFunctionBody(readSource());

    var typeCheckIndex = body.indexOf("isSupportedHealthCertificateFile(file)");
    var sizeCheckIndex = body.indexOf("isHealthCertificateFileTooLarge(file)");
    var networkCallIndex = body.indexOf("await uploadHealthCertificateFile(");

    expect(typeCheckIndex).toBeGreaterThan(-1);
    expect(sizeCheckIndex).toBeGreaterThan(-1);
    expect(networkCallIndex).toBeGreaterThan(-1);

    expect(typeCheckIndex).toBeLessThan(networkCallIndex);
    expect(sizeCheckIndex).toBeLessThan(networkCallIndex);
  });

  it("returns immediately on picker cancellation, before any validation or alert", () => {
    var body = getUploadFunctionBody(readSource());

    var canceledCheck = body.indexOf("if (result.canceled) {");
    var typeCheckIndex = body.indexOf("isSupportedHealthCertificateFile(file)");

    expect(canceledCheck).toBeGreaterThan(-1);
    expect(canceledCheck).toBeLessThan(typeCheckIndex);
  });
});

describe("useAdminCompetitionHealthCertificates Approved re-upload confirmation", () => {
  it("uses the approved Hebrew confirmation message, unchanged from the spec", () => {
    var source = readSource();

    expect(source).toContain("var REPLACE_APPROVED_CERTIFICATE_MESSAGE =");
    expect(source).toContain(
      '"החלפת תעודה מאושרת תחזיר אותה למצב ממתין לאישור המזכירות. להמשיך?";',
    );
  });

  it("gates the confirmation on the certificate currently being Approved, nothing else", () => {
    var body = getUploadFunctionBody(readSource());

    expect(body).toContain('if (horse.hcApprovalStatus === "Approved") {');
    expect(body).toContain("await confirmReplaceApprovedCertificate()");
  });

  it("asks for confirmation after the guard acquire but before the file picker opens", () => {
    var body = getUploadFunctionBody(readSource());

    var confirmIndex = body.indexOf("confirmReplaceApprovedCertificate()");
    var pickerIndex = body.indexOf("DocumentPicker.getDocumentAsync(");

    expect(confirmIndex).toBeGreaterThan(-1);
    expect(pickerIndex).toBeGreaterThan(-1);
    expect(confirmIndex).toBeLessThan(pickerIndex);
  });

  it("returns without opening the picker when the admin does not confirm", () => {
    var body = getUploadFunctionBody(readSource());
    var confirmBlockStart = body.indexOf(
      'if (horse.hcApprovalStatus === "Approved") {',
    );
    var pickerIndex = body.indexOf("DocumentPicker.getDocumentAsync(");
    var confirmBlock = body.slice(confirmBlockStart, pickerIndex);

    expect(confirmBlock).toContain("if (!confirmedReplace) {");
    expect(confirmBlock).toContain("return;");
  });

  it("still releases the in-flight guard when the admin cancels the confirmation", () => {
    // The early return above lives inside the same try/finally as the rest
    // of the flow, so the existing "releases the guard in a finally block"
    // test already proves this - this test pins that the confirmation gate
    // was not moved outside that try block.
    var body = getUploadFunctionBody(readSource());
    var tryIndex = body.indexOf("try {");
    var confirmIndex = body.indexOf(
      'if (horse.hcApprovalStatus === "Approved") {',
    );
    var financeIndex = body.indexOf("} finally {");

    expect(tryIndex).toBeGreaterThan(-1);
    expect(confirmIndex).toBeGreaterThan(tryIndex);
    expect(financeIndex).toBeGreaterThan(confirmIndex);
  });

  it("does not confirm for a certificate that is not Approved (Pending or not-yet-uploaded)", () => {
    var body = getUploadFunctionBody(readSource());

    // The only gate on the confirmation call is the Approved check above -
    // there must be no second unconditional call site.
    var occurrences =
      body.split("confirmReplaceApprovedCertificate()").length - 1;

    expect(occurrences).toBe(1);
  });
});

describe("useAdminCompetitionHealthCertificates status tabs", () => {
  it("imports the shared tab classification helpers", () => {
    expect(readSource()).toContain(
      'from "../utils/healthCertificateStatus.utils"',
    );
  });

  it("defaults to the action-required tab", () => {
    expect(readSource()).toContain(
      "useState(DEFAULT_HEALTH_CERTIFICATE_TAB)",
    );
  });

  it("derives visibleCertificates from the active tab, not the raw list", () => {
    expect(readSource()).toContain(
      "filterCertificatesByTab(certificates, activeTab)",
    );
  });

  it("exposes tabs, activeTab and visibleCertificates from the hook", () => {
    var source = readSource();
    var returnStart = source.lastIndexOf("\n  return {");
    var returnBlock = source.slice(returnStart);

    expect(returnBlock).toContain("visibleCertificates: visibleCertificates,");
    expect(returnBlock).toContain("activeTab: activeTab,");
    expect(returnBlock).toContain("setActiveTab: setActiveTab,");
    expect(returnBlock).toContain("tabs: tabs,");
  });
});

describe("useAdminCompetitionHealthCertificates error presentation", () => {
  it("never echoes the raw response body or error message into a toast", () => {
    var source = readSource();

    expect(source).not.toContain("String(error?.response?.data");
    expect(source).not.toContain("error?.message ||");
  });

  it("routes both the list-load and the upload failure through the shared error-message resolver", () => {
    var source = readSource();
    var occurrences = source.split("resolveHealthCertificateErrorMessage(").length - 1;

    // One call site in loadCertificates's catch, one in
    // uploadHealthCertificate's catch (the import line has no "(").
    expect(occurrences).toBe(2);
  });

  it("success still refreshes the certificate list", () => {
    var body = getUploadFunctionBody(readSource());

    var successToastIndex = body.indexOf("הועלתה בהצלחה");
    var networkCallIndex = body.indexOf("await uploadHealthCertificateFile(");
    var refreshIndex = body.indexOf("await loadCertificates();");

    expect(successToastIndex).toBeGreaterThan(-1);
    expect(refreshIndex).toBeGreaterThan(-1);
    expect(successToastIndex).toBeGreaterThan(networkCallIndex);
    expect(refreshIndex).toBeGreaterThan(successToastIndex);
  });
});

describe("useAdminCompetitionHealthCertificates styled-alert migration", () => {
  it("no native Alert import or Alert.alert call remains", () => {
    var source = readSource();

    expect(source).not.toMatch(/Alert\.alert\(/);
    expect(source).not.toMatch(/from "react-native"[\s\S]{0,120}Alert/);
  });

  it("imports showToast for validation/error/success notices", () => {
    expect(readSource()).toContain(
      'import { showToast } from "../services/toastService";',
    );
  });

  it("every remaining single-button notice (validation, load error, upload error, success) uses showToast", () => {
    var source = readSource();
    var showToastCount = source.split("showToast(").length - 1;

    // loadCertificates catch, no-competition guard, no-ranch guard, no-file
    // guard, unsupported-type guard, too-large guard, upload success, upload
    // catch = 8 call sites.
    expect(showToastCount).toBe(8);
  });
});

// The approved-certificate replacement warning is a real confirm/cancel
// decision (not a passive notice), so it stays an AppDialog - unlike the
// duplicate-entry confirm, this hook has exactly one consumer
// (AdminCompetitionHealthCertificatesScreen.jsx), so the dialog-props
// contract only needs to be rendered in that one screen.
describe("useAdminCompetitionHealthCertificates replace-approved-certificate dialog contract", () => {
  it("confirmReplaceApprovedCertificate opens the dialog and awaits its resolution, instead of calling a native Alert", () => {
    var source = readSource();
    var start = source.indexOf("function confirmReplaceApprovedCertificate() {");
    var end = source.indexOf("var loadCertificates = useCallback(");
    var block = source.slice(start, end);

    expect(block).toContain("return new Promise(function (resolve) {");
    expect(block).toContain("replaceConfirmResolveRef.current = resolve;");
    expect(block).toContain("setReplaceConfirmVisible(true);");
  });

  it("resolveReplaceConfirm closes the dialog, resolves the pending promise, and clears the ref", () => {
    var source = readSource();
    var start = source.indexOf("function resolveReplaceConfirm(confirmed) {");
    var end = source.indexOf("function confirmReplaceApprovedCertificate() {");
    var block = source.slice(start, end);

    expect(block).toContain("setReplaceConfirmVisible(false);");
    expect(block).toContain(
      "var resolve = replaceConfirmResolveRef.current;",
    );
    expect(block).toContain("replaceConfirmResolveRef.current = null;");
    expect(block).toContain("resolve(confirmed);");
  });

  it("exposes replaceApprovedCertificateDialogProps with the full AppDialog contract: visible, title, message, both labels, destructive, onConfirm and onCancel", () => {
    var source = readSource();
    var dialogPropsBlock = source.slice(
      source.indexOf("replaceApprovedCertificateDialogProps: {"),
    );

    expect(dialogPropsBlock).toContain("visible: replaceConfirmVisible,");
    expect(dialogPropsBlock).toContain(
      "title: REPLACE_APPROVED_CERTIFICATE_TITLE,",
    );
    expect(dialogPropsBlock).toContain(
      "message: REPLACE_APPROVED_CERTIFICATE_MESSAGE,",
    );
    expect(dialogPropsBlock).toContain(
      "confirmLabel: REPLACE_APPROVED_CERTIFICATE_CONFIRM_LABEL,",
    );
    expect(dialogPropsBlock).toContain(
      "cancelLabel: REPLACE_APPROVED_CERTIFICATE_CANCEL_LABEL,",
    );
    expect(dialogPropsBlock).toContain("destructive: true,");
    expect(dialogPropsBlock).toContain("onConfirm: function () {");
    expect(dialogPropsBlock).toContain("resolveReplaceConfirm(true);");
    expect(dialogPropsBlock).toContain("onCancel: function () {");
    expect(dialogPropsBlock).toContain("resolveReplaceConfirm(false);");
  });
});

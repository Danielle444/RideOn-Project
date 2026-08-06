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

describe("useAdminCompetitionHealthCertificates error presentation", () => {
  it("never echoes the raw response body or error message into an Alert", () => {
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

    var successAlertIndex = body.indexOf('"בוצע"');
    var networkCallIndex = body.indexOf("await uploadHealthCertificateFile(");
    var refreshIndex = body.indexOf("await loadCertificates();");

    expect(successAlertIndex).toBeGreaterThan(-1);
    expect(refreshIndex).toBeGreaterThan(-1);
    expect(successAlertIndex).toBeGreaterThan(networkCallIndex);
    expect(refreshIndex).toBeGreaterThan(successAlertIndex);
  });
});

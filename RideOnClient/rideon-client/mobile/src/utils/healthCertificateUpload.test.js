import { describe, it, expect } from "vitest";

import {
  MAX_HEALTH_CERTIFICATE_FILE_SIZE_BYTES,
  isHealthCertificateFileTooLarge,
  isSupportedHealthCertificateFile,
  resolveHealthCertificateErrorMessage,
} from "./healthCertificateUpload";

describe("isSupportedHealthCertificateFile", () => {
  it("accepts a file with the PDF mime type", () => {
    expect(
      isSupportedHealthCertificateFile({
        mimeType: "application/pdf",
        name: "cert",
      }),
    ).toBe(true);
  });

  it("accepts a .pdf filename even without a mime type", () => {
    expect(
      isSupportedHealthCertificateFile({ mimeType: null, name: "cert.PDF" }),
    ).toBe(true);
  });

  it("rejects a non-PDF file", () => {
    expect(
      isSupportedHealthCertificateFile({
        mimeType: "image/png",
        name: "photo.png",
      }),
    ).toBe(false);
  });

  it("rejects a missing file", () => {
    expect(isSupportedHealthCertificateFile(null)).toBe(false);
  });
});

describe("isHealthCertificateFileTooLarge", () => {
  it("allows a file under the limit", () => {
    expect(
      isHealthCertificateFileTooLarge({
        size: MAX_HEALTH_CERTIFICATE_FILE_SIZE_BYTES - 1,
      }),
    ).toBe(false);
  });

  it("allows a file exactly at the limit", () => {
    expect(
      isHealthCertificateFileTooLarge({
        size: MAX_HEALTH_CERTIFICATE_FILE_SIZE_BYTES,
      }),
    ).toBe(false);
  });

  it("rejects a file over the limit", () => {
    expect(
      isHealthCertificateFileTooLarge({
        size: MAX_HEALTH_CERTIFICATE_FILE_SIZE_BYTES + 1,
      }),
    ).toBe(true);
  });

  it("does not block a file with no reported size (server stays the backstop)", () => {
    expect(isHealthCertificateFileTooLarge({ size: undefined })).toBe(false);
  });
});

describe("resolveHealthCertificateErrorMessage", () => {
  it("names session expiry distinctly for an auth-interceptor rejection", () => {
    var message = resolveHealthCertificateErrorMessage(
      { isAuthError: true },
      "fallback",
    );

    expect(message).toContain("פג תוקף ההתחברות");
  });

  it("names a permission denial distinctly for a 403", () => {
    var message = resolveHealthCertificateErrorMessage(
      { response: { status: 403, data: "אין לך הרשאה להעלות תעודת בריאות עבור סוס זה" } },
      "fallback",
    );

    expect(message).toContain("הרשאה");
  });

  it("names a validation problem distinctly for a 400, without echoing the body", () => {
    var message = resolveHealthCertificateErrorMessage(
      { response: { status: 400, data: "Invalid horse id" } },
      "fallback",
    );

    expect(message).not.toContain("Invalid horse id");
  });

  it("falls back to the caller-provided message for a 500", () => {
    var message = resolveHealthCertificateErrorMessage(
      { response: { status: 500, data: "שגיאה בהעלאת תעודת הבריאות" } },
      "fallback message",
    );

    expect(message).toBe("fallback message");
  });

  it("falls back to the caller-provided message for a network/timeout error with no response", () => {
    var message = resolveHealthCertificateErrorMessage(
      { message: "timeout of 60000ms exceeded" },
      "fallback message",
    );

    expect(message).toBe("fallback message");
  });

  it("never returns the raw error message or response body", () => {
    var message = resolveHealthCertificateErrorMessage(
      { message: "Network Error", response: { status: 500, data: "internal detail" } },
      "fallback message",
    );

    expect(message).not.toBe("Network Error");
    expect(message).not.toBe("internal detail");
  });
});

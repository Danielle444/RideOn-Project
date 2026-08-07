import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// The component imports react-native, not safe to render under plain vitest
// in this repo (no RN test renderer configured) - same source-text approach
// as the sibling *.contract.test.js files for this feature.

var SOURCE_PATH = path.resolve(__dirname, "HealthCertificateCard.jsx");

function readSource() {
  return fs.readFileSync(SOURCE_PATH, "utf8");
}

describe("HealthCertificateCard status labels", () => {
  it("keeps the three pre-existing status labels", () => {
    var source = readSource();

    expect(source).toContain('label: "מאושר"');
    expect(source).toContain('label: "ממתין לאישור"');
    expect(source).toContain('label: "לא הועלה"');
  });

  it("adds the Rejected label", () => {
    expect(readSource()).toContain('label: "נדחה"');
  });

  it("checks for Rejected before falling through to the not-uploaded default", () => {
    var source = readSource();
    var rejectedCheckIndex = source.indexOf('status === "Rejected"');
    var fallbackIndex = source.indexOf('label: "לא הועלה"');

    expect(rejectedCheckIndex).toBeGreaterThan(-1);
    expect(fallbackIndex).toBeGreaterThan(-1);
    expect(rejectedCheckIndex).toBeLessThan(fallbackIndex);
  });
});

describe("HealthCertificateCard rejection reason display", () => {
  it("only renders the rejection reason when the certificate is Rejected", () => {
    expect(readSource()).toContain(
      'cert.hcApprovalStatus === "Rejected" && cert.hcRejectionReason',
    );
  });

  it("labels the reason text in Hebrew", () => {
    expect(readSource()).toContain("סיבת דחייה:");
  });

  it("never renders a raw rejected-by id", () => {
    expect(readSource()).not.toContain("hcRejectedBySystemUserId");
  });
});

describe("HealthCertificateCard replacement-upload action", () => {
  it("keeps a single upload button that doubles as the replacement action, unconditioned on status", () => {
    // The same button (props.onUpload) already fires for any horse with an
    // hcPath, which a Rejected certificate always carries - no new button is
    // needed for the "upload a replacement" requirement.
    expect(readSource()).toContain('cert.hcPath ? "החלף קובץ" : "העלה PDF"');
    expect(readSource()).toContain("props.onUpload(cert)");
  });

  it("keeps the view-file button conditioned only on hcPath, so it still shows for a Rejected certificate", () => {
    expect(readSource()).toContain("{cert.hcPath ? (");
    expect(readSource()).toContain("Linking.openURL(cert.hcPath)");
  });
});

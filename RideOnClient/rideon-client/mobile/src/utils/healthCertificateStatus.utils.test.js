import { describe, it, expect } from "vitest";
import {
  HEALTH_CERTIFICATE_TABS,
  DEFAULT_HEALTH_CERTIFICATE_TAB,
  getHealthCertificateTabKey,
  countHealthCertificatesByTab,
  filterCertificatesByTab,
} from "./healthCertificateStatus.utils";

describe("getHealthCertificateTabKey", () => {
  it("classifies a certificate with no uploaded file as actionRequired regardless of status", () => {
    expect(getHealthCertificateTabKey({ hcPath: null, hcApprovalStatus: null })).toBe(
      "actionRequired",
    );
    expect(
      getHealthCertificateTabKey({ hcPath: "", hcApprovalStatus: "Pending" }),
    ).toBe("actionRequired");
  });

  it("classifies an uploaded, approved certificate as approved", () => {
    expect(
      getHealthCertificateTabKey({
        hcPath: "https://example.com/cert.pdf",
        hcApprovalStatus: "Approved",
      }),
    ).toBe("approved");
  });

  it("classifies an uploaded, pending certificate as pending", () => {
    expect(
      getHealthCertificateTabKey({
        hcPath: "https://example.com/cert.pdf",
        hcApprovalStatus: "Pending",
      }),
    ).toBe("pending");
  });

  it("treats a missing/undefined certificate as actionRequired", () => {
    expect(getHealthCertificateTabKey(null)).toBe("actionRequired");
    expect(getHealthCertificateTabKey(undefined)).toBe("actionRequired");
  });

  it("classifies a Rejected certificate (with a file) as actionRequired, not pending or approved", () => {
    // Locked business rule: Rejected folds into the same tab as "never
    // uploaded" - both mean the admin owes the system a file.
    expect(
      getHealthCertificateTabKey({
        hcPath: "https://example.com/cert.pdf",
        hcApprovalStatus: "Rejected",
      }),
    ).toBe("actionRequired");
  });

  it("defaults an uploaded file with a genuinely unrecognized status to pending, not approved", () => {
    expect(
      getHealthCertificateTabKey({
        hcPath: "https://example.com/cert.pdf",
        hcApprovalStatus: "SomeFutureStatus",
      }),
    ).toBe("pending");
  });
});

describe("countHealthCertificatesByTab", () => {
  it("partitions every certificate into exactly one bucket, folding Rejected into actionRequired", () => {
    var certificates = [
      { hcPath: null, hcApprovalStatus: null },
      { hcPath: "a.pdf", hcApprovalStatus: "Pending" },
      { hcPath: "b.pdf", hcApprovalStatus: "Approved" },
      { hcPath: "c.pdf", hcApprovalStatus: "Approved" },
      { hcPath: "d.pdf", hcApprovalStatus: "Rejected" },
    ];

    var counts = countHealthCertificatesByTab(certificates);

    expect(counts).toEqual({ actionRequired: 2, pending: 1, approved: 2 });
    expect(counts.actionRequired + counts.pending + counts.approved).toBe(
      certificates.length,
    );
  });

  it("returns all-zero counts for an empty or missing list", () => {
    expect(countHealthCertificatesByTab([])).toEqual({
      actionRequired: 0,
      pending: 0,
      approved: 0,
    });
    expect(countHealthCertificatesByTab(null)).toEqual({
      actionRequired: 0,
      pending: 0,
      approved: 0,
    });
  });
});

describe("filterCertificatesByTab", () => {
  var certificates = [
    { horseId: 1, hcPath: null, hcApprovalStatus: null },
    { horseId: 2, hcPath: "a.pdf", hcApprovalStatus: "Pending" },
    { horseId: 3, hcPath: "b.pdf", hcApprovalStatus: "Approved" },
    { horseId: 4, hcPath: "c.pdf", hcApprovalStatus: "Rejected" },
  ];

  it("returns only the certificates matching the given tab", () => {
    expect(filterCertificatesByTab(certificates, "actionRequired")).toEqual([
      certificates[0],
      certificates[3],
    ]);
    expect(filterCertificatesByTab(certificates, "pending")).toEqual([
      certificates[1],
    ]);
    expect(filterCertificatesByTab(certificates, "approved")).toEqual([
      certificates[2],
    ]);
  });

  it("returns an empty array for a missing list", () => {
    expect(filterCertificatesByTab(null, "approved")).toEqual([]);
  });
});

describe("HEALTH_CERTIFICATE_TABS / DEFAULT_HEALTH_CERTIFICATE_TAB", () => {
  it("declares exactly the three approved tabs, in order", () => {
    expect(HEALTH_CERTIFICATE_TABS.map((tab) => tab.key)).toEqual([
      "actionRequired",
      "pending",
      "approved",
    ]);
    expect(HEALTH_CERTIFICATE_TABS.map((tab) => tab.label)).toEqual([
      "דורש פעולה",
      "ממתין לאישור",
      "אושר",
    ]);
  });

  it("defaults to the action-required tab", () => {
    expect(DEFAULT_HEALTH_CERTIFICATE_TAB).toBe("actionRequired");
    expect(HEALTH_CERTIFICATE_TABS.map((tab) => tab.key)).toContain(
      DEFAULT_HEALTH_CERTIFICATE_TAB,
    );
  });
});

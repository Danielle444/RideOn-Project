import { describe, it, expect } from "vitest";
import {
  HEALTH_CERTIFICATE_TABS,
  DEFAULT_HEALTH_CERTIFICATE_TAB,
  getHealthCertificateTabKey,
  countHealthCertificatesByTab,
  matchesHealthCertificateSearch,
  filterHealthCertificates,
} from "./healthCertificateStatus.utils";

describe("getHealthCertificateTabKey", () => {
  it("classifies a certificate with no uploaded file as notUploaded regardless of status", () => {
    expect(
      getHealthCertificateTabKey({ hcPath: null, hcApprovalStatus: null }),
    ).toBe("notUploaded");
    expect(
      getHealthCertificateTabKey({ hcPath: "", hcApprovalStatus: "Pending" }),
    ).toBe("notUploaded");
  });

  it("classifies an uploaded, approved certificate as approved", () => {
    expect(
      getHealthCertificateTabKey({
        hcPath: "https://example.com/cert.pdf",
        hcApprovalStatus: "Approved",
      }),
    ).toBe("approved");
  });

  it("classifies an uploaded, pending certificate as pendingReview", () => {
    expect(
      getHealthCertificateTabKey({
        hcPath: "https://example.com/cert.pdf",
        hcApprovalStatus: "Pending",
      }),
    ).toBe("pendingReview");
  });

  it("classifies an uploaded, rejected certificate as rejected, not pendingReview", () => {
    expect(
      getHealthCertificateTabKey({
        hcPath: "https://example.com/cert.pdf",
        hcApprovalStatus: "Rejected",
      }),
    ).toBe("rejected");
  });

  it("defaults an uploaded file with a genuinely unrecognized status to pendingReview, not approved", () => {
    expect(
      getHealthCertificateTabKey({
        hcPath: "https://example.com/cert.pdf",
        hcApprovalStatus: "SomeFutureStatus",
      }),
    ).toBe("pendingReview");
  });

  it("treats a missing/undefined certificate as notUploaded", () => {
    expect(getHealthCertificateTabKey(null)).toBe("notUploaded");
    expect(getHealthCertificateTabKey(undefined)).toBe("notUploaded");
  });
});

describe("countHealthCertificatesByTab", () => {
  it("partitions every certificate into exactly one of the four buckets", () => {
    var certificates = [
      { hcPath: null, hcApprovalStatus: null },
      { hcPath: "a.pdf", hcApprovalStatus: "Pending" },
      { hcPath: "b.pdf", hcApprovalStatus: "Approved" },
      { hcPath: "c.pdf", hcApprovalStatus: "Approved" },
      { hcPath: "d.pdf", hcApprovalStatus: "Approved" },
      { hcPath: "e.pdf", hcApprovalStatus: "Rejected" },
    ];

    var counts = countHealthCertificatesByTab(certificates);

    expect(counts).toEqual({
      notUploaded: 1,
      pendingReview: 1,
      rejected: 1,
      approved: 3,
    });
    expect(
      counts.notUploaded + counts.pendingReview + counts.rejected + counts.approved,
    ).toBe(certificates.length);
  });

  it("returns all-zero counts for an empty or missing list", () => {
    expect(countHealthCertificatesByTab([])).toEqual({
      notUploaded: 0,
      pendingReview: 0,
      rejected: 0,
      approved: 0,
    });
    expect(countHealthCertificatesByTab(null)).toEqual({
      notUploaded: 0,
      pendingReview: 0,
      rejected: 0,
      approved: 0,
    });
  });
});

describe("matchesHealthCertificateSearch", () => {
  var cert = { horseName: "Bar Sheva", barnName: "אורוות הצפון" };

  it("matches on horse name, case-insensitively", () => {
    expect(matchesHealthCertificateSearch(cert, "bar")).toBe(true);
    expect(matchesHealthCertificateSearch(cert, "BAR")).toBe(true);
  });

  it("matches on barn name", () => {
    expect(matchesHealthCertificateSearch(cert, "הצפון")).toBe(true);
  });

  it("returns false when neither field matches", () => {
    expect(matchesHealthCertificateSearch(cert, "no-match-here")).toBe(false);
  });

  it("treats an empty or whitespace-only search as matching everything", () => {
    expect(matchesHealthCertificateSearch(cert, "")).toBe(true);
    expect(matchesHealthCertificateSearch(cert, "   ")).toBe(true);
    expect(matchesHealthCertificateSearch(cert, undefined)).toBe(true);
  });

  it("does not throw on a missing barnName", () => {
    expect(
      matchesHealthCertificateSearch({ horseName: "Bar" }, "bar"),
    ).toBe(true);
  });
});

describe("filterHealthCertificates", () => {
  var certificates = [
    { horseId: 1, horseName: "Bar", barnName: null, hcPath: null, hcApprovalStatus: null },
    { horseId: 2, horseName: "Baz", barnName: "North", hcPath: "a.pdf", hcApprovalStatus: "Pending" },
    { horseId: 3, horseName: "Qux", barnName: "South", hcPath: "b.pdf", hcApprovalStatus: "Approved" },
    { horseId: 4, horseName: "Zed", barnName: "East", hcPath: "c.pdf", hcApprovalStatus: "Rejected" },
  ];

  it("returns the rejected certificate under the rejected tab", () => {
    expect(filterHealthCertificates(certificates, "rejected", "")).toEqual([
      certificates[3],
    ]);
  });

  it("composes the tab filter and the search filter (search narrows within the tab)", () => {
    expect(
      filterHealthCertificates(certificates, "pendingReview", "baz"),
    ).toEqual([certificates[1]]);

    // A search term that matches a DIFFERENT tab's item returns nothing when
    // filtering within pendingReview - tab and search are ANDed, not ORed.
    expect(
      filterHealthCertificates(certificates, "pendingReview", "qux"),
    ).toEqual([]);
  });

  it("returns every certificate in the tab when the search is empty", () => {
    expect(filterHealthCertificates(certificates, "approved", "")).toEqual([
      certificates[2],
    ]);
  });

  it("returns an empty array for a missing list", () => {
    expect(filterHealthCertificates(null, "approved", "")).toEqual([]);
  });
});

describe("HEALTH_CERTIFICATE_TABS / DEFAULT_HEALTH_CERTIFICATE_TAB", () => {
  it("declares exactly the four approved tabs, in the locked order", () => {
    expect(HEALTH_CERTIFICATE_TABS.map((tab) => tab.key)).toEqual([
      "pendingReview",
      "notUploaded",
      "rejected",
      "approved",
    ]);
    expect(HEALTH_CERTIFICATE_TABS.map((tab) => tab.label)).toEqual([
      "ממתין לבדיקה",
      "טרם הועלה",
      "נדחו",
      "אושר",
    ]);
  });

  it("defaults to the pending-review tab", () => {
    expect(DEFAULT_HEALTH_CERTIFICATE_TAB).toBe("pendingReview");
    expect(HEALTH_CERTIFICATE_TABS.map((tab) => tab.key)).toContain(
      DEFAULT_HEALTH_CERTIFICATE_TAB,
    );
  });
});

import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

// Source-level contract test for the extracted Secretary health-certificate
// hook - same approach as CompetitionHealthCertificatesPage.contract.test.js
// used before this extraction (no DOM test environment, no React Testing
// Library in this repo's web package.json). This file now owns every
// guarantee about state ownership, the load/approve request shape, and
// leakage prevention that used to live directly in the page's source, since
// that logic moved here as part of the tab/search redesign. Nothing about
// the guarantees themselves changed - only their file.

const HOOK_PATH = new URL(
  "./useCompetitionHealthCertificatesPage.js",
  import.meta.url,
);

const hookSource = readFileSync(HOOK_PATH, "utf8");

describe("useCompetitionHealthCertificatesPage load contract", () => {
  it("waits for both competitionId and ranchId before loading", () => {
    expect(hookSource).toContain("if (!competitionId) return;");
    expect(hookSource).toContain("if (!ranchId) return;");
    expect(hookSource).toMatch(/\[competitionId, ranchId\]/);
  });

  it("gives the loader both identifiers, preserving the PR #313 /hosted route call shape", () => {
    expect(hookSource).toContain(
      "await getHealthCertificates(competitionId, ranchId)",
    );
  });

  it("keeps a load error state separate from the certificate list", () => {
    expect(hookSource).toContain("const [loadError, setLoadError] = useState(false);");
    expect(hookSource).toContain("setLoadError(true);");
    expect(hookSource).toContain("setLoadError(false);");
  });

  it("keeps the loading state lifecycle", () => {
    expect(hookSource).toContain("setLoading(true);");
    expect(hookSource).toContain("setLoading(false);");
  });

  it("declares the same fixed Hebrew load-error message as before", () => {
    expect(hookSource).toContain(
      'const LOAD_ERROR_MESSAGE = "אירעה שגיאה בטעינת תעודות הבריאות. יש לנסות שוב.";',
    );
  });

  it("only reads the data envelope from a successful response", () => {
    expect(hookSource).toContain("setCertificates(response.data?.data || []);");
  });
});

describe("useCompetitionHealthCertificatesPage approve contract", () => {
  it("keeps the approve request shape and the busy-row guard", () => {
    expect(hookSource).toContain(
      "await approveHealthCertificate(cert.horseId, competitionId, ranchId);",
    );
    expect(hookSource).toContain("setActionLoadingKey(key);");
    expect(hookSource).toContain("setActionLoadingKey(null);");
  });

  it("uses the approved Hebrew approve-failure message", () => {
    expect(hookSource).toContain(
      'const APPROVE_ERROR_MESSAGE = "אירעה שגיאה באישור תעודת הבריאות";',
    );
  });

  it("routes the approve failure through the shared toast, not a thrown/rendered error", () => {
    expect(hookSource).toContain('showToast("error", APPROVE_ERROR_MESSAGE);');
  });

  it("keeps the confirm-dialog gate before approving", () => {
    expect(hookSource).toContain("function closeConfirmDialog()");
    expect(hookSource).toContain("closeConfirmDialog();");
    expect(hookSource).toMatch(/message: `האם לאשר את תעודת הבריאות של \$\{cert\.horseName\}\?`/);
  });
});

describe("useCompetitionHealthCertificatesPage reject contract", () => {
  it("imports rejectHealthCertificate from the service layer", () => {
    expect(hookSource).toContain(
      "rejectHealthCertificate,",
    );
    expect(hookSource).toContain(
      'from "../../services/healthCertificateService"',
    );
  });

  it("sends horseId, competitionId, ranchId and the trimmed reason", () => {
    expect(hookSource).toContain("await rejectHealthCertificate(");
    expect(hookSource).toContain("cert.horseId,");
    expect(hookSource).toContain("competitionId,");
    expect(hookSource).toContain("ranchId,");
    expect(hookSource).toContain("rejectModal.reason.trim(),");
  });

  it("rejects a whitespace-only reason before calling the service", () => {
    var submitStart = hookSource.indexOf("async function submitReject(");
    var body = hookSource.slice(submitStart, hookSource.indexOf("await rejectHealthCertificate("));

    expect(submitStart).toBeGreaterThan(-1);
    expect(body).toContain("if (!rejectModal.reason.trim()) {");
    expect(body).toContain("REJECT_REASON_REQUIRED_MESSAGE");
  });

  it("uses the approved Hebrew reason-required and reject-failure messages", () => {
    expect(hookSource).toContain(
      'const REJECT_ERROR_MESSAGE = "אירעה שגיאה בדחיית תעודת הבריאות";',
    );
    expect(hookSource).toContain(
      'const REJECT_REASON_REQUIRED_MESSAGE = "יש להזין סיבת דחייה";',
    );
  });

  it("reuses actionLoadingKey as the in-flight guard instead of a second parallel mechanism", () => {
    var submitStart = hookSource.indexOf("async function submitReject(");
    var body = hookSource.slice(submitStart);

    expect(body).toContain("if (actionLoadingKey) {");
    expect(body).toContain("setActionLoadingKey(key);");
    expect(body).toContain("setActionLoadingKey(null);");
  });

  it("on success: closes the modal, shows a toast, and reloads", () => {
    var submitStart = hookSource.indexOf("async function submitReject(");
    var body = hookSource.slice(submitStart);

    var rejectCallIndex = body.indexOf("await rejectHealthCertificate(");
    var closeIndex = body.indexOf("closeRejectModal();");
    var toastIndex = body.indexOf('showToast("success", "תעודת הבריאות נדחתה");');
    var reloadIndex = body.indexOf("await loadCertificates();");

    expect(rejectCallIndex).toBeGreaterThan(-1);
    expect(closeIndex).toBeGreaterThan(rejectCallIndex);
    expect(toastIndex).toBeGreaterThan(closeIndex);
    expect(reloadIndex).toBeGreaterThan(toastIndex);
  });

  it("on failure: keeps the modal open and sets an inline error, never a thrown/rendered exception", () => {
    var submitStart = hookSource.indexOf("async function submitReject(");
    var catchStart = hookSource.indexOf("} catch {", submitStart);
    var financeStart = hookSource.indexOf("} finally {", catchStart);
    var catchBlock = hookSource.slice(catchStart, financeStart);

    expect(catchStart).toBeGreaterThan(-1);
    expect(catchBlock).toContain("error: REJECT_ERROR_MESSAGE");
    expect(catchBlock).not.toContain("closeRejectModal();");
  });

  it("exposes the reject modal state and handlers", () => {
    var returnStart = hookSource.lastIndexOf("return {");
    var returnBlock = hookSource.slice(returnStart);

    expect(returnBlock).toContain("rejectModal: rejectModal,");
    expect(returnBlock).toContain("openRejectModal: openRejectModal,");
    expect(returnBlock).toContain("closeRejectModal: closeRejectModal,");
    expect(returnBlock).toContain("setRejectReason: setRejectReason,");
    expect(returnBlock).toContain("submitReject: submitReject,");
    expect(returnBlock).toContain("isRejectSubmitting: isRejectSubmitting(),");
  });
});

describe("useCompetitionHealthCertificatesPage leakage contract", () => {
  it("never renders the response body or an exception message", () => {
    expect(hookSource).not.toMatch(/response\?\.\.?data\?\.\.?message/);
    expect(hookSource).not.toContain("error.message");
    expect(hookSource).not.toContain("error?.message");
    expect(hookSource).not.toContain("error.response");
    expect(hookSource).not.toContain("error?.response");
  });

  it("does not bind the caught error at all in any handler", () => {
    var occurrences = hookSource.split("} catch {").length - 1;

    // loadCertificates, the approve onConfirm handler, and submitReject.
    expect(occurrences).toBe(3);
    expect(hookSource).not.toMatch(/catch\s*\(\s*[A-Za-z_$]/);
  });

  it("never echoes raw server text into the reject modal's inline error either", () => {
    var submitStart = hookSource.indexOf("async function submitReject(");
    var body = hookSource.slice(submitStart);

    expect(body).not.toContain("error.message");
    expect(body).not.toContain("error?.message");
  });
});

describe("useCompetitionHealthCertificatesPage status tabs", () => {
  it("imports the shared tab classification helpers", () => {
    expect(hookSource).toContain(
      'from "../../utils/healthCertificateStatus.utils"',
    );
  });

  it("defaults to the pending-review tab", () => {
    expect(hookSource).toContain("useState(DEFAULT_HEALTH_CERTIFICATE_TAB)");
  });

  it("derives visibleCertificates from both the active tab and the search text", () => {
    expect(hookSource).toContain(
      "const visibleCertificates = filterHealthCertificates(",
    );
    expect(hookSource).toContain("certificates,");
    expect(hookSource).toContain("activeTab,");
    expect(hookSource).toContain("searchText,");
  });

  it("computes tab counts from the full certificate list, not the filtered one", () => {
    expect(hookSource).toContain(
      "const tabCounts = countHealthCertificatesByTab(certificates);",
    );
  });

  it("maps HEALTH_CERTIFICATE_TABS (all four, including rejected) into tabs with counts", () => {
    expect(hookSource).toContain(
      "const tabs = HEALTH_CERTIFICATE_TABS.map(function (tab) {",
    );
    expect(hookSource).toContain("count: tabCounts[tab.key],");
  });

  it("exposes tabs, activeTab, searchText and visibleCertificates", () => {
    var returnStart = hookSource.indexOf("return {");
    var returnBlock = hookSource.slice(returnStart);

    expect(returnBlock).toContain("visibleCertificates: visibleCertificates,");
    expect(returnBlock).toContain("tabs: tabs,");
    expect(returnBlock).toContain("activeTab: activeTab,");
    expect(returnBlock).toContain("setActiveTab: setActiveTab,");
    expect(returnBlock).toContain("searchText: searchText,");
    expect(returnBlock).toContain("setSearchText: setSearchText,");
  });
});

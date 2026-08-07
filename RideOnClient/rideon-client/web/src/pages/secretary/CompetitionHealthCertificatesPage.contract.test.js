import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

// Source-level contract test for the secretary's health-certificate page.
//
// This repo has no DOM test environment and no React Testing Library (see the
// web package.json devDependencies), so a component that returns JSX cannot
// be rendered here.
//
// As of the status-tab/search redesign, the page's own state and the
// load/approve request logic were extracted into
// useCompetitionHealthCertificatesPage (see
// hooks/secretary/useCompetitionHealthCertificatesPage.contract.test.js for
// those guarantees - state ownership, request shape, error-leakage
// prevention). This file now covers only what still lives directly in the
// page's own source:
//
//   1. useActiveRole is actually CALLED, not merely imported;
//   2. competitionId/ranchId are still passed down correctly;
//   3. the render guards (loading / load-error / empty / per-tab-empty /
//      table) are wired to the right conditions, including over a load
//      failure;
//   4. no alert()/confirm()/prompt() dialogs are used;
//   5. the table columns, status labels, PDF/view link and approve button
//      are preserved;
//   6. the tabs and search input are wired to the hook's state;
//   7. the workspace layout and menu key are preserved.

const PAGE_PATH = new URL(
  "./CompetitionHealthCertificatesPage.jsx",
  import.meta.url,
);

const pageSource = readFileSync(PAGE_PATH, "utf8");

describe("CompetitionHealthCertificatesPage active-role contract", () => {
  it("imports useActiveRole", () => {
    expect(pageSource).toContain(
      'import { useActiveRole } from "../../context/ActiveRoleContext";',
    );
  });

  it("actually calls useActiveRole", () => {
    // The pre-fix file imported the hook and never invoked it, so every reference
    // to activeRole was unresolved.
    expect(pageSource).toMatch(/useActiveRole\(\)/);
    expect(pageSource).toContain("const activeRoleContext = useActiveRole();");
    expect(pageSource).toContain(
      "const activeRole = activeRoleContext.activeRole;",
    );
  });

  it("leaves no unresolved activeRole reference in the content component", () => {
    // activeRole may only appear in the page-level component that owns the hook.
    // The content component receives a plain ranchId prop instead.
    const contentStart = pageSource.indexOf("function HealthCertificatesContent");

    expect(contentStart).toBeGreaterThan(-1);

    expect(pageSource.slice(contentStart)).not.toMatch(/activeRole/);
  });

  it("passes the host ranch id down as a prop", () => {
    expect(pageSource).toMatch(
      /ranchId=\{activeRole \? activeRole\.ranchId : null\}/,
    );
    expect(pageSource).toContain(
      "function HealthCertificatesContent({ competitionId, ranchId })",
    );
  });
});

describe("CompetitionHealthCertificatesPage hook wiring", () => {
  it("delegates state to useCompetitionHealthCertificatesPage instead of owning it", () => {
    expect(pageSource).toContain(
      'import useCompetitionHealthCertificatesPage from "../../hooks/secretary/useCompetitionHealthCertificatesPage";',
    );
    expect(pageSource).toContain("useCompetitionHealthCertificatesPage({");
    expect(pageSource).toContain("competitionId: competitionId,");
    expect(pageSource).toContain("ranchId: ranchId,");
  });

  it("no longer declares its own certificate/loading/error state", () => {
    expect(pageSource).not.toContain("useState(false)");
    expect(pageSource).not.toContain("useState([])");
    expect(pageSource).not.toContain("useState(null)");
  });
});

describe("CompetitionHealthCertificatesPage render-guard contract", () => {
  it("keeps loading, load-error and true-empty guards over the full certificate list", () => {
    expect(pageSource).toMatch(/\{loading && \(/);
    expect(pageSource).toMatch(/\{!loading && loadError && \(/);
    expect(pageSource).toMatch(
      /\{!loading && !loadError && certificates\.length === 0 && \(/,
    );
  });

  it("never shows the true-empty state for a failed request", () => {
    const guardAt = pageSource.indexOf(
      "{!loading && !loadError && certificates.length === 0 && (",
    );

    expect(guardAt).toBeGreaterThan(-1);

    const renderedEmptyAt = pageSource.indexOf(
      "אין סוסים רשומים לתחרות זו",
      guardAt,
    );

    expect(renderedEmptyAt).toBeGreaterThan(-1);
  });

  it("adds a separate empty state for a tab/search combination with zero matches", () => {
    expect(pageSource).toContain("const noResultsInTab =");
    expect(pageSource).toContain("{noResultsInTab && (");
    expect(pageSource).toContain("getTabEmptyMessage(page.activeTab)");
    expect(pageSource).toContain(
      "לא נמצאו תעודות בריאות התואמות את החיפוש.",
    );
  });

  it("renders the table from visibleCertificates, not the raw list", () => {
    expect(pageSource).toContain(
      "{!loading && !loadError && page.visibleCertificates.length > 0 && (",
    );
    expect(pageSource).toContain("{page.visibleCertificates.map(function (cert, index) {");
  });

  it("declares one empty message per tab, matching the approved tab keys", () => {
    expect(pageSource).toContain("pendingReview:");
    expect(pageSource).toContain("notUploaded:");
    expect(pageSource).toContain("rejected:");
    expect(pageSource).toContain("approved:");
  });
});

describe("CompetitionHealthCertificatesPage reject contract", () => {
  it("imports and renders the reject modal", () => {
    expect(pageSource).toContain(
      'import HealthCertificateRejectModal from "../../components/secretary/health-certificates/HealthCertificateRejectModal";',
    );
    expect(pageSource).toContain("<HealthCertificateRejectModal");
  });

  it("wires the modal to the hook's reject state and handlers", () => {
    expect(pageSource).toContain("isOpen={page.rejectModal.isOpen}");
    expect(pageSource).toContain("reason={page.rejectModal.reason}");
    expect(pageSource).toContain("error={page.rejectModal.error}");
    expect(pageSource).toContain("isSaving={page.isRejectSubmitting}");
    expect(pageSource).toContain("onReasonChange={page.setRejectReason}");
    expect(pageSource).toContain("onClose={page.closeRejectModal}");
    expect(pageSource).toContain("onSubmit={page.submitReject}");
  });

  it("adds a reject button alongside approve, on the same Pending+hasFile row", () => {
    var pendingGuardIndex = pageSource.indexOf(
      'cert.hcApprovalStatus === "Pending" &&',
    );
    var approveButtonIndex = pageSource.indexOf("page.handleApproveClick(cert);");
    var rejectButtonIndex = pageSource.indexOf("page.openRejectModal(cert);");

    expect(pendingGuardIndex).toBeGreaterThan(-1);
    expect(approveButtonIndex).toBeGreaterThan(pendingGuardIndex);
    expect(rejectButtonIndex).toBeGreaterThan(approveButtonIndex);

    var rejectButtonCloseIndex = pageSource.indexOf(
      "</button>",
      rejectButtonIndex,
    );
    var rejectButtonBlock = pageSource.slice(
      rejectButtonIndex,
      rejectButtonCloseIndex,
    );
    expect(rejectButtonCloseIndex).toBeGreaterThan(rejectButtonIndex);
    expect(rejectButtonBlock).toContain("דחה");
  });

  it("shows a distinct actions-column message for an already-rejected row", () => {
    expect(pageSource).toContain('cert.hcApprovalStatus === "Rejected" && (');
    expect(pageSource).toContain("ממתין להעלאה מחדש");
  });

  it("shows the rejection reason and, when present, the rejection date on a rejected row", () => {
    expect(pageSource).toContain("cert.hcRejectionReason");
    expect(pageSource).toContain("cert.hcRejectionDate &&");
  });

  it("never renders the raw rejected-by system-user id", () => {
    expect(pageSource).not.toContain("hcRejectedBySystemUserId");
  });
});

describe("CompetitionHealthCertificatesPage tabs and search contract", () => {
  it("renders the status tabs wired to the hook's tab state", () => {
    expect(pageSource).toContain(
      'import HealthCertificateStatusTabs from "../../components/secretary/health-certificates/HealthCertificateStatusTabs";',
    );
    expect(pageSource).toContain("<HealthCertificateStatusTabs");
    expect(pageSource).toContain("tabs={page.tabs}");
    expect(pageSource).toContain("activeTab={page.activeTab}");
    expect(pageSource).toContain("onChange={page.setActiveTab}");
  });

  it("renders a search input wired to the hook's search state", () => {
    expect(pageSource).toContain("value={page.searchText}");
    expect(pageSource).toContain("page.setSearchText(event.target.value);");
  });

  it("hides tabs and search until the true-empty and loading/error checks have passed", () => {
    const tabsGuardIndex = pageSource.indexOf(
      "{!loading && !loadError && certificates.length > 0 && (",
    );
    const tabsRenderIndex = pageSource.indexOf("<HealthCertificateStatusTabs");

    expect(tabsGuardIndex).toBeGreaterThan(-1);
    expect(tabsRenderIndex).toBeGreaterThan(tabsGuardIndex);
  });
});

describe("CompetitionHealthCertificatesPage approve-feedback contract", () => {
  it("contains no alert() call", () => {
    // Matches alert(...) and window.alert(...) as a call, but not the word
    // "alert" inside an identifier.
    const alertCall = /(?<![A-Za-z0-9_$.])(?:window\s*\.\s*)?alert\s*\(/;

    expect(pageSource).not.toMatch(alertCall);
  });

  it("uses no other blocking browser dialog", () => {
    expect(pageSource).not.toMatch(/(?<![A-Za-z0-9_$.])confirm\s*\(/);
    expect(pageSource).not.toMatch(/(?<![A-Za-z0-9_$.])prompt\s*\(/);
  });

  it("routes toast state and the approve click through the hook", () => {
    expect(pageSource).toContain(
      'import ToastMessage from "../../components/common/ToastMessage";',
    );
    expect(pageSource).toContain("<ToastMessage");
    expect(pageSource).toContain("isOpen={page.toast.isOpen}");
    expect(pageSource).toContain("page.handleApproveClick(cert);");
  });

  it("keeps the confirm dialog, driven by the hook", () => {
    expect(pageSource).toContain("<ConfirmDialog");
    expect(pageSource).toContain("isOpen={page.confirmDialog.isOpen}");
    expect(pageSource).toContain("onCancel={page.closeConfirmDialog}");
  });
});

describe("CompetitionHealthCertificatesPage preserved structure", () => {
  it("keeps the existing table columns", () => {
    for (const header of [
      "שם סוס",
      "שם אורווה",
      "תאריך העלאה",
      "סטטוס",
      "קובץ",
      "פעולות",
    ]) {
      expect(pageSource).toContain(header);
    }
  });

  it("keeps the existing status labels and adds the Rejected one", () => {
    expect(pageSource).toContain('label: "מאושר"');
    expect(pageSource).toContain('label: "ממתין לאישור"');
    expect(pageSource).toContain('label: "לא הועלה"');
    expect(pageSource).toContain('label: "נדחה"');
  });

  it("keeps the PDF/view link behavior", () => {
    expect(pageSource).toContain("href={cert.hcPath}");
    expect(pageSource).toContain('target="_blank"');
    expect(pageSource).toContain("פתח PDF");
  });

  it("keeps the approve button gated on Pending status and an uploaded file", () => {
    expect(pageSource).toContain('cert.hcApprovalStatus === "Pending" &&');
    expect(pageSource).toContain("cert.hcPath && (");
  });

  it("keeps the workspace layout and menu key", () => {
    expect(pageSource).toContain(
      '<CompetitionWorkspaceLayout activeItemKey="health-certificates">',
    );
  });

  it("no longer imports the service functions directly (moved to the hook)", () => {
    expect(pageSource).not.toContain(
      'from "../../services/healthCertificateService"',
    );
  });
});

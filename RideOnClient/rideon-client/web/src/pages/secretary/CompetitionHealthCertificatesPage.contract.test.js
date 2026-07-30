import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

// Source-level contract test for the secretary's health-certificate page.
//
// This repo has no DOM test environment and no React Testing Library (see the web
// package.json devDependencies), and this file deliberately does not add one. A
// component that returns JSX cannot be rendered here, and the load/approve
// handlers are local closures inside the page rather than a hook's return value,
// so they cannot be reached by stubbing react either - the same situation as
// PaidTimeSlotRegistrationsModal.contract.test.js, which this mirrors.
//
// What CAN be asserted without a renderer is the contract the Stage B1 fix
// establishes, and these are exactly the properties that would silently regress:
//
//   1. useActiveRole is actually CALLED, not merely imported - the page threw a
//      ReferenceError on every load because activeRole was never defined;
//   2. the load failure has its own error state, separate from "no horses";
//   3. the empty state can only be reached after a successful response;
//   4. approve failures surface through the shared toast, not alert();
//   5. nothing from the response body is rendered.
//
// Behavioural coverage of the authorization itself lives in the backend tests
// (RideOnServer.Tests/HealthCertificateAuthorizationTests) plus the manual
// checklist.

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

  it("gives the loader both identifiers", () => {
    expect(pageSource).toContain(
      "await getHealthCertificates(competitionId, ranchId)",
    );
  });

  it("waits for the ranch id before loading", () => {
    expect(pageSource).toContain("if (!competitionId) return;");
    expect(pageSource).toContain("if (!ranchId) return;");
    expect(pageSource).toMatch(/\[competitionId, ranchId\]/);
  });
});

describe("CompetitionHealthCertificatesPage error-state contract", () => {
  it("keeps a load error state separate from the certificate list", () => {
    expect(pageSource).toContain("const [loadError, setLoadError] = useState(false);");
    expect(pageSource).toContain("setLoadError(true);");

    // and clears it when a fresh load starts, so a recovered load stops showing
    // the banner
    expect(pageSource).toContain("setLoadError(false);");
  });

  it("keeps the loading state intact", () => {
    expect(pageSource).toContain("setLoading(true);");
    expect(pageSource).toContain("setLoading(false);");
    expect(pageSource).toContain("{loading && (");
  });

  it("renders a dedicated Hebrew error block", () => {
    expect(pageSource).toContain(
      'const LOAD_ERROR_MESSAGE = "אירעה שגיאה בטעינת תעודות הבריאות. יש לנסות שוב.";',
    );
    expect(pageSource).toMatch(/\{!loading && loadError && \(/);
    expect(pageSource).toContain("{LOAD_ERROR_MESSAGE}");
  });

  it("never shows the empty state for a failed request", () => {
    // This is the whole point: "אין סוסים רשומים לתחרות זו" must be gated on a
    // load that actually succeeded.
    expect(pageSource).toMatch(
      /\{!loading && !loadError && certificates\.length === 0 && \(/,
    );

    const guardAt = pageSource.indexOf(
      "{!loading && !loadError && certificates.length === 0 && (",
    );

    expect(guardAt).toBeGreaterThan(-1);

    // The rendered occurrence sits inside that guard. The string also appears
    // once earlier, in the comment on the catch block explaining why this gate
    // exists, so the search deliberately starts at the guard.
    const renderedEmptyAt = pageSource.indexOf(
      "אין סוסים רשומים לתחרות זו",
      guardAt,
    );

    expect(renderedEmptyAt).toBeGreaterThan(-1);

    // and nothing else renders it: every occurrence is either that comment or
    // this one.
    const occurrences = pageSource.split("אין סוסים רשומים לתחרות זו").length - 1;

    expect(occurrences).toBe(2);
  });

  it("does not render the table over a failed load", () => {
    expect(pageSource).toMatch(
      /\{!loading && !loadError && certificates\.length > 0 && \(/,
    );
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

  it("routes the approve failure through the shared toast component", () => {
    expect(pageSource).toContain(
      'import ToastMessage from "../../components/common/ToastMessage";',
    );
    expect(pageSource).toContain("<ToastMessage");
    expect(pageSource).toContain('showToast("error", APPROVE_ERROR_MESSAGE);');
  });

  it("uses the approved Hebrew approve-failure message", () => {
    expect(pageSource).toContain(
      'const APPROVE_ERROR_MESSAGE = "אירעה שגיאה באישור תעודת הבריאות";',
    );
  });

  it("keeps the approve request shape and the busy-row guard", () => {
    expect(pageSource).toContain(
      "await approveHealthCertificate(cert.horseId, competitionId, ranchId);",
    );
    expect(pageSource).toContain("setActionLoadingKey(key);");
    expect(pageSource).toContain("setActionLoadingKey(null);");
  });

  it("keeps the confirm dialog", () => {
    expect(pageSource).toContain("<ConfirmDialog");
    expect(pageSource).toContain("function closeConfirmDialog()");
    expect(pageSource).toContain("closeConfirmDialog();");
  });
});

describe("CompetitionHealthCertificatesPage leakage contract", () => {
  it("never renders the response body or an exception message", () => {
    expect(pageSource).not.toMatch(/response\?\.\.?data\?\.\.?message/);
    expect(pageSource).not.toContain("error.message");
    expect(pageSource).not.toContain("error?.message");
    expect(pageSource).not.toContain("err.message");
    expect(pageSource).not.toContain("err?.message");
    expect(pageSource).not.toContain("error.response");
    expect(pageSource).not.toContain("error?.response");
  });

  it("does not bind the caught error at all", () => {
    // Both handlers use a bare `catch {`, so there is no error object in scope
    // that could be rendered by accident.
    expect(pageSource).toMatch(/\}\s*catch\s*\{/);
    expect(pageSource).not.toMatch(/catch\s*\(\s*[A-Za-z_$]/);
  });

  it("only reads the data envelope from a successful response", () => {
    expect(pageSource).toContain("setCertificates(response.data?.data || []);");
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

  it("keeps the existing status labels", () => {
    expect(pageSource).toContain('label: "מאושר"');
    expect(pageSource).toContain('label: "ממתין לאישור"');
    expect(pageSource).toContain('label: "לא הועלה"');
  });

  it("keeps the workspace layout and menu key", () => {
    expect(pageSource).toContain(
      '<CompetitionWorkspaceLayout activeItemKey="health-certificates">',
    );
  });
});

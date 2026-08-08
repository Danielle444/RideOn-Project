import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

// Source-level contract test for CAP-2's sweep: concrete UI paths that
// bypassed the toast contract (raw error.response?.data reaching the UI,
// or a browser alert() instead of the shared toast), found by grepping for
// `alert(` and `err.response?.data` outside getErrorMessage across web/src.
// This repo has no DOM test environment and no React Testing Library (see
// CompetitionHealthCertificatesPage.contract.test.js, which this mirrors).

function readSource(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

const noAlertCall = /(?<![A-Za-z0-9_$.])(?:window\s*\.\s*)?alert\s*\(/;

describe("CAP-2 sweep — paid-time delete no longer surfaces raw response data", () => {
  const source = readSource(
    "./hooks/secretary/useCompetitionPaidTimePage.js",
  );

  it("handleDeletePaidTimeSlot routes its error through getErrorMessage", () => {
    // No longer "async function" at the top level (RideOn notification
    // audit, 2026-08-07, Slice 3) - confirmation moved to a ConfirmDialog,
    // and the async delete+error-handling now lives in its onConfirm.
    const fnAt = source.indexOf("function handleDeletePaidTimeSlot(");
    const fnEndAt = source.indexOf("\n  }", fnAt);
    const body = source.slice(fnAt, fnEndAt);

    expect(fnAt).toBeGreaterThan(-1);
    expect(body).not.toContain("window.confirm");

    expect(body).toContain(
      'getErrorMessage(err, "שגיאה במחיקת סלוט פייד־טיים")',
    );
    expect(body).not.toMatch(/onShowToast\(\s*"error",\s*err\.response/);
  });
});

describe("CAP-2 sweep — service-price errors no longer surface raw response data", () => {
  const source = readSource("./hooks/secretary/useServicePricesPage.js");

  it("imports the shared getErrorMessage helper", () => {
    expect(source).toContain(
      'import { getErrorMessage } from "../../utils/competitionForm.utils";',
    );
  });

  it("no showToast call passes err.response?.data directly anymore", () => {
    expect(source).not.toMatch(/showToast\(\s*"error",\s*err\.response\?\.data\s*\|\|/);
  });

  it("every service-price error toast is wrapped in getErrorMessage", () => {
    const toastCalls = source.match(/showToast\("error", [^)]*\)/g) || [];

    expect(toastCalls.length).toBeGreaterThan(0);

    for (const call of toastCalls) {
      expect(call).toContain("getErrorMessage(");
    }
  });
});

describe("CAP-2 sweep — no more alert() bypassing the toast contract on the classes page", () => {
  const source = readSource(
    "./hooks/secretary/useSecretaryCompetitionClassesPage.js",
  );

  it("class-delete and entry-cancel failures route through showToast, not alert()", () => {
    expect(source).not.toMatch(noAlertCall);
    expect(source).toContain(
      'showToast("error", getErrorMessage(err, "שגיאה במחיקת מקצה"));',
    );
    expect(source).toContain(
      'showToast("error", getErrorMessage(err, "שגיאה בביטול הרשמה"));',
    );
  });
});

describe("CAP-2 sweep — stall-booking cancel failure routes through the page's toast", () => {
  const source = readSource("./pages/secretary/CompetitionStallsPage.jsx");

  it("handleDeleteBooking uses setToast + getErrorMessage instead of alert()", () => {
    expect(source).not.toMatch(noAlertCall);
    expect(source).toContain(
      'import { getErrorMessage } from "../../utils/competitionForm.utils";',
    );

    // No longer "async function" at the top level (RideOn notification
    // audit, 2026-08-07, Slice 3) - confirmation moved to a ConfirmDialog,
    // and the async delete+toast logic now lives in its onConfirm.
    const fnAt = source.indexOf("function handleDeleteBooking(");
    const fnEndAt = source.indexOf("\n  }", fnAt);
    const body = source.slice(fnAt, fnEndAt);

    expect(fnAt).toBeGreaterThan(-1);
    expect(body).not.toContain("window.confirm");
    expect(body).toContain("setToast({");
    expect(body).toContain('getErrorMessage(err, "שגיאה בביטול תא")');
  });
});

describe("CAP-2 sweep — Excel-upload failure routes through onError, not alert()", () => {
  const uploaderSource = readSource(
    "./components/secretary/stall-map/StallMapUploader.jsx",
  );

  it("StallMapUploader contains no alert() fallback", () => {
    expect(uploaderSource).not.toMatch(noAlertCall);
  });

  it("StallMapUploader accepts an onError prop and calls it on parse failure", () => {
    expect(uploaderSource).toContain("onError,\n}) {");
    expect(uploaderSource).toContain("if (onError) {\n          onError(message);\n        }");
  });

  it("both call sites wire onError to a real toast", () => {
    const stallsPageSource = readSource(
      "./pages/secretary/CompetitionStallsPage.jsx",
    );
    const compoundsTableSource = readSource(
      "./components/secretary/arenas-stalls/StallCompoundsTable.jsx",
    );
    const arenasPageSource = readSource(
      "./pages/secretary/ArenasAndStallsPage.jsx",
    );

    expect(stallsPageSource).toContain("onError={function (message) {");
    expect(compoundsTableSource).toContain("onError={props.onUploadError}");
    expect(arenasPageSource).toContain("onUploadError={function (message) {");
    expect(arenasPageSource).toContain('page.showToast("error", message);');
  });
});

describe("CAP-2 sweep — CompetitionSummarySection action banners auto-dismiss", () => {
  const source = readSource(
    "./components/secretary/competition-summary/CompetitionSummarySection.jsx",
  );

  it("uses the same 4000ms timing as the shared ToastMessage", () => {
    expect(source).toContain(
      "var ACTION_MESSAGE_AUTO_DISMISS_MS = 4000;",
    );
  });

  it("the timer resets when actionError/actionSuccess change and clears on unmount", () => {
    const effectAt = source.indexOf("useEffect(");
    const effectEndAt = source.indexOf(
      "[props.actionError, props.actionSuccess],",
    );

    expect(effectAt).toBeGreaterThan(-1);
    expect(effectEndAt).toBeGreaterThan(effectAt);

    const body = source.slice(effectAt, effectEndAt);

    expect(body).toContain("setTimeout(function () {");
    expect(body).toContain("props.onDismissActionMessages();");
    expect(body).toContain("return function () {\n        clearTimeout(timerId);\n      };");
  });

  it("does nothing if the page never wires a dismiss callback (backward compatible)", () => {
    expect(source).toContain("if (!props.onDismissActionMessages) {\n        return undefined;\n      }");
  });
});

describe("CAP-2 sweep — the federation-invoice banner is wired to a real dismiss handler", () => {
  it("useCompetitionSummaryPage exposes dismissFederationInvoiceImportMessages", () => {
    const source = readSource(
      "./hooks/secretary/useCompetitionSummaryPage.js",
    );

    expect(source).toContain("function dismissFederationInvoiceImportMessages() {");
    expect(source).toContain("setFederationInvoiceImportError(\"\");");
    expect(source).toContain("setFederationInvoiceImportSuccess(\"\");");
    expect(source).toContain(
      "dismissFederationInvoiceImportMessages:\n      dismissFederationInvoiceImportMessages,",
    );
  });

  it("CompetitionSummaryPage passes it through as onDismissActionMessages", () => {
    const source = readSource("./pages/secretary/CompetitionSummaryPage.jsx");

    expect(source).toContain(
      "onDismissActionMessages={\n                page.dismissFederationInvoiceImportMessages\n              }",
    );
  });
});

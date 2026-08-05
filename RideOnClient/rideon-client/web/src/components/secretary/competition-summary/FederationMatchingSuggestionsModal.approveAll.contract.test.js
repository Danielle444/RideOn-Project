import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

// Source-level contract test for the federation matching-suggestions modal:
// row-scoped processing state (no full-list flicker on a single approval)
// and the new "אשר הכל" button. This repo has no DOM test environment and no
// React Testing Library (see CompetitionSummaryPage.contract.test.js, which
// this mirrors) - what is asserted here is the contract the markup must not
// silently break: the button's exact label/placement/visibility rule, that
// row disabling is keyed by rowKey (not a global flag), and that the
// suggestions list itself is never gated by anything other than the
// existing full-loading state.

const MODAL_PATH = new URL(
  "./FederationMatchingSuggestionsModal.jsx",
  import.meta.url,
);

const modalSource = readFileSync(MODAL_PATH, "utf8").replace(/\r\n/g, "\n");

function sectionBetween(fromMarker, toMarker) {
  const from = modalSource.indexOf(fromMarker);
  expect(from).toBeGreaterThan(-1);

  const rest = modalSource.slice(from);
  const to = rest.indexOf(toMarker);
  expect(to).toBeGreaterThan(-1);

  return rest.slice(0, to);
}

function suggestionsTabBody() {
  return sectionBetween(
    "function SuggestionsTab(props) {",
    "\nfunction ManualTab(props) {",
  );
}

function modalBody() {
  return sectionBetween(
    "export default function FederationMatchingSuggestionsModal(props) {",
    "\n}",
  );
}

describe("shared row identity (getRowKey)", () => {
  it("is a single module-level helper, not re-derived inline in the row map", () => {
    expect(modalSource).toContain("function getRowKey(item) {");
    expect(modalSource).toContain(
      'return String(creditId) + "-" + String(paidByPersonId);',
    );

    // SuggestionsTab's row map must call the shared helper, not recompute
    // creditId/paidByPersonId/rowKey inline (that was the pre-fix duplication).
    const body = suggestionsTabBody();
    expect(body).toContain("var rowKey = getRowKey(item);");
    expect(body).not.toContain('"federationExternalCreditId",\n                "FederationExternalCreditId"');
  });
});

describe("SuggestionsTab row-scoped disabling", () => {
  it("computes per-row processing state from processingRowKeys, not a global approving flag", () => {
    const body = suggestionsTabBody();

    expect(body).toContain(
      "var isRowProcessing = processingRowKeys.indexOf(rowKey) >= 0;",
    );
    expect(body).toContain(
      "var isRowDisabled = isRowProcessing || props.bulkApproving;",
    );
  });

  it("the approve button disables only via the row-scoped flag", () => {
    const body = suggestionsTabBody();

    expect(body).toContain("disabled={isRowDisabled}");
    expect(body).not.toContain("disabled={props.approving}");
  });

  it("the full-list loading screen is still gated on props.loading only (initial load), independent of row state", () => {
    const body = suggestionsTabBody();

    expect(body).toContain("if (props.loading) {");
    expect(body).toContain("טוען הצעות התאמה...");
  });
});

describe('"אשר הכל" button', () => {
  it("renders with the exact approved label, no other new copy", () => {
    expect(modalSource).toContain("אשר הכל");
    // The button itself carries no extra in-progress label - busy state is
    // conveyed only via `disabled` (avoids inventing new Hebrew copy).
    expect(modalSource).not.toContain("מאשר הכל");
  });

  it("is visible only when there is at least one currently approvable suggestion", () => {
    expect(modalSource).toContain(
      "var approvableCount = items.filter(function (item) {\n    return processingRowKeys.indexOf(getRowKey(item)) < 0;\n  }).length;",
    );
    expect(modalSource).toContain("{approvableCount > 0 ? (");
  });

  it("is disabled while a bulk approval is running", () => {
    const body = modalBody();
    const buttonBlock = body.slice(
      body.indexOf("{approvableCount > 0 ? ("),
      body.indexOf("אשר הכל"),
    );

    expect(buttonBlock).toContain("disabled={props.bulkApproving}");
  });

  it("is wired to the dedicated onApproveAll handler, not onApprove/onReload", () => {
    const body = modalBody();
    const buttonBlock = body.slice(
      body.indexOf("{approvableCount > 0 ? ("),
      body.indexOf("אשר הכל"),
    );

    expect(buttonBlock).toContain("onClick={props.onApproveAll}");
  });

  it("is placed next to the suggestions-tab header controls, not inside every row", () => {
    const body = modalBody();
    const controlsBlock = body.slice(
      body.indexOf('activeTab === "suggestions" ? ('),
      body.indexOf("<SuggestionsTab"),
    );

    expect(controlsBlock).toContain("אשר הכל");

    const suggestionsBody = suggestionsTabBody();
    expect(suggestionsBody).not.toContain("onApproveAll");
  });

  it("does not appear at all inside the ManualTab", () => {
    const manualBody = sectionBetween(
      "function ManualTab(props) {",
      "\nexport default function FederationMatchingSuggestionsModal(props) {",
    );

    expect(manualBody).not.toContain("אשר הכל");
  });
});

describe("reload button stays consistent with the new row/bulk state", () => {
  it("is also disabled while any row is processing or a bulk run is active", () => {
    const body = modalBody();
    const reloadBlock = body.slice(
      body.indexOf("onClick={props.onReload}"),
      body.indexOf("רענון הצעות"),
    );

    expect(reloadBlock).toContain("props.bulkApproving");
    expect(reloadBlock).toContain("processingRowKeys.length > 0");
  });
});

describe("close button keeps its existing (unrelated) convention", () => {
  it("is still gated only on the manual-allocation approving flag, since closing mid-approval is allowed by design", () => {
    const body = modalBody();
    const closeBlock = body.slice(
      body.indexOf("onClick={props.onClose}"),
      body.indexOf("<X size={20} />"),
    );

    expect(closeBlock).toContain("disabled={props.approving}");
    expect(closeBlock).not.toContain("bulkApproving");
    expect(closeBlock).not.toContain("processingRowKeys");
  });
});

describe("no page reload anywhere in the modal", () => {
  it("never touches window.location", () => {
    expect(modalSource).not.toContain("window.location");
  });
});

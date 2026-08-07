import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

// Source-level contract test for the federation matching-suggestions UX fix:
// row-scoped single approval (no full-list flicker) + sequential "approve
// all". This repo has no DOM test environment and no React Testing Library
// (see CompetitionPaymentsPage.payerView.contract.test.js and
// useCompetitionPaymentsPage.bulkFederationAllocation.contract.test.js,
// which this mirrors) - what is asserted here is the contract these
// functions must satisfy at the source level: row identity, operation-id
// per row, when the list is/isn't cleared, and the sequential (never
// Promise.all) approve-all orchestration.

const HOOK_PATH = new URL("./useCompetitionSummaryPage.js", import.meta.url);
const hookSource = readFileSync(HOOK_PATH, "utf8").replace(/\r\n/g, "\n");

function bodyBetween(fromMarker, toMarker) {
  const from = hookSource.indexOf(fromMarker);
  expect(from).toBeGreaterThan(-1);

  const rest = hookSource.slice(from);
  const to = rest.indexOf(toMarker);
  expect(to).toBeGreaterThan(-1);

  return rest.slice(0, to);
}

function submitRowApprovalBody() {
  return bodyBetween(
    "async function submitFederationMatchingRowApproval(item) {",
    "\n  async function approveFederationMatchingSuggestion(item) {",
  );
}

function approveSingleBody() {
  return bodyBetween(
    "async function approveFederationMatchingSuggestion(item) {",
    "\n  async function approveAllFederationMatchingSuggestions() {",
  );
}

function approveAllBody() {
  return bodyBetween(
    "async function approveAllFederationMatchingSuggestions() {",
    "\n  function changeFederationMatchingTab(tabName) {",
  );
}

function loadSuggestionsBody() {
  return bodyBetween(
    "async function loadFederationMatchingSuggestions(options) {",
    "\n  async function openFederationMatchingModal() {",
  );
}

describe("row identity", () => {
  it("derives rowKey from federationExternalCreditId + paidByPersonId, never array index", () => {
    expect(hookSource).toContain("function getSuggestionRowKey(item) {");
    expect(hookSource).toContain(
      'return String(federationExternalCreditId) + "-" + String(paidByPersonId);',
    );
  });

  it("tracks in-flight rows in a Set, not a single boolean", () => {
    expect(hookSource).toContain(
      "var [federationMatchingProcessingKeys, setFederationMatchingProcessingKeys] =\n    useState(function () {\n      return new Set();\n    });",
    );
  });

  it("keeps operation ids in a per-row map, replacing the old single ref", () => {
    expect(hookSource).toContain(
      "var federationMatchingRowOperationsRef = useRef({});",
    );
    expect(hookSource).not.toContain("federationMatchingApproveOperationIdRef");
  });

  it("does not disturb the separate manual-allocation operation id slot", () => {
    expect(hookSource).toContain(
      "var manualFederationAllocationOperationIdRef = useRef(null);",
    );
  });
});

describe("submitFederationMatchingRowApproval (core, shared by single + bulk)", () => {
  it("sends operationId resolved per-row, not a shared/global id", () => {
    const body = submitRowApprovalBody();

    expect(body).toContain(
      "var pendingOperation =\n      federationMatchingRowOperationsRef.current[rowKey] || null;",
    );
    expect(body).toContain(
      "var resolvedOperation = resolveOperationId(\n      pendingOperation,\n      approveSignature,\n    );",
    );
    expect(body).toContain("operationId: resolvedOperation.operationId,");
  });

  it("marks the row as processing before the request, not after", () => {
    const body = submitRowApprovalBody();

    const addAt = body.indexOf("addFederationMatchingProcessingKey(rowKey);");
    const requestAt = body.indexOf(
      "await approveFederationMatchingSuggestionRequest(",
    );

    expect(addAt).toBeGreaterThan(-1);
    expect(requestAt).toBeGreaterThan(-1);
    expect(addAt).toBeLessThan(requestAt);
  });

  it("never clears the suggestions array before or during the request", () => {
    const body = submitRowApprovalBody();

    expect(body).not.toContain("setFederationMatchingItems([])");
    expect(body).not.toContain("setFederationMatchingItems([]);");
  });

  it("on success, removes only the approved row by rowKey (not the whole list)", () => {
    const body = submitRowApprovalBody();
    const successBranch = body.slice(0, body.indexOf("} catch (error) {"));

    expect(successBranch).toContain(
      "setFederationMatchingItems(function (previous) {\n        return previous.filter(function (existingItem) {\n          return getSuggestionRowKey(existingItem) !== rowKey;\n        });\n      });",
    );
  });

  it("on success, clears the row's pending operation id", () => {
    const body = submitRowApprovalBody();
    const successBranch = body.slice(0, body.indexOf("} catch (error) {"));

    expect(successBranch).toContain(
      "delete federationMatchingRowOperationsRef.current[rowKey];",
    );
  });

  it("on failure, keeps the row (no filter/removal) and preserves the operation id for retry", () => {
    const body = submitRowApprovalBody();
    const failureBranch = body.slice(
      body.indexOf("} catch (error) {"),
      body.indexOf("} finally {"),
    );

    expect(failureBranch).not.toContain("setFederationMatchingItems(");
    expect(failureBranch).not.toContain(
      "delete federationMatchingRowOperationsRef.current[rowKey];",
    );
    expect(failureBranch).toContain(
      getErrorCallSnippet("שגיאה באישור הצעת התאמה"),
    );
    expect(failureBranch).toContain("return false;");
  });

  it("always removes the row from processing in finally, success or failure", () => {
    const body = submitRowApprovalBody();
    const finallyBranch = body.slice(body.indexOf("} finally {"));

    expect(finallyBranch).toContain(
      "removeFederationMatchingProcessingKey(rowKey);",
    );
  });
});

function getErrorCallSnippet(fallback) {
  return `getErrorMessage(error, "${fallback}")`;
}

describe("approveFederationMatchingSuggestion (single-row public handler)", () => {
  it("guards against double submission via the processing set, not array index", () => {
    const body = approveSingleBody();

    expect(body).toContain("var rowKey = getSuggestionRowKey(item);");
    expect(body).toContain(
      "if (federationMatchingProcessingKeys.has(rowKey)) {\n      return;\n    }",
    );
  });

  it("delegates the HTTP submission to the shared core function", () => {
    const body = approveSingleBody();

    expect(body).toContain(
      "var succeeded = await submitFederationMatchingRowApproval(item);",
    );
  });

  it("runs exactly one background reconciliation after a real success, swallowing its own errors", () => {
    const body = approveSingleBody();
    const successBranch = body.slice(body.indexOf("if (succeeded) {"));

    expect(successBranch).toContain(
      "await loadFederationMatchingSuggestions({ background: true });",
    );
    expect(successBranch).toContain("await loadSummary();");
    expect(successBranch).toContain(
      "} catch (refreshError) {\n        console.error(refreshError);\n      }",
    );

    // A refresh failure must never be reported as an approval failure.
    expect(successBranch).not.toContain("setFederationMatchingError(");
  });

  it("never closes the modal or reloads the page", () => {
    const body = approveSingleBody();

    expect(body).not.toContain("setFederationMatchingOpen(false)");
    expect(body).not.toContain("window.location");
  });
});

describe("approveAllFederationMatchingSuggestions (bulk)", () => {
  it("no-ops on a repeated click while already running", () => {
    const body = approveAllBody();

    expect(body).toContain(
      "if (!competitionId || !ranchId || federationMatchingBulkRunning) {\n      return;\n    }",
    );
  });

  it("excludes rows already being processed from the batch (safe row exclusion, no extra locking needed)", () => {
    const body = approveAllBody();

    expect(body).toContain(
      "var approvableItems = federationMatchingItems.filter(function (item) {\n      return !federationMatchingProcessingKeys.has(getSuggestionRowKey(item));\n    });",
    );
  });

  it("processes rows sequentially with a for-loop and await, never Promise.all", () => {
    const body = approveAllBody();

    expect(body).toContain(
      "for (var i = 0; i < approvableItems.length; i++) {",
    );
    expect(body).toContain(
      "await submitFederationMatchingRowApproval(approvableItems[i]);",
    );
    expect(body).not.toContain("Promise.all(");
  });

  it("does not break or return out of the loop on a single row's failure", () => {
    const body = approveAllBody();
    const loopBody = body.slice(
      body.indexOf("for (var i = 0; i < approvableItems.length; i++) {"),
      body.indexOf("setFederationMatchingBulkRunning(false);"),
    );

    expect(loopBody).not.toMatch(/\bbreak\b/);
    expect(loopBody).not.toMatch(/\breturn\b/);
  });

  it("reuses the same per-row core submission as the single-row path (one operation id per row, never derived from index)", () => {
    const body = approveAllBody();

    expect(body).toContain("submitFederationMatchingRowApproval(approvableItems[i])");
    // Confirms the loop hands each item to the row-keyed core function rather
    // than building its own request/operationId inline.
    expect(body).not.toContain("approveFederationMatchingSuggestionRequest(");
  });

  it("never clears the suggestions list during the batch", () => {
    const body = approveAllBody();

    expect(body).not.toContain("setFederationMatchingItems([])");
  });

  it("runs exactly one background reconciliation after the whole batch, not per row", () => {
    const body = approveAllBody();

    const occurrences = (
      body.match(/loadFederationMatchingSuggestions\(\{ background: true \}\)/g) || []
    ).length;

    expect(occurrences).toBe(1);

    const afterLoop = body.slice(body.indexOf("setFederationMatchingBulkRunning(false);"));
    expect(afterLoop).toContain(
      "await loadFederationMatchingSuggestions({ background: true });",
    );
    expect(afterLoop).toContain("await loadSummary();");
  });

  it("flips the bulk-running flag off before reconciling, so the button re-enables promptly", () => {
    const body = approveAllBody();

    const runningOffAt = body.indexOf("setFederationMatchingBulkRunning(false);");
    const reconcileAt = body.indexOf(
      "await loadFederationMatchingSuggestions({ background: true });",
    );

    expect(runningOffAt).toBeGreaterThan(-1);
    expect(reconcileAt).toBeGreaterThan(-1);
    expect(runningOffAt).toBeLessThan(reconcileAt);
  });

  it("never reloads the page", () => {
    const body = approveAllBody();

    expect(body).not.toContain("window.location");
  });
});

describe("loadFederationMatchingSuggestions (initial vs background)", () => {
  it("only shows the full loading UI on a genuine initial load (no items yet, foreground call)", () => {
    const body = loadSuggestionsBody();

    expect(body).toContain(
      "var isInitialLoad = !isBackground && federationMatchingItems.length === 0;",
    );
    expect(body).toContain(
      "if (isInitialLoad) {\n        setFederationMatchingLoading(true);\n      }",
    );
  });

  it("a background refresh never touches error/success state or clears items on failure", () => {
    const body = loadSuggestionsBody();
    const catchBranch = body.slice(
      body.indexOf("} catch (error) {"),
      body.indexOf("} finally {"),
    );

    expect(catchBranch).toContain("if (!isBackground) {");
    expect(catchBranch).toContain("setFederationMatchingItems([]);");

    // The clearing/erroring calls must be gated on !isBackground, i.e. never
    // run during a background reconciliation.
    const guardIndex = catchBranch.indexOf("if (!isBackground) {");
    const clearIndex = catchBranch.indexOf("setFederationMatchingItems([]);");
    expect(clearIndex).toBeGreaterThan(guardIndex);
  });

  it("a successful refresh (background or not) always applies the fresh list", () => {
    const body = loadSuggestionsBody();

    expect(body).toContain(
      "setFederationMatchingItems(\n        Array.isArray(response.data) ? response.data : [],\n      );",
    );
  });
});

describe("no page reload anywhere in the federation matching flow", () => {
  it("the hook never touches window.location", () => {
    expect(hookSource).not.toContain("window.location");
  });
});

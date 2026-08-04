import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

// Source-level contract test for the atomic bulk Federation allocation
// change: the direct-payments screen used to call
// allocateFederationCreditToCharge once per selected charge over separate
// HTTP requests, with no atomicity - a mid-loop failure left earlier
// allocations committed while later charges were silently skipped, and the
// client computed each charge's amount itself.
//
// This repo has no DOM test environment and no React Testing Library (see
// CompetitionPaymentsPage.payerView.contract.test.js), so what can be
// asserted here is the contract this change must satisfy: one HTTP request
// replaces the loop, the payload never carries a per-charge amount or a
// payer id, a failed allocation still refreshes state before allowing a
// retry, and a refresh failure after a successful allocation never turns
// into a false failure message.

const HOOK_PATH = new URL("./useCompetitionPaymentsPage.js", import.meta.url);
const SERVICE_PATH = new URL(
  "../../services/competitionPaymentsService.js",
  import.meta.url,
);

const hookSource = readFileSync(HOOK_PATH, "utf8").replace(/\r\n/g, "\n");
const serviceSource = readFileSync(SERVICE_PATH, "utf8").replace(/\r\n/g, "\n");

function submitFunctionBody() {
  const from = hookSource.indexOf(
    "async function submitFederationCoverageAllocation() {",
  );

  expect(from).toBeGreaterThan(-1);

  const rest = hookSource.slice(from);
  const to = rest.indexOf("\n  async function submitPayment(formData) {");

  expect(to).toBeGreaterThan(-1);

  return rest.slice(0, to);
}

describe("bulkAllocateFederationCreditToCharges service contract", () => {
  it("posts to the bulk-allocate endpoint", () => {
    expect(serviceSource).toContain("function bulkAllocateFederationCreditToCharges(data) {");
    expect(serviceSource).toContain(
      "`${API}/CompetitionPayments/federation/credits/bulk-allocate`",
    );
  });

  it("is exported and the old per-charge function is no longer imported by the hook", () => {
    expect(serviceSource).toContain("bulkAllocateFederationCreditToCharges,");
    expect(hookSource).not.toContain("allocateFederationCreditToCharge,");
  });
});

describe("submitFederationCoverageAllocation atomic contract", () => {
  it("sends exactly one bulk request instead of a per-charge loop", () => {
    const body = submitFunctionBody();

    expect(body).toContain("await bulkAllocateFederationCreditToCharges({");

    // No loop construct of any kind remains in the submit handler.
    expect(body).not.toMatch(/\bfor\s*\(/);
    expect(body).not.toMatch(/\bwhile\s*\(/);
    expect(body).not.toContain(".forEach(function (charge) {\n        await");
  });

  it("sends billChargeIds and never a per-charge amount, payer id, or credit figure", () => {
    const body = submitFunctionBody();

    expect(body).toContain("billChargeIds: billChargeIds,");

    expect(body).not.toContain("allocatedAmount:");
    expect(body).not.toContain("billChargeId: billChargeId,");
    expect(body).not.toContain("payerPersonId:");
    expect(body).not.toContain("missingAmount");
  });

  it("derives billChargeIds from the selected federation charges", () => {
    const body = submitFunctionBody();

    expect(body).toContain(
      'var billChargeIds = selectedFederationCharges.map(function (charge) {',
    );
    expect(body).toContain(
      'return getValue(charge, "billChargeId", "BillChargeId", 0);',
    );
  });

  it("keeps the existing double-submit guard (federationApplyLoading set before the request)", () => {
    const body = submitFunctionBody();

    const loadingAt = body.indexOf("setFederationApplyLoading(true);");
    const requestAt = body.indexOf("await bulkAllocateFederationCreditToCharges(");

    expect(loadingAt).toBeGreaterThan(-1);
    expect(requestAt).toBeGreaterThan(-1);
    expect(loadingAt).toBeLessThan(requestAt);

    expect(body).toContain("setFederationApplyLoading(false);");
  });

  it("shows the success message and closes the modal only when the request succeeds", () => {
    const body = submitFunctionBody();

    expect(body).toContain("if (allocationSucceeded) {");
    expect(body).toContain('setFederationApplySuccess("כיסוי ההתאחדות שויך בהצלחה");');
    expect(body).toContain("setFederationApplyModalOpen(false);");
  });

  it("on failure, keeps the modal open and does not show a success message", () => {
    const body = submitFunctionBody();

    const failureBranch = body.slice(body.indexOf("} else {"));

    expect(failureBranch).not.toContain("setFederationApplyModalOpen(false);");
    expect(failureBranch).not.toContain("setFederationApplySuccess(");
  });

  it("refreshes federation coverage data on failure so stale state is not retained before a retry", () => {
    const body = submitFunctionBody();
    const failureBranch = body.slice(body.indexOf("} else {"));

    expect(failureBranch).toContain("await loadFederationCoverageData(payerPersonId);");
  });

  it("does not let a refresh failure after a real success overwrite the success message", () => {
    const body = submitFunctionBody();
    const successBranch = body.slice(
      body.indexOf("if (allocationSucceeded) {"),
      body.indexOf("} else {"),
    );

    // The refresh after success is wrapped in its own try/catch, and that
    // catch block must only log - never call setFederationApplyError, which
    // would turn a real success into a reported failure.
    expect(successBranch).toContain("await reloadSelectedPayerData(payerPersonId);");
    expect(successBranch).toContain(
      "} catch (refreshError) {\n          console.error(refreshError);\n        }",
    );
    expect(successBranch).not.toContain("setFederationApplyError(");
  });
});

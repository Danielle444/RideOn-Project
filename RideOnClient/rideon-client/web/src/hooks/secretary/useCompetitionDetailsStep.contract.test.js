import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

// Source-level contract test proving the reschedule feature did not touch the
// ordinary "save details" / UpdateCompetition flow. This complements the
// behavioral coverage in useCompetitionDetailsStep.reschedule.test.js, which
// only exercises the NEW handleReschedule path.

const HOOK_PATH = new URL("./useCompetitionDetailsStep.js", import.meta.url);
const hookSource = readFileSync(HOOK_PATH, "utf8");

describe("useCompetitionDetailsStep ordinary edit flow — unchanged by reschedule", () => {
  it("saveDetails still calls updateCompetition for an existing competition", () => {
    expect(hookSource).toContain("await updateCompetition(competitionId, payload);");
  });

  it("saveDetails still calls createCompetition for a brand-new competition", () => {
    expect(hookSource).toContain(
      "var response = await createCompetition(createPayload);",
    );
  });

  it("saveDetails' three intents (draft/publish/continue) keep their original status mapping", () => {
    const saveDetailsAt = hookSource.indexOf("async function saveDetails(");
    expect(saveDetailsAt).toBeGreaterThan(-1);

    const rescheduleAt = hookSource.indexOf("async function handleReschedule(");
    expect(rescheduleAt).toBeGreaterThan(-1);

    // handleReschedule is defined strictly after saveDetails — the two are
    // sibling functions, not one absorbed into the other.
    expect(rescheduleAt).toBeGreaterThan(saveDetailsAt);

    const saveDetailsBody = hookSource.slice(saveDetailsAt, rescheduleAt);

    expect(saveDetailsBody).toContain('statusToSend = null;');
    expect(saveDetailsBody).toContain('statusToSend = "טיוטה";');
    expect(saveDetailsBody).not.toContain("rescheduleCompetition(");
  });

  it("handleReschedule never writes to detailsForm directly — every displayed date comes from the post-success reload", () => {
    const rescheduleAt = hookSource.indexOf("async function handleReschedule(");
    const nextFunctionAt = hookSource.indexOf("\n  return {", rescheduleAt);

    expect(rescheduleAt).toBeGreaterThan(-1);
    expect(nextFunctionAt).toBeGreaterThan(rescheduleAt);

    const body = hookSource.slice(rescheduleAt, nextFunctionAt);

    expect(body).not.toContain("setDetailsForm(");
    expect(body).toContain(
      "await loadExistingCompetition(competitionId, currentRanchId);",
    );
  });

  it("loadExistingCompetition (used by both the ordinary reload and the reschedule reload) is untouched", () => {
    expect(hookSource).toContain(
      "async function loadExistingCompetition(competitionIdValue, ranchId) {",
    );
    expect(hookSource).toContain(
      "var competitionRes = await getCompetitionById(competitionIdValue, ranchId);",
    );
  });

  it("exposes the reschedule handlers as new, additive return fields", () => {
    const returnAt = hookSource.lastIndexOf("return {");
    const returnBlock = hookSource.slice(returnAt);

    for (const field of [
      "rescheduleModalOpen",
      "savingReschedule",
      "openRescheduleModal",
      "closeRescheduleModal",
      "handleReschedule",
    ]) {
      expect(returnBlock).toContain(field);
    }

    // and the original fields are still there too — additive, not a rewrite.
    for (const field of ["saveDetails", "loadExistingCompetition", "handleDetailsChange"]) {
      expect(returnBlock).toContain(field);
    }
  });
});

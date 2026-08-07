import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

// Source-level contract test for CAP-6: the old separate "postpone" flow
// (a standalone handleReschedule + its own modal) is folded into saveDetails
// itself. This repo has no DOM test environment and no React Testing
// Library, and saveDetails' date-change branch reads state
// (detailsForm/persistedCompetitionStartDate) that a stubbed-useState
// harness cannot drive to differ (see
// useCompetitionDetailsStep.dateChange.test.js) - so the exact branching and
// call sequencing is proven here by reading the source directly, the same
// technique CompetitionHealthCertificatesPage.contract.test.js uses.

const HOOK_PATH = new URL("./useCompetitionDetailsStep.js", import.meta.url);
const hookSource = readFileSync(HOOK_PATH, "utf8").replace(/\r\n/g, "\n");

describe("saveDetails — date-change detection and guard", () => {
  it("detects a start-date change against the PERSISTED date, never detailsForm's own stale copy", () => {
    expect(hookSource).toContain(
      "detailsForm.competitionStartDate !== persistedCompetitionStartDate;",
    );
  });

  it("requires an existing competition before ever considering a date change", () => {
    const startDateChangedAt = hookSource.indexOf("var startDateChanged =");
    const nextStatementAt = hookSource.indexOf(
      "if (startDateChanged) {",
      startDateChangedAt,
    );

    expect(startDateChangedAt).toBeGreaterThan(-1);
    expect(nextStatementAt).toBeGreaterThan(startDateChangedAt);

    const body = hookSource.slice(startDateChangedAt, nextStatementAt);

    expect(body).toContain("!!competitionId");
  });

  it("computes the offset via the shared pure helper, not ad-hoc date math", () => {
    expect(hookSource).toContain(
      "var offsetDays = getWholeDayOffsetDays(\n        detailsForm.competitionStartDate,\n        persistedCompetitionStartDate,\n      );",
    );
  });

  it("blocks a non-positive offset with the approved forward-only guard and never calls the endpoint", () => {
    const guardAt = hookSource.indexOf("if (offsetDays <= 0) {");
    const guardEndAt = hookSource.indexOf("\n      }", guardAt);

    expect(guardAt).toBeGreaterThan(-1);

    const guardBody = hookSource.slice(guardAt, guardEndAt);

    expect(guardBody).toContain("DATE_CHANGE_FORWARD_ONLY_GUARD");
    expect(guardBody).toContain("return { success: false };");
    expect(guardBody).not.toContain("rescheduleCompetition(");
  });

  it("the forward-only guard string matches hebrew-strings.md verbatim", () => {
    expect(hookSource).toContain(
      'var DATE_CHANGE_FORWARD_ONLY_GUARD =\n  "אפשר להזיז את התחרות רק קדימה. יש לבחור תאריך פתיחה מאוחר מהנוכחי.";',
    );
  });
});

describe("saveDetails — confirmation before any write", () => {
  it("awaits the shared confirm dialog before doing anything else on a date change", () => {
    expect(hookSource).toContain(
      "var confirmed = await askDateChangeConfirmation(",
    );
    expect(hookSource).toContain("if (!confirmed) {\n        return { success: false };\n      }");
  });

  it("askDateChangeConfirmation opens the dialog and returns a promise resolved by confirm/cancel", () => {
    const fnAt = hookSource.indexOf("function askDateChangeConfirmation(");
    const fnEndAt = hookSource.indexOf("\n  }", fnAt);

    expect(fnAt).toBeGreaterThan(-1);

    const body = hookSource.slice(fnAt, fnEndAt);

    expect(body).toContain("setDateChangeConfirm({");
    expect(body).toContain("isOpen: true,");
    expect(body).toContain("return new Promise(function (resolve) {");
    expect(body).toContain("dateChangeConfirmResolveRef.current = resolve;");
  });

  it("confirmDateChange resolves true, cancelDateChangeConfirm resolves false, both close the dialog", () => {
    expect(hookSource).toContain(
      "function confirmDateChange() {\n    resolveDateChangeConfirm(true);\n  }",
    );
    expect(hookSource).toContain(
      "function cancelDateChangeConfirm() {\n    resolveDateChangeConfirm(false);\n  }",
    );

    const resolveFnAt = hookSource.indexOf(
      "function resolveDateChangeConfirm(",
    );
    const resolveFnEndAt = hookSource.indexOf("\n  }", resolveFnAt);
    const resolveFnBody = hookSource.slice(resolveFnAt, resolveFnEndAt);

    expect(resolveFnBody).toContain("setDateChangeConfirm({ isOpen: false");
  });
});

describe("saveDetails — date-change path calls reschedule THEN update, in that order", () => {
  function getSaveWithDateChangeBody() {
    const fnAt = hookSource.indexOf("async function saveWithDateChange(");
    const fnEndAt = hookSource.indexOf(
      "\n  async function saveOrdinary(",
      fnAt,
    );

    expect(fnAt).toBeGreaterThan(-1);
    expect(fnEndAt).toBeGreaterThan(fnAt);

    return hookSource.slice(fnAt, fnEndAt);
  }

  it("saveWithDateChange calls rescheduleCompetition before updateCompetition", () => {
    const body = getSaveWithDateChangeBody();
    const rescheduleAt = body.indexOf("await rescheduleCompetition(");
    const updateAt = body.indexOf("await updateCompetition(");

    expect(rescheduleAt).toBeGreaterThan(-1);
    expect(updateAt).toBeGreaterThan(rescheduleAt);
  });

  it("posts competitionId, hostRanchId and offsetDays to the dedicated reschedule endpoint", () => {
    expect(hookSource).toContain(
      "rescheduleResponse = await rescheduleCompetition(competitionId, {\n          competitionId: competitionId,\n          hostRanchId: currentRanchId,\n          offsetDays: offsetDays,\n        });",
    );
  });

  it("the follow-up update sends the RESCHEDULED dates (offset applied), never the stale pre-move ones", () => {
    const body = getSaveWithDateChangeBody();

    expect(body).toContain(
      "var newStartDate = addDaysToDateOnly(\n          persistedCompetitionStartDate,\n          offsetDays,\n        );",
    );
    expect(body).toContain(
      "var newEndDate = addDaysToDateOnly(\n          persistedCompetitionEndDate,\n          offsetDays,\n        );",
    );
    expect(body).toContain("competitionStartDate: newStartDate,");
    expect(body).toContain("competitionEndDate: newEndDate,");
  });

  it("applies the same intent-based status transition as the ordinary path", () => {
    const body = getSaveWithDateChangeBody();

    expect(body).toContain("var statusToSend = computeStatusToSend(intent);");
    expect(body).toContain("applyIntentStatusSideEffect(intent);");
  });

  it("reuses the reschedule endpoint's own success message (or the fixed fallback) as the toast", () => {
    expect(hookSource).toContain(
      "var successMessage =\n        rescheduleResponse.data?.message ||\n        rescheduleResponse.data?.Message ||\n        RESCHEDULE_SUCCESS_FALLBACK;",
    );
    expect(hookSource).toContain(
      'var RESCHEDULE_SUCCESS_FALLBACK = "התחרות וכל מועדי השירותים שלה נדחו בהצלחה.";',
    );
  });

  it("reloads the competition from the server after a successful date-change save", () => {
    const body = getSaveWithDateChangeBody();

    expect(body).toContain(
      "await loadExistingCompetition(competitionId, currentRanchId);",
    );
  });

  it("surfaces the fixed generic failure message on a reschedule failure, mirroring the old handleReschedule contract", () => {
    expect(hookSource).toContain(
      'var RESCHEDULE_GENERIC_ERROR = "אירעה שגיאה בדחיית התחרות. לא בוצעו שינויים.";',
    );
    expect(hookSource).toContain(
      'onShowToast("error", getErrorMessage(error, RESCHEDULE_GENERIC_ERROR));',
    );
  });
});

// Partial-success correction: rescheduleCompetition commits the date move
// server-side before updateCompetition is ever attempted. The two calls must
// therefore be guarded independently - a failure in the second call must
// never be reported (or behave) as if the date move itself failed.
describe("saveWithDateChange — the two endpoint calls are guarded independently", () => {
  function getSaveWithDateChangeBody() {
    const fnAt = hookSource.indexOf("async function saveWithDateChange(");
    const fnEndAt = hookSource.indexOf(
      "\n  async function saveOrdinary(",
      fnAt,
    );

    return hookSource.slice(fnAt, fnEndAt);
  }

  it("wraps rescheduleCompetition and updateCompetition in two SEPARATE try/catch blocks, not one shared one", () => {
    const body = getSaveWithDateChangeBody();

    const tryCount = (body.match(/\btry\s*\{/g) || []).length;
    const catchCount = (body.match(/\}\s*catch\s*\(error\)\s*\{/g) || [])
      .length;

    // One outer try/finally (savingDetails/savingReschedule flags) plus the
    // two independently-guarded stages below it.
    expect(tryCount).toBe(3);
    expect(catchCount).toBe(2);
  });

  describe("path 1 — rescheduleCompetition fails", () => {
    it("updateCompetition is never called: it is textually AFTER the reschedule catch's early return", () => {
      const body = getSaveWithDateChangeBody();

      const rescheduleCatchAt = body.indexOf(
        "} catch (error) {\n        console.error(error);\n        onShowToast(\"error\", getErrorMessage(error, RESCHEDULE_GENERIC_ERROR));\n        return { success: false };\n      }",
      );
      const updateCallAt = body.indexOf("await updateCompetition(");

      expect(rescheduleCatchAt).toBeGreaterThan(-1);
      expect(updateCallAt).toBeGreaterThan(rescheduleCatchAt);
    });

    it("shows the existing (unchanged) reschedule failure message — not the new partial-save message", () => {
      const body = getSaveWithDateChangeBody();
      const rescheduleCatchAt = body.indexOf(
        "try {\n        rescheduleResponse = await rescheduleCompetition(",
      );
      const rescheduleCatchEndAt = body.indexOf("\n      }", body.indexOf("return { success: false };", rescheduleCatchAt));
      const rescheduleCatchBlock = body.slice(rescheduleCatchAt, rescheduleCatchEndAt);

      expect(rescheduleCatchBlock).toContain("getErrorMessage(error, RESCHEDULE_GENERIC_ERROR)");
      expect(rescheduleCatchBlock).not.toContain("DATE_CHANGE_PARTIAL_SAVE_ERROR");
    });

    it("does not reload — matches the pre-existing error path, which never reloaded either", () => {
      const body = getSaveWithDateChangeBody();
      const rescheduleTryAt = body.indexOf(
        "try {\n        rescheduleResponse = await rescheduleCompetition(",
      );
      const rescheduleCatchEndAt = body.indexOf(
        "\n      }",
        body.indexOf("return { success: false };", rescheduleTryAt),
      );
      const rescheduleStageBlock = body.slice(
        rescheduleTryAt,
        rescheduleCatchEndAt,
      );

      expect(rescheduleStageBlock).not.toContain("loadExistingCompetition(");
    });
  });

  describe("path 2 — rescheduleCompetition succeeds, updateCompetition fails", () => {
    it("shows the exact approved truthful partial-success message, never the reschedule-failed one", () => {
      expect(hookSource).toContain(
        'var DATE_CHANGE_PARTIAL_SAVE_ERROR =\n  "המועדים עודכנו, אך שמירת שאר פרטי התחרות נכשלה. יש לבדוק את הפרטים ולנסות שוב.";',
      );
      expect(hookSource).toContain(
        'onShowToast("error", DATE_CHANGE_PARTIAL_SAVE_ERROR);',
      );
    });

    it("the updateCompetition catch block reloads the competition (dates already moved, UI must reflect that)", () => {
      const body = getSaveWithDateChangeBody();
      const updateCatchAt = body.indexOf(
        '} catch (error) {\n        console.error(error);\n        onShowToast("error", DATE_CHANGE_PARTIAL_SAVE_ERROR);',
      );
      const updateCatchEndAt = body.indexOf("\n      }", updateCatchAt);
      const updateCatchBlock = body.slice(updateCatchAt, updateCatchEndAt);

      expect(updateCatchAt).toBeGreaterThan(-1);
      expect(updateCatchBlock).toContain(
        "await loadExistingCompetition(competitionId, currentRanchId);",
      );
      expect(updateCatchBlock).toContain("return { success: false };");
    });

    it("never shows RESCHEDULE_GENERIC_ERROR ('no changes were made') once reschedule has already succeeded", () => {
      const body = getSaveWithDateChangeBody();
      const updateTryAt = body.indexOf("try {\n        var newStartDate");
      const updateCatchEndAt = body.indexOf(
        "\n      }",
        body.indexOf("return { success: false };", updateTryAt),
      );
      const updateStageBlock = body.slice(updateTryAt, updateCatchEndAt);

      expect(updateStageBlock).not.toContain("RESCHEDULE_GENERIC_ERROR");
    });

    it("does not run applyIntentStatusSideEffect when the field save failed (status never actually changed server-side)", () => {
      const body = getSaveWithDateChangeBody();
      const updateTryAt = body.indexOf("try {\n        var newStartDate");
      const updateCatchEndAt = body.indexOf(
        "\n      }",
        body.indexOf("return { success: false };", updateTryAt),
      );
      const updateStageBlock = body.slice(updateTryAt, updateCatchEndAt);

      expect(updateStageBlock).not.toContain("applyIntentStatusSideEffect");
    });
  });

  describe("path 3 — both rescheduleCompetition and updateCompetition succeed", () => {
    it("shows exactly one success toast (the reschedule message) — no duplicate success toast from the update stage", () => {
      const body = getSaveWithDateChangeBody();
      const successToastCount = (
        body.match(/onShowToast\("success",/g) || []
      ).length;

      expect(successToastCount).toBe(1);
    });

    it("reloads exactly once at the end — not once per stage", () => {
      const body = getSaveWithDateChangeBody();
      const reloadCount = (
        body.match(/await loadExistingCompetition\(/g) || []
      ).length;

      // Once in the partial-failure catch (path 2), once on the full-success
      // path — never both in the same execution, but two textual call sites
      // total is correct (only one of them ever runs per invocation).
      expect(reloadCount).toBe(2);
    });

    it("the success path's reload comes after the success toast, both after updateCompetition resolved", () => {
      const body = getSaveWithDateChangeBody();
      const updateCallAt = body.indexOf("await updateCompetition(");
      const successToastAt = body.indexOf('onShowToast("success", successMessage);');
      const finalReloadAt = body.lastIndexOf(
        "await loadExistingCompetition(competitionId, currentRanchId);",
      );

      expect(updateCallAt).toBeGreaterThan(-1);
      expect(successToastAt).toBeGreaterThan(updateCallAt);
      expect(finalReloadAt).toBeGreaterThan(successToastAt);
    });
  });
});

describe("saveOrdinary — the no-date-change path is unchanged by CAP-6", () => {
  it("still calls updateCompetition for an existing competition", () => {
    const fnAt = hookSource.indexOf("async function saveOrdinary(");
    expect(fnAt).toBeGreaterThan(-1);

    const body = hookSource.slice(fnAt);

    expect(body).toContain("await updateCompetition(competitionId, payload);");
  });

  it("still calls createCompetition for a brand-new competition", () => {
    expect(hookSource).toContain(
      "var response = await createCompetition(createPayload);",
    );
  });

  it("never calls rescheduleCompetition — that only ever happens in saveWithDateChange", () => {
    const fnAt = hookSource.indexOf("async function saveOrdinary(");
    const fnEndAt = hookSource.indexOf("\n  return {", fnAt);

    expect(fnAt).toBeGreaterThan(-1);
    expect(fnEndAt).toBeGreaterThan(fnAt);

    const body = hookSource.slice(fnAt, fnEndAt);

    expect(body).not.toContain("rescheduleCompetition(");
  });
});

describe("saveDetails — intent status mapping shared by both paths", () => {
  it("computeStatusToSend keeps the original three-way mapping", () => {
    const fnAt = hookSource.indexOf("function computeStatusToSend(");
    const fnEndAt = hookSource.indexOf("\n  }", fnAt);
    const body = hookSource.slice(fnAt, fnEndAt);

    expect(body).toContain('if (intent === "publish") {\n      return null;');
    expect(body).toContain('if (intent === "draft") {\n      return "טיוטה";');
    expect(body).toContain("return currentStatus;");
  });
});

describe("hook return — new fields are additive, old reschedule-modal fields are gone", () => {
  it("exposes the confirm-dialog handlers", () => {
    const returnAt = hookSource.lastIndexOf("return {");
    const returnBlock = hookSource.slice(returnAt);

    for (const field of [
      "savingReschedule",
      "dateChangeConfirm",
      "confirmDateChange",
      "cancelDateChangeConfirm",
      "dateChangeConfirmLabel",
      "dateChangeCancelLabel",
    ]) {
      expect(returnBlock).toContain(field);
    }

    for (const field of ["saveDetails", "loadExistingCompetition", "handleDetailsChange"]) {
      expect(returnBlock).toContain(field);
    }

    for (const field of [
      "rescheduleModalOpen",
      "openRescheduleModal",
      "closeRescheduleModal",
      "handleReschedule",
    ]) {
      expect(returnBlock).not.toContain(field);
    }
  });
});

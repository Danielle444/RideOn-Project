import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createInFlightGuard } from "../utils/inFlightGuard";

// useProfileScreen.js pulls in react-native/context deps, not safe to
// import/render under vitest - same convention as every other
// *.contract.test.js file in this repo: read the source as text.

var SOURCE_PATH = path.resolve(__dirname, "useProfileScreen.js");

function readSource() {
  return fs.readFileSync(SOURCE_PATH, "utf8").replace(/\r\n/g, "\n");
}

describe("useProfileScreen - styled alert migration", () => {
  it("no longer imports or calls the native Alert", () => {
    var source = readSource();
    expect(source).not.toMatch(/\bAlert\b/);
  });

  it("imports showToast from the styled alert foundation", () => {
    var source = readSource();
    expect(source).toContain('import { showToast } from "../services/toastService";');
  });

  it("all 14 acknowledgement-only alerts became showToast calls (none dropped, none duplicated)", () => {
    var source = readSource();
    var matches = source.match(/showToast\(/g) || [];
    expect(matches.length).toBe(14);
  });

  it("success toasts use the success type", () => {
    var source = readSource();
    expect(source).toContain('showToast("פרטי המשתמש עודכנו בהצלחה", "success");');
    expect(source).toContain('showToast("פרטי החווה עודכנו בהצלחה", "success");');
    expect(source).toContain('showToast("הבקשה להוספת פרופיל נשלחה בהצלחה", "success");');
    expect(source).toContain('showToast("המנהל נוסף בהצלחה", "success");');
    expect(source).toContain('showToast("המנהל הוסר בהצלחה", "success");');
    expect(source).toContain(
      '? "בקשת הניהול אושרה"\n          : "בקשת הניהול נדחתה",\n        "success",\n      );',
    );
  });

  it("every catch-block toast uses the error type", () => {
    var source = readSource();
    var errorCallCount = (
      source.match(/\n\s*"error",\n\s*\);/g) || []
    ).length;
    expect(errorCallCount).toBe(8);
  });

  it("preserves refresh/state sequencing - loadPage still runs right after the save-success toast", () => {
    var source = readSource();
    var toastIndex = source.indexOf('showToast("פרטי המשתמש עודכנו בהצלחה", "success");');
    var reloadIndex = source.indexOf("await loadPage();", toastIndex);

    expect(toastIndex).toBeGreaterThan(-1);
    expect(reloadIndex).toBeGreaterThan(toastIndex);
    expect(reloadIndex - toastIndex).toBeLessThan(100);
  });

  it("preserves refresh sequencing for manager add/remove - reload calls still precede their success toast", () => {
    var source = readSource();
    var addManagerFnStart = source.indexOf("async function handleAddManager(adminPersonId)");
    var addManagerFnEnd = source.indexOf("async function handleRemoveManager(adminPersonId)");
    var addManagerBody = source.slice(addManagerFnStart, addManagerFnEnd);

    var loadManagersIndex = addManagerBody.indexOf("await loadManagers();");
    var toastIndex = addManagerBody.indexOf('showToast("המנהל נוסף בהצלחה", "success");');

    expect(loadManagersIndex).toBeGreaterThan(-1);
    expect(toastIndex).toBeGreaterThan(loadManagersIndex);
  });

  it("no manager-flow business logic changed - handlers still call the same service functions", () => {
    var source = readSource();
    expect(source).toContain("await addPayerManager(user.personId, adminPersonId);");
    expect(source).toContain("await removePayerManager(user.personId, adminPersonId);");
    expect(source).toContain(
      "await answerPayerManagerRequest(\n        user.personId,\n        adminPersonId,\n        answerStatus,\n      );",
    );
  });
});

describe("useProfileScreen - destructive manager action guards (P3.1)", () => {
  it("imports the shared in-flight guard utility", () => {
    var source = readSource();
    expect(source).toContain(
      'import { createInFlightGuard } from "../utils/inFlightGuard";',
    );
  });

  it("initializes one guard ref per destructive action, lazily", () => {
    var source = readSource();

    expect(source).toContain("const removeManagerGuardRef = useRef(null);");
    expect(source).toContain(
      "if (removeManagerGuardRef.current === null) {\n    removeManagerGuardRef.current = createInFlightGuard();\n  }",
    );

    expect(source).toContain("const answerManagerGuardRef = useRef(null);");
    expect(source).toContain(
      "if (answerManagerGuardRef.current === null) {\n    answerManagerGuardRef.current = createInFlightGuard();\n  }",
    );
  });

  it("handleRemoveManager: guard acquisition precedes the mutation and any mutation-dependent state, and is a no-op when already in flight", () => {
    var source = readSource();

    var fnStart = source.indexOf("async function handleRemoveManager(adminPersonId)");
    var fnEnd = source.indexOf("async function handleAnswerManagerRequest(");
    var body = source.slice(fnStart, fnEnd);

    var guardKeyIndex = body.indexOf('const guardKey = "removeManager:" + adminPersonId;');
    var tryAcquireIndex = body.indexOf(
      "if (!removeManagerGuardRef.current.tryAcquire(guardKey)) {",
    );
    var earlyReturnIndex = body.indexOf("return;", tryAcquireIndex);
    var setBusyIndex = body.indexOf("setRemovingManagerId(adminPersonId);");
    var mutationIndex = body.indexOf(
      "await removePayerManager(user.personId, adminPersonId);",
    );

    // Guard key derived from the real adminPersonId parameter already in
    // scope - no invented identifiers.
    expect(guardKeyIndex).toBeGreaterThan(-1);

    // tryAcquire (and its early-return no-op path) run before ANY of the
    // busy-state update or the API call.
    expect(tryAcquireIndex).toBeGreaterThan(guardKeyIndex);
    expect(earlyReturnIndex).toBeGreaterThan(tryAcquireIndex);
    expect(setBusyIndex).toBeGreaterThan(earlyReturnIndex);
    expect(mutationIndex).toBeGreaterThan(setBusyIndex);

    // Release happens in finally, alongside the existing busy-state reset.
    var finallyIndex = body.indexOf("} finally {");
    var releaseIndex = body.indexOf(
      "removeManagerGuardRef.current.release(guardKey);",
    );
    var resetBusyInFinallyIndex = body.indexOf(
      "setRemovingManagerId(null);",
      finallyIndex,
    );

    expect(finallyIndex).toBeGreaterThan(mutationIndex);
    expect(releaseIndex).toBeGreaterThan(finallyIndex);
    expect(resetBusyInFinallyIndex).toBeGreaterThan(finallyIndex);
    expect(resetBusyInFinallyIndex).toBeLessThan(releaseIndex);
  });

  it("handleAnswerManagerRequest (covers both approve and reject): guard acquisition precedes the mutation, release happens in finally", () => {
    var source = readSource();

    var fnStart = source.indexOf(
      "async function handleAnswerManagerRequest(adminPersonId, answerStatus)",
    );
    var fnEnd = source.indexOf("async function handleApproveManagerRequest(");
    var body = source.slice(fnStart, fnEnd);

    var guardKeyIndex = body.indexOf('const guardKey = "answerManager:" + adminPersonId;');
    var tryAcquireIndex = body.indexOf(
      "if (!answerManagerGuardRef.current.tryAcquire(guardKey)) {",
    );
    var earlyReturnIndex = body.indexOf("return;", tryAcquireIndex);
    var setBusyIndex = body.indexOf("setAnsweringManagerId(adminPersonId);");
    var mutationIndex = body.indexOf("await answerPayerManagerRequest(");

    expect(guardKeyIndex).toBeGreaterThan(-1);
    expect(tryAcquireIndex).toBeGreaterThan(guardKeyIndex);
    expect(earlyReturnIndex).toBeGreaterThan(tryAcquireIndex);
    expect(setBusyIndex).toBeGreaterThan(earlyReturnIndex);
    expect(mutationIndex).toBeGreaterThan(setBusyIndex);

    var finallyIndex = body.indexOf("} finally {");
    var releaseIndex = body.indexOf(
      "answerManagerGuardRef.current.release(guardKey);",
    );
    var resetBusyInFinallyIndex = body.indexOf(
      "setAnsweringManagerId(null);",
      finallyIndex,
    );

    expect(finallyIndex).toBeGreaterThan(mutationIndex);
    expect(releaseIndex).toBeGreaterThan(finallyIndex);
    expect(resetBusyInFinallyIndex).toBeGreaterThan(finallyIndex);
    expect(resetBusyInFinallyIndex).toBeLessThan(releaseIndex);

    // handleRejectManagerRequest still delegates to this same guarded
    // function - reject gets the guard "for free", same as it already
    // shared answeringManagerId with approve before this change.
    var rejectDelegation = source.indexOf(
      "async function handleRejectManagerRequest(adminPersonId) {",
    );
    var rejectDelegationEnd = source.indexOf("\n  }\n", rejectDelegation);
    expect(source.slice(rejectDelegation, rejectDelegationEnd)).toContain(
      'await handleAnswerManagerRequest(adminPersonId, "Rejected");',
    );
  });

  it("createInFlightGuard itself: duplicate tryAcquire for the same key is a no-op until release", () => {
    // Exercises the real utility at runtime (it has no react/react-native
    // import, per its own header comment, so it's safe to import directly
    // under vitest) to prove the guard behavior the two tests above rely on
    // statically actually holds.
    var guard = createInFlightGuard();
    var key = "removeManager:123";

    expect(guard.tryAcquire(key)).toBe(true);
    // A second, concurrent attempt for the same key (simulating a duplicate
    // confirm before the first request settles) is a no-op.
    expect(guard.tryAcquire(key)).toBe(false);
    expect(guard.tryAcquire(key)).toBe(false);

    // A different key (a different adminPersonId) is unaffected.
    expect(guard.tryAcquire("removeManager:456")).toBe(true);

    guard.release(key);
    // Only after release can the same key be acquired again.
    expect(guard.tryAcquire(key)).toBe(true);
  });
});

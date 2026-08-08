import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// PT-8: this screen's paid-time cancellation (handleCancel) lacked a
// synchronous in-flight guard, unlike the Payer/stall/shavings flows
// elsewhere in the app. The screen imports react-native/context modules not
// safe to import under plain vitest, so this reads source text - same
// approach as the repo's other *.contract.test.js files (see
// AdminCompetitionPayerAccountScreen.contract.test.js).

var SOURCE_PATH = path.resolve(__dirname, "AdminCompetitionPaidTimesScreen.jsx");

function readSource() {
  return fs.readFileSync(SOURCE_PATH, "utf8").replace(/\r\n/g, "\n");
}

function countOccurrences(haystack, needle) {
  var count = 0;
  var index = 0;

  while ((index = haystack.indexOf(needle, index)) !== -1) {
    count++;
    index += needle.length;
  }

  return count;
}

function getFunctionBlock(source, signature, nextSignature) {
  var start = source.indexOf(signature);
  var end = source.indexOf(nextSignature, start);

  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);

  return source.slice(start, end);
}

function getHandleCancelBlock(source) {
  return getFunctionBlock(
    source,
    "async function handleCancel(item) {",
    "function renderFilterChip(",
  );
}

function getConfirmCancelBlock(source) {
  return getFunctionBlock(
    source,
    "function confirmCancel(item) {",
    "async function handleCancel(item) {",
  );
}

function getOpenEditBlock(source) {
  return getFunctionBlock(
    source,
    "function openEdit(item) {",
    "function closeEdit() {",
  );
}

describe("AdminCompetitionPaidTimesScreen - PT-8 paid-time cancellation in-flight guard", () => {
  it("imports createInFlightGuard and lazily initializes paidTimeCancelGuardRef", () => {
    var source = readSource();

    expect(source).toContain(
      'import { createInFlightGuard } from "../../../../utils/inFlightGuard";',
    );
    expect(source).toContain("var paidTimeCancelGuardRef = useRef(null);");
    expect(source).toContain(
      "if (paidTimeCancelGuardRef.current === null) {\n    paidTimeCancelGuardRef.current = createInFlightGuard();\n  }",
    );
  });

  it("the guard ref is lazily initialized, never as the useRef argument itself", () => {
    var source = readSource();

    expect(source).not.toContain("useRef(createInFlightGuard())");
  });

  it("handleCancel no longer gates on availability.paidTimes.isEnabled - cancellation is an always-available business path, mirroring AdminCompetitionPayerAccountScreen", () => {
    var block = getHandleCancelBlock(readSource());

    expect(block).not.toContain("if (!availability.paidTimes.isEnabled) {");
  });

  it("handleCancel's first statement is the guard key, with the tryAcquire check immediately after - no step-level check runs first", () => {
    var block = getHandleCancelBlock(readSource());

    var guardKeyIndex = block.indexOf(
      "var guardKey = item.paidTimeRequestId;",
    );
    var guardCheckIndex = block.indexOf(
      "if (!paidTimeCancelGuardRef.current.tryAcquire(guardKey)) {",
    );

    expect(guardKeyIndex).toBeGreaterThan(-1);
    expect(guardCheckIndex).toBeGreaterThan(guardKeyIndex);
  });

  it("acquires the guard synchronously, keyed by paidTimeRequestId (matching the existing cancellingId key), before setCancellingId and the service call", () => {
    var block = getHandleCancelBlock(readSource());

    var guardKeyIndex = block.indexOf(
      "var guardKey = item.paidTimeRequestId;",
    );
    var guardCheckIndex = block.indexOf(
      "if (!paidTimeCancelGuardRef.current.tryAcquire(guardKey)) {",
    );
    var returnIndex = block.indexOf("return;", guardCheckIndex);
    var setCancellingIdIndex = block.indexOf("setCancellingId(guardKey);");
    var serviceCallIndex = block.indexOf("await cancelPaidTimeRequest(");

    expect(guardKeyIndex).toBeGreaterThan(-1);
    expect(guardCheckIndex).toBeGreaterThan(guardKeyIndex);
    expect(returnIndex).toBeGreaterThan(guardCheckIndex);
    expect(returnIndex).toBeLessThan(setCancellingIdIndex);
    expect(setCancellingIdIndex).toBeLessThan(serviceCallIndex);
  });

  it("a failed acquire returns before the paid-time-enabled-gated mutation runs - no duplicate cancelPaidTimeRequest call", () => {
    var block = getHandleCancelBlock(readSource());

    expect(countOccurrences(block, "await cancelPaidTimeRequest(")).toBe(1);
  });

  it("releases the guard in the outer finally, alongside setCancellingId(null), on both success and failure", () => {
    var block = getHandleCancelBlock(readSource());

    var finallyIndex = block.lastIndexOf("} finally {");
    var finallyBlock = block.slice(finallyIndex);

    expect(finallyBlock).toContain("setCancellingId(null);");
    expect(finallyBlock).toContain(
      "paidTimeCancelGuardRef.current.release(guardKey);",
    );

    expect(
      countOccurrences(
        block,
        "paidTimeCancelGuardRef.current.release(guardKey);",
      ),
    ).toBe(1);
  });

  it("on failure, the error message goes through the shared hardened extractor, and the notice is unchanged", () => {
    var block = getHandleCancelBlock(readSource());

    // Promoted off the raw err?.response?.data echo (RideOn notification
    // audit, 2026-08-07, Slice 2) onto the shared, hardened extractor - it
    // can no longer surface raw/English/SQLSTATE-prefixed backend text.
    expect(block).toContain(
      'var msg = getApiErrorMessage(err, "אירעה שגיאה");',
    );
    expect(block).toContain('showToast(String(msg), "error");');
  });

  it("imports the shared hardened error extractor", () => {
    var source = readSource();

    expect(source).toContain(
      'from "../../../../../../shared/auth/utils/authApiErrors"',
    );
  });

  it("on success, the existing refresh call (paidTimes.handleRefresh) is unchanged", () => {
    var block = getHandleCancelBlock(readSource());

    expect(block).toContain("await paidTimes.handleRefresh();");
  });
});

// P2: hardening the structural gap flagged in the admin-alert-migration
// audit - the mutation and the post-cancel refresh sat in one outer
// try/catch, so a rejecting refresh could have reported a successful
// cancellation as a failure, and there was no styled success feedback at
// all. Mirrors AdminCompetitionPayerAccountScreen's doCancelPaidTime, which
// already carries this exact shape and success wording.
describe("AdminCompetitionPaidTimesScreen - cancellation success feedback and refresh isolation", () => {
  it("shows the established paid-time cancellation success toast, matching AdminCompetitionPayerAccountScreen.doCancelPaidTime", () => {
    var block = getHandleCancelBlock(readSource());

    expect(block).toContain('showToast("הבקשה בוטלה", "success");');
  });

  it("the success toast fires after the mutation but before the refresh is attempted", () => {
    var block = getHandleCancelBlock(readSource());

    var mutationIndex = block.indexOf("await cancelPaidTimeRequest(");
    var toastIndex = block.indexOf('showToast("הבקשה בוטלה", "success");');
    var refreshIndex = block.indexOf("await paidTimes.handleRefresh();");

    expect(mutationIndex).toBeGreaterThan(-1);
    expect(toastIndex).toBeGreaterThan(mutationIndex);
    expect(refreshIndex).toBeGreaterThan(toastIndex);
  });

  it("the refresh call is nested in its own try/catch, isolated from the mutation's outer catch", () => {
    var block = getHandleCancelBlock(readSource());

    var refreshTryIndex = block.indexOf(
      "try {\n        await paidTimes.handleRefresh();",
    );
    var refreshCatchIndex = block.indexOf(
      "} catch (refreshError) {\n        console.log(\"CANCEL PAID TIME REFRESH ERROR\", refreshError);\n      }",
    );

    expect(refreshTryIndex).toBeGreaterThan(-1);
    expect(refreshCatchIndex).toBeGreaterThan(refreshTryIndex);
  });

  it("a refresh failure cannot reach the cancellation-failure toast - the outer catch's getApiErrorMessage/showToast pair appears exactly once, after the nested refresh catch", () => {
    var block = getHandleCancelBlock(readSource());

    expect(
      countOccurrences(block, 'var msg = getApiErrorMessage(err, "אירעה שגיאה");'),
    ).toBe(1);
    expect(countOccurrences(block, 'showToast(String(msg), "error");')).toBe(1);

    var nestedCatchIndex = block.indexOf("} catch (refreshError) {");
    var outerCatchIndex = block.indexOf("} catch (err) {");

    expect(nestedCatchIndex).toBeGreaterThan(-1);
    expect(outerCatchIndex).toBeGreaterThan(nestedCatchIndex);
  });

  it("the in-flight guard and confirmation dialog remain intact alongside the hardened refresh", () => {
    var source = readSource();
    var block = getHandleCancelBlock(source);

    expect(block).toContain(
      "if (!paidTimeCancelGuardRef.current.tryAcquire(guardKey)) {",
    );
    expect(
      countOccurrences(
        block,
        "paidTimeCancelGuardRef.current.release(guardKey);",
      ),
    ).toBe(1);
    expect(countOccurrences(source, "<AppDialog")).toBe(1);
  });

  it("zero Alert references remain in the production file", () => {
    var source = readSource();

    expect(source).not.toContain("Alert");
  });

  it("the confirmCancel dynamic 24h/full-charge copy is unchanged by this hardening", () => {
    var block = getConfirmCancelBlock(readSource());

    expect(block).toContain('"ביטול בתוך 24 שעות - חיוב מלא"');
    expect(block).toContain('"ביטול פייד טיים"');
    expect(block).toContain(
      'confirmLabel: withinDay ? "אישור וחיוב" : "אישור ביטול"',
    );
  });
});

// Regression coverage for the submission-critical bug: both the "ערוך" and
// "בטל פייד טיים" buttons on an expanded Paid Time card silently no-op'd
// because openEdit AND confirmCancel both returned early on
// availability.paidTimes.isEnabled, with no user-visible feedback.
// AdminCompetitionPayerAccountScreen already established the correct
// contract (commit 0f21e11): cancellation is always available, edit is
// gated by canEditPaidTimeRow. This screen previously used the pre-fix
// pattern from commit 5153432 and was never updated to match.
describe("AdminCompetitionPaidTimesScreen - Cancel is never gated on step availability", () => {
  it("confirmCancel does not check availability.paidTimes.isEnabled before showing the confirm alert", () => {
    var block = getConfirmCancelBlock(readSource());

    expect(block).not.toContain("if (!availability.paidTimes.isEnabled) {");
  });

  it("confirmCancel's first statement builds the alert title, not a step-availability check", () => {
    var block = getConfirmCancelBlock(readSource());
    var trimmed = block.slice(block.indexOf("{") + 1).trimStart();

    expect(trimmed.startsWith("var withinDay =")).toBe(true);
  });
});

describe("AdminCompetitionPaidTimesScreen - Edit eligibility uses the established canEditPaidTimeRow pattern", () => {
  it("imports canEditPaidTimeRow from the shared paidTimeEditAvailability util (no second implementation)", () => {
    var source = readSource();

    expect(source).toContain(
      'import { canEditPaidTimeRow } from "../../../../utils/paidTimeEditAvailability";',
    );
  });

  it("openEdit gates on canEditPaidTimeRow(item, availability.paidTimes), not the raw isEnabled flag", () => {
    var block = getOpenEditBlock(readSource());

    expect(block).toContain(
      "if (!canEditPaidTimeRow(item, availability.paidTimes)) {",
    );
    expect(block).not.toContain("if (!availability.paidTimes.isEnabled) {");
  });
});

describe("AdminCompetitionPaidTimesScreen - AppDialog/AppToast migration", () => {
  it("no longer imports or calls the native Alert.alert anywhere in the screen", () => {
    var source = readSource();

    expect(source).not.toContain("Alert");
  });

  it("imports showToast and AppDialog from the styled-alert foundation", () => {
    var source = readSource();

    expect(source).toContain(
      'import { showToast } from "../../../../services/toastService";',
    );
    expect(source).toContain(
      'import AppDialog from "../../../../components/common/AppDialog";',
    );
  });

  it("owns a confirmDialog state slot for its one cancel confirmation", () => {
    var source = readSource();

    expect(source).toContain("var [confirmDialog, setConfirmDialog] = useState(null);");
  });

  it("renders exactly one AppDialog instance, wired to confirmDialog and cleared via onCancel", () => {
    var source = readSource();

    expect(countOccurrences(source, "<AppDialog")).toBe(1);
    expect(source).toContain("visible={!!confirmDialog}");
    expect(source).toContain("title={confirmDialog?.title}");
    expect(source).toContain("message={confirmDialog?.message}");
    expect(source).toContain("confirmLabel={confirmDialog?.confirmLabel || \"אישור\"}");
    expect(source).toContain("onConfirm={confirmDialog?.onConfirm}");
    expect(source).toContain(
      "onCancel={function () {\n          setConfirmDialog(null);\n        }}",
    );
  });

  it("confirmCancel sets confirmDialog with the same dynamic 24h/full-charge title, body and confirm label it always had, and clears the dialog before invoking handleCancel", () => {
    var block = getConfirmCancelBlock(readSource());

    expect(block).toContain('"ביטול בתוך 24 שעות - חיוב מלא"');
    expect(block).toContain('"ביטול פייד טיים"');
    expect(block).toContain(
      '"שים לב: הביטול מתבצע פחות מ-24 שעות לפני המועד. במידה ותאשר, תחויב בתשלום מלא. הסלוט יתפנה לרוכב אחר."',
    );
    expect(block).toContain(
      '"ביטול הבקשה ישחרר את הסלוט לרוכב אחר. עפ\\"י כללי העסק חיוב מלא חל. להמשיך?"',
    );
    expect(block).toContain(
      'confirmLabel: withinDay ? "אישור וחיוב" : "אישור ביטול"',
    );
    expect(block).toContain("setConfirmDialog({");
    expect(block).toContain("setConfirmDialog(null);");
    expect(block).toContain("handleCancel(item);");
  });
});

describe("AdminCompetitionPaidTimesScreen - paidTimesAvailability is threaded to both card renderers", () => {
  it("passes paidTimesAvailability to PaidTimeScheduleView and PaidTimeListItemCard so PaidTimeCardActions can compute edit eligibility before render", () => {
    var source = readSource();

    expect(
      countOccurrences(source, "paidTimesAvailability={availability.paidTimes}"),
    ).toBe(2);
  });
});

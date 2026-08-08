import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// Admin stalls/shavings styled-alert migration: swaps this screen's native
// Alert.alert calls for the AppDialog/AppToast(showToast) foundation
// (feat/mobile-styled-alert-foundation, merged origin/main b9b5b62) and fixes
// the PROVEN BUG that handleCancelStallBooking had no synchronous in-flight
// guard, unlike every sibling cancel flow (AdminCompetitionPayerAccountScreen,
// AdminCompetitionPaidTimesScreen - see that screen's own PT-8 contract test,
// whose helper shape this file mirrors). The screen imports react-native/
// context modules not safe to import under plain vitest, so this reads
// source text instead of mounting - same approach as the repo's other
// *.contract.test.js files.

var SOURCE_PATH = path.resolve(__dirname, "AdminCompetitionStallsShavingsScreen.jsx");
var CARD_SOURCE_PATH = path.resolve(
  __dirname,
  "../../../../components/competitions/CompetitionStallCard.jsx",
);

function readSource() {
  return fs.readFileSync(SOURCE_PATH, "utf8").replace(/\r\n/g, "\n");
}

function readCardSource() {
  return fs.readFileSync(CARD_SOURCE_PATH, "utf8").replace(/\r\n/g, "\n");
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

function getHandleCancelStallBookingBlock(source) {
  return getFunctionBlock(
    source,
    "function handleCancelStallBooking(item) {",
    "async function handleConfirmCancelStallBooking() {",
  );
}

function getHandleConfirmCancelStallBookingBlock(source) {
  return getFunctionBlock(
    source,
    "async function handleConfirmCancelStallBooking() {",
    "function handleDismissStallCancelDialog() {",
  );
}

function getHandleCancelShavingsFromHistoryBlock(source) {
  return getFunctionBlock(
    source,
    "function handleCancelShavingsFromHistory(order) {",
    "async function handleConfirmCancelShavingsFromHistory() {",
  );
}

function getHandleConfirmCancelShavingsFromHistoryBlock(source) {
  return getFunctionBlock(
    source,
    "async function handleConfirmCancelShavingsFromHistory() {",
    "function handleDismissShavingsCancelDialog() {",
  );
}

describe("AdminCompetitionStallsShavingsScreen - stall cancel requires confirmation before any request", () => {
  it("handleCancelStallBooking never calls adminCancelStallBooking directly - it only opens the dialog via setStallCancelTarget", () => {
    var block = getHandleCancelStallBookingBlock(readSource());

    expect(block).not.toContain("adminCancelStallBooking(");
    expect(block).toContain("setStallCancelTarget(item);");
  });

  it("the stall-cancel AppDialog's onConfirm is the separate handler, not an inline closure", () => {
    var source = readSource();

    expect(source).toContain("onConfirm={handleConfirmCancelStallBooking}");
  });
});

describe("AdminCompetitionStallsShavingsScreen - cancel (dismiss) performs no request", () => {
  it("handleDismissStallCancelDialog only clears stallCancelTarget - no service import is reachable from it", () => {
    var block = getFunctionBlock(
      readSource(),
      "function handleDismissStallCancelDialog() {",
      "// Admin history cancel",
    );

    expect(block).toContain("setStallCancelTarget(null);");
    expect(block).not.toContain("adminCancelStallBooking");
  });

  it("the stall-cancel AppDialog's onCancel is wired to the dismiss handler", () => {
    var source = readSource();

    expect(source).toContain("onCancel={handleDismissStallCancelDialog}");
  });
});

describe("AdminCompetitionStallsShavingsScreen - confirm fires the cancel exactly once", () => {
  it("handleConfirmCancelStallBooking calls adminCancelStallBooking exactly once", () => {
    var block = getHandleConfirmCancelStallBookingBlock(readSource());

    expect(countOccurrences(block, "await adminCancelStallBooking(")).toBe(1);
  });
});

describe("AdminCompetitionStallsShavingsScreen - PROVEN BUG fix: synchronous in-flight guard on stall cancel", () => {
  it("imports createInFlightGuard and lazily initializes stallCancelGuardRef (never as the useRef argument itself)", () => {
    var source = readSource();

    expect(source).toContain(
      'import { createInFlightGuard } from "../../../../utils/inFlightGuard";',
    );
    expect(source).toContain("var stallCancelGuardRef = useRef(null);");
    expect(source).toContain(
      "if (stallCancelGuardRef.current === null) {\n    stallCancelGuardRef.current = createInFlightGuard();\n  }",
    );
    expect(source).not.toContain("useRef(createInFlightGuard())");
  });

  it("acquires the guard synchronously, keyed by stallBookingId, before setCancellingStallId and the service call", () => {
    var block = getHandleConfirmCancelStallBookingBlock(readSource());

    var guardKeyIndex = block.indexOf('var guardKey = "stall:" + item.stallBookingId;');
    var guardCheckIndex = block.indexOf(
      "if (!stallCancelGuardRef.current.tryAcquire(guardKey)) {",
    );
    var returnIndex = block.indexOf("return;", guardCheckIndex);
    var setCancellingIndex = block.indexOf("setCancellingStallId(item.stallBookingId);");
    var serviceCallIndex = block.indexOf("await adminCancelStallBooking(");

    expect(guardKeyIndex).toBeGreaterThan(-1);
    expect(guardCheckIndex).toBeGreaterThan(guardKeyIndex);
    expect(returnIndex).toBeGreaterThan(guardCheckIndex);
    expect(returnIndex).toBeLessThan(setCancellingIndex);
    expect(setCancellingIndex).toBeLessThan(serviceCallIndex);
  });

  it("a failed acquire returns before setCancellingStallId or the service call run - duplicate/second-tap-while-pending cannot fire a second request", () => {
    var block = getHandleConfirmCancelStallBookingBlock(readSource());

    var guardCheckIndex = block.indexOf(
      "if (!stallCancelGuardRef.current.tryAcquire(guardKey)) {",
    );
    var guardCheckBlock = block.slice(
      guardCheckIndex,
      block.indexOf("}", guardCheckIndex) + 1,
    );

    expect(guardCheckBlock).toContain("return;");
    expect(guardCheckBlock).not.toContain("setCancellingStallId");
    expect(guardCheckBlock).not.toContain("adminCancelStallBooking");

    // Only one acquisition path exists in the whole handler.
    expect(
      countOccurrences(block, "stallCancelGuardRef.current.tryAcquire(guardKey)"),
    ).toBe(1);
  });

  it("releases the guard in the outer finally, alongside setCancellingStallId(null), exactly once", () => {
    var block = getHandleConfirmCancelStallBookingBlock(readSource());

    var finallyIndex = block.lastIndexOf("} finally {");
    var finallyBlock = block.slice(finallyIndex);

    expect(finallyBlock).toContain("setCancellingStallId(null);");
    expect(finallyBlock).toContain("stallCancelGuardRef.current.release(guardKey);");
    expect(
      countOccurrences(block, "stallCancelGuardRef.current.release(guardKey);"),
    ).toBe(1);
  });

  it("the guard key is namespaced as stall:<id>, distinct from the shavings guard's shavings:<id> key space", () => {
    var source = readSource();

    expect(source).toContain('var guardKey = "stall:" + item.stallBookingId;');
    expect(source).toContain('var busyKey = "shavings:" + order.shavingsOrderId;');
  });

  it("does not rely only on React state for correctness - the tryAcquire check runs before any setState in the handler", () => {
    var block = getHandleConfirmCancelStallBookingBlock(readSource());

    var firstSetStateIndex = block.indexOf("setCancellingStallId(");
    var guardCheckIndex = block.indexOf(
      "if (!stallCancelGuardRef.current.tryAcquire(guardKey)) {",
    );

    expect(guardCheckIndex).toBeGreaterThan(-1);
    expect(guardCheckIndex).toBeLessThan(firstSetStateIndex);
  });
});

describe("AdminCompetitionStallsShavingsScreen - stall-cancel row/button is disabled while its own cancel is pending", () => {
  it("cancellingStallId is threaded from the screen into CompetitionStallCard", () => {
    var source = readSource();

    expect(source).toContain("cancellingStallId={cancellingStallId}");
  });

  it("the AppDialog's own confirm button is also held busy for the exact pending booking (isBusy compares against stallCancelTarget)", () => {
    var block = getFunctionBlock(readSource(), "<AppDialog", "<AppDialog\n          visible={!!shavingsCancelTarget}");

    expect(block).toContain("cancellingStallId === stallCancelTarget.stallBookingId");
  });

  it("CompetitionStallCard disables the cancel Pressable and swaps its label while cancellingStallId matches this row", () => {
    var source = readCardSource();

    expect(source).toContain("disabled={props.cancellingStallId === item.stallBookingId}");
    expect(source).toContain(
      'props.cancellingStallId === item.stallBookingId\n                      ? "מבטלת..."\n                      : "ביטול תא"',
    );
  });
});

describe("AdminCompetitionStallsShavingsScreen - shavings cancellation remains independent of the new stall guard", () => {
  it("handleCancelShavingsFromHistory still only opens its own dialog (setShavingsCancelTarget), untouched by the stall guard", () => {
    var block = getHandleCancelShavingsFromHistoryBlock(readSource());

    expect(block).toContain("setShavingsCancelTarget(order);");
    expect(block).not.toContain("stallCancelGuardRef");
  });

  it("handleConfirmCancelShavingsFromHistory still uses the pre-existing cancellingShavingsId state mechanism, not stallCancelGuardRef", () => {
    var block = getHandleConfirmCancelShavingsFromHistoryBlock(readSource());

    expect(block).toContain("setCancellingShavingsId(busyKey);");
    expect(block).toContain("await adminCancelShavingsOrder(");
    expect(block).not.toContain("stallCancelGuardRef");
  });

  it("cancellingShavingsId is still passed to CompetitionStallCard unchanged, alongside (not replaced by) cancellingStallId", () => {
    var source = readSource();

    expect(source).toContain("cancellingShavingsId={cancellingShavingsId}");
    expect(source).toContain("cancellingStallId={cancellingStallId}");
  });
});

describe("AdminCompetitionStallsShavingsScreen - styled success/error feedback replaces native alerts", () => {
  it("imports AppDialog and showToast, never react-native's Alert", () => {
    var source = readSource();

    expect(source).toContain(
      'import AppDialog from "../../../../components/common/AppDialog";',
    );
    expect(source).toContain(
      'import { showToast } from "../../../../services/toastService";',
    );
    expect(source).not.toMatch(/from ["']react-native["'][\s\S]{0,200}Alert/);
  });

  it("stall cancel success shows the shared DIRECT_CANCELLATION_COPY via a success toast", () => {
    var block = getHandleConfirmCancelStallBookingBlock(readSource());

    expect(block).toContain('showToast(DIRECT_CANCELLATION_COPY.text, "success");');
  });

  it("stall cancel failure shows the extracted API error via an error toast, same fallback copy as before", () => {
    var block = getHandleConfirmCancelStallBookingBlock(readSource());

    expect(block).toContain(
      'getApiErrorMessage(error, "אירעה שגיאה בביטול הזמנת התא")',
    );
    expect(block).toMatch(/showToast\(\s*getApiErrorMessage\(error, "אירעה שגיאה בביטול הזמנת התא"\),\s*"error",\s*\)/);
  });

  it("shavings cancel success/failure copy is unchanged, now routed through showToast", () => {
    var block = getHandleConfirmCancelShavingsFromHistoryBlock(readSource());

    expect(block).toContain('showToast(DIRECT_CANCELLATION_COPY.text, "success");');
    expect(block).toMatch(/showToast\(\s*getApiErrorMessage\(error, "אירעה שגיאה בביטול הזמנת הנסורת"\),\s*"error",\s*\)/);
  });

  it("both confirm dialogs render with destructive styling and the original Hebrew copy, cancelLabel first per the app's existing button order", () => {
    var source = readSource();

    expect(source).toContain('title="ביטול הזמנת תא"');
    expect(source).toContain('message="האם לבטל את הזמנת התא?"');
    expect(source).toContain('title="ביטול הזמנת נסורת"');
    expect(source).toContain('message="האם לבטל את הזמנת הנסורת?"');
    expect(countOccurrences(source, 'confirmLabel="כן, בטלי"')).toBe(2);
    expect(countOccurrences(source, 'cancelLabel="לא"')).toBe(2);
    expect(countOccurrences(source, "destructive={true}")).toBe(2);
  });
});

describe("AdminCompetitionStallsShavingsScreen - zero Alert.alert remains in the scoped live production files", () => {
  var SCOPED_FILES = [
    SOURCE_PATH,
    path.resolve(__dirname, "../../../../hooks/useAdminCompetitionShavings.js"),
    path.resolve(__dirname, "../../../../hooks/useAdminTackStallBookings.js"),
    path.resolve(__dirname, "../../../../hooks/useAdminHorseStallBookings.js"),
    path.resolve(
      __dirname,
      "../../../../components/competitions/StallBookingEditModal.jsx",
    ),
    CARD_SOURCE_PATH,
  ];

  SCOPED_FILES.forEach(function (filePath) {
    it("has zero Alert.alert calls: " + path.basename(filePath), () => {
      var text = fs.readFileSync(filePath, "utf8");

      expect(text).not.toContain("Alert.alert(");
    });

    it("does not import Alert from react-native: " + path.basename(filePath), () => {
      var text = fs.readFileSync(filePath, "utf8");

      expect(text).not.toMatch(/import\s*\{[^}]*\bAlert\b[^}]*\}\s*from\s*["']react-native["']/);
    });
  });
});

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

  it("handleCancel still returns early when the paid-time step is disabled, before ever touching the guard", () => {
    var block = getHandleCancelBlock(readSource());

    var stepCheckIndex = block.indexOf(
      "if (!availability.paidTimes.isEnabled) {",
    );
    var guardCheckIndex = block.indexOf(
      "if (!paidTimeCancelGuardRef.current.tryAcquire(guardKey)) {",
    );

    expect(stepCheckIndex).toBeGreaterThan(-1);
    expect(guardCheckIndex).toBeGreaterThan(stepCheckIndex);
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

  it("on failure, the existing error alert and message extraction are unchanged", () => {
    var block = getHandleCancelBlock(readSource());

    expect(block).toContain(
      'var msg = err?.response?.data || err?.message || "אירעה שגיאה";',
    );
    expect(block).toContain('Alert.alert("שגיאה", String(msg));');
  });

  it("on success, the existing refresh call (paidTimes.handleRefresh) is unchanged", () => {
    var block = getHandleCancelBlock(readSource());

    expect(block).toContain("await paidTimes.handleRefresh();");
  });
});

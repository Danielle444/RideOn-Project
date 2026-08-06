import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// WorkerHomeScreen imports react-native/context modules not safe to import
// under plain vitest, so this reads source text - same approach as every
// other *.contract.test.js file in this codebase. The dedup BEHAVIOR itself
// (not just that this text is present) is proven separately in
// WorkerHomeScreen.startupAlertDedup.behavior.test.js, which actually runs
// the same withTransientRetry + createStartupAlertGuard composition
// asserted here.

var SOURCE_PATH = path.resolve(__dirname, "WorkerHomeScreen.jsx");

function readSource() {
  return fs.readFileSync(SOURCE_PATH, "utf8").replace(/\r\n/g, "\n");
}

describe("WorkerHomeScreen - restored-session home retry", () => {
  it("imports withTransientRetry from the shared retry helper", () => {
    var source = readSource();

    expect(source).toContain(
      'import { withTransientRetry } from "../../../../utils/transientRequestRetry";',
    );
  });

  it("wraps the worker competitions-board fetch in withTransientRetry, not a bare call", () => {
    var source = readSource();

    expect(source).toContain(
      "var response = await withTransientRetry(function () {\n" +
        "        return getMobileWorkerCompetitionsBoard(activeRole.ranchId);\n" +
        "      });",
    );
    expect(source).not.toContain(
      "var response = await getMobileWorkerCompetitionsBoard(activeRole.ranchId);",
    );
  });

  it("wraps the shavings-feed fetch in withTransientRetry, not a bare call", () => {
    var source = readSource();

    expect(source).toContain(
      "var response = await withTransientRetry(function () {\n" +
        "        return getWorkerHomeShavingsFeed(activeRole.ranchId);\n" +
        "      });",
    );
    expect(source).not.toContain(
      "var response = await getWorkerHomeShavingsFeed(activeRole.ranchId);",
    );
  });

  it("each withTransientRetry call site wraps exactly one of the two service calls - never both in one wrapper", () => {
    var source = readSource();

    var retryWrapCount =
      source.split("withTransientRetry(function () {").length - 1;
    expect(retryWrapCount).toBe(2);
  });
});

describe("WorkerHomeScreen - startup dual-failure alert dedup wiring", () => {
  it("imports createStartupAlertGuard from the shared guard helper", () => {
    var source = readSource();

    expect(source).toContain(
      'import { createStartupAlertGuard } from "../../../../utils/startupAlertGuard";',
    );
  });

  it("holds exactly one guard instance in a ref, not React state", () => {
    var source = readSource();

    expect(source).toContain("var startupAlertGuardRef = useRef(null);");
    expect(source).toContain(
      "startupAlertGuardRef.current = createStartupAlertGuard();",
    );
  });

  it("loadWorkerHome resets the guard both before and after the paired cycle", () => {
    var source = readSource();

    expect(source).toContain("async function loadWorkerHome() {");
    expect(source).toContain("startupAlertGuardRef.current.reset();");
    // Reset appears twice: once before the paired Promise.all, once in its
    // finally - not just once.
    var resetCount = source.split("startupAlertGuardRef.current.reset();").length - 1;
    expect(resetCount).toBe(2);
  });

  it("loadWorkerHome runs both loaders together via Promise.all", () => {
    var source = readSource();

    expect(source).toContain(
      "await Promise.all([loadHomeCompetitions(), loadShavingsFeed()]);",
    );
  });

  it("each loader's Alert.alert call is gated by startupAlertGuardRef.current.shouldAlert()", () => {
    var source = readSource();

    expect(source).toContain(
      'if (startupAlertGuardRef.current.shouldAlert()) {\n' +
        '        Alert.alert("שגיאה", "אירעה שגיאה בטעינת דף הבית");\n' +
        '      }',
    );
    expect(source).toContain(
      'if (startupAlertGuardRef.current.shouldAlert()) {\n' +
        '        Alert.alert("שגיאה", "אירעה שגיאה בטעינת הזמנות הנסורת להיום");\n' +
        '      }',
    );

    // Each of the two generic alert messages still appears exactly once in
    // the whole file - the guard changed WHEN they fire, not how many
    // distinct call sites exist.
    var competitionsAlertCount =
      source.split('Alert.alert("שגיאה", "אירעה שגיאה בטעינת דף הבית");').length - 1;
    var shavingsAlertCount =
      source.split('Alert.alert("שגיאה", "אירעה שגיאה בטעינת הזמנות הנסורת להיום");')
        .length - 1;
    expect(competitionsAlertCount).toBe(1);
    expect(shavingsAlertCount).toBe(1);
  });

  it("handleClaimShavingsOrder's own alerts are unguarded - unrelated to the startup cycle", () => {
    var source = readSource();

    // These two pre-existing alerts (409 conflict / generic claim failure)
    // must stay exactly as they were - not routed through the startup
    // guard, since they are a standalone user action, not part of the
    // paired mount/refresh cycle.
    expect(source).toContain(
      'Alert.alert("לא ניתן", "ההזמנה כבר נלקחה לטיפול על ידי עובד אחר");',
    );
    expect(source).toContain(
      'Alert.alert("שגיאה", "לא ניתן לקחת את ההזמנה לטיפול");',
    );
  });

  it("handleRefresh now delegates to loadWorkerHome, not a bare inline Promise.all", () => {
    var source = readSource();

    expect(source).toContain("async function handleRefresh() {");
    expect(source).toContain("await loadWorkerHome();");
  });

  it("the mount useEffect starts a cycle via loadWorkerHome, not by firing the two loaders directly", () => {
    var source = readSource();

    expect(source).toContain(
      "      loadWorkerHome();\n" + "    },\n" + "    [activeRole],",
    );
  });
});

describe("WorkerHomeScreen - shavings cancellation lifecycle wiring", () => {
  it("passes isCancelled and hasPendingCancellation through to the shared order card", () => {
    var source = readSource();

    expect(source).toContain("isCancelled={order.isCancelled}");
    expect(source).toContain(
      "hasPendingCancellation={order.hasPendingCancellation}",
    );
  });

  it("passes the two cancellation fields on the same card instance that renders the home feed", () => {
    var source = readSource();

    var cardBlockStart = source.indexOf("<WorkerShavingsOrderCard");
    expect(cardBlockStart).toBeGreaterThan(-1);

    var cardBlockEnd = source.indexOf("/>", cardBlockStart);
    expect(cardBlockEnd).toBeGreaterThan(-1);

    var cardBlock = source.substring(cardBlockStart, cardBlockEnd);

    expect(cardBlock).toContain("isCancelled={order.isCancelled}");
    expect(cardBlock).toContain(
      "hasPendingCancellation={order.hasPendingCancellation}",
    );
  });
});

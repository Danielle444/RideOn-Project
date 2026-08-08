import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// אותה גישה כמו AppDialog.contract.test.js. ToastHost משלב react-native +
// react-native-safe-area-context, שגם הוא לא בטוח לרנדר תחת vitest רגיל.
// הלוגיקה שכן ניתנת לבדיקה אמיתית (ה-queue עצמו) כבר מכוסה ב-
// toastService.test.js - כאן רק בודקים את חוט החיבור.

var SOURCE_PATH = path.resolve(__dirname, "ToastHost.jsx");

function readSource() {
  return fs.readFileSync(SOURCE_PATH, "utf8").replace(/\r\n/g, "\n");
}

describe("ToastHost", () => {
  it("subscribes to the shared toastService queue on mount and unsubscribes on unmount", () => {
    var source = readSource();
    expect(source).toContain(
      "import { subscribeToasts, dismissToast } from \"../../services/toastService\";",
    );
    expect(source).toContain("useEffect(function () {\n    return subscribeToasts(setToasts);\n  }, []);");
  });

  it("renders nothing when there are no active toasts (non-blocking when idle)", () => {
    var source = readSource();
    expect(source).toContain("if (toasts.length === 0) {");
    expect(source).toContain("return null;");
  });

  it("is safe-area aware - offsets from the top inset instead of a hardcoded value", () => {
    var source = readSource();
    expect(source).toContain("useSafeAreaInsets");
    expect(source).toContain("insets.top");
  });

  it("host wrapper uses pointerEvents box-none so it never blocks touches on the screen below it", () => {
    var source = readSource();
    expect(source).toContain('pointerEvents="box-none"');
  });

  it("renders one AppToast per queued toast, keyed by its stable id (not index)", () => {
    var source = readSource();
    expect(source).toContain("toasts.map(function (toast) {");
    expect(source).toContain("key={toast.id}");
  });

  it("tapping a toast dismisses only that toast by id", () => {
    var source = readSource();
    expect(source).toContain("dismissToast(toast.id);");
  });

  it("never calls the native Alert.alert internally", () => {
    var source = readSource();
    expect(source).not.toContain("Alert.alert");
  });
});

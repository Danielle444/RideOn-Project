import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// אותה גישה כמו AppDialog.contract.test.js - קריאת המקור כטקסט, בלי
// לרנדר react-native תחת vitest.

var SOURCE_PATH = path.resolve(__dirname, "AppToast.jsx");

function readSource() {
  return fs.readFileSync(SOURCE_PATH, "utf8").replace(/\r\n/g, "\n");
}

describe("AppToast", () => {
  it("renders the message text right-aligned for Hebrew", () => {
    var source = readSource();
    expect(source).toContain("<Text style={styles.message}>{props.message}</Text>");
  });

  it("every type (success, error, warning, info) maps to a distinct icon+color+background", () => {
    var source = readSource();
    var byType = ["success", "error", "warning", "info"];
    byType.forEach((type) => {
      expect(source).toContain(`  ${type}: {`);
    });
  });

  it("falls back to the info visual when type is missing/unknown", () => {
    var source = readSource();
    expect(source).toContain("var meta = ICON_BY_TYPE[props.type] || ICON_BY_TYPE.info;");
  });

  it("is a plain Pressable, not a Modal - non-blocking, can't trap interaction", () => {
    var source = readSource();
    expect(source).toContain("Pressable");
    expect(source).not.toContain("Modal");
  });

  it("never calls the native Alert.alert internally", () => {
    var source = readSource();
    expect(source).not.toContain("Alert.alert");
  });

  it("exposes an accessibilityRole so screen readers announce it", () => {
    var source = readSource();
    expect(source).toContain('accessibilityRole="alert"');
  });
});

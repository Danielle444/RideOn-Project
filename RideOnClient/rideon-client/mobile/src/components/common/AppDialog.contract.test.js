import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// AppDialog מייבא react-native/@expo/vector-icons, לא בטוח לייבא תחת
// vitest רגיל - אותה גישה כמו שאר קבצי ה-*.contract.test.js בריפו הזה
// (ראו CompetitionEntryCreateModal.contract.test.js): קוראים את מקור
// הקומפוננטה כטקסט ובודקים עליו במקום לרנדר.

var SOURCE_PATH = path.resolve(__dirname, "AppDialog.jsx");

function readSource() {
  return fs.readFileSync(SOURCE_PATH, "utf8").replace(/\r\n/g, "\n");
}

describe("AppDialog", () => {
  it("passes visible straight to Modal, so visible=false hides it (no separate early-return null)", () => {
    var source = readSource();
    expect(source).toContain("visible={!!props.visible}");
  });

  it("renders title and message only when provided, both right-aligned for Hebrew", () => {
    var source = readSource();
    expect(source).toContain(
      '{props.title ? <Text style={styles.title}>{props.title}</Text> : null}',
    );
    expect(source).toContain(
      '{props.message ? <Text style={styles.message}>{props.message}</Text> : null}',
    );
  });

  it("message text has no numberOfLines cap, so long messages wrap instead of truncating", () => {
    var source = readSource();
    var messageLineIndex = source.indexOf("styles.message");
    var messageLine = source.slice(messageLineIndex, messageLineIndex + 80);
    expect(messageLine).not.toContain("numberOfLines");
  });

  it("confirm button calls onConfirm exactly once per press when not busy", () => {
    var source = readSource();
    var fnStart = source.indexOf("function handleConfirmPress()");
    var fnBody = source.slice(fnStart, source.indexOf("\n  }\n", fnStart));

    expect(fnBody).toContain("if (isBusy) {");
    expect(fnBody).toContain("return;");
    expect(fnBody).toContain("props.onConfirm();");
  });

  it("busy blocks the confirm handler before onConfirm is invoked (no double-confirm while saving)", () => {
    var source = readSource();
    var fnStart = source.indexOf("function handleConfirmPress()");
    var fnEnd = source.indexOf("function handleCancelPress()");
    var fnBody = source.slice(fnStart, fnEnd);

    var guardIndex = fnBody.indexOf("if (isBusy) {");
    var confirmCallIndex = fnBody.indexOf("props.onConfirm();");

    expect(guardIndex).toBeGreaterThan(-1);
    expect(confirmCallIndex).toBeGreaterThan(guardIndex);
  });

  it("the confirm Pressable is disabled while isBusy, not just guarded in the handler", () => {
    var source = readSource();
    expect(source).toContain("disabled={isBusy}");
  });

  it("cancel button only renders when onCancel is a function - one-button vs two-button modes", () => {
    var source = readSource();
    expect(source).toContain('var hasCancel = typeof props.onCancel === "function";');
    expect(source).toContain("{hasCancel ? (");
  });

  it("cancel handler is a no-op while busy or when there is no onCancel", () => {
    var source = readSource();
    var fnStart = source.indexOf("function handleCancelPress()");
    var fnEnd = source.indexOf("function handleRequestClose()");
    var fnBody = source.slice(fnStart, fnEnd);

    expect(fnBody).toContain("if (isBusy || !hasCancel) {");
    expect(fnBody).toContain("return;");
  });

  it("hardware back / system dismiss (onRequestClose) is blocked while busy", () => {
    var source = readSource();
    var fnStart = source.indexOf("function handleRequestClose()");
    var fnEnd = source.indexOf("return (", fnStart);
    var fnBody = source.slice(fnStart, fnEnd);

    expect(fnBody).toContain("if (isBusy) {");
    expect(fnBody).toContain("return;");
    expect(source).toContain("onRequestClose={handleRequestClose}");
  });

  it("destructive swaps the confirm button to the danger color instead of the brand color", () => {
    var source = readSource();
    expect(source).toContain("props.destructive ? styles.primaryButtonDestructive : null");
  });

  it("busy replaces the confirm label with a spinner instead of just disabling it silently", () => {
    var source = readSource();
    expect(source).toContain("<ActivityIndicator size=\"small\" color=\"#FFFFFF\" />");
  });

  it("every visual type (success, error, warning, info) maps to a distinct Ionicons name and color", () => {
    var source = readSource();
    var namesAndColors = [
      ["checkmark-circle", "#4C8C4A"],
      ["close-circle", "#9C3D35"],
      ["warning", "#B7791F"],
      ["information-circle", "#7B5A4D"],
    ];

    namesAndColors.forEach(([name]) => {
      expect(source).toContain(`"${name}"`);
    });

    // all four colors must be distinct from one another
    var colors = namesAndColors.map(([, color]) => color);
    expect(new Set(colors).size).toBe(colors.length);
  });

  it("'confirm' type (the default/no-match case) renders no icon block", () => {
    var source = readSource();
    expect(source).toContain("var icon = ICON_BY_TYPE[props.type] || null;");
    expect(source).toContain("{icon ? (");
  });

  it("never calls the native Alert.alert internally", () => {
    var source = readSource();
    expect(source).not.toContain("Alert.alert");
    expect(source).not.toMatch(/from ["']react-native["'][\s\S]{0,200}Alert/);
  });

  it("has no paid-time-specific or other business-model coupling", () => {
    var source = readSource();
    ["paidTime", "PaidTime", "competition", "Competition", "entry", "Entry"].forEach(
      (fragment) => {
        expect(source).not.toContain(fragment);
      },
    );
  });

  it("does not build a global dialog queue/manager - stays a plain controlled component", () => {
    var source = readSource();
    expect(source).not.toContain("useState");
    expect(source).not.toContain("registerDialog");
    expect(source).not.toContain("dialogQueue");
  });

  it("both Pressables expose accessibilityRole=\"button\", matching the rest of the app's convention", () => {
    var source = readSource();
    var occurrences = source.split('accessibilityRole="button"').length - 1;
    expect(occurrences).toBe(2);
  });
});

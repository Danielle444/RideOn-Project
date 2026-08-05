import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

// Source-level contract test for CAP-2's toast auto-dismiss. This repo has
// no DOM test environment and no React Testing Library (see
// CompetitionHealthCertificatesPage.contract.test.js, which this mirrors),
// so the component cannot be rendered, and its useEffect cannot be
// triggered/observed through a renderer. What CAN be proven without one is
// the exact timer contract: a 4000ms auto-dismiss that resets on
// isOpen/message/type changes and clears on close/unmount, plus that the
// manual X close button survives untouched.

// Normalized to LF so multi-line toContain checks below are not sensitive to
// this checkout's CRLF line endings.
const TOAST_PATH = new URL("./ToastMessage.jsx", import.meta.url);
const toastSource = readFileSync(TOAST_PATH, "utf8").replace(/\r\n/g, "\n");

describe("ToastMessage — auto-dismiss timer", () => {
  it("auto-dismiss delay is 4000ms", () => {
    expect(toastSource).toContain("const AUTO_DISMISS_MS = 4000;");
  });

  it("uses a useEffect that starts a setTimeout calling onClose", () => {
    const effectAt = toastSource.indexOf("useEffect(");
    const effectEndAt = toastSource.indexOf(
      "[props.isOpen, props.message, props.type],",
    );

    expect(effectAt).toBeGreaterThan(-1);
    expect(effectEndAt).toBeGreaterThan(effectAt);

    const effectBody = toastSource.slice(effectAt, effectEndAt);

    expect(effectBody).toContain("setTimeout(function () {");
    expect(effectBody).toContain("props.onClose();");
    expect(effectBody).toContain("}, AUTO_DISMISS_MS);");
  });

  it("guards against auto-dismissing a closed toast", () => {
    const effectAt = toastSource.indexOf("useEffect(");
    const effectEndAt = toastSource.indexOf(
      "[props.isOpen, props.message, props.type],",
    );

    const effectBody = toastSource.slice(effectAt, effectEndAt);

    expect(effectBody).toContain("if (!props.isOpen) {\n        return undefined;\n      }");
  });

  it("resets the timer when isOpen, message or type changes", () => {
    expect(toastSource).toContain(
      "[props.isOpen, props.message, props.type],",
    );
  });

  it("clears the timer on close/unmount via the effect's cleanup function", () => {
    expect(toastSource).toContain(
      "return function () {\n        clearTimeout(timerId);\n      };",
    );
  });

  it("keeps the manual X close button, still wired to props.onClose", () => {
    expect(toastSource).toContain("onClick={props.onClose}");
    expect(toastSource).toContain("<X size={16} />");
  });

  it("still returns null when not open, after the hook runs (hooks can't be conditional)", () => {
    const nullReturnAt = toastSource.indexOf("return null;");
    const effectAt = toastSource.indexOf("useEffect(");

    expect(nullReturnAt).toBeGreaterThan(-1);
    expect(effectAt).toBeGreaterThan(-1);
    expect(effectAt).toBeLessThan(nullReturnAt);
  });
});

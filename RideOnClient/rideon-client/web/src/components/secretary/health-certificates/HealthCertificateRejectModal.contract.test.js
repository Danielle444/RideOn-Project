import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

// Source-level contract test - no DOM test environment/RTL in this repo's
// web package.json, same approach as the page/hook contract tests.

const SOURCE_PATH = new URL(
  "./HealthCertificateRejectModal.jsx",
  import.meta.url,
);

const source = readFileSync(SOURCE_PATH, "utf8");

describe("HealthCertificateRejectModal", () => {
  it("reuses the existing form-modal shell instead of a new modal system", () => {
    expect(source).toContain('import FormModal from "../../common/form/FormModal";');
    expect(source).toContain('import FormField from "../../common/form/FormField";');
    expect(source).toContain('import Textarea from "../../common/form/Textarea";');
  });

  it("renders nothing when closed", () => {
    expect(source).toContain("if (!props.isOpen) {");
    expect(source).toContain("return null;");
  });

  it("marks the rejection reason as a required field", () => {
    expect(source).toContain('<FormField label="סיבת דחייה" required>');
  });

  it("wires the textarea to the controlled reason value and change handler", () => {
    expect(source).toContain("value={props.reason}");
    expect(source).toContain("props.onReasonChange(event.target.value);");
  });

  it("surfaces the hook's error through FormModal's existing error slot", () => {
    expect(source).toContain("error={props.error}");
  });

  it("passes the busy state through to disable double-submit", () => {
    expect(source).toContain("isSaving={props.isSaving}");
  });

  it("wires close and submit to the passed-in handlers", () => {
    expect(source).toContain("onClose={props.onClose}");
    expect(source).toContain("onSubmit={props.onSubmit}");
  });
});

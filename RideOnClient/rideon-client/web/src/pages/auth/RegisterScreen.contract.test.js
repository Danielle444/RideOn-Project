import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

// Source-level contract test for CAP-10's migration of RegisterScreen's
// date-of-birth field off native <input type="date"> onto the shared
// DatePicker. This repo has no DOM test environment and no React Testing
// Library (see CompetitionHealthCertificatesPage.contract.test.js, which
// this mirrors), so the component cannot be rendered.
//
// dateOfBirth is the one call site that manages its own focus-ring via
// inline style + onFocus/onBlur (rather than a Tailwind className), so this
// test also proves that passthrough survived the migration unchanged.

const SOURCE_PATH = new URL("./RegisterScreen.jsx", import.meta.url);
const source = readFileSync(SOURCE_PATH, "utf8").replace(/\r\n/g, "\n");

function extractFieldBlock(src, label) {
  const labelAt = src.indexOf(`label="${label}"`);
  const closeAt = src.indexOf("</Field>", labelAt);
  return src.slice(labelAt, closeAt);
}

describe("RegisterScreen — date of birth uses the shared DatePicker", () => {
  it("imports the shared DatePicker and no longer has a native date input", () => {
    expect(source).toContain(
      'import DatePicker from "../../components/common/DatePicker";',
    );
    expect(source).not.toContain('type="date"');
  });

  it("keeps the same value/onChange contract (form.dateOfBirth via set(\"dateOfBirth\"))", () => {
    const block = extractFieldBlock(source, "תאריך לידה");

    expect(block).toContain("<DatePicker");
    expect(block).toContain("value={form.dateOfBirth}");
    expect(block).toContain('onChange={set("dateOfBirth")}');
  });

  it("still locks (disables) the field when dateOfBirthLocked is true", () => {
    const block = extractFieldBlock(source, "תאריך לידה");
    expect(block).toContain("disabled={dateOfBirthLocked}");
  });

  it("still passes through the manual focus-ring style/onFocus/onBlur for this field", () => {
    const block = extractFieldBlock(source, "תאריך לידה");

    expect(block).toContain("getReadOnlyFieldStyle()");
    expect(block).toContain("getEditableFieldStyle()");
    expect(block).toContain("handleEditableFieldFocus");
    expect(block).toContain("handleEditableFieldBlur");
  });

  it("className still switches between the locked/editable Tailwind classes", () => {
    const block = extractFieldBlock(source, "תאריך לידה");
    expect(block).toContain("className={dateOfBirthLocked ? readOnlyCls : inputCls}");
  });
});

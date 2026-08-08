import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// PayerManagersSection.jsx cannot be imported/rendered under vitest
// (react-native deps) - same convention as every other
// *.contract.test.js file in this repo: read the source as text.

var SOURCE_PATH = path.resolve(__dirname, "PayerManagersSection.jsx");

function readSource() {
  return fs.readFileSync(SOURCE_PATH, "utf8").replace(/\r\n/g, "\n");
}

describe("PayerManagersSection - styled alert migration", () => {
  it("no longer imports or calls the native Alert", () => {
    var source = readSource();
    expect(source).not.toMatch(/\bAlert\b/);
  });

  it("imports AppDialog from the styled alert foundation", () => {
    var source = readSource();
    expect(source).toContain('import AppDialog from "../common/AppDialog";');
  });

  it("last-manager business rule opens a warning dialog and sends no request", () => {
    var source = readSource();
    var fnStart = source.indexOf("function handleRemovePress(item)");
    var fnEnd = source.indexOf("\n  }\n", fnStart);
    var fnBody = source.slice(fnStart, fnEnd);

    expect(fnBody).toContain("if ((props.managers || []).length <= 1) {");
    expect(fnBody).toContain("setIsLastManagerDialogVisible(true);");
    expect(fnBody).not.toContain("onRemoveManager");
  });

  it("removing a manager requires confirmation - the request only fires from the confirm handler", () => {
    var source = readSource();

    // handleRemovePress only stages the target, it never calls the action.
    var pressStart = source.indexOf("function handleRemovePress(item)");
    var pressEnd = source.indexOf("function handleRemoveCancel()");
    expect(source.slice(pressStart, pressEnd)).not.toContain(
      "props.onRemoveManager",
    );

    // Only handleRemoveConfirm actually calls it, and only after clearing
    // the pending target (so a second tap after confirm can't refire it).
    var confirmStart = source.indexOf("function handleRemoveConfirm()");
    var confirmEnd = source.indexOf("function handleRejectCancel()");
    var confirmBody = source.slice(confirmStart, confirmEnd);

    expect(confirmBody).toContain("setRemoveTarget(null);");
    expect(confirmBody).toContain("props.onRemoveManager(target.adminPersonId);");
  });

  it("rejecting a manager request requires confirmation - stages a target instead of firing inline", () => {
    var source = readSource();

    // The pending-request row's reject button only stages rejectTarget now.
    expect(source).toContain(
      "onPress={function () {\n                        setRejectTarget(item);\n                      }}",
    );
    expect(source).not.toContain("props.onRejectManagerRequest(item.adminPersonId)");

    var confirmStart = source.indexOf("function handleRejectConfirm()");
    var confirmEnd = source.indexOf("var removeTargetName");
    var confirmBody = source.slice(confirmStart, confirmEnd);

    expect(confirmBody).toContain("setRejectTarget(null);");
    expect(confirmBody).toContain(
      "props.onRejectManagerRequest(target.adminPersonId);",
    );
  });

  it("renders all three dialogs: single-button warning, and two destructive confirm/cancel dialogs", () => {
    var source = readSource();

    expect(source).toContain("visible={isLastManagerDialogVisible}");
    expect(source).toContain('title="לא ניתן להסיר"');

    expect(source).toContain("visible={!!removeTarget}");
    expect(source).toContain("destructive={true}");
    expect(source).toContain("onCancel={handleRemoveCancel}");

    expect(source).toContain("visible={!!rejectTarget}");
    expect(source).toContain("onCancel={handleRejectCancel}");

    // Both destructive confirmations render with a cancel path (real
    // two-choice dialogs), the last-manager notice does not (single button).
    var lastManagerBlockStart = source.indexOf("visible={isLastManagerDialogVisible}");
    var lastManagerBlockEnd = source.indexOf("/>", lastManagerBlockStart);
    expect(source.slice(lastManagerBlockStart, lastManagerBlockEnd)).not.toContain(
      "onCancel",
    );
  });

  it("existing action handlers and disabled/loading props on the list rows are unchanged", () => {
    var source = readSource();
    expect(source).toContain("disabled={isRemoving}");
    expect(source).toContain("disabled={isAnswering}");
    expect(source).toContain(
      '{isRemoving ? "מסירה..." : "הסרה"}',
    );
  });
});

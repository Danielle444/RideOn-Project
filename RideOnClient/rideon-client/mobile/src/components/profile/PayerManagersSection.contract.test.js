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

    // Only handleRemoveConfirm actually calls it. The target is deliberately
    // NOT cleared synchronously here anymore (that used to happen in the
    // same tick as the mutation starting, which made the dialog's isBusy
    // prop invisible) - it stays staged until useProfileScreen.js's busy id
    // returns to null, via the pendingRemoveIdRef effect below.
    var confirmStart = source.indexOf("function handleRemoveConfirm()");
    var confirmEnd = source.indexOf("function handleRejectCancel()");
    var confirmBody = source.slice(confirmStart, confirmEnd);

    expect(confirmBody).toContain("if (!removeTarget) {");
    expect(confirmBody).toContain(
      "pendingRemoveIdRef.current = removeTarget.adminPersonId;",
    );
    expect(confirmBody).toContain(
      "props.onRemoveManager(removeTarget.adminPersonId);",
    );
    expect(confirmBody).not.toContain("setRemoveTarget(null);");
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

    expect(confirmBody).toContain("if (!rejectTarget) {");
    expect(confirmBody).toContain(
      "pendingRejectIdRef.current = rejectTarget.adminPersonId;",
    );
    expect(confirmBody).toContain(
      "props.onRejectManagerRequest(rejectTarget.adminPersonId);",
    );
    expect(confirmBody).not.toContain("setRejectTarget(null);");
  });

  it("a pending-target ref defers clearing the dialog target until the hook's busy id settles back to null", () => {
    var source = readSource();

    expect(source).toContain("var pendingRemoveIdRef = useRef(null);");
    expect(source).toContain("var pendingRejectIdRef = useRef(null);");

    // The remove effect only fires once a confirm was staged (ref non-null)
    // AND the hook reports the mutation has settled (removingManagerId back
    // to null) - not simply whenever removingManagerId happens to be null.
    var removeEffectStart = source.indexOf(
      "pendingRemoveIdRef.current !== null &&",
    );
    var removeEffectSlice = source.slice(removeEffectStart, removeEffectStart + 200);
    expect(removeEffectSlice).toContain("props.removingManagerId === null");
    expect(removeEffectSlice).toContain("pendingRemoveIdRef.current = null;");
    expect(removeEffectSlice).toContain("setRemoveTarget(null);");

    var rejectEffectStart = source.indexOf(
      "pendingRejectIdRef.current !== null &&",
    );
    var rejectEffectSlice = source.slice(rejectEffectStart, rejectEffectStart + 200);
    expect(rejectEffectSlice).toContain("props.answeringManagerId === null");
    expect(rejectEffectSlice).toContain("pendingRejectIdRef.current = null;");
    expect(rejectEffectSlice).toContain("setRejectTarget(null);");
  });

  it("destructive dialogs receive isBusy scoped to the actual selected target, not just any in-flight action", () => {
    var source = readSource();

    var removeDialogStart = source.indexOf("visible={!!removeTarget}");
    var removeDialogEnd = source.indexOf("/>", removeDialogStart);
    var removeDialogProps = source.slice(removeDialogStart, removeDialogEnd);

    expect(removeDialogProps).toContain("isBusy={");
    expect(removeDialogProps).toContain(
      "props.removingManagerId === removeTarget.adminPersonId",
    );

    var rejectDialogStart = source.indexOf("visible={!!rejectTarget}");
    var rejectDialogEnd = source.indexOf("/>", rejectDialogStart);
    var rejectDialogProps = source.slice(rejectDialogStart, rejectDialogEnd);

    expect(rejectDialogProps).toContain("isBusy={");
    expect(rejectDialogProps).toContain(
      "props.answeringManagerId === rejectTarget.adminPersonId",
    );

    // The last-manager notice is a single-button informational dialog with
    // no mutation behind it - it must not have gained isBusy wiring.
    var lastManagerBlockStart = source.indexOf("visible={isLastManagerDialogVisible}");
    var lastManagerBlockEnd = source.indexOf("/>", lastManagerBlockStart);
    expect(source.slice(lastManagerBlockStart, lastManagerBlockEnd)).not.toContain(
      "isBusy",
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

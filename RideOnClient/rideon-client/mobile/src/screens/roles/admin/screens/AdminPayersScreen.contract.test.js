import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// AdminPayersScreen imports react-native/context modules not safe to import
// under plain vitest, so this reads source text - same approach as every
// other *.contract.test.js file in this codebase.

var SOURCE_PATH = path.resolve(__dirname, "AdminPayersScreen.jsx");

function readSource() {
  return fs.readFileSync(SOURCE_PATH, "utf8").replace(/\r\n/g, "\n");
}

describe("AdminPayersScreen - alert migration to AppToast/AppDialog", () => {
  it("no longer uses the native Alert.alert", () => {
    var source = readSource();

    expect(source).not.toContain("Alert.alert");
    expect(source).not.toMatch(/from ["']react-native["'][\s\S]{0,200}Alert/);
  });

  it("imports showToast, AppDialog and the in-flight guard helper", () => {
    var source = readSource();

    expect(source).toContain(
      'import { showToast } from "../../../../services/toastService";',
    );
    expect(source).toContain(
      'import AppDialog from "../../../../components/common/AppDialog";',
    );
    expect(source).toContain(
      'import { createInFlightGuard } from "../../../../utils/inFlightGuard";',
    );
  });

  it("load-error notice keeps its original text", () => {
    var source = readSource();

    expect(source).toContain(
      'showToast("אירעה שגיאה בטעינת המשלמים", "error");',
    );
  });

  it("remove-success and remove-error notices keep their original text", () => {
    var source = readSource();

    expect(source).toContain(
      'showToast("המשלם הוסר מרשימת הניהול", "success");',
    );
    expect(source).toContain(
      'getApiErrorMessage(error, "אירעה שגיאה בהסרת המשלם")',
    );
  });

  describe("remove-payer confirmation dialog", () => {
    it("renders a destructive AppDialog with the original title/message/button labels", () => {
      var source = readSource();
      var dialogStart = source.indexOf("<AppDialog");
      var dialogEnd = source.indexOf("/>", dialogStart);
      var dialogJsx = source.slice(dialogStart, dialogEnd);

      expect(dialogJsx).toContain('title="הסרת משלם"');
      expect(dialogJsx).toContain(
        'message="האם להסיר את המשלם מרשימת הניהול שלך?"',
      );
      expect(dialogJsx).toContain('confirmLabel="הסר"');
      expect(dialogJsx).toContain('cancelLabel="ביטול"');
      expect(dialogJsx).toContain("destructive={true}");
    });

    it("the row's הסר button only opens the dialog (sets removeTargetId), it does not remove directly", () => {
      var source = readSource();
      var pressableStart = source.indexOf("styles.dangerButton");
      var pressableEnd = source.indexOf("</Pressable>", pressableStart);
      var pressableJsx = source.slice(pressableStart, pressableEnd);

      expect(pressableJsx).toContain("setRemoveTargetId(payer.personId);");
      expect(pressableJsx).not.toContain("doRemovePayer(");
    });

    it("cancel clears removeTargetId without calling doRemovePayer", () => {
      var source = readSource();
      var onCancelIndex = source.indexOf("onCancel={function () {");
      var onCancelBody = source.slice(onCancelIndex, source.indexOf("}}", onCancelIndex));

      expect(onCancelBody).toContain("setRemoveTargetId(null);");
      expect(onCancelBody).not.toContain("doRemovePayer");
    });

    it("confirm calls doRemovePayer with the pending target id", () => {
      var source = readSource();
      var onConfirmIndex = source.indexOf("onConfirm={function () {\n          doRemovePayer");
      expect(onConfirmIndex).toBeGreaterThan(-1);
    });

    it("isBusy is wired to the in-flight removal state, not left permanently false", () => {
      var source = readSource();
      expect(source).toContain("isBusy={removingPersonId !== null}");
    });
  });

  describe("duplicate removal blocked", () => {
    it("doRemovePayer acquires the guard before calling removeManagedPayer", () => {
      var source = readSource();
      var fnStart = source.indexOf("async function doRemovePayer(personId)");
      var fnEnd = source.indexOf("\n  }\n", fnStart);
      var fnBody = source.slice(fnStart, fnEnd);

      var guardIndex = fnBody.indexOf("removeGuardRef.current.tryAcquire(guardKey)");
      var apiCallIndex = fnBody.indexOf("await removeManagedPayer(");

      expect(guardIndex).toBeGreaterThan(-1);
      expect(apiCallIndex).toBeGreaterThan(guardIndex);
    });

    it("a failed tryAcquire returns immediately, before any state is set or the API is called", () => {
      var source = readSource();
      var fnStart = source.indexOf("async function doRemovePayer(personId)");
      var guardCheckIndex = source.indexOf(
        "if (!removeGuardRef.current.tryAcquire(guardKey)) {",
        fnStart,
      );
      var returnIndex = source.indexOf("return;", guardCheckIndex);
      var setBusyIndex = source.indexOf("setRemovingPersonId(personId);", fnStart);

      expect(returnIndex).toBeGreaterThan(guardCheckIndex);
      expect(returnIndex).toBeLessThan(setBusyIndex);
    });

    it("the guard is released in a finally block, so a later retry is always possible", () => {
      var source = readSource();
      var fnStart = source.indexOf("async function doRemovePayer(personId)");
      var fnEnd = source.indexOf("\n  }\n", fnStart);
      var fnBody = source.slice(fnStart, fnEnd);

      var finallyIndex = fnBody.indexOf("} finally {");
      var releaseIndex = fnBody.indexOf("removeGuardRef.current.release(guardKey);");

      expect(finallyIndex).toBeGreaterThan(-1);
      expect(releaseIndex).toBeGreaterThan(finallyIndex);
    });

    it("guard is keyed per payer (personId), not a single shared key", () => {
      var source = readSource();
      expect(source).toContain('var guardKey = "payer:" + personId;');
    });

    it("the row's הסר Pressable is disabled while that payer's removal is in flight", () => {
      var source = readSource();
      var pressableStart = source.indexOf("styles.dangerButton");
      var pressableEnd = source.indexOf("</Pressable>", pressableStart);
      var pressableJsx = source.slice(pressableStart, pressableEnd);

      expect(pressableJsx).toContain(
        "disabled={removingPersonId === payer.personId}",
      );
    });
  });
});

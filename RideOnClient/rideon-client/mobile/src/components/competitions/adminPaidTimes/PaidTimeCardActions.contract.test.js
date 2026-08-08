import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// Regression coverage for the submission-critical bug where the Edit
// button's own eligibility (canEdit) was wired to item.canCancel instead of
// a real edit-availability check, even though the component's comment
// referenced "canModify". item.canModify/editCanModify turned out to be an
// unrelated field scoped to the edit form itself (useAdminCompetitionPaidTimes),
// never populated on list-card items - so canEdit must come from the
// established, tested canEditPaidTimeRow(item, paidTimesAvailability)
// pattern already shipped on AdminCompetitionPayerAccountScreen (commit
// 0f21e11), not from item.canCancel and not from item.canModify.
//
// This component imports react-native, which isn't safe to import under
// plain vitest here - same source-text approach as the screen-level
// *.contract.test.js files in this repo.

var SOURCE_PATH = path.resolve(__dirname, "PaidTimeCardActions.jsx");

function readSource() {
  return fs.readFileSync(SOURCE_PATH, "utf8").replace(/\r\n/g, "\n");
}

describe("PaidTimeCardActions - canEdit uses the established canEditPaidTimeRow pattern", () => {
  it("imports canEditPaidTimeRow from the shared paidTimeEditAvailability util (no second implementation)", () => {
    var source = readSource();

    expect(source).toContain(
      'import { canEditPaidTimeRow } from "../../../utils/paidTimeEditAvailability";',
    );
  });

  it("canEdit is computed via canEditPaidTimeRow(item, props.paidTimesAvailability)", () => {
    var source = readSource();

    expect(source).toContain(
      "var canEdit = canEditPaidTimeRow(item, props.paidTimesAvailability);",
    );
    expect(source).not.toContain("var canEdit = !!item.canCancel;");
  });

  it("canCancel still comes from the server-provided item.canCancel, independent of paidTimesAvailability", () => {
    var source = readSource();

    expect(source).toContain("var canCancel = !!item.canCancel;");
  });
});

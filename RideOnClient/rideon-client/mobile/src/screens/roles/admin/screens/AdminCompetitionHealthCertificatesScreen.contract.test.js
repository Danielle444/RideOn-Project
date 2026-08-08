import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// Sole consumer of useAdminCompetitionHealthCertificates.js, edited as a
// direct, necessary consequence of that hook's styled-alert migration -
// AppDialog is a plain controlled component (not a global host like the
// toast), so the approved-certificate replacement confirm must be rendered
// here for the hook's confirmReplaceApprovedCertificate() Promise to ever
// resolve. The screen imports react-native/context modules not safe to
// import under plain vitest, so this reads source text - same approach as
// the repo's other *.contract.test.js files.

var SOURCE_PATH = path.resolve(
  __dirname,
  "AdminCompetitionHealthCertificatesScreen.jsx",
);

function readSource() {
  return fs.readFileSync(SOURCE_PATH, "utf8").replace(/\r\n/g, "\n");
}

describe("AdminCompetitionHealthCertificatesScreen - replace-approved-certificate dialog wiring", () => {
  it("imports AppDialog", () => {
    expect(readSource()).toContain(
      'import AppDialog from "../../../../components/common/AppDialog";',
    );
  });

  it("renders the dialog by spreading the hook's dialog-props contract, not a local reimplementation", () => {
    var source = readSource();

    expect(source).toContain(
      "<AppDialog {...healthCertificates.replaceApprovedCertificateDialogProps} />",
    );
  });

  it("healthCertificates.uploadHealthCertificate (the function that can trigger the confirm) is still wired as HealthCertificateCard's onUpload, unchanged", () => {
    var source = readSource();

    expect(source).toContain("onUpload={healthCertificates.uploadHealthCertificate}");
  });

  it("does not duplicate any business logic from the hook - no local Approved-status check or confirm state on this screen", () => {
    var source = readSource();

    expect(source).not.toContain("hcApprovalStatus");
    expect(source).not.toMatch(/useState\(.*[Cc]onfirm/);
  });

  it("no native Alert import remains", () => {
    var source = readSource();

    expect(source).not.toMatch(/Alert\.alert\(/);
    expect(source).not.toMatch(/from "react-native"[\s\S]{0,120}Alert/);
  });

  it("exit-competition clears the active competition before navigating back to the board, matching sibling admin competition screens", () => {
    var source = readSource();
    var fnStart = source.indexOf("async function handleExitCompetition()");
    var fnEnd = source.indexOf("\n  }\n", fnStart);
    var fnBody = source.slice(fnStart, fnEnd);

    expect(fnStart).toBeGreaterThan(-1);
    expect(fnBody).toContain("await competitionContext.clearCompetition();");
    expect(fnBody).toContain('props.navigation.navigate("AdminCompetitionsBoard");');

    var clearAt = fnBody.indexOf("competitionContext.clearCompetition()");
    var navigateAt = fnBody.indexOf('props.navigation.navigate("AdminCompetitionsBoard")');

    expect(clearAt).toBeGreaterThan(-1);
    expect(navigateAt).toBeGreaterThan(-1);
    expect(clearAt).toBeLessThan(navigateAt);
  });
});

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// CAP-4: contract test proving the paid-time "סיום" (Finish) button stays on
// the signup/registration screen instead of navigating to the standalone
// AdminCompetitionPaidTimes management screen - mirrors
// PaidTimeCreateModal.handleFinish, which only closes the success state
// (see its own onClose call, not a navigation.navigate). No renderer is
// configured in this repo, so this reads source text directly (same
// approach as paidTimeSafeArea.contract.test.js).

var SOURCE_PATH = path.resolve(__dirname, "AdminCompetitionRegistrationsScreen.jsx");

function readSource() {
  return fs.readFileSync(SOURCE_PATH, "utf8");
}

function getFunctionBody(source, functionName) {
  var startIndex = source.indexOf("function " + functionName + "(");
  expect(startIndex).toBeGreaterThan(-1);

  var braceDepth = 0;
  var bodyStart = source.indexOf("{", startIndex);
  var i = bodyStart;

  for (; i < source.length; i++) {
    if (source[i] === "{") braceDepth++;
    if (source[i] === "}") {
      braceDepth--;
      if (braceDepth === 0) break;
    }
  }

  return source.slice(bodyStart, i + 1);
}

describe("handleFinishPaidTime stays on the registration screen", () => {
  it("does not call navigation.navigate", () => {
    var body = getFunctionBody(readSource(), "handleFinishPaidTime");

    expect(body).not.toMatch(/navigation\.navigate/);
    expect(body).not.toContain("AdminCompetitionPaidTimes");
  });

  it("closes the in-place success state via paidTime.handleCloseSuccess", () => {
    var body = getFunctionBody(readSource(), "handleFinishPaidTime");

    expect(body).toContain("paidTime.handleCloseSuccess();");
  });

  it("is wired as the onFinish handler for the paid-time tab", () => {
    var source = readSource();

    expect(source).toMatch(/onFinish=\{handleFinishPaidTime\}/);
  });

  it("handleAddAnotherPaidTime ('בקשה נוספת') is unchanged - still closes success and stays on the form", () => {
    var body = getFunctionBody(readSource(), "handleAddAnotherPaidTime");

    expect(body).toContain("paidTime.handleCloseSuccess();");
    expect(body).not.toMatch(/navigation\.navigate/);
  });
});

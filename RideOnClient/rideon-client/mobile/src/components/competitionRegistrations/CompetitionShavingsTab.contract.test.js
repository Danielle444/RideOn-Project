import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// CAP-7: contract test proving the "later" shavings delivery date field
// receives the competition-day highlightedRange, same as the stall date
// fields - and that the hook actually derives that range from the same
// invitation-details response the stall-booking hook already uses.

var TAB_SOURCE_PATH = path.resolve(__dirname, "CompetitionShavingsTab.jsx");
var SCREEN_SOURCE_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "screens/roles/admin/screens/AdminCompetitionRegistrationsScreen.jsx",
);
var HOOK_SOURCE_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "hooks/useAdminCompetitionShavings.js",
);

describe("CompetitionShavingsTab delivery date highlighting", () => {
  it("the later-delivery CompetitionDateField receives highlightedCompetitionRange", () => {
    var tabSource = fs.readFileSync(TAB_SOURCE_PATH, "utf8");
    var laterDateFieldBlock = tabSource
      .split('label="תאריך אספקה"')[1]
      .split("/>")[0];

    expect(laterDateFieldBlock).toContain(
      "highlightedRange={props.highlightedCompetitionRange}",
    );
  });

  it("the later-delivery field does NOT receive orderedDates (not semantically relevant here - every available stall already has a booking)", () => {
    var tabSource = fs.readFileSync(TAB_SOURCE_PATH, "utf8");
    var laterDateFieldBlock = tabSource
      .split('label="תאריך אספקה"')[1]
      .split("/>")[0];

    expect(laterDateFieldBlock).not.toContain("orderedDates");
  });

  it("AdminCompetitionRegistrationsScreen threads shavings.highlightedCompetitionRange down", () => {
    var screenSource = fs.readFileSync(SCREEN_SOURCE_PATH, "utf8");

    expect(screenSource).toContain(
      "highlightedCompetitionRange={shavings.highlightedCompetitionRange}",
    );
  });

  it("useAdminCompetitionShavings derives the range from the same invitation-details competition payload", () => {
    var hookSource = fs.readFileSync(HOOK_SOURCE_PATH, "utf8");

    expect(hookSource).toContain(
      "normalizeCompetitionSummary(invitationResponse?.data?.competition)",
    );
    expect(hookSource).toMatch(
      /var highlightedCompetitionRange = useMemo\(/,
    );
    expect(hookSource).toContain("highlightedCompetitionRange: highlightedCompetitionRange,");
  });
});

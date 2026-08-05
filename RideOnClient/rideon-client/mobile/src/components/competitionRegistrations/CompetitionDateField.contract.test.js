import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// CAP-2: contract test for the shared month-header arrows, without
// rendering react-native (no renderer configured in this repo - see
// paidTimeSafeArea.contract.test.js for the established pattern of reading
// source text instead). The header row is flexDirection: "row-reverse", so
// the FIRST Pressable in source order renders on the right and the LAST
// renders on the left.

var SOURCE_PATH = path.resolve(__dirname, "CompetitionDateField.jsx");

function readSource() {
  return fs.readFileSync(SOURCE_PATH, "utf8");
}

function getHeaderBlock(source) {
  var afterModeCheck = source.split('mode === "date" ? (')[1];
  return afterModeCheck.split("HEBREW_DAYS.map")[0];
}

describe("CompetitionDateField month header arrows (RTL)", () => {
  it("the header row is row-reverse", () => {
    var source = readSource();
    var headerBlock = getHeaderBlock(source);

    expect(headerBlock).toMatch(/flexDirection:\s*"row-reverse"/);
  });

  it("the first (right-side) Pressable goes to the previous month with a '›' glyph", () => {
    var headerBlock = getHeaderBlock(readSource());

    expect(headerBlock).toMatch(
      /<Pressable\s+onPress=\{goToPreviousMonth\}\s+accessibilityLabel="חודש קודם"\s*>\s*<Text[^>]*>›<\/Text>/,
    );

    expect(headerBlock.indexOf("goToPreviousMonth")).toBeLessThan(
      headerBlock.indexOf("goToNextMonth"),
    );
  });

  it("the last (left-side) Pressable goes to the next month with a '‹' glyph", () => {
    var headerBlock = getHeaderBlock(readSource());

    expect(headerBlock).toMatch(
      /<Pressable\s+onPress=\{goToNextMonth\}\s+accessibilityLabel="חודש הבא"\s*>\s*<Text[^>]*>‹<\/Text>/,
    );
  });

  it("goToPreviousMonth decrements the month and goToNextMonth increments it", () => {
    var source = readSource();

    expect(source).toMatch(
      /function goToPreviousMonth\(\) \{[\s\S]*?prev\.getMonth\(\) - 1/,
    );
    expect(source).toMatch(
      /function goToNextMonth\(\) \{[\s\S]*?prev\.getMonth\(\) \+ 1/,
    );
  });

  it("this shared component is the one used by board filters, stall dates and shavings dates (not forked)", () => {
    var mobileSrc = path.resolve(__dirname, "..", "..");

    var filterBar = fs.readFileSync(
      path.join(mobileSrc, "components/competitions/CompetitionsFilterBar.jsx"),
      "utf8",
    );
    var tackForm = fs.readFileSync(
      path.join(
        mobileSrc,
        "components/competitionRegistrations/CompetitionTackStallFormCard.jsx",
      ),
      "utf8",
    );
    var shavingsTab = fs.readFileSync(
      path.join(
        mobileSrc,
        "components/competitionRegistrations/CompetitionShavingsTab.jsx",
      ),
      "utf8",
    );

    expect(filterBar).toContain(
      'import CompetitionDateField from "../competitionRegistrations/CompetitionDateField"',
    );
    expect(tackForm).toContain(
      'import CompetitionDateField from "./CompetitionDateField"',
    );
    expect(shavingsTab).toContain(
      'import CompetitionDateField from "./CompetitionDateField"',
    );
  });
});

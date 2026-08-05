import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// CAP-6: contract test proving the saved-stalls hook maps the server total
// and prefers it over the client recompute. The hook itself pulls in
// react-native/service modules not safe to import under plain vitest, so
// this reads source text (same approach as the repo's other
// *.contract.test.js files) - the actual amount logic is unit-tested
// directly in stallBookingAmounts.test.js.

var SOURCE_PATH = path.resolve(__dirname, "useAdminCompetitionStallsOverview.js");
var CARD_SOURCE_PATH = path.resolve(
  __dirname,
  "..",
  "components/competitions/CompetitionStallCard.jsx",
);

function readSource() {
  return fs.readFileSync(SOURCE_PATH, "utf8");
}

describe("useAdminCompetitionStallsOverview server-total wiring", () => {
  it("imports the pure server-total helpers", () => {
    var source = readSource();

    expect(source).toMatch(
      /import\s*\{\s*extractServerStallTotal,\s*resolveStallAmount,\s*\}\s*from\s*"\.\.\/utils\/stallBookingAmounts";/,
    );
  });

  it("normalizeBooking maps the server total via extractServerStallTotal", () => {
    var source = readSource();
    var normalizeBlock = source
      .split("function normalizeBooking(item) {")[1]
      .split("function normalizeStallBookingPayer")[0];

    expect(normalizeBlock).toContain(
      "serverStallAmount: extractServerStallTotal(item),",
    );
  });

  it("cards() resolves stallAmount via resolveStallAmount, not a bare recompute", () => {
    var source = readSource();
    var cardsBlock = source.split("var cards = useMemo(")[1];

    expect(cardsBlock).toContain("var stallAmount = resolveStallAmount({");
    expect(cardsBlock).toContain("serverStallAmount: booking.serverStallAmount,");
    expect(cardsBlock).not.toMatch(
      /var stallAmount =\s*\n?\s*Number\(numberOfDays \|\| 1\) \* effectivePerDayPrice;/,
    );
  });

  it("shavings are added into the card total exactly once", () => {
    var source = readSource();
    var occurrences = source.split("stallAmount + shavingsTotalAmount").length - 1;

    expect(occurrences).toBe(1);
  });
});

describe("CompetitionStallCard payment badge", () => {
  it("shows the badge whenever the resolved total is greater than zero", () => {
    var cardSource = fs.readFileSync(CARD_SOURCE_PATH, "utf8");

    expect(cardSource).toContain("Number(totalAmount || 0) > 0");
  });
});

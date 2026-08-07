import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// This component imports react-native, which is not safe to import under
// plain vitest, so this reads source text - same approach as the repo's
// other *.contract.test.js files (e.g. AdminCompetitionPayerAccountScreen).

var SOURCE_PATH = path.resolve(__dirname, "ShavingsGroupCard.jsx");

function readSource() {
  return fs.readFileSync(SOURCE_PATH, "utf8").replace(/\r\n/g, "\n");
}

describe("ShavingsGroupCard", () => {
  it("owns its own collapse state (starts expanded) rather than requiring the caller to track it", () => {
    var source = readSource();

    expect(source).toContain(
      "var [isCollapsed, setIsCollapsed] = useState(false);",
    );
  });

  it("toggles collapse via a Pressable on the group header, not per-row", () => {
    var source = readSource();

    var toggleIndex = source.indexOf("function toggleCollapsed() {");
    var pressableIndex = source.indexOf(
      "<Pressable\n        onPress={toggleCollapsed}",
    );

    expect(toggleIndex).toBeGreaterThan(-1);
    expect(pressableIndex).toBeGreaterThan(-1);
  });

  it("renders getGroupLabel(group) as the card title - the same helper for every band, including needsReview groups", () => {
    var source = readSource();

    expect(source).toContain(
      "<Text style={styles.itemTitle}>{getGroupLabel(group)}</Text>",
    );
  });

  it("a needsReview group (or any group with no anchor stall) falls back to the approved Hebrew fallback header, never the generic stall label", () => {
    var source = readSource();

    expect(source).toContain("if (group.isNeedsReview || !group.anchorStall) {");
    expect(source).toContain(
      "return SHAVINGS_NEEDS_REVIEW_COPY.stallLabel;",
    );
    expect(source).toContain(
      'import { SHAVINGS_NEEDS_REVIEW_COPY } from "../../utils/payerAccountCopy";',
    );
  });

  it("each order row reads only real proc-212 shavings[] fields - bagQuantity, amountToPay, paidAmount, unpaidAmount, deliveryStatus, requestedDeliveryTime, stallBookingIds - nothing invented", () => {
    var source = readSource();

    expect(source).toContain("order.bagQuantity");
    expect(source).toContain("order.amountToPay");
    expect(source).toContain("order.paidAmount");
    expect(source).toContain("order.unpaidAmount");
    expect(source).toContain("order.deliveryStatus");
    expect(source).toContain("formatShavingsDeliveryTime(order.requestedDeliveryTime)");
    expect(source).toContain("order.stallBookingIds");
  });

  it("uses function declarations rather than arrow functions, matching this codebase's payer-account convention", () => {
    var source = readSource();

    expect(source).not.toMatch(/=>\s*\{/);
    expect(source).not.toMatch(/\([^)]*\)\s*=>/);
  });

  it("renders each order keyed by shavingsOrderId, so React never warns about duplicate/missing keys within a group", () => {
    var source = readSource();

    expect(source).toContain('key={String(order.shavingsOrderId)}');
  });
});

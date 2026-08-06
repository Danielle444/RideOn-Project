import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

import {
  resolveStallLifecycleState,
  resolveShavingsLifecycleState,
  LIFECYCLE_STATE,
} from "../utils/payerAccountLifecycle.js";

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

// SH-1/SH-2: standalone shavings cancellation (proc 176's IsCancelled/
// HasPendingCancellation) wiring. Source-text checks confirm the hook itself
// wires the shared resolver in; the arithmetic describe block below proves the
// resolver's actual math using the real (RN-free) payerAccountLifecycle module.
describe("useAdminCompetitionStallsOverview shavings lifecycle wiring (SH-1/SH-2)", () => {
  it("imports the shared shavings lifecycle resolver", () => {
    var source = readSource();

    expect(source).toMatch(
      /import\s*\{\s*resolveStallLifecycleState,\s*resolveShavingsLifecycleState,\s*LIFECYCLE_STATE,\s*\}\s*from\s*"\.\.\/utils\/payerAccountLifecycle";/,
    );
  });

  it("normalizeShavingsOrder maps isCancelled from the API response", () => {
    var source = readSource();
    var normalizeBlock = source
      .split("function normalizeShavingsOrder(item) {")[1]
      .split("function normalizeShavingsDetail")[0];

    expect(normalizeBlock).toMatch(
      /isCancelled:\s*normalizeBoolean\(\s*item\.isCancelled\s*\?\?\s*item\.IsCancelled\s*\?\?\s*item\.iscancelled,\s*\)/,
    );
  });

  it("normalizeShavingsOrder maps hasPendingCancellation from the API response", () => {
    var source = readSource();
    var normalizeBlock = source
      .split("function normalizeShavingsOrder(item) {")[1]
      .split("function normalizeShavingsDetail")[0];

    expect(normalizeBlock).toMatch(
      /hasPendingCancellation:\s*normalizeBoolean\(\s*item\.hasPendingCancellation\s*\?\?\s*item\.HasPendingCancellation\s*\?\?\s*item\.haspendingcancellation,\s*\)/,
    );
  });

  it("cards() derives each related order's lifecycleState via the shared resolver", () => {
    var source = readSource();
    var cardsBlock = source.split("var cards = useMemo(")[1];

    expect(cardsBlock).toContain(
      "var stallLifecycleState = resolveStallLifecycleState(booking);",
    );
    expect(cardsBlock).toMatch(
      /lifecycleState:\s*resolveShavingsLifecycleState\(\s*order,\s*stallLifecycleState,\s*\)/,
    );
  });

  it("shavingsTotalAmount excludes orders whose lifecycleState is CANCELLED", () => {
    var source = readSource();
    var totalBlock = source
      .split("var shavingsTotalAmount = relatedOrders.reduce(")[1]
      .split("}, 0);")[0];

    expect(totalBlock).toMatch(
      /order\.lifecycleState === LIFECYCLE_STATE\.CANCELLED/,
    );
    expect(totalBlock).toContain("return sum;");
  });

  it("shavingsTotalAmount is not gated on the raw isCancelled flag directly (must go through the resolver)", () => {
    var source = readSource();
    var totalBlock = source
      .split("var shavingsTotalAmount = relatedOrders.reduce(")[1]
      .split("}, 0);")[0];

    expect(totalBlock).not.toContain("order.isCancelled");
  });
});

describe("shavings total exclusion arithmetic (mirrors the hook's reduce, via the real resolver)", () => {
  function sumShavings(orders) {
    return orders.reduce(function (sum, order) {
      if (order.lifecycleState === LIFECYCLE_STATE.CANCELLED) {
        return sum;
      }

      return sum + Number(order.amountForThisStall || 0);
    }, 0);
  }

  function withLifecycle(order, stallState) {
    return {
      ...order,
      lifecycleState: resolveShavingsLifecycleState(order, stallState),
    };
  }

  var activeStallState = resolveStallLifecycleState({
    isCancelled: false,
    hasPendingCancellation: false,
    hasPendingChange: false,
  });

  it("excludes a terminally cancelled order's amount", () => {
    var orders = [
      { amountForThisStall: 100, isCancelled: true },
      { amountForThisStall: 50, isCancelled: false },
    ].map((o) => withLifecycle(o, activeStallState));

    expect(sumShavings(orders)).toBe(50);
  });

  it("keeps a pending-cancellation order's amount in the total (not terminal)", () => {
    var orders = [
      { amountForThisStall: 100, hasPendingCancellation: true },
      { amountForThisStall: 50 },
    ].map((o) => withLifecycle(o, activeStallState));

    expect(sumShavings(orders)).toBe(150);
  });

  it("computes the correct remaining total across a mix of active/pending/cancelled orders", () => {
    var orders = [
      { amountForThisStall: 100, isCancelled: true },
      { amountForThisStall: 60, hasPendingCancellation: true },
      { amountForThisStall: 40 },
      { amountForThisStall: 20, isCancelled: true },
    ].map((o) => withLifecycle(o, activeStallState));

    expect(sumShavings(orders)).toBe(100);
  });

  it("falls back safely to Active when lifecycle fields are missing entirely", () => {
    var order = withLifecycle({ amountForThisStall: 75 }, activeStallState);

    expect(order.lifecycleState).toBe(LIFECYCLE_STATE.ACTIVE);
    expect(sumShavings([order])).toBe(75);
  });
});

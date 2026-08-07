import { describe, it, expect } from "vitest";
import {
  formatStallNumbers,
  formatCompoundDestination,
  getDeliveryDestinationDisplay,
  DELIVERY_DESTINATION_UNASSIGNED_TEXT,
  DELIVERY_DESTINATION_PARTIAL_WARNING,
} from "./shavingsDestination.utils";

describe("formatStallNumbers", () => {
  it("renders a single stall as its own number", () => {
    expect(formatStallNumbers(["901"])).toBe("901");
  });

  it("collapses a contiguous run into a dash range", () => {
    expect(formatStallNumbers(["10", "11"])).toBe("10–11");
  });

  it("keeps non-contiguous stalls comma-separated", () => {
    expect(formatStallNumbers(["10", "12", "15"])).toBe("10, 12, 15");
  });

  it("sorts numerically regardless of input order", () => {
    expect(formatStallNumbers(["15", "10", "12"])).toBe("10, 12, 15");
  });

  it("dedupes repeated stall numbers", () => {
    expect(formatStallNumbers(["10", "10", "11"])).toBe("10–11");
  });

  it("falls back to a plain comma-joined list for non-numeric stall numbers", () => {
    expect(formatStallNumbers(["A1", "B2"])).toBe("A1, B2");
  });
});

describe("formatCompoundDestination", () => {
  it("uses singular תא for exactly one stall", () => {
    expect(
      formatCompoundDestination({
        compoundName: "תאי תחרות",
        stalls: [{ stallNumber: "901" }],
      }),
    ).toBe("מתחם תאי תחרות · תא 901");
  });

  it("uses plural תאים for a contiguous range", () => {
    expect(
      formatCompoundDestination({
        compoundName: "B2W",
        stalls: [{ stallNumber: "10" }, { stallNumber: "11" }],
      }),
    ).toBe("מתחם B2W · תאים 10–11");
  });

  it("uses plural תאים for non-contiguous stalls", () => {
    expect(
      formatCompoundDestination({
        CompoundName: "B2W",
        Stalls: [
          { StallNumber: "10" },
          { StallNumber: "12" },
          { StallNumber: "15" },
        ],
      }),
    ).toBe("מתחם B2W · תאים 10, 12, 15");
  });
});

describe("getDeliveryDestinationDisplay", () => {
  it("returns one line per compound for multiple compounds", () => {
    const result = getDeliveryDestinationDisplay({
      deliveryDestinations: [
        {
          compoundName: "תאי תחרות",
          stalls: [{ stallNumber: "504" }],
        },
        {
          compoundName: "B2W",
          stalls: [{ stallNumber: "10" }, { stallNumber: "11" }],
        },
      ],
      hasUnassignedStalls: false,
    });

    expect(result.lines).toEqual([
      "מתחם תאי תחרות · תא 504",
      "מתחם B2W · תאים 10–11",
    ]);
    expect(result.warningText).toBeNull();
    expect(result.emptyText).toBeNull();
  });

  it("also reads the PascalCase DeliveryDestinations/HasUnassignedStalls fallback", () => {
    const result = getDeliveryDestinationDisplay({
      DeliveryDestinations: [
        { CompoundId: 1, CompoundName: "B2W", Stalls: [{ StallNumber: "10" }] },
      ],
      HasUnassignedStalls: false,
    });

    expect(result.lines).toEqual(["מתחם B2W · תא 10"]);
  });

  it("shows known destinations plus the partial warning when some stalls are unassigned", () => {
    const result = getDeliveryDestinationDisplay({
      deliveryDestinations: [
        { compoundName: "B2W", stalls: [{ stallNumber: "10" }] },
      ],
      hasUnassignedStalls: true,
    });

    expect(result.lines).toEqual(["מתחם B2W · תא 10"]);
    expect(result.warningText).toBe(DELIVERY_DESTINATION_PARTIAL_WARNING);
    expect(result.emptyText).toBeNull();
  });

  it("shows only the fully-unassigned text when no destination has resolved yet", () => {
    const result = getDeliveryDestinationDisplay({
      deliveryDestinations: [],
      hasUnassignedStalls: false,
    });

    expect(result.lines).toEqual([]);
    expect(result.warningText).toBeNull();
    expect(result.emptyText).toBe(DELIVERY_DESTINATION_UNASSIGNED_TEXT);
  });

  it("also treats an order with bookings but zero resolved compounds as fully unassigned", () => {
    // HasUnassignedStalls can be true with an empty DeliveryDestinations array when every
    // linked booking failed to resolve to a stall/compound — same user-facing message as
    // "no bookings at all", per the business spec (only one "not yet assigned" state).
    const result = getDeliveryDestinationDisplay({
      deliveryDestinations: [],
      hasUnassignedStalls: true,
    });

    expect(result.lines).toEqual([]);
    expect(result.emptyText).toBe(DELIVERY_DESTINATION_UNASSIGNED_TEXT);
  });

  it("treats a missing deliveryDestinations field as fully unassigned rather than throwing", () => {
    const result = getDeliveryDestinationDisplay({});

    expect(result.emptyText).toBe(DELIVERY_DESTINATION_UNASSIGNED_TEXT);
  });

  it("does not display a duplicate stall twice within a compound", () => {
    const result = getDeliveryDestinationDisplay({
      deliveryDestinations: [
        {
          compoundName: "B2W",
          stalls: [{ stallNumber: "10" }, { stallNumber: "10" }],
        },
      ],
      hasUnassignedStalls: false,
    });

    expect(result.lines).toEqual(["מתחם B2W · תא 10"]);
  });
});

import { describe, it, expect } from "vitest";
import {
  formatStallNumbers,
  formatCompoundDestination,
  getDeliveryDestinationDisplay,
  DELIVERY_DESTINATION_UNASSIGNED_TEXT,
  DELIVERY_DESTINATION_PARTIAL_WARNING,
} from "../../../shared/shavings/shavingsDestination.utils";

// Mobile-side parity check for the shared formatter (moved out of
// web/src/utils/shavingsDestination.utils.js into shared/shavings/ so both apps read one
// implementation — see the RanchWorker delivery-destination slice). This mirrors the
// business-rule cases already pinned by web/src/utils/shavingsDestination.utils.test.js,
// resolved from mobile's own module graph, so a future metro/import-path regression on this
// side is caught here rather than only on web.

describe("shared shavingsDestination.utils — resolved from mobile", function () {
  it("formats a single stall with no range dash", function () {
    expect(formatStallNumbers(["901"])).toBe("901");
  });

  it("collapses a contiguous run into a dash range", function () {
    expect(formatStallNumbers(["10", "11"])).toBe("10–11");
  });

  it("keeps non-contiguous stalls comma-separated", function () {
    expect(formatStallNumbers(["10", "12", "15"])).toBe("10, 12, 15");
  });

  it("uses the singular תא label for exactly one stall", function () {
    expect(
      formatCompoundDestination({
        compoundName: "תאי תחרות",
        stalls: [{ stallNumber: "901" }],
      }),
    ).toBe("מתחם תאי תחרות · תא 901");
  });

  it("uses the plural תאים label for a contiguous range", function () {
    expect(
      formatCompoundDestination({
        compoundName: "B2W",
        stalls: [{ stallNumber: "10" }, { stallNumber: "11" }],
      }),
    ).toBe("מתחם B2W · תאים 10–11");
  });

  it("uses the plural תאים label for non-contiguous stalls", function () {
    expect(
      formatCompoundDestination({
        compoundName: "B2W",
        stalls: [
          { stallNumber: "10" },
          { stallNumber: "12" },
          { stallNumber: "15" },
        ],
      }),
    ).toBe("מתחם B2W · תאים 10, 12, 15");
  });

  it("renders one line per compound for a multi-compound destination, no warning", function () {
    var display = getDeliveryDestinationDisplay({
      deliveryDestinations: [
        { compoundName: "תאי תחרות", stalls: [{ stallNumber: "901" }] },
        { compoundName: "B2W", stalls: [{ stallNumber: "10" }, { stallNumber: "11" }] },
      ],
      hasUnassignedStalls: false,
    });

    expect(display.lines).toEqual([
      "מתחם תאי תחרות · תא 901",
      "מתחם B2W · תאים 10–11",
    ]);
    expect(display.warningText).toBeNull();
    expect(display.emptyText).toBeNull();
  });

  it("appends the partial-assignment warning when known destinations exist and hasUnassignedStalls is true", function () {
    var display = getDeliveryDestinationDisplay({
      deliveryDestinations: [
        { compoundName: "תאי תחרות", stalls: [{ stallNumber: "901" }] },
      ],
      hasUnassignedStalls: true,
    });

    expect(display.lines).toEqual(["מתחם תאי תחרות · תא 901"]);
    expect(display.warningText).toBe(DELIVERY_DESTINATION_PARTIAL_WARNING);
    expect(display.emptyText).toBeNull();
  });

  it("renders only the unassigned text when deliveryDestinations is empty, even if hasUnassignedStalls is true", function () {
    var display = getDeliveryDestinationDisplay({
      deliveryDestinations: [],
      hasUnassignedStalls: true,
    });

    expect(display.lines).toEqual([]);
    expect(display.warningText).toBeNull();
    expect(display.emptyText).toBe(DELIVERY_DESTINATION_UNASSIGNED_TEXT);
  });

  it("treats a missing deliveryDestinations field as fully unassigned rather than throwing", function () {
    var display = getDeliveryDestinationDisplay({});

    expect(display.emptyText).toBe(DELIVERY_DESTINATION_UNASSIGNED_TEXT);
  });

  it("also reads PascalCase DeliveryDestinations/HasUnassignedStalls", function () {
    var display = getDeliveryDestinationDisplay({
      DeliveryDestinations: [
        { CompoundName: "B2W", Stalls: [{ StallNumber: "10" }, { StallNumber: "12" }] },
      ],
      HasUnassignedStalls: false,
    });

    expect(display.lines).toEqual(["מתחם B2W · תאים 10, 12"]);
  });

  it("does not double-render a duplicate stall id within one compound", function () {
    var display = getDeliveryDestinationDisplay({
      deliveryDestinations: [
        {
          compoundName: "B2W",
          stalls: [{ stallNumber: "10" }, { stallNumber: "10" }],
        },
      ],
      hasUnassignedStalls: false,
    });

    expect(display.lines).toEqual(["מתחם B2W · תא 10"]);
  });
});

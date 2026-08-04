import { describe, it, expect } from "vitest";
import { canEditPaidTimeRow } from "./paidTimeEditAvailability.js";

function buildItem(overrides) {
  return Object.assign({ isPaid: false, status: "Assigned" }, overrides);
}

function buildAvailability(overrides) {
  return Object.assign({ isEnabled: true }, overrides);
}

describe("canEditPaidTimeRow", () => {
  it("allows edit when the step is active and the item is unpaid/non-cancelled", () => {
    expect(canEditPaidTimeRow(buildItem({}), buildAvailability({}))).toBe(true);
  });

  it("disallows edit once the competition has ended (step disabled)", () => {
    expect(
      canEditPaidTimeRow(buildItem({}), buildAvailability({ isEnabled: false })),
    ).toBe(false);
  });

  it("disallows edit when the request is already paid, regardless of step availability", () => {
    expect(
      canEditPaidTimeRow(buildItem({ isPaid: true }), buildAvailability({})),
    ).toBe(false);
  });

  it("disallows edit when the request is cancelled, regardless of step availability", () => {
    expect(
      canEditPaidTimeRow(buildItem({ status: "Cancelled" }), buildAvailability({})),
    ).toBe(false);
  });

  it("disallows edit when paidTimesAvailability is missing entirely", () => {
    expect(canEditPaidTimeRow(buildItem({}), null)).toBe(false);
  });
});

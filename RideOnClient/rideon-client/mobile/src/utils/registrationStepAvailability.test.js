import { describe, it, expect } from "vitest";
import { computeRegistrationStepAvailability } from "./registrationStepAvailability.js";

function buildStatus(overrides) {
  return Object.assign(
    {
      isCompetitionEnded: false,
      paidTimeConfigured: false,
      isPaidTimeWindowOpen: false,
      hasActivePaidTimePrice: false,
      paidTimeReadyToBook: false,
      paidTimeRegistrationDate: null,
      hasRelevantActiveEntry: false,
      hasRelevantActiveNonTackStallBooking: false,
    },
    overrides,
  );
}

describe("paid time visibility across competition-ended states", () => {
  it("hides paid time when not configured and the competition is active", () => {
    var status = buildStatus({ isCompetitionEnded: false, paidTimeConfigured: false });
    var result = computeRegistrationStepAvailability(status);

    expect(result.paidTimes.isVisible).toBe(false);
    expect(result.paidTimes.isEnabled).toBe(false);
    expect(result.paidTimes.unavailableReason).toBe("NOT_CONFIGURED");
  });

  it("keeps paid time hidden when not configured and the competition has ended", () => {
    var status = buildStatus({ isCompetitionEnded: true, paidTimeConfigured: false });
    var result = computeRegistrationStepAvailability(status);

    expect(result.paidTimes.isVisible).toBe(false);
    expect(result.paidTimes.isEnabled).toBe(false);
    expect(result.paidTimes.isReadOnly).toBe(false);

    // Classes/stalls/shavings must be unaffected by paid time's configuration state.
    expect(result.classes).toEqual({
      isVisible: true,
      isEnabled: false,
      isReadOnly: true,
      unavailableReason: null,
    });
    expect(result.stalls).toEqual({
      isVisible: true,
      isEnabled: false,
      isReadOnly: true,
      unavailableReason: null,
    });
    expect(result.shavings).toEqual({
      isVisible: true,
      isEnabled: false,
      isReadOnly: true,
      unavailableReason: null,
    });
  });

  it("shows paid time as read-only once the competition has ended, when it was configured", () => {
    var status = buildStatus({ isCompetitionEnded: true, paidTimeConfigured: true });
    var result = computeRegistrationStepAvailability(status);

    expect(result.paidTimes.isVisible).toBe(true);
    expect(result.paidTimes.isEnabled).toBe(false);
    expect(result.paidTimes.isReadOnly).toBe(true);
    expect(result.paidTimes.unavailableReason).toBe(null);
  });

  it("disables paid time with MISSING_PRICE when the window is open but no active price exists", () => {
    var status = buildStatus({
      isCompetitionEnded: false,
      paidTimeConfigured: true,
      isPaidTimeWindowOpen: true,
      hasActivePaidTimePrice: false,
    });
    var result = computeRegistrationStepAvailability(status);

    expect(result.paidTimes.isVisible).toBe(true);
    expect(result.paidTimes.isEnabled).toBe(false);
    expect(result.paidTimes.unavailableReason).toBe("MISSING_PRICE");
  });
});

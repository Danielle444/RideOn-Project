// Pure mapping from the server RegistrationStepStatus response to per-tab
// availability state for the RanchAdmin four-step registration workflow
// (Classes / Stalls / Paid Time / Shavings). Consumes only what the server
// already computed - no creator/managed-payer rules are re-derived here.

var REASON_NOT_CONFIGURED = "NOT_CONFIGURED";
var REASON_NOT_OPEN_YET = "NOT_OPEN_YET";
var REASON_MISSING_PRICE = "MISSING_PRICE";
var REASON_NEEDS_RELEVANT_ENTRY = "NEEDS_RELEVANT_ENTRY";
var REASON_NEEDS_RELEVANT_STALL_BOOKING = "NEEDS_RELEVANT_STALL_BOOKING";
var REASON_STATUS_UNAVAILABLE = "STATUS_UNAVAILABLE";

function isValidStatus(status) {
  return (
    status !== null &&
    typeof status === "object" &&
    (status.isCompetitionEnded === true || status.isCompetitionEnded === false)
  );
}

function buildStatusUnavailableAvailability() {
  return {
    classes: {
      isVisible: true,
      isEnabled: false,
      isReadOnly: false,
      unavailableReason: REASON_STATUS_UNAVAILABLE,
    },
    stalls: {
      isVisible: true,
      isEnabled: false,
      isReadOnly: false,
      unavailableReason: REASON_STATUS_UNAVAILABLE,
    },
    paidTimes: {
      isVisible: true,
      isEnabled: false,
      isReadOnly: false,
      unavailableReason: REASON_STATUS_UNAVAILABLE,
      openingDate: null,
    },
    shavings: {
      isVisible: true,
      isEnabled: false,
      isReadOnly: false,
      unavailableReason: REASON_STATUS_UNAVAILABLE,
    },
  };
}

function buildEndedAvailability(status) {
  return {
    classes: {
      isVisible: true,
      isEnabled: false,
      isReadOnly: true,
      unavailableReason: null,
    },
    stalls: {
      isVisible: true,
      isEnabled: false,
      isReadOnly: true,
      unavailableReason: null,
    },
    paidTimes: status.paidTimeConfigured
      ? {
          isVisible: true,
          isEnabled: false,
          isReadOnly: true,
          unavailableReason: null,
          openingDate: null,
        }
      : {
          isVisible: false,
          isEnabled: false,
          isReadOnly: false,
          unavailableReason: REASON_NOT_CONFIGURED,
          openingDate: null,
        },
    shavings: {
      isVisible: true,
      isEnabled: false,
      isReadOnly: true,
      unavailableReason: null,
    },
  };
}

function computeClassesAvailability() {
  return {
    isVisible: true,
    isEnabled: true,
    isReadOnly: false,
    unavailableReason: null,
  };
}

function computeStallsAvailability(status) {
  if (status.hasRelevantActiveEntry) {
    return {
      isVisible: true,
      isEnabled: true,
      isReadOnly: false,
      unavailableReason: null,
    };
  }

  return {
    isVisible: true,
    isEnabled: false,
    isReadOnly: false,
    unavailableReason: REASON_NEEDS_RELEVANT_ENTRY,
  };
}

function computeShavingsAvailability(status) {
  if (status.hasRelevantActiveNonTackStallBooking) {
    return {
      isVisible: true,
      isEnabled: true,
      isReadOnly: false,
      unavailableReason: null,
    };
  }

  return {
    isVisible: true,
    isEnabled: false,
    isReadOnly: false,
    unavailableReason: REASON_NEEDS_RELEVANT_STALL_BOOKING,
  };
}

function computePaidTimesAvailability(status) {
  if (!status.paidTimeConfigured) {
    return {
      isVisible: false,
      isEnabled: false,
      isReadOnly: false,
      unavailableReason: REASON_NOT_CONFIGURED,
      openingDate: null,
    };
  }

  if (!status.isPaidTimeWindowOpen) {
    return {
      isVisible: true,
      isEnabled: false,
      isReadOnly: false,
      unavailableReason: REASON_NOT_OPEN_YET,
      openingDate: status.paidTimeRegistrationDate || null,
    };
  }

  if (!status.hasActivePaidTimePrice) {
    return {
      isVisible: true,
      isEnabled: false,
      isReadOnly: false,
      unavailableReason: REASON_MISSING_PRICE,
      openingDate: null,
    };
  }

  if (status.paidTimeReadyToBook) {
    return {
      isVisible: true,
      isEnabled: true,
      isReadOnly: false,
      unavailableReason: null,
      openingDate: null,
    };
  }

  // Configured, window open, price active, but the server did not mark it
  // ready to book - an inconsistent combination the named reasons don't
  // describe. Do not invent a business reason (NOT_OPEN_YET/MISSING_PRICE
  // would contradict the supplied fields) and do not leave the reason null,
  // since this step is disabled while still active (not the ended-competition
  // exception) - flag it as an unresolved status rather than mislabeling it.
  return {
    isVisible: true,
    isEnabled: false,
    isReadOnly: false,
    unavailableReason: REASON_STATUS_UNAVAILABLE,
    openingDate: null,
  };
}

export function computeRegistrationStepAvailability(status) {
  if (!isValidStatus(status)) {
    return buildStatusUnavailableAvailability();
  }

  if (status.isCompetitionEnded) {
    return buildEndedAvailability(status);
  }

  return {
    classes: computeClassesAvailability(),
    stalls: computeStallsAvailability(status),
    paidTimes: computePaidTimesAvailability(status),
    shavings: computeShavingsAvailability(status),
  };
}

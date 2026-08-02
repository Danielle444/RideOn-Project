/* eslint-disable react-hooks/rules-of-hooks --
 * This file calls the hook outside React on purpose: the React hooks it uses are
 * stubbed below, so there is no renderer and the rule's premise does not hold.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Same harness as useCompetitionPaidTimePage.assign.test.js: this repo has no
// DOM test environment and no React Testing Library, so the hook cannot be
// rendered. useCompetitionDetailsStep only uses useState / useEffect, so those
// are stubbed and the hook is invoked directly to get real handler closures
// out of the real module. No production file is reshaped for testing.
vi.mock("react", function () {
  return {
    useState: function (initial) {
      return [initial, function () {}];
    },
    useEffect: function () {},
  };
});

vi.mock("../../services/competitionService", function () {
  return {
    createCompetition: vi.fn().mockResolvedValue({ data: {} }),
    getCompetitionById: vi.fn().mockResolvedValue({ data: {} }),
    updateCompetition: vi.fn().mockResolvedValue({ data: {} }),
    rescheduleCompetition: vi.fn().mockResolvedValue({ data: {} }),
  };
});

vi.mock("../../services/superUserService", function () {
  return {
    getAllFields: vi.fn().mockResolvedValue({ data: [] }),
    getAllClassTypes: vi.fn().mockResolvedValue({ data: [] }),
    getAllJudges: vi.fn().mockResolvedValue({ data: [] }),
    getAllPrizeTypes: vi.fn().mockResolvedValue({ data: [] }),
    getAllPatternsWithManeuvers: vi.fn().mockResolvedValue({ data: [] }),
  };
});

vi.mock("../../services/arenaService", function () {
  return { getArenasByRanchId: vi.fn().mockResolvedValue({ data: [] }) };
});

vi.mock("../../services/paidTimeSlotInCompetitionService", function () {
  return { getAllPaidTimeBaseSlots: vi.fn().mockResolvedValue({ data: [] }) };
});

// competitionForm.utils is deliberately NOT mocked: the real getErrorMessage is
// part of what these tests exercise (same convention as the paid-time assign test).

import useCompetitionDetailsStep from "./useCompetitionDetailsStep";
import {
  rescheduleCompetition,
  getCompetitionById,
  updateCompetition,
} from "../../services/competitionService";

const RANCH_ID = 11;
const COMPETITION_ID = 46;
const SUCCESS_MESSAGE = "התחרות וכל מועדי השירותים שלה נדחו בהצלחה.";
const GENERIC_MESSAGE = "אירעה שגיאה בדחיית התחרות. לא בוצעו שינויים.";

function httpError(data) {
  var err = new Error("Request failed with status code 409");
  err.response = { status: 409, data: data };
  return err;
}

function buildEditStep(onShowToast) {
  return useCompetitionDetailsStep({
    currentRanchId: RANCH_ID,
    isEdit: true,
    competitionIdFromRoute: COMPETITION_ID,
    onNavigateToEdit: function () {},
    onShowToast: onShowToast,
  });
}

describe("handleReschedule", function () {
  var onShowToast;

  beforeEach(function () {
    vi.clearAllMocks();
    getCompetitionById.mockResolvedValue({
      data: { competitionId: COMPETITION_ID, competitionStatus: "טיוטה" },
    });
    rescheduleCompetition.mockResolvedValue({ data: { message: SUCCESS_MESSAGE } });
    onShowToast = vi.fn();
  });

  it("is a no-op in create mode (no competitionId)", async function () {
    var step = useCompetitionDetailsStep({
      currentRanchId: RANCH_ID,
      isEdit: false,
      competitionIdFromRoute: null,
      onNavigateToEdit: function () {},
      onShowToast: onShowToast,
    });

    await step.handleReschedule(7);

    expect(rescheduleCompetition).not.toHaveBeenCalled();
    expect(onShowToast).not.toHaveBeenCalled();
  });

  it("is a no-op without a current ranch", async function () {
    var step = useCompetitionDetailsStep({
      currentRanchId: null,
      isEdit: true,
      competitionIdFromRoute: COMPETITION_ID,
      onNavigateToEdit: function () {},
      onShowToast: onShowToast,
    });

    await step.handleReschedule(7);

    expect(rescheduleCompetition).not.toHaveBeenCalled();
  });

  it("posts competitionId, hostRanchId and offsetDays to the dedicated reschedule endpoint", async function () {
    var step = buildEditStep(onShowToast);

    await step.handleReschedule(7);

    expect(rescheduleCompetition).toHaveBeenCalledTimes(1);
    expect(rescheduleCompetition).toHaveBeenCalledWith(COMPETITION_ID, {
      competitionId: COMPETITION_ID,
      hostRanchId: RANCH_ID,
      offsetDays: 7,
    });
  });

  it("never calls updateCompetition (the ordinary edit endpoint) for a reschedule", async function () {
    var step = buildEditStep(onShowToast);

    await step.handleReschedule(7);

    expect(updateCompetition).not.toHaveBeenCalled();
  });

  it("shows the success toast and reloads the competition from the server", async function () {
    var step = buildEditStep(onShowToast);

    await step.handleReschedule(7);

    expect(onShowToast).toHaveBeenCalledWith("success", SUCCESS_MESSAGE);

    // The reload is the mechanism that refreshes the displayed old/new dates —
    // it re-fetches by id+ranch exactly like loadExistingCompetition always has.
    expect(getCompetitionById).toHaveBeenCalledWith(COMPETITION_ID, RANCH_ID);
  });

  it("falls back to the fixed success copy if the server response carries no message", async function () {
    rescheduleCompetition.mockResolvedValue({ data: {} });

    var step = buildEditStep(onShowToast);

    await step.handleReschedule(7);

    expect(onShowToast).toHaveBeenCalledWith("success", SUCCESS_MESSAGE);
  });

  it("shows the exact fixed message for each documented business-conflict response", async function () {
    var conflictMessages = [
      "לא ניתן לדחות תחרות שכבר התחילה.",
      "מספר ימי הדחייה חייב להיות גדול מאפס.",
      "לא ניתן לדחות את התחרות כל עוד קיימות בקשות שינוי או ביטול שממתינות לטיפול.",
      "לא ניתן לדחות את התחרות משום שקיימים מקצים או זמני פייד־טיים מחוץ לטווח התקין.",
      "לא ניתן לדחות את התחרות משום שהדחייה תיצור חפיפה בהזמנת תא של אחד הסוסים.",
    ];

    for (var i = 0; i < conflictMessages.length; i++) {
      vi.clearAllMocks();
      onShowToast = vi.fn();
      rescheduleCompetition.mockRejectedValue(httpError(conflictMessages[i]));

      var step = buildEditStep(onShowToast);

      await step.handleReschedule(7);

      expect(onShowToast).toHaveBeenCalledWith("error", conflictMessages[i]);
    }
  });

  it("does not reload the competition when the server rejects", async function () {
    rescheduleCompetition.mockRejectedValue(
      httpError("לא ניתן לדחות תחרות שכבר התחילה."),
    );

    var step = buildEditStep(onShowToast);
    var callsBefore = getCompetitionById.mock.calls.length;

    await step.handleReschedule(7);

    expect(getCompetitionById.mock.calls.length).toBe(callsBefore);
    expect(onShowToast).not.toHaveBeenCalledWith("success", SUCCESS_MESSAGE);
  });

  it("falls back to the fixed generic failure message when the server sends no usable text", async function () {
    rescheduleCompetition.mockRejectedValue({});

    var step = buildEditStep(onShowToast);

    await step.handleReschedule(7);

    expect(onShowToast).toHaveBeenCalledWith("error", GENERIC_MESSAGE);
  });
});

describe("openRescheduleModal / closeRescheduleModal", function () {
  it("openRescheduleModal does not throw without a competitionId (create mode)", function () {
    var step = useCompetitionDetailsStep({
      currentRanchId: RANCH_ID,
      isEdit: false,
      competitionIdFromRoute: null,
      onNavigateToEdit: function () {},
      onShowToast: function () {},
    });

    expect(function () {
      step.openRescheduleModal();
    }).not.toThrow();
  });

  it("closeRescheduleModal does not throw while a reschedule is in flight (stubbed state stays at its initial value)", function () {
    var step = buildEditStep(function () {});

    expect(function () {
      step.closeRescheduleModal();
    }).not.toThrow();
  });
});

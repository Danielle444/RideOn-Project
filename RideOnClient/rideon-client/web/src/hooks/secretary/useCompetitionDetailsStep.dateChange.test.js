/* eslint-disable react-hooks/rules-of-hooks --
 * This file calls the hook outside React on purpose: the React hooks it uses are
 * stubbed below, so there is no renderer and the rule's premise does not hold.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// CAP-6: the old separate "postpone" flow (a standalone handleReschedule +
// its own modal) is gone. Editing competitionStartDate on the details form
// and saving now drives the SAME dedicated reschedule endpoint, confirmed
// via a shared ConfirmDialog before it runs. Same harness as
// useCompetitionPaidTimePage.assign.test.js: this repo has no DOM test
// environment and no React Testing Library, so the hook cannot be rendered.
// useState is stubbed to always return the INITIAL value (no setter ever
// actually mutates state across "renders", since there is only one render
// here) - which means detailsForm.competitionStartDate and
// persistedCompetitionStartDate can never be driven to differ from each
// other through this harness (both start, and stay, at ""). Behaviorally
// exercising saveDetails' date-change branch is therefore NOT possible here;
// that branch's exact structure and call sequencing is instead proven via
// the source-level assertions in useCompetitionDetailsStep.contract.test.js,
// the same technique this repo already uses wherever a stubbed-useState
// harness cannot reach a code path (see
// CompetitionHealthCertificatesPage.contract.test.js for the rationale).
// What CAN be behaviorally exercised here: the pure helpers saveDetails
// relies on, the confirm/cancel API shape, and the create-mode guard.
vi.mock("react", function () {
  return {
    useState: function (initial) {
      return [initial, function () {}];
    },
    useEffect: function () {},
    useRef: function (initial) {
      return { current: initial };
    },
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

import useCompetitionDetailsStep from "./useCompetitionDetailsStep";
import { rescheduleCompetition } from "../../services/competitionService";
import {
  getWholeDayOffsetDays,
  getErrorMessage as getErrorMessageUtil,
} from "../../utils/competitionForm.utils";
import { addDaysToDateOnly } from "../../utils/paidTimeSlotForm.utils";

const RANCH_ID = 11;
const RESCHEDULE_GENERIC_ERROR = "אירעה שגיאה בדחיית התחרות. לא בוצעו שינויים.";

function httpError(data) {
  var err = new Error("Request failed with status code 409");
  err.response = { status: 409, data: data };
  return err;
}

describe("getWholeDayOffsetDays — the pure decision function saveDetails relies on", function () {
  it("computes whole-day offsets, positive, zero and negative", function () {
    expect(getWholeDayOffsetDays("2026-08-17", "2026-08-10")).toBe(7);
    expect(getWholeDayOffsetDays("2026-08-10", "2026-08-10")).toBe(0);
    expect(getWholeDayOffsetDays("2026-08-05", "2026-08-10")).toBe(-5);
  });
});

describe("addDaysToDateOnly — reused (not duplicated) for the derived end-date preview", function () {
  it("adds whole days to a YYYY-MM-DD string", function () {
    expect(addDaysToDateOnly("2026-08-10", 7)).toBe("2026-08-17");
    expect(addDaysToDateOnly("2026-08-28", 4)).toBe("2026-09-01");
  });
});

describe("business-conflict messages from usp_RescheduleCompetition surface verbatim", function () {
  // These exact strings are the live proc's RAISE EXCEPTION text (read
  // 2026-08-05) - getErrorMessage must pass them through unchanged since the
  // controller returns them as the raw response body string.
  it("returns each documented guard string verbatim, with no fallback substitution", function () {
    var conflictMessages = [
      "לא ניתן לדחות תחרות שכבר התחילה.",
      "מספר ימי הדחייה חייב להיות גדול מאפס.",
      "לא ניתן לדחות את התחרות כל עוד קיימות בקשות שינוי או ביטול שממתינות לטיפול.",
      "לא ניתן לדחות את התחרות משום שקיימים מקצים או זמני פייד־טיים מחוץ לטווח התקין.",
      "לא ניתן לדחות את התחרות משום שהדחייה תיצור חפיפה בהזמנת תא של אחד הסוסים.",
    ];

    for (var i = 0; i < conflictMessages.length; i++) {
      var error = httpError(conflictMessages[i]);
      expect(getErrorMessageUtil(error, RESCHEDULE_GENERIC_ERROR)).toBe(
        conflictMessages[i],
      );
    }
  });

  it("falls back to the fixed generic failure message when the server sends no usable text", function () {
    expect(getErrorMessageUtil({}, RESCHEDULE_GENERIC_ERROR)).toBe(
      RESCHEDULE_GENERIC_ERROR,
    );
  });
});

describe("useCompetitionDetailsStep exposes the CAP-6 confirm-dialog contract", function () {
  function buildStep(onShowToast) {
    return useCompetitionDetailsStep({
      currentRanchId: RANCH_ID,
      isEdit: false,
      competitionIdFromRoute: null,
      onNavigateToEdit: function () {},
      onShowToast: onShowToast || function () {},
    });
  }

  it("returns dateChangeConfirm state and confirm/cancel handlers instead of the removed modal fields", function () {
    var step = buildStep();

    expect(step.dateChangeConfirm).toEqual({
      isOpen: false,
      title: "",
      message: "",
    });
    expect(typeof step.confirmDateChange).toBe("function");
    expect(typeof step.cancelDateChangeConfirm).toBe("function");
    expect(typeof step.dateChangeConfirmLabel).toBe("string");
    expect(typeof step.dateChangeCancelLabel).toBe("string");

    // The removed modal's fields must not linger on the returned object.
    expect(step).not.toHaveProperty("rescheduleModalOpen");
    expect(step).not.toHaveProperty("openRescheduleModal");
    expect(step).not.toHaveProperty("closeRescheduleModal");
    expect(step).not.toHaveProperty("handleReschedule");
  });

  it("confirmDateChange/cancelDateChangeConfirm do not throw with no pending confirmation", function () {
    var step = buildStep();

    expect(function () {
      step.confirmDateChange();
    }).not.toThrow();

    expect(function () {
      step.cancelDateChangeConfirm();
    }).not.toThrow();
  });
});

describe("saveDetails — create mode can never reach the date-change branch", function () {
  var onShowToast;

  beforeEach(function () {
    vi.clearAllMocks();
    onShowToast = vi.fn();
  });

  it("never calls rescheduleCompetition without a saved competitionId", async function () {
    var step = useCompetitionDetailsStep({
      currentRanchId: RANCH_ID,
      isEdit: false,
      competitionIdFromRoute: null,
      onNavigateToEdit: function () {},
      onShowToast: onShowToast,
    });

    var result = await step.saveDetails("draft", true);

    expect(result.success).toBe(false);
    expect(rescheduleCompetition).not.toHaveBeenCalled();
  });

  it("is a no-op without a current ranch", async function () {
    var step = useCompetitionDetailsStep({
      currentRanchId: null,
      isEdit: false,
      competitionIdFromRoute: null,
      onNavigateToEdit: function () {},
      onShowToast: onShowToast,
    });

    var result = await step.saveDetails("draft", true);

    expect(result.success).toBe(false);
    expect(rescheduleCompetition).not.toHaveBeenCalled();
    expect(onShowToast).toHaveBeenCalledWith("error", "לא נבחרה חווה פעילה");
  });
});

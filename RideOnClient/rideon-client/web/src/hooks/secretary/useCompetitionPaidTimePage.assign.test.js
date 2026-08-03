/* eslint-disable react-hooks/rules-of-hooks --
 * This file calls the hook outside React on purpose: the React hooks it uses are
 * stubbed below, so there is no renderer and the rule's premise does not hold.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Same harness as useCompetitionPaidTimePage.unassign.test.js: this repo has no
// DOM test environment and no React Testing Library, so the hook cannot be
// rendered. It only uses useState / useEffect / useMemo, so those are stubbed
// and the hook is invoked directly to get a real handleAssignRequest closure out
// of the real module. No production file is reshaped for testing.
vi.mock("react", function () {
  return {
    useState: function (initial) {
      return [initial, function () {}];
    },
    useEffect: function () {},
    useMemo: function (factory) {
      return factory();
    },
  };
});

vi.mock("../../services/paidTimeRequestService", function () {
  return {
    getPaidTimeRequestsForAssignment: vi.fn().mockResolvedValue({ data: [] }),
    assignPaidTimeRequest: vi.fn().mockResolvedValue({ data: null }),
    unassignPaidTimeRequest: vi.fn().mockResolvedValue({ data: null }),
  };
});

vi.mock("../../services/paidTimeSlotInCompetitionService", function () {
  return {
    getPaidTimeSlotsByCompetitionId: vi.fn().mockResolvedValue({ data: [] }),
    getAllPaidTimeBaseSlots: vi.fn().mockResolvedValue({ data: [] }),
    createPaidTimeSlotInCompetition: vi.fn().mockResolvedValue({ data: null }),
    updatePaidTimeSlotInCompetition: vi.fn().mockResolvedValue({ data: null }),
    deletePaidTimeSlotInCompetition: vi.fn().mockResolvedValue({ data: null }),
  };
});

vi.mock("../../services/arenaService", function () {
  return { getArenasByRanchId: vi.fn().mockResolvedValue({ data: [] }) };
});

vi.mock("../../services/competitionService", function () {
  return { getCompetitionById: vi.fn().mockResolvedValue({ data: {} }) };
});

// competitionForm.utils is deliberately NOT mocked: the real getErrorMessage is
// part of what these tests exercise.

import useCompetitionPaidTimePage from "./useCompetitionPaidTimePage";
import { assignPaidTimeRequest } from "../../services/paidTimeRequestService";
import { getPaidTimeSlotsByCompetitionId } from "../../services/paidTimeSlotInCompetitionService";

const GENERIC_MESSAGE = "אירעה שגיאה בשיבוץ בקשת פייד־טיים";
const COMPETITION_ID = 41;
const RANCH_ID = 7;
const REQUEST_ID = 9931;
const SLOT_ID = 412;
const ORDER = 3;

// Build an axios-style rejection for a given response body.
function httpError(data) {
  var err = new Error("Request failed with status code 400");
  err.response = { status: 400, data: data };
  return err;
}

function buildPage(onShowToast) {
  return useCompetitionPaidTimePage({
    competitionId: COMPETITION_ID,
    ranchId: RANCH_ID,
    onShowToast: onShowToast,
  });
}

describe("handleAssignRequest", function () {
  var onShowToast;

  beforeEach(function () {
    vi.clearAllMocks();
    getPaidTimeSlotsByCompetitionId.mockResolvedValue({ data: [] });
    assignPaidTimeRequest.mockResolvedValue({ data: null });
    onShowToast = vi.fn();
  });

  // ===== 10. success path is unchanged =====
  it("posts the assign, refreshes the board and shows the success toast", async function () {
    var page = buildPage(onShowToast);

    await page.handleAssignRequest(REQUEST_ID, SLOT_ID, ORDER);

    expect(assignPaidTimeRequest).toHaveBeenCalledTimes(1);
    expect(assignPaidTimeRequest).toHaveBeenCalledWith({
      ranchId: RANCH_ID,
      paidTimeRequestId: REQUEST_ID,
      assignedCompSlotId: SLOT_ID,
      assignedOrder: ORDER,
    });

    // loadSlots() still runs after a successful assign. (loadRequests()
    // self-skips because no slots are selected in this stubbed state - that is
    // its existing guard, not something this change touched.)
    expect(getPaidTimeSlotsByCompetitionId).toHaveBeenCalledWith(
      COMPETITION_ID,
      RANCH_ID,
    );

    expect(onShowToast).toHaveBeenCalledTimes(1);
    expect(onShowToast).toHaveBeenCalledWith("success", "שובץ בהצלחה");
  });

  // ===== 11. controlled server messages reach the secretary =====
  var controlledMessages = [
    // public.usp_assignpaidtimerequest
    "לא ניתן לשבץ בקשה שבוטלה",
    "לא ניתן לשבץ בקשה בסלוט שפורסם",
    "המקום 3 כבר תפוס על ידי רוח צפונית. יש לבחור מקום פנוי או לשחרר את השיבוץ הקיים",
    // public.usp_recalculatepaidtimeslotassignments
    "השיבוץ הידני יוצר חפיפה בתוך הסלוט",
    "אין מספיק זמן בסלוט להשלמת השיבוץ לפי סדר הכניסה הנוכחי",
    "השיבוץ הידני יוצר חפיפה בזמני המאמן",
    "השיבוץ הידני יוצר חפיפה בזמני הרוכב",
    "השיבוץ הידני יוצר חפיפה בזמני הסוס",
    "קיים יותר משיבוץ אחד באותו מיקום בסלוט",
  ];

  controlledMessages.forEach(function (message) {
    it('shows the controlled server message "' + message + '" as an error toast', async function () {
      // The server returns the allowlisted message as a bare JSON string.
      assignPaidTimeRequest.mockRejectedValue(httpError(message));

      var page = buildPage(onShowToast);

      await page.handleAssignRequest(REQUEST_ID, SLOT_ID, ORDER);

      expect(onShowToast).toHaveBeenCalledTimes(1);
      expect(onShowToast).toHaveBeenCalledWith("error", message);
    });
  });

  it("does not show a success toast when the server rejects", async function () {
    assignPaidTimeRequest.mockRejectedValue(
      httpError("השיבוץ הידני יוצר חפיפה בזמני הסוס"),
    );

    var page = buildPage(onShowToast);

    await page.handleAssignRequest(REQUEST_ID, SLOT_ID, ORDER);

    expect(onShowToast).not.toHaveBeenCalledWith("success", "שובץ בהצלחה");
  });

  // ===== 12. the server's generic message is displayed as-is =====
  it("shows the server's generic assign message", async function () {
    assignPaidTimeRequest.mockRejectedValue(httpError(GENERIC_MESSAGE));

    var page = buildPage(onShowToast);

    await page.handleAssignRequest(REQUEST_ID, SLOT_ID, ORDER);

    expect(onShowToast).toHaveBeenCalledWith("error", GENERIC_MESSAGE);
  });

  it("also reads the message out of a { message } body shape", async function () {
    assignPaidTimeRequest.mockRejectedValue(
      httpError({ message: "קיים יותר משיבוץ אחד באותו מיקום בסלוט" }),
    );

    var page = buildPage(onShowToast);

    await page.handleAssignRequest(REQUEST_ID, SLOT_ID, ORDER);

    expect(onShowToast).toHaveBeenCalledWith(
      "error",
      "קיים יותר משיבוץ אחד באותו מיקום בסלוט",
    );
  });

  // ===== 13. no usable server text =====
  //
  // getErrorMessage's precedence is: response body text -> error.message ->
  // fallback. So the Hebrew fallback fires only when the rejection carries no
  // usable text ANYWHERE. A real axios rejection always sets .message, so for
  // those the second rung wins. Both rungs are pinned below; this is
  // pre-existing shared-util behavior (identical to the unassign path) and
  // changing it is out of scope for this fix.
  it("falls back to the generic Hebrew message when the error carries no text at all", async function () {
    assignPaidTimeRequest.mockRejectedValue({});

    var page = buildPage(onShowToast);

    await page.handleAssignRequest(REQUEST_ID, SLOT_ID, ORDER);

    expect(onShowToast).toHaveBeenCalledWith("error", GENERIC_MESSAGE);
  });

  it("falls back to the generic Hebrew message for an empty-message error with an empty body", async function () {
    var err = new Error("");
    err.response = { status: 400, data: {} };

    assignPaidTimeRequest.mockRejectedValue(err);

    var page = buildPage(onShowToast);

    await page.handleAssignRequest(REQUEST_ID, SLOT_ID, ORDER);

    expect(onShowToast).toHaveBeenCalledWith("error", GENERIC_MESSAGE);
  });

  it("shows axios' own text when the body has no usable message (documented precedence)", async function () {
    assignPaidTimeRequest.mockRejectedValue(httpError({}));

    var page = buildPage(onShowToast);

    await page.handleAssignRequest(REQUEST_ID, SLOT_ID, ORDER);

    expect(onShowToast).toHaveBeenCalledWith(
      "error",
      "Request failed with status code 400",
    );
  });

  it("surfaces a bare transport failure as-is (documented precedence)", async function () {
    assignPaidTimeRequest.mockRejectedValue(new Error("Network Error"));

    var page = buildPage(onShowToast);

    await page.handleAssignRequest(REQUEST_ID, SLOT_ID, ORDER);

    expect(onShowToast).toHaveBeenCalledWith("error", "Network Error");
  });

  // ===== 14. a failed assign does not refresh the board =====
  it("does not reload requests or slots when the assign fails", async function () {
    assignPaidTimeRequest.mockRejectedValue(
      httpError("לא ניתן לשבץ בקשה בסלוט שפורסם"),
    );

    var page = buildPage(onShowToast);

    await page.handleAssignRequest(REQUEST_ID, SLOT_ID, ORDER);

    // The mount-time loads do not fire (useEffect is stubbed), so any call to
    // getPaidTimeSlotsByCompetitionId could only have come from loadSlots() -
    // which sits after the failing await and must therefore not have run.
    expect(getPaidTimeSlotsByCompetitionId).not.toHaveBeenCalled();
    expect(onShowToast).toHaveBeenCalledTimes(1);
  });

  it("never throws when no toast handler was supplied", async function () {
    assignPaidTimeRequest.mockRejectedValue(
      httpError("השיבוץ הידני יוצר חפיפה בזמני הרוכב"),
    );

    var page = useCompetitionPaidTimePage({
      competitionId: COMPETITION_ID,
      ranchId: RANCH_ID,
      onShowToast: undefined,
    });

    await expect(
      page.handleAssignRequest(REQUEST_ID, SLOT_ID, ORDER),
    ).resolves.toBeUndefined();
  });
});

// ===== 15. the drop handler itself =====
describe("handleDragEnd", function () {
  var onShowToast;

  function dragEvent() {
    return {
      active: { data: { current: { request: { paidTimeRequestId: REQUEST_ID } } } },
      over: {
        data: { current: { timeCell: { slotId: SLOT_ID, assignedOrder: ORDER } } },
      },
    };
  }

  beforeEach(function () {
    vi.clearAllMocks();
    getPaidTimeSlotsByCompetitionId.mockResolvedValue({ data: [] });
    onShowToast = vi.fn();
  });

  it("passes the dropped request, slot and order through to the assign call", async function () {
    assignPaidTimeRequest.mockResolvedValue({ data: null });

    var page = buildPage(onShowToast);

    await page.handleDragEnd(dragEvent());

    expect(assignPaidTimeRequest).toHaveBeenCalledWith({
      ranchId: RANCH_ID,
      paidTimeRequestId: REQUEST_ID,
      assignedCompSlotId: SLOT_ID,
      assignedOrder: ORDER,
    });
  });

  it("does not reject on a failed drop, so dnd-kit gets no unhandled rejection", async function () {
    assignPaidTimeRequest.mockRejectedValue(
      httpError("השיבוץ הידני יוצר חפיפה בזמני המאמן"),
    );

    var page = buildPage(onShowToast);

    // dnd-kit does not await onDragEnd; before the catch was added this promise
    // rejected and the secretary saw nothing at all.
    await expect(page.handleDragEnd(dragEvent())).resolves.toBeUndefined();

    expect(onShowToast).toHaveBeenCalledWith(
      "error",
      "השיבוץ הידני יוצר חפיפה בזמני המאמן",
    );
  });

  it("still clears the drag overlay when the assign fails", async function () {
    assignPaidTimeRequest.mockRejectedValue(
      httpError("השיבוץ הידני יוצר חפיפה בזמני המאמן"),
    );

    var page = buildPage(onShowToast);

    await page.handleDragEnd(dragEvent());

    // setActiveRequest(null) runs before the assign call and is untouched by
    // this fix. With the stubbed useState the state never advances, so what is
    // asserted here is that a failed drop leaves activeRequest at its cleared
    // value rather than at a dragged request.
    expect(page.activeRequest).toBeNull();
  });

  // ===== CAP-4: blocked occupied-target drops =====
  it("blocks a drop onto an occupied cell: shows the reject toast and does not call assign", async function () {
    var page = buildPage(onShowToast);

    var event = {
      active: {
        data: { current: { request: { paidTimeRequestId: REQUEST_ID } } },
      },
      over: {
        data: {
          current: {
            timeCell: {
              slotId: SLOT_ID,
              assignedOrder: ORDER,
              assignment: { paidTimeRequestId: 555 },
            },
          },
        },
      },
    };

    await page.handleDragEnd(event);

    expect(assignPaidTimeRequest).not.toHaveBeenCalled();
    expect(onShowToast).toHaveBeenCalledTimes(1);
    expect(onShowToast).toHaveBeenCalledWith("error", "המשבצת כבר תפוסה");
  });

  it("stays silent on a same-source/same-position no-op drop", async function () {
    var page = buildPage(onShowToast);

    var event = {
      active: {
        data: {
          current: {
            request: { paidTimeRequestId: REQUEST_ID },
            sourceTimeCell: { slotId: SLOT_ID, assignedOrder: ORDER },
          },
        },
      },
      over: {
        data: {
          current: { timeCell: { slotId: SLOT_ID, assignedOrder: ORDER } },
        },
      },
    };

    await page.handleDragEnd(event);

    expect(assignPaidTimeRequest).not.toHaveBeenCalled();
    expect(onShowToast).not.toHaveBeenCalled();
  });
});

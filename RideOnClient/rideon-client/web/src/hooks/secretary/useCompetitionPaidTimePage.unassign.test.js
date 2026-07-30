/* eslint-disable react-hooks/rules-of-hooks --
 * This file calls the hook outside React on purpose: the React hooks it uses are
 * stubbed below, so there is no renderer and the rule's premise does not hold.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// This repo has no DOM test environment and no React Testing Library (see the
// web package.json devDependencies), so the hook cannot be rendered. The hooks
// it actually uses are only useState / useEffect / useMemo, so they are stubbed
// here and the hook is invoked directly to get a real handleUnassignRequest
// closure out of the real module. No production file is reshaped for testing.
//
// - useState  -> [initialValue, noop setter]  (state never advances; every
//                assertion below is about calls made, not about re-renders)
// - useEffect -> noop                         (the mount-time loads do not fire)
// - useMemo   -> runs the factory once
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
import { unassignPaidTimeRequest } from "../../services/paidTimeRequestService";
import { getPaidTimeSlotsByCompetitionId } from "../../services/paidTimeSlotInCompetitionService";

const GENERIC_MESSAGE = "אירעה שגיאה בביטול שיבוץ בקשת פייד־טיים";
const COMPETITION_ID = 41;
const RANCH_ID = 7;
const REQUEST_ID = 9931;

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

describe("handleUnassignRequest", function () {
  var onShowToast;

  beforeEach(function () {
    vi.clearAllMocks();
    getPaidTimeSlotsByCompetitionId.mockResolvedValue({ data: [] });
    onShowToast = vi.fn();
  });

  // ===== 7. success path is unchanged =====
  it("posts the unassign, refreshes the board and shows the success toast", async function () {
    unassignPaidTimeRequest.mockResolvedValue({ data: null });

    var page = buildPage(onShowToast);

    await page.handleUnassignRequest(REQUEST_ID);

    expect(unassignPaidTimeRequest).toHaveBeenCalledTimes(1);
    expect(unassignPaidTimeRequest).toHaveBeenCalledWith({
      ranchId: RANCH_ID,
      paidTimeRequestId: REQUEST_ID,
    });

    // loadSlots() still runs after a successful unassign. (loadRequests()
    // self-skips because no slots are selected in this stubbed state - that is
    // its existing guard, not something this change touched.)
    expect(getPaidTimeSlotsByCompetitionId).toHaveBeenCalledWith(
      COMPETITION_ID,
      RANCH_ID,
    );

    expect(onShowToast).toHaveBeenCalledTimes(1);
    expect(onShowToast).toHaveBeenCalledWith("success", "הוסר שיבוץ");
  });

  // ===== 8. controlled server message reaches the secretary =====
  var controlledMessages = [
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
      unassignPaidTimeRequest.mockRejectedValue(httpError(message));

      var page = buildPage(onShowToast);

      await page.handleUnassignRequest(REQUEST_ID);

      expect(onShowToast).toHaveBeenCalledTimes(1);
      expect(onShowToast).toHaveBeenCalledWith("error", message);
    });
  });

  it("does not reject, so the click handler no longer produces an unhandled rejection", async function () {
    unassignPaidTimeRequest.mockRejectedValue(
      httpError("השיבוץ הידני יוצר חפיפה בזמני המאמן"),
    );

    var page = buildPage(onShowToast);

    await expect(page.handleUnassignRequest(REQUEST_ID)).resolves.toBeUndefined();
  });

  it("does not show a success toast when the server rejects", async function () {
    unassignPaidTimeRequest.mockRejectedValue(
      httpError("השיבוץ הידני יוצר חפיפה בזמני הסוס"),
    );

    var page = buildPage(onShowToast);

    await page.handleUnassignRequest(REQUEST_ID);

    expect(onShowToast).not.toHaveBeenCalledWith("success", "הוסר שיבוץ");
  });

  it("also reads the message out of a { message } body shape", async function () {
    unassignPaidTimeRequest.mockRejectedValue(
      httpError({ message: "קיים יותר משיבוץ אחד באותו מיקום בסלוט" }),
    );

    var page = buildPage(onShowToast);

    await page.handleUnassignRequest(REQUEST_ID);

    expect(onShowToast).toHaveBeenCalledWith(
      "error",
      "קיים יותר משיבוץ אחד באותו מיקום בסלוט",
    );
  });

  // ===== 9. no usable server text =====
  //
  // getErrorMessage's precedence is: response body text -> error.message ->
  // fallback. So the Hebrew fallback fires only when the rejection carries no
  // usable text ANYWHERE. A real axios rejection always sets .message, so for
  // those the second rung wins. Both rungs are pinned below; this is
  // pre-existing shared-util behavior that every other catch in this hook
  // already has, and changing it is out of scope for this fix.
  it("falls back to the generic Hebrew message when the error carries no text at all", async function () {
    unassignPaidTimeRequest.mockRejectedValue({});

    var page = buildPage(onShowToast);

    await page.handleUnassignRequest(REQUEST_ID);

    expect(onShowToast).toHaveBeenCalledWith("error", GENERIC_MESSAGE);
  });

  it("falls back to the generic Hebrew message for an empty-message error with an empty body", async function () {
    var err = new Error("");
    err.response = { status: 400, data: {} };

    unassignPaidTimeRequest.mockRejectedValue(err);

    var page = buildPage(onShowToast);

    await page.handleUnassignRequest(REQUEST_ID);

    expect(onShowToast).toHaveBeenCalledWith("error", GENERIC_MESSAGE);
  });

  it("shows axios' own text when the body has no usable message (documented precedence)", async function () {
    unassignPaidTimeRequest.mockRejectedValue(httpError({}));

    var page = buildPage(onShowToast);

    await page.handleUnassignRequest(REQUEST_ID);

    expect(onShowToast).toHaveBeenCalledWith(
      "error",
      "Request failed with status code 400",
    );
  });

  it("surfaces a bare transport failure as-is (documented precedence)", async function () {
    unassignPaidTimeRequest.mockRejectedValue(new Error("Network Error"));

    var page = buildPage(onShowToast);

    await page.handleUnassignRequest(REQUEST_ID);

    expect(onShowToast).toHaveBeenCalledWith("error", "Network Error");
  });

  it("never throws when no toast handler was supplied", async function () {
    unassignPaidTimeRequest.mockRejectedValue(
      httpError("השיבוץ הידני יוצר חפיפה בזמני הרוכב"),
    );

    var page = useCompetitionPaidTimePage({
      competitionId: COMPETITION_ID,
      ranchId: RANCH_ID,
      onShowToast: undefined,
    });

    await expect(page.handleUnassignRequest(REQUEST_ID)).resolves.toBeUndefined();
  });
});

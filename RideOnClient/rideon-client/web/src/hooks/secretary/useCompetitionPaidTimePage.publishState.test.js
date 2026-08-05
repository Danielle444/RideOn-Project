/* eslint-disable react-hooks/rules-of-hooks --
 * This file calls the hook outside React on purpose: the React hooks it uses are
 * stubbed below, so there is no renderer and the rule's premise does not hold.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Same harness as useCompetitionPaidTimePage.assign.test.js / .unassign.test.js.
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
    setPaidTimeSlotPublishState: vi.fn().mockResolvedValue({ data: null }),
    deletePaidTimeSlotInCompetition: vi.fn().mockResolvedValue({ data: null }),
  };
});

vi.mock("../../services/arenaService", function () {
  return { getArenasByRanchId: vi.fn().mockResolvedValue({ data: [] }) };
});

vi.mock("../../services/competitionService", function () {
  return { getCompetitionById: vi.fn().mockResolvedValue({ data: {} }) };
});

import useCompetitionPaidTimePage from "./useCompetitionPaidTimePage";
import {
  getPaidTimeSlotsByCompetitionId,
  setPaidTimeSlotPublishState,
} from "../../services/paidTimeSlotInCompetitionService";

const COMPETITION_ID = 41;
const RANCH_ID = 7;
const SLOT = { paidTimeSlotInCompId: 122, isPublished: false };

function buildPage(onShowToast) {
  return useCompetitionPaidTimePage({
    competitionId: COMPETITION_ID,
    ranchId: RANCH_ID,
    onShowToast: onShowToast,
  });
}

describe("handleSetPublishState", function () {
  var onShowToast;

  beforeEach(function () {
    vi.clearAllMocks();
    getPaidTimeSlotsByCompetitionId.mockResolvedValue({ data: [] });
    setPaidTimeSlotPublishState.mockResolvedValue({ data: null });
    onShowToast = vi.fn();
  });

  it("calls the publish endpoint with isPublished:true for a publish action", async function () {
    var page = buildPage(onShowToast);

    await page.handleSetPublishState(SLOT, true);

    expect(setPaidTimeSlotPublishState).toHaveBeenCalledTimes(1);
    expect(setPaidTimeSlotPublishState).toHaveBeenCalledWith(122, {
      hostRanchId: RANCH_ID,
      isPublished: true,
    });
  });

  it("calls the publish endpoint with isPublished:false for an unpublish action", async function () {
    var page = buildPage(onShowToast);

    await page.handleSetPublishState(SLOT, false);

    expect(setPaidTimeSlotPublishState).toHaveBeenCalledWith(122, {
      hostRanchId: RANCH_ID,
      isPublished: false,
    });
  });

  it("refreshes the slot list through the existing loadSlots path after a successful mutation", async function () {
    var page = buildPage(onShowToast);

    await page.handleSetPublishState(SLOT, true);

    // The mount-time load does not fire (useEffect is stubbed), so this call
    // can only have come from loadSlots() inside handleSetPublishState.
    expect(getPaidTimeSlotsByCompetitionId).toHaveBeenCalledWith(
      COMPETITION_ID,
      RANCH_ID,
    );
  });

  it("does not refresh the slot list when the mutation fails", async function () {
    setPaidTimeSlotPublishState.mockRejectedValue(new Error("boom"));

    var page = buildPage(onShowToast);

    await page.handleSetPublishState(SLOT, true);

    expect(getPaidTimeSlotsByCompetitionId).not.toHaveBeenCalled();
  });

  it("shows an error toast on failure without inventing new Hebrew text", async function () {
    var err = new Error("Network Error");
    setPaidTimeSlotPublishState.mockRejectedValue(err);

    var page = buildPage(onShowToast);

    await page.handleSetPublishState(SLOT, true);

    // getErrorMessage(err) with no fallback override: surfaces only text the
    // error itself carries, never a string authored specifically for this call.
    expect(onShowToast).toHaveBeenCalledWith("error", "Network Error");
  });

  it("never throws when no toast handler was supplied", async function () {
    setPaidTimeSlotPublishState.mockRejectedValue(new Error("boom"));

    var page = useCompetitionPaidTimePage({
      competitionId: COMPETITION_ID,
      ranchId: RANCH_ID,
      onShowToast: undefined,
    });

    await expect(
      page.handleSetPublishState(SLOT, true),
    ).resolves.toBeUndefined();
  });
});

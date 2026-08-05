/* eslint-disable react-hooks/rules-of-hooks --
 * Same harness as useCompetitionPaidTimePage.assign.test.js: this repo has no
 * DOM test environment and no React Testing Library, so the hook cannot be
 * rendered. React's useState/useEffect/useCallback/useMemo are stubbed and the
 * hook is invoked directly to get a real handleCreateStallBookingForPayer
 * closure out of the real module. No production file is reshaped for testing.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("react", function () {
  return {
    useState: function (initial) {
      return [initial, function () {}];
    },
    useEffect: function () {},
    useCallback: function (fn) {
      return fn;
    },
    useMemo: function (factory) {
      return factory();
    },
  };
});

vi.mock("../../services/stallMapService", function () {
  return {
    getCompounds: vi.fn().mockResolvedValue({ data: [] }),
    saveLayout: vi.fn().mockResolvedValue({ data: null }),
    getAssignmentOverview: vi.fn().mockResolvedValue({ data: [] }),
    getAssignments: vi.fn().mockResolvedValue({ data: [] }),
    assignStallBooking: vi.fn().mockResolvedValue({ data: null }),
    unassignStallBooking: vi.fn().mockResolvedValue({ data: null }),
    getPublishStatus: vi.fn().mockResolvedValue({ data: null }),
    publishStallMap: vi.fn().mockResolvedValue({ data: null }),
    unpublishStallMap: vi.fn().mockResolvedValue({ data: null }),
  };
});

vi.mock("../../services/stallBookingsService", function () {
  return {
    secretaryDeleteStallBooking: vi.fn().mockResolvedValue({ data: null }),
    secretaryUpdateStallBooking: vi.fn().mockResolvedValue({ data: null }),
    secretaryCreateStallBookingForPayer: vi
      .fn()
      .mockResolvedValue({ data: { stallBookingId: 501 } }),
  };
});

import useCompetitionStallsPage from "./useCompetitionStallsPage";
import {
  getAssignmentOverview,
  getAssignments,
} from "../../services/stallMapService";
import { secretaryCreateStallBookingForPayer } from "../../services/stallBookingsService";

const COMPETITION_ID = 78;
const RANCH_ID = 11;

function buildPage() {
  return useCompetitionStallsPage(COMPETITION_ID, RANCH_ID);
}

describe("handleCreateStallBookingForPayer", function () {
  beforeEach(function () {
    vi.clearAllMocks();
    getAssignmentOverview.mockResolvedValue({ data: [] });
    getAssignments.mockResolvedValue({ data: [] });
    secretaryCreateStallBookingForPayer.mockResolvedValue({
      data: { stallBookingId: 501 },
    });
  });

  // Ranch-model fix: the server derives the host ranch from competitionId and
  // never reads a client-supplied ranchId for this endpoint (confirmed via
  // StallBookingsController.SecretaryCreateStallBookingForPayer -- the field
  // is kept on the DTO only for client backward compatibility and is unused
  // server-side), so it must not be sent.
  it("does not send ranchId for a horse stall booking", async function () {
    const page = buildPage();

    await page.handleCreateStallBookingForPayer({
      payerPersonId: 5,
      horseId: 9,
      startDate: "2026-08-10",
      endDate: "2026-08-12",
      isForTack: false,
      productId: 3,
      notes: null,
      requestingRanchId: null,
    });

    expect(secretaryCreateStallBookingForPayer).toHaveBeenCalledTimes(1);
    const sentPayload = secretaryCreateStallBookingForPayer.mock.calls[0][0];
    expect(sentPayload).not.toHaveProperty("ranchId");
    expect(sentPayload.competitionId).toBe(COMPETITION_ID);
    expect(sentPayload.horseId).toBe(9);
  });

  // requestingRanchId is the guest/home ranch for a tack booking -- there is
  // no horse for the server to derive it from, so it must be forwarded
  // explicitly from the modal's selection.
  it("forwards requestingRanchId for a tack stall booking", async function () {
    const page = buildPage();

    await page.handleCreateStallBookingForPayer({
      payerPersonId: 5,
      horseId: null,
      startDate: "2026-08-10",
      endDate: "2026-08-12",
      isForTack: true,
      productId: 3,
      notes: null,
      requestingRanchId: 49,
    });

    expect(secretaryCreateStallBookingForPayer).toHaveBeenCalledTimes(1);
    const sentPayload = secretaryCreateStallBookingForPayer.mock.calls[0][0];
    expect(sentPayload).not.toHaveProperty("ranchId");
    expect(sentPayload.requestingRanchId).toBe(49);
    expect(sentPayload.isForTack).toBe(true);
  });

  it("refreshes the overview and assignments after a successful create", async function () {
    const page = buildPage();

    await page.handleCreateStallBookingForPayer({
      payerPersonId: 5,
      horseId: 9,
      startDate: "2026-08-10",
      endDate: "2026-08-12",
      isForTack: false,
      productId: 3,
      notes: null,
      requestingRanchId: null,
    });

    expect(getAssignmentOverview).toHaveBeenCalledWith(
      COMPETITION_ID,
      RANCH_ID,
    );
    expect(getAssignments).toHaveBeenCalledWith(COMPETITION_ID, RANCH_ID);
  });
});

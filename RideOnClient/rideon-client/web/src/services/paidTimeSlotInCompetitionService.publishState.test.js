import { describe, it, expect, vi, beforeEach } from "vitest";

// Service-layer contract test for CAP-4: proves the exact HTTP verb, route
// and request-body shape sent to the new publish-state endpoint, independent
// of any hook/page wiring. Mirrors the mocking style used for React/services
// in the hook-level tests in this repo (e.g. useCompetitionPaidTimePage.assign.test.js),
// applied here to axiosInstance directly since this is a service-only test.
vi.mock("./axiosInstance", function () {
  return {
    default: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    },
  };
});

vi.mock("./storageService", function () {
  return { getToken: vi.fn().mockReturnValue("test-token") };
});

import axios from "./axiosInstance";
import { setPaidTimeSlotPublishState } from "./paidTimeSlotInCompetitionService";

describe("setPaidTimeSlotPublishState", function () {
  beforeEach(function () {
    vi.clearAllMocks();
    axios.patch.mockResolvedValue({ data: {} });
  });

  it("uses PATCH", async function () {
    await setPaidTimeSlotPublishState(5, { hostRanchId: 11, isPublished: true });

    expect(axios.patch).toHaveBeenCalledTimes(1);
    expect(axios.get).not.toHaveBeenCalled();
    expect(axios.post).not.toHaveBeenCalled();
    expect(axios.put).not.toHaveBeenCalled();
  });

  it("hits the exact publish-state route for the given slot id", async function () {
    await setPaidTimeSlotPublishState(5, { hostRanchId: 11, isPublished: true });

    var url = axios.patch.mock.calls[0][0];

    expect(url).toMatch(/\/PaidTimeSlotsInCompetition\/5\/publish-state$/);
  });

  it("sends a body containing only hostRanchId and isPublished - no slot id, no competition id, no extra fields", async function () {
    await setPaidTimeSlotPublishState(5, { hostRanchId: 11, isPublished: true });

    var body = axios.patch.mock.calls[0][1];

    expect(Object.keys(body).sort()).toEqual(["hostRanchId", "isPublished"]);
    expect(body).toEqual({ hostRanchId: 11, isPublished: true });
    expect(body.paidTimeSlotInCompId).toBeUndefined();
    expect(body.PaidTimeSlotInCompId).toBeUndefined();
    expect(body.competitionId).toBeUndefined();
    expect(body.CompetitionId).toBeUndefined();
  });

  it("passes isPublished:false through unchanged for an unpublish call", async function () {
    await setPaidTimeSlotPublishState(5, { hostRanchId: 11, isPublished: false });

    var body = axios.patch.mock.calls[0][1];

    expect(body).toEqual({ hostRanchId: 11, isPublished: false });
  });
});

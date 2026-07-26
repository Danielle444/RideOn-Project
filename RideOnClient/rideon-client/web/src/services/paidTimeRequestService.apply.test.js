import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the shared axiosInstance BEFORE importing the service. Each HTTP verb is
// a spy so we can assert exactly which one Apply uses and with what payload.
vi.mock("./axiosInstance", function () {
  return {
    default: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    },
  };
});

import axios from "./axiosInstance";
import { applyAutoSchedule } from "./paidTimeRequestService";

describe("applyAutoSchedule service function (Stage D2)", function () {
  beforeEach(function () {
    axios.get.mockReset();
    axios.post.mockReset();
    axios.put.mockReset();
    axios.delete.mockReset();
  });

  it("issues a POST to the auto-schedule/apply endpoint", function () {
    axios.post.mockResolvedValue({ data: {} });

    applyAutoSchedule(41, 7, "a".repeat(64));

    expect(axios.post).toHaveBeenCalledTimes(1);
    var call = axios.post.mock.calls[0];
    expect(call[0]).toContain("/PaidTimeRequests/auto-schedule/apply");
  });

  it("sends competitionId and ranchId as query params", function () {
    axios.post.mockResolvedValue({ data: {} });

    applyAutoSchedule(41, 7, "a".repeat(64));

    var call = axios.post.mock.calls[0];
    expect(call[2]).toEqual({ params: { competitionId: 41, ranchId: 7 } });
  });

  it("sends a body containing ONLY the fingerprint", function () {
    axios.post.mockResolvedValue({ data: {} });

    var fingerprint = "b".repeat(64);
    applyAutoSchedule(41, 7, fingerprint);

    var call = axios.post.mock.calls[0];
    var body = call[1];

    // Exactly one key, and it is the fingerprint.
    expect(body).toEqual({ fingerprint: fingerprint });
    expect(Object.keys(body)).toEqual(["fingerprint"]);
  });

  it("never sends assignments, a proposal, ids, times, orders, or generatedAt", function () {
    axios.post.mockResolvedValue({ data: {} });

    applyAutoSchedule(41, 7, "c".repeat(64));

    var body = axios.post.mock.calls[0][1];

    expect(body).not.toHaveProperty("assignments");
    expect(body).not.toHaveProperty("scheduledItems");
    expect(body).not.toHaveProperty("proposal");
    expect(body).not.toHaveProperty("paidTimeRequestId");
    expect(body).not.toHaveProperty("assignedCompSlotId");
    expect(body).not.toHaveProperty("assignedStartTime");
    expect(body).not.toHaveProperty("assignedOrder");
    expect(body).not.toHaveProperty("status");
    expect(body).not.toHaveProperty("generatedAt");
  });

  it("does not call the old ungated /auto-schedule endpoint (nor assign/unassign)", function () {
    axios.post.mockResolvedValue({ data: {} });

    applyAutoSchedule(41, 7, "d".repeat(64));

    expect(axios.get).not.toHaveBeenCalled();
    expect(axios.put).not.toHaveBeenCalled();
    expect(axios.delete).not.toHaveBeenCalled();

    var url = axios.post.mock.calls[0][0];
    // The Apply URL ends in /apply - it must not be the bare ungated endpoint,
    // nor the preview/assign/unassign endpoints.
    expect(url).toMatch(/\/auto-schedule\/apply$/);
    expect(url).not.toContain("/auto-schedule/preview");
    expect(url).not.toContain("/assign");
    expect(url).not.toContain("/unassign");
  });

  it("returns the axios promise (existing service convention)", async function () {
    var response = { data: { scheduledCount: 3, unscheduledCount: 1 } };
    axios.post.mockResolvedValue(response);

    var returned = await applyAutoSchedule(41, 7, "e".repeat(64));
    expect(returned).toBe(response);
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the shared axiosInstance BEFORE importing the service. Each HTTP verb is
// a spy so we can assert exactly which one the Preview function uses.
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
import { previewAutoSchedule } from "./paidTimeRequestService";

describe("previewAutoSchedule service function", function () {
  beforeEach(function () {
    axios.get.mockReset();
    axios.post.mockReset();
    axios.put.mockReset();
    axios.delete.mockReset();
  });

  it("issues a POST to the auto-schedule/preview endpoint", function () {
    axios.post.mockResolvedValue({ data: {} });

    previewAutoSchedule(41, 7);

    expect(axios.post).toHaveBeenCalledTimes(1);
    var call = axios.post.mock.calls[0];
    expect(call[0]).toContain("/PaidTimeRequests/auto-schedule/preview");
  });

  it("sends competitionId and ranchId as query params and no business body", function () {
    axios.post.mockResolvedValue({ data: {} });

    previewAutoSchedule(41, 7);

    var call = axios.post.mock.calls[0];
    // Second arg is the request body: must be null (no business payload).
    expect(call[1]).toBeNull();
    // Third arg is the axios config with query params.
    expect(call[2]).toEqual({ params: { competitionId: 41, ranchId: 7 } });
  });

  it("returns the axios promise (existing service convention)", async function () {
    var response = { data: { fingerprint: "FP", scheduledItems: [] } };
    axios.post.mockResolvedValue(response);

    var returned = await previewAutoSchedule(41, 7);
    expect(returned).toBe(response);
  });

  it("does not invoke assign/unassign/transfer or any other verb", function () {
    axios.post.mockResolvedValue({ data: {} });

    previewAutoSchedule(41, 7);

    // Only POST is used; no GET/PUT/DELETE, and POST hit only the preview URL.
    expect(axios.get).not.toHaveBeenCalled();
    expect(axios.put).not.toHaveBeenCalled();
    expect(axios.delete).not.toHaveBeenCalled();

    var postUrls = axios.post.mock.calls.map(function (c) {
      return c[0];
    });
    postUrls.forEach(function (url) {
      expect(url).not.toContain("/assign");
      expect(url).not.toContain("/unassign");
      expect(url).not.toContain("/transfer-to-slot");
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

// Service-layer contract test for the health-certificate scope split: proves
// the web secretary read call moved to the new competition-wide /hosted route
// while the approve call stays exactly where it was. Mirrors the mocking
// style in paidTimeSlotInCompetitionService.publishState.test.js.
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
import {
  getHealthCertificates,
  approveHealthCertificate,
  rejectHealthCertificate,
} from "./healthCertificateService";

describe("getHealthCertificates", function () {
  beforeEach(function () {
    vi.clearAllMocks();
    axios.get.mockResolvedValue({ data: { data: [] } });
  });

  it("uses GET", async function () {
    await getHealthCertificates(78, 11);

    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(axios.post).not.toHaveBeenCalled();
  });

  it("hits the hosted, competition-wide route - not the plain RanchAdmin route", async function () {
    await getHealthCertificates(78, 11);

    var url = axios.get.mock.calls[0][0];

    expect(url).toMatch(/\/Horses\/health-certificates\/hosted$/);
    expect(url).not.toMatch(/\/Horses\/health-certificates$/);
  });

  it("sends competitionId and ranchId as query params, unchanged shape", async function () {
    await getHealthCertificates(78, 11);

    var config = axios.get.mock.calls[0][1];

    expect(config.params).toEqual({ competitionId: 78, ranchId: 11 });
  });
});

describe("approveHealthCertificate", function () {
  beforeEach(function () {
    vi.clearAllMocks();
    axios.post.mockResolvedValue({ data: {} });
  });

  it("still posts to the unchanged approve route", async function () {
    await approveHealthCertificate(4021, 78, 11);

    expect(axios.post).toHaveBeenCalledTimes(1);

    var url = axios.post.mock.calls[0][0];

    expect(url).toMatch(/\/Horses\/health-certificates\/approve$/);
  });

  it("keeps the existing request body shape", async function () {
    await approveHealthCertificate(4021, 78, 11);

    var body = axios.post.mock.calls[0][1];

    expect(body).toEqual({ horseId: 4021, competitionId: 78, ranchId: 11 });
  });
});

describe("rejectHealthCertificate", function () {
  beforeEach(function () {
    vi.clearAllMocks();
    axios.post.mockResolvedValue({ data: {} });
  });

  it("posts to the new reject route", async function () {
    await rejectHealthCertificate(4021, 78, 11, "התעודה לא קריאה");

    expect(axios.post).toHaveBeenCalledTimes(1);

    var url = axios.post.mock.calls[0][0];

    expect(url).toMatch(/\/Horses\/health-certificates\/reject$/);
  });

  it("sends horseId, competitionId, ranchId and reason, matching the finalized contract", async function () {
    await rejectHealthCertificate(4021, 78, 11, "התעודה לא קריאה");

    var body = axios.post.mock.calls[0][1];

    expect(body).toEqual({
      horseId: 4021,
      competitionId: 78,
      ranchId: 11,
      reason: "התעודה לא קריאה",
    });
  });
});

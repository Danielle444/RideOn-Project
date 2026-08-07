import { describe, it, expect, vi, beforeEach } from "vitest";

// Service-layer contract test for the health-certificate scope split: proves
// the mobile RanchAdmin routes did NOT change, only the server-side
// authorization behind them. Mirrors the mocking style used on the web side
// (paidTimeSlotInCompetitionService.publishState.test.js /
// healthCertificateService.hostedRoute.test.js).
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

import axios from "./axiosInstance";
import {
  getHealthCertificates,
  uploadHealthCertificateFile,
} from "./horsesService";

describe("getHealthCertificates", function () {
  beforeEach(function () {
    vi.clearAllMocks();
    axios.get.mockResolvedValue({ data: { data: [] } });
  });

  it("still hits the plain, ranch-scoped route - not /hosted", async function () {
    await getHealthCertificates(78, 11);

    expect(axios.get).toHaveBeenCalledTimes(1);

    var url = axios.get.mock.calls[0][0];

    expect(url).toBe("/Horses/health-certificates");
  });

  it("sends competitionId and ranchId as query params, unchanged shape", async function () {
    await getHealthCertificates(78, 11);

    var config = axios.get.mock.calls[0][1];

    expect(config.params).toEqual({ competitionId: 78, ranchId: 11 });
  });
});

describe("uploadHealthCertificateFile", function () {
  beforeEach(function () {
    vi.clearAllMocks();
    axios.post.mockResolvedValue({ data: {} });
  });

  it("still posts to the unchanged upload route", async function () {
    await uploadHealthCertificateFile({
      horseId: 261,
      competitionId: 78,
      ranchId: 11,
      file: { uri: "file:///cert.pdf", name: "cert.pdf", mimeType: "application/pdf" },
    });

    expect(axios.post).toHaveBeenCalledTimes(1);

    var url = axios.post.mock.calls[0][0];

    expect(url).toBe("/Horses/health-certificates/upload");
  });

  it("keeps the 60s per-request upload timeout", async function () {
    await uploadHealthCertificateFile({
      horseId: 261,
      competitionId: 78,
      ranchId: 11,
      file: { uri: "file:///cert.pdf", name: "cert.pdf", mimeType: "application/pdf" },
    });

    var config = axios.post.mock.calls[0][2];

    expect(config.timeout).toBe(60000);
  });
});

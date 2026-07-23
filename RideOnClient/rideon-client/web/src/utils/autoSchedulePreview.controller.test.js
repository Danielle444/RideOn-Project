import { describe, it, expect, vi } from "vitest";
import { fetchAutoSchedulePreview } from "./autoSchedulePreview.controller.js";

var SLOTS = [
  {
    paidTimeSlotInCompId: 1,
    slotDate: "2026-08-01T00:00:00",
    startTime: "08:00:00",
    endTime: "12:00:00",
    arenaName: "Arena 1",
  },
];

function fullResponse() {
  return {
    // Shape of a real axiosInstance response: the payload lives under .data.
    data: {
      fingerprint: "FP-1",
      generatedAt: "2026-07-23T09:00:00Z",
      scheduledCount: 1,
      frozenCount: 1,
      unscheduledCount: 1,
      scheduledItems: [
        {
          paidTimeRequestId: 100,
          horseName: "Comet",
          riderName: "Alice",
          coachName: "Bob",
          payerName: "Carol",
          requestedCompSlotId: 1,
          assignedCompSlotId: 1,
          assignedArenaName: "Arena 1",
          assignedStartTime: "2026-08-01T08:00:00",
          assignedOrder: 1,
          effectiveDurationMinutes: 11,
        },
      ],
      frozenItems: [
        {
          paidTimeRequestId: 200,
          horseName: "Thunder",
          assignedCompSlotId: 1,
          assignedArenaName: "Arena 1",
          assignedStartTime: "2026-08-01T08:11:00",
          assignedOrder: 2,
        },
      ],
      unscheduledItems: [
        {
          paidTimeRequestId: 300,
          horseName: "Blaze",
          requestedCompSlotId: 1,
          reason: "הסלוט המבוקש פורסם - שיבוץ ידני נדרש",
          reasonCode: "RequestedSlotPublished",
        },
      ],
    },
  };
}

describe("fetchAutoSchedulePreview - the Preview orchestration seam", function () {
  it("calls the injected preview function with competitionId and ranchId only", async function () {
    var previewFn = vi.fn().mockResolvedValue(fullResponse());

    await fetchAutoSchedulePreview(previewFn, 41, 7, SLOTS);

    expect(previewFn).toHaveBeenCalledTimes(1);
    expect(previewFn).toHaveBeenCalledWith(41, 7);
  });

  it("passes response.data (not the whole response) plus slots into the mapper", async function () {
    var previewFn = vi.fn().mockResolvedValue(fullResponse());

    var result = await fetchAutoSchedulePreview(previewFn, 41, 7, SLOTS);

    // If .data were not unwrapped, buckets would be empty. They are populated,
    // and the assigned slot label was resolved against the provided slots.
    expect(result.scheduled).toHaveLength(1);
    expect(result.scheduled[0].assignedSlotLabel).toContain("2026-08-01");
    expect(result.scheduled[0].assignedSlotLabel).toContain("08:00–12:00");
  });

  it("keeps scheduled, frozen, and unscheduled in separate buckets", async function () {
    var previewFn = vi.fn().mockResolvedValue(fullResponse());

    var result = await fetchAutoSchedulePreview(previewFn, 41, 7, SLOTS);

    expect(result.scheduled.map((x) => x.paidTimeRequestId)).toEqual([100]);
    expect(result.frozen.map((x) => x.paidTimeRequestId)).toEqual([200]);
    expect(result.unscheduled.map((x) => x.paidTimeRequestId)).toEqual([300]);
  });

  it("derives summary counts from the mapped arrays", async function () {
    var response = fullResponse();
    response.data.scheduledCount = 99; // deliberately wrong server counts
    response.data.frozenCount = 99;
    response.data.unscheduledCount = 99;
    var previewFn = vi.fn().mockResolvedValue(response);

    var result = await fetchAutoSchedulePreview(previewFn, 41, 7, SLOTS);

    expect(result.counts.scheduled).toBe(1);
    expect(result.counts.frozen).toBe(1);
    expect(result.counts.unscheduled).toBe(1);
  });

  it("produces the empty flag when the server returns no items", async function () {
    var previewFn = vi.fn().mockResolvedValue({ data: { fingerprint: "FP" } });

    var result = await fetchAutoSchedulePreview(previewFn, 41, 7, SLOTS);

    expect(result.isEmpty).toBe(true);
    expect(result.scheduled).toEqual([]);
  });

  it("propagates a rejected preview call so the caller can show an error state", async function () {
    var previewFn = vi.fn().mockRejectedValue(new Error("network down"));

    await expect(
      fetchAutoSchedulePreview(previewFn, 41, 7, SLOTS),
    ).rejects.toThrow("network down");
  });

  it("can be called again to recalculate, using the injected preview only", async function () {
    var previewFn = vi.fn().mockResolvedValue(fullResponse());

    await fetchAutoSchedulePreview(previewFn, 41, 7, SLOTS);
    await fetchAutoSchedulePreview(previewFn, 41, 7, SLOTS);

    // Recalculate == another read-only Preview call; nothing else is invoked
    // because the seam depends on the injected function and nothing more.
    expect(previewFn).toHaveBeenCalledTimes(2);
  });

  it("throws a clear error if no preview function is provided", async function () {
    await expect(
      fetchAutoSchedulePreview(undefined, 41, 7, SLOTS),
    ).rejects.toThrow("previewFn is required");
  });
});

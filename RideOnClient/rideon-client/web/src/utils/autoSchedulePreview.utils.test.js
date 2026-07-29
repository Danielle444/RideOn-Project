import { describe, it, expect } from "vitest";
import {
  mapAutoSchedulePreview,
  mapUnscheduledReason,
  normalizePlacementKind,
  placementKindLabel,
  formatOldToNew,
  REASON_CODE_LABELS,
  PLACEMENT_KIND_LABELS,
  ADJACENT_SLOTS_TRIED_LABEL,
  MOVEMENT_SEARCH_EXHAUSTED_LABEL,
  FROZEN_REASON_LABELS,
} from "./autoSchedulePreview.utils.js";

// Loaded slots as the paid-time page actually holds them (camelCase from the
// PaidTimeSlotsInCompetition endpoint). Slot 1 has an arena; slot 2 does not.
var SLOTS = [
  {
    paidTimeSlotInCompId: 1,
    slotDate: "2026-08-01T00:00:00",
    startTime: "08:00:00",
    endTime: "12:00:00",
    arenaName: "Arena 1",
  },
  {
    paidTimeSlotInCompId: 2,
    slotDate: "2026-08-02T00:00:00",
    startTime: "09:00:00",
    endTime: "11:00:00",
    arenaName: "",
  },
];

function baseResponse() {
  return {
    fingerprint: "FP-ABC",
    generatedAt: "2026-07-23T09:00:00Z",
    scheduledCount: 1,
    unscheduledCount: 1,
    frozenCount: 1,
    scheduledItems: [
      {
        paidTimeRequestId: 100,
        horseId: 501,
        horseName: "Comet",
        barnName: "South Barn",
        riderName: "Alice Rider",
        coachName: "Bob Coach",
        payerName: "Carol Payer",
        requestedCompSlotId: 2,
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
        barnName: "North Barn",
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
        barnName: "East Barn",
        riderName: "Dave Rider",
        coachName: "Eve Coach",
        requestedCompSlotId: 2,
        reason: "הסלוט המבוקש פורסם - שיבוץ ידני נדרש",
        reasonCode: "RequestedSlotPublished",
      },
    ],
  };
}

describe("mapAutoSchedulePreview - scheduled bucket", function () {
  it("maps names, requested/proposed slots, arena, start time and duration", function () {
    var result = mapAutoSchedulePreview(baseResponse(), SLOTS);

    expect(result.scheduled).toHaveLength(1);
    var s = result.scheduled[0];

    expect(s.paidTimeRequestId).toBe(100);
    expect(s.horse).toBe("Comet");
    expect(s.rider).toBe("Alice Rider");
    expect(s.coach).toBe("Bob Coach");
    expect(s.payer).toBe("Carol Payer");

    // Requested (slot 2) and proposed (slot 1) must stay distinct.
    expect(s.requestedSlotId).toBe(2);
    expect(s.requestedSlotLabel).toContain("2026-08-02");
    expect(s.assignedSlotId).toBe(1);
    expect(s.assignedSlotLabel).toContain("2026-08-01");
    expect(s.assignedSlotLabel).toContain("08:00–12:00");
    expect(s.requestedSlotLabel).not.toBe(s.assignedSlotLabel);

    expect(s.arena).toBe("Arena 1");
    expect(s.startTime).toBe("08:00");
    expect(s.durationMinutes).toBe(11);
    expect(s.assignedOrder).toBe(1);
  });
});

describe("mapAutoSchedulePreview - frozen bucket", function () {
  it("keeps frozen items in their own bucket and maps slot/arena", function () {
    var result = mapAutoSchedulePreview(baseResponse(), SLOTS);

    expect(result.frozen).toHaveLength(1);
    var f = result.frozen[0];

    expect(f.paidTimeRequestId).toBe(200);
    expect(f.horse).toBe("Thunder");
    expect(f.assignedSlotId).toBe(1);
    expect(f.assignedSlotLabel).toContain("2026-08-01");
    expect(f.arena).toBe("Arena 1");
    expect(f.startTime).toBe("08:11");
    expect(f.assignedOrder).toBe(2);

    // Frozen ids never leak into the scheduled bucket.
    var scheduledIds = result.scheduled.map(function (x) {
      return x.paidTimeRequestId;
    });
    expect(scheduledIds).not.toContain(200);
  });

  it("handles nullable assignedStartTime and assignedOrder without throwing", function () {
    var response = baseResponse();
    response.frozenItems = [
      {
        paidTimeRequestId: 201,
        horseName: "NoTime",
        assignedCompSlotId: 1,
        assignedArenaName: "Arena 1",
        assignedStartTime: null,
        assignedOrder: null,
      },
    ];

    var result = mapAutoSchedulePreview(response, SLOTS);
    var f = result.frozen[0];

    expect(f.startTime).toBe("—");
    expect(f.assignedOrder).toBeNull();
    expect(f.assignedSlotLabel).toContain("2026-08-01");
  });
});

describe("mapAutoSchedulePreview - unscheduled bucket", function () {
  it("keeps unscheduled items in their own bucket and prefers server Hebrew reason", function () {
    var result = mapAutoSchedulePreview(baseResponse(), SLOTS);

    expect(result.unscheduled).toHaveLength(1);
    var u = result.unscheduled[0];

    expect(u.paidTimeRequestId).toBe(300);
    expect(u.horse).toBe("Blaze");
    expect(u.rider).toBe("Dave Rider");
    expect(u.requestedSlotId).toBe(2);
    expect(u.requestedSlotLabel).toContain("2026-08-02");
    expect(u.reasonText).toBe("הסלוט המבוקש פורסם - שיבוץ ידני נדרש");
    expect(u.reasonCode).toBe("RequestedSlotPublished");
  });

  it("maps every known reasonCode when the server reason is missing", function () {
    var codes = [
      "RequestedSlotMissing",
      "RequestedSlotPublished",
      "NoFreeCapacityOrCoachBusy",
      "Unknown",
    ];

    codes.forEach(function (code) {
      var response = baseResponse();
      response.unscheduledItems = [
        {
          paidTimeRequestId: 400,
          horseName: "H",
          requestedCompSlotId: 1,
          reason: "",
          reasonCode: code,
        },
      ];

      var result = mapAutoSchedulePreview(response, SLOTS);
      expect(result.unscheduled[0].reasonText).toBe(REASON_CODE_LABELS[code]);
      expect(result.unscheduled[0].reasonCode).toBe(code);
    });
  });

  it("falls back safely for an unknown/missing reason code", function () {
    var response = baseResponse();
    response.unscheduledItems = [
      {
        paidTimeRequestId: 401,
        horseName: "H",
        requestedCompSlotId: 1,
        // no reason, unrecognized code
        reasonCode: "SomeFutureCode",
      },
      {
        paidTimeRequestId: 402,
        horseName: "H2",
        requestedCompSlotId: 1,
        // no reason, no code at all
      },
    ];

    var result = mapAutoSchedulePreview(response, SLOTS);
    expect(result.unscheduled[0].reasonText).toBe(REASON_CODE_LABELS.Unknown);
    expect(result.unscheduled[0].reasonCode).toBe("SomeFutureCode");
    expect(result.unscheduled[1].reasonText).toBe(REASON_CODE_LABELS.Unknown);
    expect(result.unscheduled[1].reasonCode).toBeNull();
  });
});

describe("mapAutoSchedulePreview - display-name fallbacks", function () {
  it("falls back horseName -> barnName -> 'סוס'", function () {
    var response = baseResponse();
    response.scheduledItems = [
      { paidTimeRequestId: 1, horseName: "Real", barnName: "B" },
      { paidTimeRequestId: 2, horseName: "", barnName: "BarnOnly" },
      { paidTimeRequestId: 3, horseName: null, barnName: null },
      { paidTimeRequestId: 4 },
    ];

    var result = mapAutoSchedulePreview(response, SLOTS);
    expect(result.scheduled[0].horse).toBe("Real");
    expect(result.scheduled[1].horse).toBe("BarnOnly");
    expect(result.scheduled[2].horse).toBe("סוס");
    expect(result.scheduled[3].horse).toBe("סוס");
  });

  it("falls back rider/coach/payer to '—' on null, empty, or missing", function () {
    var response = baseResponse();
    response.scheduledItems = [
      {
        paidTimeRequestId: 1,
        horseName: "H",
        riderName: null,
        coachName: "",
        // payerName missing entirely
      },
    ];

    var result = mapAutoSchedulePreview(response, SLOTS);
    var s = result.scheduled[0];
    expect(s.rider).toBe("—");
    expect(s.coach).toBe("—");
    expect(s.payer).toBe("—");
    // Nullable barn preserved as null.
    expect(s.barnName).toBeNull();
  });
});

describe("mapAutoSchedulePreview - slot safety", function () {
  it("handles a missing slot id and an unresolved slot id without throwing", function () {
    var response = baseResponse();
    response.scheduledItems = [
      {
        paidTimeRequestId: 1,
        horseName: "H",
        requestedCompSlotId: 999, // not in SLOTS
        assignedCompSlotId: null, // missing id
        assignedArenaName: "",
      },
    ];

    var result = mapAutoSchedulePreview(response, SLOTS);
    var s = result.scheduled[0];

    expect(s.requestedSlotLabel).toBe("סלוט #999");
    expect(s.assignedSlotLabel).toBe("—");
    // arena: no DTO arena, unresolved slot -> dash.
    expect(s.arena).toBe("—");
  });

  it("resolves arena from the slot when the DTO arena is empty", function () {
    var response = baseResponse();
    response.scheduledItems = [
      {
        paidTimeRequestId: 1,
        horseName: "H",
        assignedCompSlotId: 1, // slot 1 has "Arena 1"
        assignedArenaName: "", // empty -> fall back to slot arena
      },
    ];

    var result = mapAutoSchedulePreview(response, SLOTS);
    expect(result.scheduled[0].arena).toBe("Arena 1");
  });

  it("returns a dash arena when neither DTO nor slot has an arena name", function () {
    var response = baseResponse();
    response.scheduledItems = [
      {
        paidTimeRequestId: 1,
        horseName: "H",
        assignedCompSlotId: 2, // slot 2 arenaName is ""
        assignedArenaName: "",
      },
    ];

    var result = mapAutoSchedulePreview(response, SLOTS);
    expect(result.scheduled[0].arena).toBe("—");
  });

  it("keeps requested and proposed slot labels distinct", function () {
    var result = mapAutoSchedulePreview(baseResponse(), SLOTS);
    var s = result.scheduled[0];
    expect(s.requestedSlotLabel).not.toBe(s.assignedSlotLabel);
  });
});

describe("mapAutoSchedulePreview - response safety", function () {
  it("treats missing arrays as empty and sets the empty flag", function () {
    var result = mapAutoSchedulePreview({ fingerprint: "FP" }, SLOTS);

    expect(result.scheduled).toEqual([]);
    expect(result.frozen).toEqual([]);
    expect(result.unscheduled).toEqual([]);
    expect(result.isEmpty).toBe(true);
    expect(result.counts.scheduled).toBe(0);
  });

  it("handles a null response and null slots without throwing", function () {
    var result = mapAutoSchedulePreview(null, null);
    expect(result.isEmpty).toBe(true);
    expect(result.fingerprint).toBeNull();
  });

  it("is not empty when any bucket has items", function () {
    var result = mapAutoSchedulePreview(baseResponse(), SLOTS);
    expect(result.isEmpty).toBe(false);
    expect(result.counts.scheduled).toBe(1);
    expect(result.counts.frozen).toBe(1);
    expect(result.counts.unscheduled).toBe(1);
  });

  it("preserves the fingerprint and generatedAt without influencing mapping", function () {
    var withFp = mapAutoSchedulePreview(baseResponse(), SLOTS);

    var noFpResponse = baseResponse();
    delete noFpResponse.fingerprint;
    var withoutFp = mapAutoSchedulePreview(noFpResponse, SLOTS);

    expect(withFp.fingerprint).toBe("FP-ABC");
    expect(withFp.generatedAt).toBe("2026-07-23T09:00:00Z");
    expect(withoutFp.fingerprint).toBeNull();

    // Mapped buckets are identical regardless of the fingerprint.
    expect(withoutFp.scheduled).toEqual(withFp.scheduled);
    expect(withoutFp.frozen).toEqual(withFp.frozen);
    expect(withoutFp.unscheduled).toEqual(withFp.unscheduled);
  });

  it("derives display counts from the mapped arrays, not the server counts", function () {
    var response = baseResponse();
    // Deliberately wrong server counts; display counts must ignore them.
    response.scheduledCount = 99;
    response.frozenCount = 99;
    response.unscheduledCount = 99;

    var result = mapAutoSchedulePreview(response, SLOTS);
    expect(result.counts.scheduled).toBe(1);
    expect(result.counts.frozen).toBe(1);
    expect(result.counts.unscheduled).toBe(1);
    // Server-reported values are still preserved for reference.
    expect(result.counts.serverScheduled).toBe(99);
  });
});

describe("mapAutoSchedulePreview - purity", function () {
  it("does not mutate the input response or slots", function () {
    var response = baseResponse();
    var responseSnapshot = JSON.stringify(response);
    var slotsSnapshot = JSON.stringify(SLOTS);

    mapAutoSchedulePreview(response, SLOTS);

    expect(JSON.stringify(response)).toBe(responseSnapshot);
    expect(JSON.stringify(SLOTS)).toBe(slotsSnapshot);
  });
});

describe("mapUnscheduledReason", function () {
  it("prefers a non-empty server reason and trims it", function () {
    expect(mapUnscheduledReason("  סיבה אמיתית  ", "Unknown")).toBe("סיבה אמיתית");
  });

  it("falls back to the code label, then to Unknown", function () {
    expect(mapUnscheduledReason("", "RequestedSlotMissing")).toBe(
      REASON_CODE_LABELS.RequestedSlotMissing,
    );
    expect(mapUnscheduledReason(null, "NopeCode")).toBe(REASON_CODE_LABELS.Unknown);
    expect(mapUnscheduledReason(undefined, undefined)).toBe(
      REASON_CODE_LABELS.Unknown,
    );
  });
});

/* =======================
   V2-1: placement kind + adjacent-slots-tried
======================= */

describe("normalizePlacementKind / placementKindLabel", function () {
  it("passes through the three known kinds", function () {
    expect(normalizePlacementKind("Requested")).toBe("Requested");
    expect(normalizePlacementKind("PreviousSameDay")).toBe("PreviousSameDay");
    expect(normalizePlacementKind("NextSameDay")).toBe("NextSameDay");
  });

  it("falls back to Requested for missing, empty or unknown values", function () {
    expect(normalizePlacementKind(undefined)).toBe("Requested");
    expect(normalizePlacementKind(null)).toBe("Requested");
    expect(normalizePlacementKind("")).toBe("Requested");
    expect(normalizePlacementKind("   ")).toBe("Requested");
    expect(normalizePlacementKind("SomethingNewFromAFutureServer")).toBe(
      "Requested",
    );
    // Must not be fooled by inherited Object.prototype keys.
    expect(normalizePlacementKind("constructor")).toBe("Requested");
  });

  it("maps each kind to its approved Hebrew label", function () {
    expect(placementKindLabel("Requested")).toBe(
      PLACEMENT_KIND_LABELS.Requested,
    );
    expect(placementKindLabel("PreviousSameDay")).toBe(
      PLACEMENT_KIND_LABELS.PreviousSameDay,
    );
    expect(placementKindLabel("NextSameDay")).toBe(
      PLACEMENT_KIND_LABELS.NextSameDay,
    );
    expect(placementKindLabel(undefined)).toBe(PLACEMENT_KIND_LABELS.Requested);
  });
});

describe("mapAutoSchedulePreview - V2-1 fields", function () {
  it("surfaces a previous-same-day fallback with its label and flag", function () {
    var response = baseResponse();
    response.scheduledItems[0].placementKind = "PreviousSameDay";

    var s = mapAutoSchedulePreview(response, SLOTS).scheduled[0];

    expect(s.placementKind).toBe("PreviousSameDay");
    expect(s.placementKindLabel).toBe(PLACEMENT_KIND_LABELS.PreviousSameDay);
    expect(s.isFallbackPlacement).toBe(true);
    // Requested and assigned slots stay distinct and both remain readable.
    expect(s.requestedSlotId).toBe(2);
    expect(s.assignedSlotId).toBe(1);
  });

  it("surfaces a next-same-day fallback", function () {
    var response = baseResponse();
    response.scheduledItems[0].placementKind = "NextSameDay";

    var s = mapAutoSchedulePreview(response, SLOTS).scheduled[0];

    expect(s.placementKind).toBe("NextSameDay");
    expect(s.placementKindLabel).toBe(PLACEMENT_KIND_LABELS.NextSameDay);
    expect(s.isFallbackPlacement).toBe(true);
  });

  it("reads a PascalCase placementKind too", function () {
    var response = baseResponse();
    delete response.scheduledItems[0].placementKind;
    response.scheduledItems[0].PlacementKind = "PreviousSameDay";

    expect(mapAutoSchedulePreview(response, SLOTS).scheduled[0].placementKind).toBe(
      "PreviousSameDay",
    );
  });

  it("exposes the adjacent-slots-tried label only when the flag is true", function () {
    var tried = baseResponse();
    tried.unscheduledItems[0].adjacentSlotsTried = true;
    var triedItem = mapAutoSchedulePreview(tried, SLOTS).unscheduled[0];
    expect(triedItem.adjacentSlotsTried).toBe(true);
    expect(triedItem.adjacentSlotsTriedLabel).toBe(ADJACENT_SLOTS_TRIED_LABEL);

    var notTried = baseResponse();
    notTried.unscheduledItems[0].adjacentSlotsTried = false;
    var notTriedItem = mapAutoSchedulePreview(notTried, SLOTS).unscheduled[0];
    expect(notTriedItem.adjacentSlotsTried).toBe(false);
    expect(notTriedItem.adjacentSlotsTriedLabel).toBeNull();
  });

  it("does not change the reason when adjacent slots were tried", function () {
    var response = baseResponse();
    response.unscheduledItems[0].adjacentSlotsTried = true;

    var item = mapAutoSchedulePreview(response, SLOTS).unscheduled[0];

    expect(item.reasonText).toBe("הסלוט המבוקש פורסם - שיבוץ ידני נדרש");
    expect(item.reasonCode).toBe("RequestedSlotPublished");
  });

  // 23: an older server that knows nothing about V2-1 must still render.
  it("uses safe defaults for an older server response with neither field", function () {
    var response = baseResponse();
    expect(response.scheduledItems[0].placementKind).toBeUndefined();
    expect(response.unscheduledItems[0].adjacentSlotsTried).toBeUndefined();

    var result = mapAutoSchedulePreview(response, SLOTS);

    expect(result.scheduled[0].placementKind).toBe("Requested");
    expect(result.scheduled[0].placementKindLabel).toBe(
      PLACEMENT_KIND_LABELS.Requested,
    );
    expect(result.scheduled[0].isFallbackPlacement).toBe(false);
    expect(result.unscheduled[0].adjacentSlotsTried).toBe(false);
    expect(result.unscheduled[0].adjacentSlotsTriedLabel).toBeNull();
  });

  it("treats a non-boolean adjacentSlotsTried as false", function () {
    var response = baseResponse();
    response.unscheduledItems[0].adjacentSlotsTried = "true";

    expect(
      mapAutoSchedulePreview(response, SLOTS).unscheduled[0].adjacentSlotsTried,
    ).toBe(false);
  });
});

// =====================================================================
// V2-2: moved / unchanged buckets, frozen reasons, movement diagnostics
// =====================================================================
describe("mapAutoSchedulePreview - V2-2 movement", function () {
  function movedResponse() {
    var response = baseResponse();
    response.movedCount = 1;
    response.unchangedCount = 1;
    response.movedItems = [
      {
        paidTimeRequestId: 400,
        horseName: "Rocket",
        barnName: "West Barn",
        riderName: "Dana Rider",
        coachName: "Eli Coach",
        payerName: "Fay Payer",
        requestedCompSlotId: 1,
        effectiveDurationMinutes: 11,
        previousAssignedCompSlotId: 1,
        previousAssignedStartTime: "2026-08-01T08:00:00",
        previousAssignedOrder: 3,
        previousArenaName: "Arena 1",
        assignedCompSlotId: 2,
        assignedStartTime: "2026-08-02T09:30:00",
        assignedOrder: 1,
        assignedArenaName: "",
        placementKind: "NextSameDay",
        allocationOrigin: "Manual",
      },
    ];
    response.unchangedItems = [
      {
        paidTimeRequestId: 500,
        horseName: "Willow",
        assignedCompSlotId: 1,
        assignedArenaName: "Arena 1",
        assignedStartTime: "2026-08-01T10:00:00",
        assignedOrder: 9,
        allocationOrigin: null,
      },
    ];
    return response;
  }

  it("maps a moved item with old -> new labels for slot, time and order", function () {
    var item = mapAutoSchedulePreview(movedResponse(), SLOTS).moved[0];

    expect(item.paidTimeRequestId).toBe(400);
    expect(item.previousSlotId).toBe(1);
    expect(item.assignedSlotId).toBe(2);
    expect(item.previousStartTime).toBe("08:00");
    expect(item.startTime).toBe("09:30");
    expect(item.previousOrder).toBe(3);
    expect(item.assignedOrder).toBe(1);

    // The approved "מ־{old} אל {new}" shape, pre-formatted so the modal never
    // builds it itself.
    expect(item.startTimeChangeLabel).toBe("מ־08:00 אל 09:30");
    expect(item.orderChangeLabel).toBe("מ־3 אל 1");
    expect(item.slotChangeLabel).toBe(
      "מ־2026-08-01 · 08:00–12:00 · Arena 1 אל 2026-08-02 · 09:00–11:00",
    );
  });

  it("preserves the moved row's allocation origin verbatim", function () {
    expect(mapAutoSchedulePreview(movedResponse(), SLOTS).moved[0].allocationOrigin).toBe(
      "Manual",
    );
  });

  it("keeps a null allocation origin null rather than inventing one", function () {
    var response = movedResponse();
    response.movedItems[0].allocationOrigin = null;

    expect(mapAutoSchedulePreview(response, SLOTS).moved[0].allocationOrigin).toBeNull();
  });

  it("counts moved and unchanged separately from frozen", function () {
    var counts = mapAutoSchedulePreview(movedResponse(), SLOTS).counts;

    expect(counts.moved).toBe(1);
    expect(counts.unchanged).toBe(1);
    expect(counts.frozen).toBe(1);
    expect(counts.serverMoved).toBe(1);
    expect(counts.serverUnchanged).toBe(1);
  });

  it("maps an unchanged item without any old/new pairing", function () {
    var item = mapAutoSchedulePreview(movedResponse(), SLOTS).unchanged[0];

    expect(item.paidTimeRequestId).toBe(500);
    expect(item.assignedOrder).toBe(9);
    expect(item.startTime).toBe("10:00");
    expect(item.slotChangeLabel).toBeUndefined();
  });

  it("labels each frozen reason and flags the published-slot case", function () {
    var response = movedResponse();
    response.frozenItems[0].frozenReason = "PublishedSlot";
    response.frozenItems[0].isPublishedSlot = true;

    var item = mapAutoSchedulePreview(response, SLOTS).frozen[0];

    expect(item.frozenReason).toBe("PublishedSlot");
    expect(item.frozenReasonLabel).toBe(FROZEN_REASON_LABELS.PublishedSlot);
    expect(item.isPublishedSlot).toBe(true);
  });

  it("maps every remaining frozen reason", function () {
    var response = movedResponse();

    response.frozenItems[0].frozenReason = "OutOfScopePlacement";
    expect(mapAutoSchedulePreview(response, SLOTS).frozen[0].frozenReasonLabel).toBe(
      FROZEN_REASON_LABELS.OutOfScopePlacement,
    );

    response.frozenItems[0].frozenReason = "NoStartTime";
    expect(mapAutoSchedulePreview(response, SLOTS).frozen[0].frozenReasonLabel).toBe(
      FROZEN_REASON_LABELS.NoStartTime,
    );

    // The row is healthy; its SLOT holds a legacy start-time-less assignment.
    response.frozenItems[0].frozenReason = "UnsafeLegacySlot";
    var item = mapAutoSchedulePreview(response, SLOTS).frozen[0];
    expect(item.frozenReasonLabel).toBe(FROZEN_REASON_LABELS.UnsafeLegacySlot);
    // Distinct from the published case - it must not read as a publication freeze.
    expect(item.isPublishedSlot).toBe(false);
  });

  it("degrades an unrecognised frozen reason to no label instead of throwing", function () {
    var response = movedResponse();
    response.frozenItems[0].frozenReason = "SomethingNew";

    var item = mapAutoSchedulePreview(response, SLOTS).frozen[0];

    expect(item.frozenReason).toBe("SomethingNew");
    expect(item.frozenReasonLabel).toBeNull();
  });

  it("surfaces search exhaustion ADDITIVELY, never replacing the reason", function () {
    var response = movedResponse();
    response.unscheduledItems[0].movementAttempted = true;
    response.unscheduledItems[0].movementSearchExhausted = true;

    var item = mapAutoSchedulePreview(response, SLOTS).unscheduled[0];

    expect(item.movementAttempted).toBe(true);
    expect(item.movementSearchExhausted).toBe(true);
    expect(item.movementSearchExhaustedLabel).toBe(
      MOVEMENT_SEARCH_EXHAUSTED_LABEL,
    );
    // The original requested-slot reason is untouched.
    expect(item.reasonText).toBe("הסלוט המבוקש פורסם - שיבוץ ידני נדרש");
    expect(item.reasonCode).toBe("RequestedSlotPublished");
  });

  it("shows no exhaustion line when a movement search simply found nothing", function () {
    var response = movedResponse();
    response.unscheduledItems[0].movementAttempted = true;
    response.unscheduledItems[0].movementSearchExhausted = false;

    var item = mapAutoSchedulePreview(response, SLOTS).unscheduled[0];

    expect(item.movementAttempted).toBe(true);
    expect(item.movementSearchExhaustedLabel).toBeNull();
  });

  // The backward-compatibility guarantee: a server that predates V2-2 sends
  // neither movedItems nor unchangedItems and none of the new item fields.
  it("handles an older server response with no V2-2 fields at all", function () {
    var response = baseResponse();
    expect(response.movedItems).toBeUndefined();
    expect(response.unchangedItems).toBeUndefined();

    var result = mapAutoSchedulePreview(response, SLOTS);

    expect(result.moved).toEqual([]);
    expect(result.unchanged).toEqual([]);
    expect(result.counts.moved).toBe(0);
    expect(result.counts.unchanged).toBe(0);
    expect(result.frozen[0].frozenReasonLabel).toBeNull();
    expect(result.frozen[0].isPublishedSlot).toBe(false);
    expect(result.unscheduled[0].movementSearchExhausted).toBe(false);
    expect(result.unscheduled[0].movementSearchExhaustedLabel).toBeNull();
    // Still not "empty" - the pre-V2-2 buckets are populated.
    expect(result.isEmpty).toBe(false);
  });

  it("treats a response with only moved rows as non-empty", function () {
    var response = {
      fingerprint: "FP-X",
      movedItems: movedResponse().movedItems,
    };

    var result = mapAutoSchedulePreview(response, SLOTS);

    expect(result.isEmpty).toBe(false);
    expect(result.moved).toHaveLength(1);
  });

  it("formatOldToNew renders the approved shape", function () {
    expect(formatOldToNew("א", "ב")).toBe("מ־א אל ב");
    expect(formatOldToNew(3, 1)).toBe("מ־3 אל 1");
  });
});

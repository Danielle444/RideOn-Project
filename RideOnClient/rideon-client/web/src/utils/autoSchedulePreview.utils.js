// Pure display-mapping for the read-only auto-scheduling Preview (Stage C1).
//
// Transforms the raw Preview response (Stage A/B DTO) plus the already-loaded
// paid-time slots into display-ready data for the future modal. This module is
// PURE: no API calls, no mutations, no React state, no browser side effects. It
// never persists, assigns, or interprets business meaning of the fingerprint.
//
// Field access is dual-case (camelCase || PascalCase) to match how the existing
// paid-time page already reads server payloads and slot objects.

// Hebrew labels for the currently verified unscheduled reason codes. Used ONLY
// as a fallback when the server did not provide a human-readable reason string.
// An unknown/missing code falls back to the generic Unknown label (never throws).
var REASON_CODE_LABELS = {
  RequestedSlotMissing: "הסלוט המבוקש לא נמצא",
  RequestedSlotPublished: "הסלוט המבוקש פורסם - שיבוץ ידני נדרש",
  NoFreeCapacityOrCoachBusy: "אין מקום פנוי בסלוט המבוקש (קיבולת/מאמן עסוק)",
  Unknown: "לא ניתן לשבץ - סיבה לא ידועה",
};

var HORSE_FALLBACK = "סוס";
var DASH = "—";

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

// Read a property by camelCase name, falling back to its PascalCase variant.
function pick(source, camelKey, pascalKey) {
  if (!source || typeof source !== "object") {
    return undefined;
  }

  var camelValue = source[camelKey];
  if (camelValue !== undefined && camelValue !== null) {
    return camelValue;
  }

  return source[pascalKey];
}

/* =======================
   slot helpers
======================= */

function getSlotId(slot) {
  return pick(slot, "paidTimeSlotInCompId", "PaidTimeSlotInCompId");
}

function getSlotDate(slot) {
  return pick(slot, "slotDate", "SlotDate");
}

function getSlotStartTime(slot) {
  return pick(slot, "startTime", "StartTime");
}

function getSlotEndTime(slot) {
  return pick(slot, "endTime", "EndTime");
}

function getSlotArenaName(slot) {
  return pick(slot, "arenaName", "ArenaName");
}

// "HH:MM" from either a bare TIME ("08:00:00") or a full ISO timestamp
// ("2026-08-01T08:00:00"). Returns "" when absent.
function formatTime(value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  var str = String(value);
  var tIndex = str.indexOf("T");

  if (tIndex >= 0) {
    return str.substring(tIndex + 1, tIndex + 6);
  }

  return str.substring(0, 5);
}

// "YYYY-MM-DD" from a date/timestamp value, or "" when absent. Deterministic
// (no timezone shift) - safe for the future modal and for tests.
function formatDateOnly(value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  return String(value).substring(0, 10);
}

// Build a lookup of slotId -> slot object from the already-loaded slots.
function buildSlotIndex(slots) {
  var index = {};
  var list = asArray(slots);

  for (var i = 0; i < list.length; i++) {
    var slot = list[i];
    var id = getSlotId(slot);

    if (id !== null && id !== undefined) {
      index[String(id)] = slot;
    }
  }

  return index;
}

// Human-readable slot label. Resolves against the loaded slots; if the slot is
// not found, returns a safe fallback that still carries the id. Never throws.
function buildSlotLabel(slotIndex, slotId) {
  if (slotId === null || slotId === undefined || slotId === "") {
    return DASH;
  }

  var slot = slotIndex[String(slotId)];

  if (!slot) {
    return "סלוט #" + String(slotId);
  }

  var dateLabel = formatDateOnly(getSlotDate(slot));
  var startLabel = formatTime(getSlotStartTime(slot));
  var endLabel = formatTime(getSlotEndTime(slot));
  var arenaName = getSlotArenaName(slot);

  var parts = [];

  if (isNonEmptyString(dateLabel)) {
    parts.push(dateLabel);
  }

  if (isNonEmptyString(startLabel) && isNonEmptyString(endLabel)) {
    parts.push(startLabel + "–" + endLabel);
  } else if (isNonEmptyString(startLabel)) {
    parts.push(startLabel);
  }

  if (isNonEmptyString(arenaName)) {
    parts.push(arenaName);
  }

  if (parts.length === 0) {
    return "סלוט #" + String(slotId);
  }

  return parts.join(" · ");
}

// Arena display: prefer the DTO's assignedArenaName, else the resolved slot's
// arena, else a dash. Never throws.
function resolveArenaDisplay(assignedArenaName, slotIndex, slotId) {
  if (isNonEmptyString(assignedArenaName)) {
    return assignedArenaName;
  }

  if (slotId !== null && slotId !== undefined && slotId !== "") {
    var slot = slotIndex[String(slotId)];
    var slotArena = slot ? getSlotArenaName(slot) : null;

    if (isNonEmptyString(slotArena)) {
      return slotArena;
    }
  }

  return DASH;
}

/* =======================
   display-name fallbacks
======================= */

function displayHorse(item) {
  var horseName = pick(item, "horseName", "HorseName");
  if (isNonEmptyString(horseName)) {
    return horseName;
  }

  var barnName = pick(item, "barnName", "BarnName");
  if (isNonEmptyString(barnName)) {
    return barnName;
  }

  return HORSE_FALLBACK;
}

function displayRider(item) {
  var riderName = pick(item, "riderName", "RiderName");
  return isNonEmptyString(riderName) ? riderName : DASH;
}

function displayCoach(item) {
  var coachName = pick(item, "coachName", "CoachName");
  return isNonEmptyString(coachName) ? coachName : DASH;
}

function displayPayer(item) {
  var payerName = pick(item, "payerName", "PayerName");
  return isNonEmptyString(payerName) ? payerName : DASH;
}

// Raw barn value preserved (or null) for optional secondary display.
function rawBarnName(item) {
  var barnName = pick(item, "barnName", "BarnName");
  return isNonEmptyString(barnName) ? barnName : null;
}

/* =======================
   reason handling
======================= */

// Prefer the server-provided Hebrew reason; fall back to the reasonCode map;
// finally to a generic Hebrew label. Never throws.
function mapUnscheduledReason(reason, reasonCode) {
  if (isNonEmptyString(reason)) {
    return reason.trim();
  }

  if (isNonEmptyString(reasonCode) && REASON_CODE_LABELS[reasonCode]) {
    return REASON_CODE_LABELS[reasonCode];
  }

  return REASON_CODE_LABELS.Unknown;
}

/* =======================
   per-bucket mapping
======================= */

function mapScheduledItem(item, slotIndex) {
  var requestedSlotId = pick(item, "requestedCompSlotId", "RequestedCompSlotId");
  var assignedSlotId = pick(item, "assignedCompSlotId", "AssignedCompSlotId");
  var assignedArenaName = pick(item, "assignedArenaName", "AssignedArenaName");
  var startTimeRaw = pick(item, "assignedStartTime", "AssignedStartTime");
  var duration = pick(item, "effectiveDurationMinutes", "EffectiveDurationMinutes");
  var assignedOrder = pick(item, "assignedOrder", "AssignedOrder");
  var startTimeLabel = formatTime(startTimeRaw);

  return {
    paidTimeRequestId: pick(item, "paidTimeRequestId", "PaidTimeRequestId"),
    horse: displayHorse(item),
    barnName: rawBarnName(item),
    rider: displayRider(item),
    coach: displayCoach(item),
    payer: displayPayer(item),
    requestedSlotId: requestedSlotId,
    requestedSlotLabel: buildSlotLabel(slotIndex, requestedSlotId),
    assignedSlotId: assignedSlotId,
    assignedSlotLabel: buildSlotLabel(slotIndex, assignedSlotId),
    arena: resolveArenaDisplay(assignedArenaName, slotIndex, assignedSlotId),
    startTime: isNonEmptyString(startTimeLabel) ? startTimeLabel : DASH,
    durationMinutes:
      duration === null || duration === undefined ? null : Number(duration),
    assignedOrder:
      assignedOrder === null || assignedOrder === undefined
        ? null
        : Number(assignedOrder),
  };
}

function mapFrozenItem(item, slotIndex) {
  var assignedSlotId = pick(item, "assignedCompSlotId", "AssignedCompSlotId");
  var assignedArenaName = pick(item, "assignedArenaName", "AssignedArenaName");
  var startTimeRaw = pick(item, "assignedStartTime", "AssignedStartTime");
  var assignedOrder = pick(item, "assignedOrder", "AssignedOrder");
  var startTimeLabel = formatTime(startTimeRaw);

  return {
    paidTimeRequestId: pick(item, "paidTimeRequestId", "PaidTimeRequestId"),
    horse: displayHorse(item),
    barnName: rawBarnName(item),
    assignedSlotId: assignedSlotId,
    assignedSlotLabel: buildSlotLabel(slotIndex, assignedSlotId),
    arena: resolveArenaDisplay(assignedArenaName, slotIndex, assignedSlotId),
    // assignedStartTime / assignedOrder are nullable on frozen items.
    startTime: isNonEmptyString(startTimeLabel) ? startTimeLabel : DASH,
    assignedOrder:
      assignedOrder === null || assignedOrder === undefined
        ? null
        : Number(assignedOrder),
  };
}

function mapUnscheduledItem(item, slotIndex) {
  var requestedSlotId = pick(item, "requestedCompSlotId", "RequestedCompSlotId");
  var reason = pick(item, "reason", "Reason");
  var reasonCode = pick(item, "reasonCode", "ReasonCode");

  return {
    paidTimeRequestId: pick(item, "paidTimeRequestId", "PaidTimeRequestId"),
    horse: displayHorse(item),
    barnName: rawBarnName(item),
    rider: displayRider(item),
    coach: displayCoach(item),
    requestedSlotId: requestedSlotId,
    requestedSlotLabel: buildSlotLabel(slotIndex, requestedSlotId),
    reasonText: mapUnscheduledReason(reason, reasonCode),
    // Raw code preserved for future badge/detail use (may be undefined).
    reasonCode: isNonEmptyString(reasonCode) ? reasonCode : null,
  };
}

/* =======================
   main entry
======================= */

// Transform the raw Preview response + loaded slots into display-ready data.
// Pure and defensive: missing arrays become empty, missing strings fall back,
// unresolved slots degrade gracefully, and inputs are never mutated.
function mapAutoSchedulePreview(response, slots) {
  var safeResponse = response && typeof response === "object" ? response : {};
  var slotIndex = buildSlotIndex(slots);

  var rawScheduled = asArray(pick(safeResponse, "scheduledItems", "ScheduledItems"));
  var rawFrozen = asArray(pick(safeResponse, "frozenItems", "FrozenItems"));
  var rawUnscheduled = asArray(
    pick(safeResponse, "unscheduledItems", "UnscheduledItems"),
  );

  var scheduled = rawScheduled.map(function (item) {
    return mapScheduledItem(item, slotIndex);
  });

  var frozen = rawFrozen.map(function (item) {
    return mapFrozenItem(item, slotIndex);
  });

  var unscheduled = rawUnscheduled.map(function (item) {
    return mapUnscheduledItem(item, slotIndex);
  });

  var isEmpty =
    scheduled.length === 0 && frozen.length === 0 && unscheduled.length === 0;

  return {
    // Preserved for future Stage D (Apply) staleness checks - NOT displayed or
    // interpreted here.
    fingerprint: pick(safeResponse, "fingerprint", "Fingerprint") || null,
    generatedAt: pick(safeResponse, "generatedAt", "GeneratedAt") || null,

    isEmpty: isEmpty,

    counts: {
      // Display counts derived from the actually-mapped arrays.
      scheduled: scheduled.length,
      frozen: frozen.length,
      unscheduled: unscheduled.length,
      // Server-reported counts preserved for reference (may be undefined).
      serverScheduled: pick(safeResponse, "scheduledCount", "ScheduledCount"),
      serverFrozen: pick(safeResponse, "frozenCount", "FrozenCount"),
      serverUnscheduled: pick(safeResponse, "unscheduledCount", "UnscheduledCount"),
    },

    scheduled: scheduled,
    frozen: frozen,
    unscheduled: unscheduled,
  };
}

export {
  mapAutoSchedulePreview,
  mapUnscheduledReason,
  REASON_CODE_LABELS,
};

// Shared physical-run grouping for the secretary draw/running-order screen.
//
// Locked business rule (mirrors RideOnServer/BL/Services/PhysicalRunGrouper.cs
// -- never change without a business decision): two entries belong to the same
// physical run when RiderFederationMemberId, HorseId, ClassDate (date part) and
// OrderInDay are all equal. BillId, creation timestamp, coach and pattern
// number are NOT part of the key.
//
// Invalid duplicates: multiple Active entries sharing RiderFederationMemberId +
// HorseId + ClassInCompId are never a legitimate second physical run. They are
// detected and excluded from grouping -- callers must check `duplicates` and
// block editing/saving rather than silently assigning a draw position.
//
// Field access follows the existing dual-casing convention used throughout
// this screen's hook/table (see useSecretaryCompetitionClassesPage.js).
//
// KNOWN OPEN QUESTION, deliberately not addressed by this key (2026-08-07 audit):
// the key does not include ArenaId. classincompetition.arenaid exists and is not
// part of the key, so two classes sharing ClassDate+OrderInDay but scheduled in
// DIFFERENT arenas are still merged into one physical run today. Live data shows
// this is rare (cross-arena OrderInDay ties are a small minority of all ties --
// see the schedule-view Phase 7 notes), and same rider+horse in two arenas at the
// same slot is itself a data anomaly rather than a real scenario, but this is a
// genuine unresolved business-rule question, not an oversight to silently fix
// here. Do not add ArenaId to this key without an explicit business decision --
// it is the same locked rule PhysicalRunGrouper.cs (server) and
// entriesPhysicalRunGrouping.js (mobile) implement, and all three must change
// together if it ever does.

function normalizeDateOnly(value) {
  if (!value) {
    return "";
  }

  return String(value).substring(0, 10);
}

export function getEntryId(item) {
  return item.entryId || item.EntryId;
}

export function getEntryStatus(item) {
  return item.entryStatus || item.EntryStatus || "Active";
}

export function isActiveEntry(item) {
  var status = String(getEntryStatus(item)).toLowerCase();
  return status !== "cancelled" && status !== "cancelledafterstart";
}

export function getRiderFederationMemberId(item) {
  var value = item.riderFederationMemberId;
  return value === null || value === undefined
    ? item.RiderFederationMemberId
    : value;
}

export function getHorseId(item) {
  var value = item.horseId;
  return value === null || value === undefined ? item.HorseId : value;
}

export function getEntryClassDate(item) {
  return normalizeDateOnly(item.classDate || item.ClassDate);
}

export function getEntryOrderInDay(item) {
  var value = item.orderInDay;
  return value === null || value === undefined ? item.OrderInDay : value;
}

export function getEntryClassInCompId(item) {
  return item.classInCompId || item.ClassInCompId;
}

export function getEntryClassName(item) {
  return item.className || item.ClassName || "";
}

// Entries missing ClassDate or OrderInDay cannot be grouped by the locked key
// -- fall back to a per-entry key so they are never merged with an unrelated
// row (mirrors PhysicalRunGrouper.BuildRunKey's same defensive fallback).
export function buildPhysicalRunKey(entry) {
  var riderId = getRiderFederationMemberId(entry);
  var horseId = getHorseId(entry);
  var classDate = getEntryClassDate(entry);
  var orderInDay = getEntryOrderInDay(entry);

  if (!classDate || orderInDay === null || orderInDay === undefined || orderInDay === "") {
    return "entry:" + getEntryId(entry);
  }

  return riderId + ":" + horseId + ":" + classDate + ":" + Number(orderInDay);
}

function uniqueValues(values) {
  var seen = {};
  var result = [];

  values.forEach(function (value) {
    if (value === null || value === undefined || value === "") {
      return;
    }

    var key = String(value);

    if (seen[key]) {
      return;
    }

    seen[key] = true;
    result.push(value);
  });

  return result;
}

// Groups a flat entry list into physical runs. Only Active entries are ever
// grouped -- Cancelled/CancelledAfterStart entries are filtered out first, so
// a run with one cancelled and one active classification keeps only the
// active one, and a run with every classification cancelled produces no run.
//
// Returns { runs, duplicates }. `duplicates` lists invalid same-class Active
// duplicates (same rider+horse+classInCompId) -- callers MUST check this and
// block editing/saving rather than using `runs`.
export function groupEntriesIntoPhysicalRuns(entries) {
  var list = Array.isArray(entries) ? entries : [];
  var active = list.filter(isActiveEntry);

  var byDuplicateKey = {};

  active.forEach(function (entry) {
    var key = [
      getRiderFederationMemberId(entry),
      getHorseId(entry),
      getEntryClassInCompId(entry),
    ].join(":");

    if (!byDuplicateKey[key]) {
      byDuplicateKey[key] = [];
    }

    byDuplicateKey[key].push(entry);
  });

  var duplicates = [];
  var duplicateEntryIds = {};

  Object.keys(byDuplicateKey).forEach(function (key) {
    var group = byDuplicateKey[key];

    if (group.length <= 1) {
      return;
    }

    var first = group[0];

    duplicates.push({
      riderFederationMemberId: getRiderFederationMemberId(first),
      riderName: first.riderName || first.RiderName || "",
      horseId: getHorseId(first),
      horseName: first.horseName || first.HorseName || "",
      classInCompId: getEntryClassInCompId(first),
      className: getEntryClassName(first),
      entryIds: group.map(getEntryId),
    });

    group.forEach(function (entry) {
      duplicateEntryIds[getEntryId(entry)] = true;
    });
  });

  // Entries caught in an invalid duplicate must never receive a draw
  // position, silently or otherwise.
  var groupable = active.filter(function (entry) {
    return !duplicateEntryIds[getEntryId(entry)];
  });

  var runsByKey = {};
  var runOrder = [];

  groupable.forEach(function (entry) {
    var key = buildPhysicalRunKey(entry);

    if (!runsByKey[key]) {
      runsByKey[key] = [];
      runOrder.push(key);
    }

    runsByKey[key].push(entry);
  });

  var runs = runOrder.map(function (key) {
    var groupEntries = runsByKey[key];
    var first = groupEntries[0];
    var entryIds = groupEntries.map(getEntryId).map(Number);
    var classNames = uniqueValues(groupEntries.map(getEntryClassName));

    return {
      runKey: key,
      // Representative id (stable, smallest linked entryId) -- used as the
      // draft item's identity for drag/drop and move-by-index, exactly like
      // a plain entry item's entryId, so the existing drag/move/save wiring
      // in useSecretaryCompetitionClassesPage.js needs no changes.
      entryId: Math.min.apply(null, entryIds),
      entryIds: entryIds,
      classInCompIds: uniqueValues(groupEntries.map(getEntryClassInCompId)),
      classNames: classNames,
      className: classNames.join(" + "),
      riderFederationMemberId: getRiderFederationMemberId(first),
      riderName: first.riderName || first.RiderName || "",
      horseId: getHorseId(first),
      horseName: first.horseName || first.HorseName || "",
      barnName: first.barnName || first.BarnName || "",
      coachName: uniqueValues(
        groupEntries.map(function (entry) {
          return entry.coachName || entry.CoachName || "";
        }),
      ).join(", "),
      payerName: first.payerName || first.PayerName || "",
      prizeRecipientName: first.prizeRecipientName || first.PrizeRecipientName || "",
      entryStatus: "Active",
      isCancelledAfterStart: false,
      classDate: getEntryClassDate(first),
      orderInDay: getEntryOrderInDay(first),
      createdAt: groupEntries
        .map(function (entry) {
          return entry.createdAt || entry.CreatedAt || "";
        })
        .sort()[0],
      entries: groupEntries,
    };
  });

  return { runs: runs, duplicates: duplicates };
}

function getEntryDrawOrderValue(item) {
  var value = item.drawOrder;
  return value === null || value === undefined || value === "" ? item.DrawOrder : value;
}

// Read-only display rows for the non-edit draw/entries screen: one row per
// physical run (grouped, DrawOrder taken from the underlying persisted
// entries), plus one row per Cancelled/CancelledAfterStart entry left
// ungrouped (CAP-9: a cancelled classification is never merged into a
// physical run). Unlike buildRunDraft, this NEVER renumbers DrawOrder -- an
// undrawn group must keep showing empty draw numbers, not a fabricated
// sequential draft, since this is what is actually persisted, not an edit
// draft.
//
// If a run's linked entries disagree on DrawOrder (stale data persisted by
// the pre-grouping generator, before this file existed), the lowest value is
// shown and hasInconsistentDrawOrder is set so the caller can surface a
// "needs redraw" signal -- this is a display fallback for already-published
// old draws, not a silent merge: no persisted row is changed or hidden by
// this function, both original DrawOrder values remain in the underlying
// `entries` the run carries.
//
// Entries caught in an invalid same-class duplicate (see
// groupEntriesIntoPhysicalRuns) are excluded from `runs` entirely -- for a
// read-only screen that must still account for every row, they are shown
// individually (ungrouped, isInvalidDuplicate flagged) rather than silently
// dropped the way an edit-mode caller (buildRunDraft) is allowed to block on.
export function buildDisplayRunRows(items) {
  var list = Array.isArray(items) ? items : [];

  var cancelledRows = list.filter(function (entry) {
    return !isActiveEntry(entry);
  });

  var grouping = groupEntriesIntoPhysicalRuns(list);

  var duplicateEntryIds = {};
  grouping.duplicates.forEach(function (duplicate) {
    duplicate.entryIds.forEach(function (id) {
      duplicateEntryIds[id] = true;
    });
  });

  var duplicateRows = list
    .filter(function (entry) {
      return isActiveEntry(entry) && duplicateEntryIds[getEntryId(entry)];
    })
    .map(function (entry) {
      return { ...entry, isInvalidDuplicate: true };
    });

  var runRows = grouping.runs.map(function (run) {
    var drawOrders = uniqueValues(
      run.entries.map(getEntryDrawOrderValue).map(function (value) {
        return value === null || value === undefined || value === ""
          ? null
          : Number(value);
      }),
    );

    return {
      ...run,
      drawOrder:
        drawOrders.length > 0 ? Math.min.apply(null, drawOrders) : null,
      hasInconsistentDrawOrder: drawOrders.length > 1,
    };
  });

  return runRows.concat(cancelledRows, duplicateRows);
}

// Expands a draft of run items (or plain entry items -- entryIds falls back
// to [entryId] so this also accepts a flat entry array unchanged) into the
// flat { entryId, drawOrder } rows the save endpoint expects. Every entryId
// linked to a run receives that run's shared drawOrder.
export function expandRunsToEntryDrawOrders(runItems) {
  var list = Array.isArray(runItems) ? runItems : [];
  var result = [];

  list.forEach(function (item) {
    var drawOrderValue = item.drawOrder;

    if (drawOrderValue === null || drawOrderValue === undefined || drawOrderValue === "") {
      drawOrderValue = item.DrawOrder;
    }

    var drawOrder = Number(drawOrderValue);

    var ids =
      Array.isArray(item.entryIds) && item.entryIds.length > 0
        ? item.entryIds
        : [getEntryId(item)];

    ids.forEach(function (id) {
      result.push({ entryId: Number(id), drawOrder: drawOrder });
    });
  });

  return result;
}

// Re-exported from the central copy module so existing import sites (the
// hook) don't need to change -- see physicalRunCopy.utils.js for the
// approved Hebrew string itself. Never duplicate the literal here.
export { formatDuplicateEntriesMessage } from "./physicalRunCopy.utils.js";

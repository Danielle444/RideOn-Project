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

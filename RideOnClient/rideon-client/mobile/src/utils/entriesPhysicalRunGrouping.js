// Shared physical-run grouping for EntriesViewModal (display only, no
// editing). Locked business rule (mirrors RideOnServer/BL/Services/
// PhysicalRunGrouper.cs and web's physicalRunGrouping.utils.js -- never
// change without a business decision): two entries belong to the same
// physical run when riderFederationMemberId, horseId, classDate (date part)
// and orderInDay are all equal. billId, creation timestamp, coach and
// pattern number are NOT part of the key.
//
// Invalid duplicates: multiple Active entries sharing riderFederationMemberId
// + horseId + classInCompId are never a legitimate second physical run.
// CORRECTED behavior (shared-physical-runs correction round): when a
// physical-run-key bucket contains ANY same-class duplicate, the ENTIRE
// bucket is treated as one invalid grouping context -- not just the
// duplicated classification. A bucket with class A entered twice and class B
// once is never silently reduced to a valid "A+B" run using one arbitrary A
// row; none of the bucket's entries render as a normal numbered row, and the
// whole context surfaces as one duplicate warning instead, carrying every
// entryId involved so nothing is silently hidden. This is stricter than
// "just exclude the duplicated entryIds and merge the rest" -- that earlier
// approach could still present a run built from partially-contaminated data.
//
// Caller contract: pass an already Active-only entry list (CAP-9 filtering,
// see isActiveEntryForDraw in entriesDrawState.js, happens upstream in
// EntriesViewModal.jsx before this runs) -- this module has no status
// awareness of its own.

function normalizeDateOnly(value) {
  if (!value) {
    return "";
  }

  var d = new Date(value);

  if (Number.isNaN(d.getTime())) {
    return String(value);
  }

  return d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate();
}

function getEntryId(item) {
  return item.entryId;
}

function getRiderFederationMemberId(item) {
  return item.riderFederationMemberId;
}

function getHorseId(item) {
  return item.horseId;
}

function getEntryClassInCompId(item) {
  return item.classInCompId;
}

function getEntryClassName(item) {
  return item.className || "";
}

function getEntryDrawOrder(item) {
  return item.drawOrder === null || item.drawOrder === undefined
    ? null
    : item.drawOrder;
}

// Entries missing classDate or orderInDay cannot be grouped by the locked
// key -- fall back to a per-entry key so they are never merged with an
// unrelated row (same defensive fallback as the server/web helpers).
function buildPhysicalRunKey(entry) {
  var classDate = normalizeDateOnly(entry.classDate);
  var orderInDay = entry.orderInDay;

  if (!classDate || orderInDay === null || orderInDay === undefined) {
    return "entry:" + getEntryId(entry);
  }

  return (
    getRiderFederationMemberId(entry) +
    ":" +
    getHorseId(entry) +
    ":" +
    classDate +
    ":" +
    Number(orderInDay)
  );
}

function uniqueValues(values) {
  var seen = {};
  var result = [];

  values.forEach(function (value) {
    if (!value) {
      return;
    }

    if (seen[value]) {
      return;
    }

    seen[value] = true;
    result.push(value);
  });

  return result;
}

function mergeRunItems(runItems) {
  var sorted = runItems
    .slice()
    .sort(function (a, b) {
      return getEntryClassInCompId(a) - getEntryClassInCompId(b);
    });

  var primary = sorted[0];
  var classNames = uniqueValues(sorted.map(getEntryClassName));
  var sharedDrawOrder = sorted
    .map(getEntryDrawOrder)
    .find(function (value) {
      return value !== null;
    });

  return Object.assign({}, primary, {
    classNames: classNames,
    entryIds: sorted.map(getEntryId),
    drawOrder: sharedDrawOrder === undefined ? primary.drawOrder : sharedDrawOrder,
  });
}

// Transforms an Active-only entry list into { displayItems, duplicateWarnings }.
//
// displayItems: one item per legitimate physical run. A run covering several
// classifications collapses to ONE merged item (see mergeRunItems); a
// single-classification run passes through unchanged.
//
// duplicateWarnings: one entry per physical-run-key bucket that contains an
// invalid same-class duplicate. Every entryId in that bucket is listed in
// `blockedEntryIds` (held back from displayItems entirely -- none of them
// render as a normal row), and `duplicates` lists the exact classInCompId(s)
// and entryIds that collided, for a precise "these entries are the problem"
// message.
export function buildPhysicalRunContexts(items) {
  var list = Array.isArray(items) ? items : [];

  var bucketsByKey = {};
  var keyOrder = [];

  list.forEach(function (item) {
    var key = buildPhysicalRunKey(item);

    if (!bucketsByKey[key]) {
      bucketsByKey[key] = [];
      keyOrder.push(key);
    }

    bucketsByKey[key].push(item);
  });

  var displayItems = [];
  var duplicateWarnings = [];

  keyOrder.forEach(function (key) {
    var bucketItems = bucketsByKey[key];

    var byClass = {};

    bucketItems.forEach(function (item) {
      var classId = getEntryClassInCompId(item);

      if (!byClass[classId]) {
        byClass[classId] = [];
      }

      byClass[classId].push(item);
    });

    var duplicateClasses = Object.keys(byClass)
      .filter(function (classId) {
        return byClass[classId].length > 1;
      })
      .map(function (classId) {
        var group = byClass[classId];

        return {
          classInCompId: Number(classId),
          className: getEntryClassName(group[0]),
          entryIds: group.map(getEntryId),
        };
      });

    if (duplicateClasses.length > 0) {
      var first = bucketItems[0];

      duplicateWarnings.push({
        runKey: key,
        classDate: first.classDate,
        orderInDay: first.orderInDay,
        riderFederationMemberId: getRiderFederationMemberId(first),
        riderName: first.riderName || "",
        horseId: getHorseId(first),
        horseName: first.horseName || "",
        duplicates: duplicateClasses,
        blockedEntryIds: bucketItems.map(getEntryId),
      });

      return;
    }

    if (bucketItems.length === 1) {
      displayItems.push(bucketItems[0]);
      return;
    }

    displayItems.push(mergeRunItems(bucketItems));
  });

  return { displayItems: displayItems, duplicateWarnings: duplicateWarnings };
}

// Back-compat convenience for callers that only need the display list.
export function buildRunDisplayItems(items) {
  return buildPhysicalRunContexts(items).displayItems;
}

export { buildPhysicalRunKey };

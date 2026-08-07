// Single shared Entry <-> fine pairing algorithm for the Secretary Payments
// screen, keyed on the server-resolved `resolvedEntryId`
// (usp_getcompetitionpayercharges' "ResolvedEntryId" column) rather than raw
// SourceId/CategoryKey special-casing. Consumed by useCompetitionPaymentsPage.js
// (for visible/selected units and selection toggling), PaymentChargesTable.jsx
// and CreatePaymentModal.jsx, so the three surfaces can never disagree about
// which billcharge rows form one payable Entry unit.
//
// Locked business rule: for the same ChargeOwner, an Entry's base charge and
// its fine (Entry-created OR resolved via ChangeEntryRequest) are ONE
// payable unit. An Entry has AT MOST ONE payable Organizer fine - never
// aggregated, never string_agg'd, never picked arbitrarily. This is already
// enforced server-side (usp_getcompetitionpayercharges and
// usp_createcompetitionpayerpayment both RAISE if violated), but this client
// never trusts that blindly: if it ever receives more than one fine-shaped
// row for the same (chargeOwner, resolvedEntryId), it does NOT sum or pick
// one - it marks that unit as an integrity violation instead, with no
// payable total computed and payment selection disabled for it.

function getValue(item, camelKey, pascalKey, fallback) {
  if (!item) {
    return fallback;
  }

  if (item[camelKey] !== null && item[camelKey] !== undefined) {
    return item[camelKey];
  }

  if (item[pascalKey] !== null && item[pascalKey] !== undefined) {
    return item[pascalKey];
  }

  return fallback;
}

function isFineRow(charge) {
  return getValue(charge, "sourceType", "SourceType", "") === "Fine";
}

function isBaseEntryRow(charge) {
  var sourceType = getValue(charge, "sourceType", "SourceType", "");
  var categoryKey = getValue(charge, "categoryKey", "CategoryKey", "");

  return sourceType === "Entry" && categoryKey === "classes";
}

function buildUnit(baseCharge, fineCharge) {
  var primaryCharge = baseCharge || fineCharge;

  var baseAmount = baseCharge
    ? Number(getValue(baseCharge, "amountToPay", "AmountToPay", 0)) || 0
    : 0;
  var fineAmount = fineCharge
    ? Number(getValue(fineCharge, "amountToPay", "AmountToPay", 0)) || 0
    : 0;

  var billChargeIds = [];

  if (baseCharge) {
    billChargeIds.push(
      getValue(baseCharge, "billChargeId", "BillChargeId", 0),
    );
  }

  if (fineCharge) {
    billChargeIds.push(
      getValue(fineCharge, "billChargeId", "BillChargeId", 0),
    );
  }

  var baseStatus = baseCharge
    ? getValue(baseCharge, "chargeStatus", "ChargeStatus", "")
    : null;
  var fineStatus = fineCharge
    ? getValue(fineCharge, "chargeStatus", "ChargeStatus", "")
    : null;

  // A merged unit only reads as "Paid" once every constituent charge is
  // Paid -- a base Paid with its fine still Open (or vice versa) presents
  // as Open, never as a misleadingly-settled unit.
  var combinedStatus =
    baseCharge && fineCharge
      ? baseStatus === "Paid" && fineStatus === "Paid"
        ? "Paid"
        : "Open"
      : baseStatus || fineStatus;

  var baseCanSelect = baseCharge
    ? getValue(baseCharge, "canSelectForPayment", "CanSelectForPayment", false)
    : true;
  var fineCanSelect = fineCharge
    ? getValue(fineCharge, "canSelectForPayment", "CanSelectForPayment", false)
    : true;

  return {
    displayUnitKey: billChargeIds.join("-"),
    billChargeIds: billChargeIds,
    billChargeId: billChargeIds[0],

    chargeOwner: getValue(primaryCharge, "chargeOwner", "ChargeOwner", ""),
    categoryKey: getValue(primaryCharge, "categoryKey", "CategoryKey", ""),
    sourceType: getValue(primaryCharge, "sourceType", "SourceType", ""),
    sourceId: getValue(primaryCharge, "sourceId", "SourceId", 0),
    resolvedEntryId: getValue(
      primaryCharge,
      "resolvedEntryId",
      "ResolvedEntryId",
      null,
    ),

    displayDate: getValue(primaryCharge, "displayDate", "DisplayDate", null),
    startDate: getValue(primaryCharge, "startDate", "StartDate", null),
    endDate: getValue(primaryCharge, "endDate", "EndDate", null),
    requestedDeliveryTime: getValue(
      primaryCharge,
      "requestedDeliveryTime",
      "RequestedDeliveryTime",
      null,
    ),

    mainName: getValue(primaryCharge, "mainName", "MainName", "-"),
    riderName: getValue(primaryCharge, "riderName", "RiderName", null),
    horseName: getValue(primaryCharge, "horseName", "HorseName", null),
    barnName: getValue(primaryCharge, "barnName", "BarnName", null),
    coachName: getValue(primaryCharge, "coachName", "CoachName", null),
    payerName: getValue(primaryCharge, "payerName", "PayerName", ""),
    orderedByName: getValue(
      primaryCharge,
      "orderedByName",
      "OrderedByName",
      null,
    ),
    stallTypeName: getValue(
      primaryCharge,
      "stallTypeName",
      "StallTypeName",
      null,
    ),
    stallNumber: getValue(primaryCharge, "stallNumber", "StallNumber", null),
    compoundName: getValue(
      primaryCharge,
      "compoundName",
      "CompoundName",
      null,
    ),
    bagQuantity: getValue(primaryCharge, "bagQuantity", "BagQuantity", null),
    splitPayersCount: getValue(
      primaryCharge,
      "splitPayersCount",
      "SplitPayersCount",
      1,
    ),
    splitPaymentText: getValue(
      primaryCharge,
      "splitPaymentText",
      "SplitPaymentText",
      "",
    ),
    splitPayersJson: getValue(
      primaryCharge,
      "splitPayersJson",
      "SplitPayersJson",
      "[]",
    ),
    stallAssignmentText: getValue(
      primaryCharge,
      "stallAssignmentText",
      "StallAssignmentText",
      null,
    ),
    invoiceNumber: getValue(
      primaryCharge,
      "invoiceNumber",
      "InvoiceNumber",
      null,
    ),
    hasPendingChange: !!(
      baseCharge &&
      (baseCharge.hasPendingChange || baseCharge.HasPendingChange)
    ),
    hasPendingCancellation: !!(
      baseCharge &&
      (baseCharge.hasPendingCancellation || baseCharge.HasPendingCancellation)
    ),

    baseAmount: baseAmount,
    fineAmount: fineAmount,
    hasFine: !!(baseCharge && fineCharge),
    amountToPay: baseAmount + fineAmount,
    chargeStatus: combinedStatus,
    canSelectForPayment: baseCanSelect && fineCanSelect,
    hasIntegrityViolation: false,

    raw: fineCharge && baseCharge ? [baseCharge, fineCharge] : [primaryCharge],
  };
}

// A resolvedEntryId with more than one fine-shaped row is a data-integrity
// violation of the locked "at most one payable Organizer fine per Entry"
// rule. This should be structurally impossible given the server-side
// guards, but the client never assumes that: no total is computed, nothing
// is selectable, and the anomaly is surfaced explicitly rather than merged
// away.
function buildIntegrityViolationUnit(resolvedEntryId, chargeOwner, fineCharges) {
  var billChargeIds = fineCharges.map(function (charge) {
    return getValue(charge, "billChargeId", "BillChargeId", 0);
  });

  var first = fineCharges[0];

  return {
    displayUnitKey:
      "integrity-violation-" + chargeOwner + "-" + resolvedEntryId,
    billChargeIds: billChargeIds,
    billChargeId: billChargeIds[0],

    chargeOwner: chargeOwner,
    resolvedEntryId: resolvedEntryId,
    categoryKey: getValue(first, "categoryKey", "CategoryKey", ""),
    sourceType: "Fine",
    sourceId: getValue(first, "sourceId", "SourceId", 0),

    displayDate: getValue(first, "displayDate", "DisplayDate", null),
    mainName: getValue(first, "mainName", "MainName", "-"),
    riderName: getValue(first, "riderName", "RiderName", null),
    horseName: getValue(first, "horseName", "HorseName", null),
    barnName: getValue(first, "barnName", "BarnName", null),
    coachName: getValue(first, "coachName", "CoachName", null),
    payerName: getValue(first, "payerName", "PayerName", ""),

    baseAmount: 0,
    fineAmount: 0,
    hasFine: true,
    // Deliberately not a number: a normal payable total must never be
    // computed for a unit whose fine data is ambiguous.
    amountToPay: null,
    chargeStatus: getValue(first, "chargeStatus", "ChargeStatus", ""),
    canSelectForPayment: false,
    hasIntegrityViolation: true,
    integrityViolationBillChargeIds: billChargeIds,

    raw: fineCharges,
  };
}

// Groups raw usp_getcompetitionpayercharges rows into payable display units,
// keyed by (ChargeOwner, ResolvedEntryId). One unit per resolved Entry (base
// + its at-most-one fine, from either mechanism), one unit per every other
// raw charge (paid-time/stalls/shavings, or any row with no ResolvedEntryId)
// unchanged. Never drops a row: an orphaned fine (no live base charge for
// its resolved entry - e.g. a cancelled entry, CER #2) still surfaces as its
// own standalone unit with real entry/class/rider context, not a generic
// line.
export function buildPayableEntryUnits(charges) {
  var list = Array.isArray(charges) ? charges : [];

  var entryGroups = {};
  var otherRows = [];

  list.forEach(function (charge) {
    var resolvedEntryId = getValue(
      charge,
      "resolvedEntryId",
      "ResolvedEntryId",
      null,
    );

    if (resolvedEntryId === null || resolvedEntryId === undefined) {
      otherRows.push(charge);
      return;
    }

    var chargeOwner = getValue(charge, "chargeOwner", "ChargeOwner", "");
    var key = chargeOwner + "::" + resolvedEntryId;

    if (!entryGroups[key]) {
      entryGroups[key] = {
        resolvedEntryId: resolvedEntryId,
        chargeOwner: chargeOwner,
        baseCharges: [],
        fineCharges: [],
      };
    }

    if (isBaseEntryRow(charge)) {
      entryGroups[key].baseCharges.push(charge);
    } else if (isFineRow(charge)) {
      entryGroups[key].fineCharges.push(charge);
    } else {
      // Defensive: a row carrying a ResolvedEntryId that is neither the
      // base-entry shape nor a fine shape should not happen given the
      // server's contract - never silently drop it, pass it through.
      otherRows.push(charge);
    }
  });

  var entryUnits = [];

  Object.keys(entryGroups).forEach(function (key) {
    var group = entryGroups[key];

    if (group.fineCharges.length > 1) {
      entryUnits.push(
        buildIntegrityViolationUnit(
          group.resolvedEntryId,
          group.chargeOwner,
          group.fineCharges,
        ),
      );

      if (typeof console !== "undefined" && console.error) {
        console.error(
          "[paymentEntryGrouping] integrity violation: " +
            group.fineCharges.length +
            " payable fines resolve to the same Entry (resolvedEntryId=" +
            group.resolvedEntryId +
            ", chargeOwner=" +
            group.chargeOwner +
            "). Refusing to compute a payable total.",
        );
      }

      // The base charge (if present) still needs to surface somewhere -
      // it cannot be safely merged with an ambiguous fine set, so it
      // stands alone rather than being dropped.
      group.baseCharges.forEach(function (baseCharge) {
        entryUnits.push(buildUnit(baseCharge, null));
      });

      return;
    }

    var fineCharge =
      group.fineCharges.length === 1 ? group.fineCharges[0] : null;

    if (group.baseCharges.length === 0) {
      if (fineCharge) {
        // No live base charge for this resolved entry (e.g. a cancelled
        // entry, CER #2) - the fine IS the whole unit, still carrying real
        // entry/class/rider context via ResolvedEntryId, not a generic line.
        entryUnits.push(buildUnit(fineCharge, null));
      }

      return;
    }

    group.baseCharges.forEach(function (baseCharge, index) {
      // Structurally there is exactly one base 'classes'/Entry charge per
      // (chargeOwner, resolvedEntryId) - defensively, if more than one ever
      // exists, only the first carries the fine so it is never duplicated.
      entryUnits.push(buildUnit(baseCharge, index === 0 ? fineCharge : null));
    });
  });

  var otherUnits = otherRows.map(function (charge) {
    return buildUnit(charge, null);
  });

  return entryUnits.concat(otherUnits);
}

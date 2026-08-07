import { describe, it, expect } from "vitest";
import { buildPayableEntryUnits } from "./paymentEntryGrouping.utils.js";

function baseCharge(overrides) {
  return Object.assign(
    {
      billChargeId: 2239,
      billId: 900,
      chargeOwner: "Organizer",
      categoryKey: "classes",
      sourceType: "Entry",
      sourceId: 10675,
      resolvedEntryId: 10675,
      mainName: "פתוח לא מוגבל",
      riderName: "שי קנטי",
      horseName: "קאי",
      barnName: "KAY",
      coachName: "שי קנטי",
      payerName: "משה כהן",
      amountToPay: 250,
      chargeStatus: "Open",
      canSelectForPayment: true,
    },
    overrides,
  );
}

function entryCreatedFineCharge(overrides) {
  return Object.assign(
    {
      billChargeId: 2315,
      billId: 900,
      chargeOwner: "Organizer",
      categoryKey: "fine",
      sourceType: "Fine",
      sourceId: 10675,
      resolvedEntryId: 10675,
      mainName: "פתוח לא מוגבל",
      riderName: "שי קנטי",
      horseName: "קאי",
      barnName: "KAY",
      payerName: "משה כהן",
      amountToPay: 50,
      chargeStatus: "Open",
      canSelectForPayment: true,
    },
    overrides,
  );
}

function cerFineCharge(overrides) {
  // ChangeEntryRequest fine: categoryKey stays 'classes', sourceId is a
  // ChangeEntryRequestId, but the server already resolved ResolvedEntryId
  // via coalesce(newEntryId, originalEntryId).
  return Object.assign(
    {
      billChargeId: 505,
      billId: 901,
      chargeOwner: "Organizer",
      categoryKey: "classes",
      sourceType: "Fine",
      sourceId: 1,
      resolvedEntryId: 294,
      mainName: "נונ פרו 50+",
      riderName: "דודי לזר",
      horseName: "סי יא סבן (פנחס)",
      payerName: "דנה לוי",
      amountToPay: 100,
      chargeStatus: "Open",
      canSelectForPayment: true,
    },
    overrides,
  );
}

function federationBaseCharge(overrides) {
  return Object.assign(
    {
      billChargeId: 2240,
      billId: 900,
      chargeOwner: "Federation",
      categoryKey: "classes",
      sourceType: "Entry",
      sourceId: 10675,
      resolvedEntryId: 10675,
      mainName: "פתוח לא מוגבל",
      riderName: "שי קנטי",
      horseName: "קאי",
      barnName: "KAY",
      payerName: "משה כהן",
      amountToPay: 50,
      chargeStatus: "Open",
      canSelectForPayment: true,
    },
    overrides,
  );
}

function paidTimeCharge(overrides) {
  return Object.assign(
    {
      billChargeId: 3001,
      billId: 902,
      chargeOwner: "Organizer",
      categoryKey: "paid-time",
      sourceType: "PaidTimeRequest",
      sourceId: 55,
      resolvedEntryId: null,
      mainName: "פייד־טיים 20 דק׳",
      payerName: "יעל אבני",
      amountToPay: 80,
      chargeStatus: "Open",
      canSelectForPayment: true,
    },
    overrides,
  );
}

describe("buildPayableEntryUnits", () => {
  it("matches the real QA anchor (competition 78 / entry 10675): base 250 + fine 50 = 300", () => {
    var units = buildPayableEntryUnits([baseCharge(), entryCreatedFineCharge()]);

    expect(units).toHaveLength(1);
    var unit = units[0];

    expect(unit.hasFine).toBe(true);
    expect(unit.hasIntegrityViolation).toBe(false);
    expect(unit.billChargeIds.slice().sort()).toEqual([2239, 2315]);
    expect(unit.baseAmount).toBe(250);
    expect(unit.fineAmount).toBe(50);
    expect(unit.amountToPay).toBe(300);
  });

  it("merges a ChangeEntryRequest fine with its resolved (new) Entry's base charge: CER #1, entry 294, 200 + 100 = 300", () => {
    var cerBase = baseCharge({
      billChargeId: 5,
      sourceId: 294,
      resolvedEntryId: 294,
      mainName: "נונ פרו 50+",
      riderName: "דודי לזר",
      horseName: "סי יא סבן (פנחס)",
      amountToPay: 200,
    });

    var units = buildPayableEntryUnits([cerBase, cerFineCharge()]);

    expect(units).toHaveLength(1);
    var unit = units[0];

    expect(unit.hasFine).toBe(true);
    expect(unit.billChargeIds.slice().sort()).toEqual([5, 505]);
    expect(unit.baseAmount).toBe(200);
    expect(unit.fineAmount).toBe(100);
    expect(unit.amountToPay).toBe(300);
    expect(unit.mainName).toBe("נונ פרו 50+");
    expect(unit.riderName).toBe("דודי לזר");
  });

  it("CER #5 (entry 296): 300 + 50 = 350", () => {
    var cerBase = baseCharge({
      billChargeId: 7,
      sourceId: 296,
      resolvedEntryId: 296,
      mainName: "Open NRHA",
      riderName: "סער בן חמו",
      amountToPay: 300,
    });
    var fine = cerFineCharge({
      billChargeId: 127,
      sourceId: 5,
      resolvedEntryId: 296,
      mainName: "Open NRHA",
      riderName: "סער בן חמו",
      amountToPay: 50,
    });

    var units = buildPayableEntryUnits([cerBase, fine]);

    expect(units).toHaveLength(1);
    expect(units[0].amountToPay).toBe(350);
  });

  it("CER #2 cancellation (originalEntryId fallback, entry 46): no live base charge, fine still carries real entry context instead of a generic line", () => {
    var fine = cerFineCharge({
      billChargeId: 128,
      sourceId: 2,
      resolvedEntryId: 46,
      mainName: "מקצה סוסים לאימון",
      riderName: "גד כרמון",
      horseName: "צ'קס סוויט רבולושן (קוקו)",
      amountToPay: 50,
    });

    var units = buildPayableEntryUnits([fine]);

    expect(units).toHaveLength(1);
    var unit = units[0];

    expect(unit.hasFine).toBe(false);
    expect(unit.hasIntegrityViolation).toBe(false);
    expect(unit.billChargeIds).toEqual([128]);
    expect(unit.amountToPay).toBe(50);
    expect(unit.mainName).toBe("מקצה סוסים לאימון");
    expect(unit.riderName).toBe("גד כרמון");
  });

  it("never merges a Federation base charge with an Organizer fine (Federation stays separate)", () => {
    var units = buildPayableEntryUnits([
      baseCharge(),
      entryCreatedFineCharge(),
      federationBaseCharge(),
    ]);

    expect(units).toHaveLength(2);

    var federationUnit = units.find(function (u) {
      return u.chargeOwner === "Federation";
    });

    expect(federationUnit).toBeTruthy();
    expect(federationUnit.hasFine).toBe(false);
    expect(federationUnit.amountToPay).toBe(50);
    expect(federationUnit.billChargeIds).toEqual([2240]);
  });

  it("passes non-entry charges (paid-time/stalls/shavings) through unchanged as single-id units", () => {
    var units = buildPayableEntryUnits([paidTimeCharge()]);

    expect(units).toHaveLength(1);
    expect(units[0].billChargeIds).toEqual([3001]);
    expect(units[0].amountToPay).toBe(80);
    expect(units[0].hasFine).toBe(false);
  });

  it("only reads a merged unit as Paid once every constituent charge is Paid", () => {
    var paidBaseOpenFine = buildPayableEntryUnits([
      baseCharge({ chargeStatus: "Paid" }),
      entryCreatedFineCharge({ chargeStatus: "Open" }),
    ])[0];

    expect(paidBaseOpenFine.chargeStatus).toBe("Open");

    var bothPaid = buildPayableEntryUnits([
      baseCharge({ chargeStatus: "Paid" }),
      entryCreatedFineCharge({ chargeStatus: "Paid" }),
    ])[0];

    expect(bothPaid.chargeStatus).toBe("Paid");
  });

  it("a merged unit can only be selected for payment when every constituent charge can be selected", () => {
    var unit = buildPayableEntryUnits([
      baseCharge({ canSelectForPayment: true }),
      entryCreatedFineCharge({ canSelectForPayment: false }),
    ])[0];

    expect(unit.canSelectForPayment).toBe(false);
  });

  describe("data-integrity violation (more than one payable fine resolving to the same Entry)", () => {
    it("does NOT sum or pick one -- marks an explicit integrity-violation unit with no payable total", () => {
      var secondFine = entryCreatedFineCharge({
        billChargeId: 9999,
        amountToPay: 999,
      });

      var units = buildPayableEntryUnits([
        baseCharge(),
        entryCreatedFineCharge(),
        secondFine,
      ]);

      var violation = units.find(function (u) {
        return u.hasIntegrityViolation === true;
      });

      expect(violation).toBeTruthy();
      expect(violation.amountToPay).toBeNull();
      expect(violation.canSelectForPayment).toBe(false);
      expect(violation.integrityViolationBillChargeIds.slice().sort()).toEqual(
        [2315, 9999],
      );

      // The base charge still surfaces on its own -- never silently dropped,
      // never silently merged with the ambiguous fine set.
      var baseUnit = units.find(function (u) {
        return (
          !u.hasIntegrityViolation &&
          u.billChargeIds.length === 1 &&
          u.billChargeIds[0] === 2239
        );
      });

      expect(baseUnit).toBeTruthy();
      expect(baseUnit.amountToPay).toBe(250);
    });

    it("mixing an Entry-created fine and a ChangeEntryRequest fine for the same resolved Entry is also caught", () => {
      var entryCreatedFine = entryCreatedFineCharge({
        billChargeId: 2315,
        resolvedEntryId: 294,
      });
      var cerBase = baseCharge({
        billChargeId: 5,
        sourceId: 294,
        resolvedEntryId: 294,
        amountToPay: 200,
      });

      var units = buildPayableEntryUnits([
        cerBase,
        entryCreatedFine,
        cerFineCharge(),
      ]);

      var violation = units.find(function (u) {
        return u.hasIntegrityViolation === true;
      });

      expect(violation).toBeTruthy();
      expect(
        violation.integrityViolationBillChargeIds
          .slice()
          .sort(function (a, b) {
            return a - b;
          }),
      ).toEqual([505, 2315]);
    });
  });
});

import { describe, it, expect } from "vitest";
import {
  resolveEffectiveTackPayers,
  resolveTackPayerChoices,
  isTackPayerSelectionLocked,
} from "./tackPayerLock.js";

var LOCKED_PAYER = { paidByPersonId: 1, payerFullName: "משלם נעול" };
var OTHER_PAYER_A = { paidByPersonId: 2, payerFullName: "משלם אחר א" };
var OTHER_PAYER_B = { paidByPersonId: 3, payerFullName: "משלם אחר ב" };

describe("resolveTackPayerChoices", () => {
  it("1. locked choices contain only the locked payer even when allSelectedHorsePayers contains other payers", () => {
    var result = resolveTackPayerChoices({
      lockedPayer: LOCKED_PAYER,
      allSelectedHorsePayers: [OTHER_PAYER_A, OTHER_PAYER_B, LOCKED_PAYER],
    });

    expect(result).toEqual([LOCKED_PAYER]);
  });

  it("4. no-lock behavior still returns the existing normal payer set", () => {
    var result = resolveTackPayerChoices({
      lockedPayer: null,
      allSelectedHorsePayers: [OTHER_PAYER_A, OTHER_PAYER_B],
    });

    expect(result).toEqual([OTHER_PAYER_A, OTHER_PAYER_B]);
  });

  it("returns an empty array (not a crash) when allSelectedHorsePayers is absent and unlocked", () => {
    expect(resolveTackPayerChoices({ lockedPayer: null })).toEqual([]);
  });
});

describe("resolveEffectiveTackPayers", () => {
  it("locked wins over 'equal' split mode, ignoring allSelectedHorsePayers entirely", () => {
    var result = resolveEffectiveTackPayers({
      lockedPayer: LOCKED_PAYER,
      tackSplitMode: "equal",
      allSelectedHorsePayers: [OTHER_PAYER_A, OTHER_PAYER_B],
      selectedTackPayers: [],
    });

    expect(result).toEqual([LOCKED_PAYER]);
  });

  it("locked wins over 'specific' split mode, ignoring a stale selectedTackPayers value", () => {
    var result = resolveEffectiveTackPayers({
      lockedPayer: LOCKED_PAYER,
      tackSplitMode: "specific",
      allSelectedHorsePayers: [],
      selectedTackPayers: [OTHER_PAYER_A],
    });

    expect(result).toEqual([LOCKED_PAYER]);
  });

  it("4. no-lock 'equal' mode still returns allSelectedHorsePayers", () => {
    var result = resolveEffectiveTackPayers({
      lockedPayer: null,
      tackSplitMode: "equal",
      allSelectedHorsePayers: [OTHER_PAYER_A, OTHER_PAYER_B],
      selectedTackPayers: [],
    });

    expect(result).toEqual([OTHER_PAYER_A, OTHER_PAYER_B]);
  });

  it("4. no-lock 'specific' mode still returns selectedTackPayers", () => {
    var result = resolveEffectiveTackPayers({
      lockedPayer: null,
      tackSplitMode: "specific",
      allSelectedHorsePayers: [OTHER_PAYER_A],
      selectedTackPayers: [OTHER_PAYER_B],
    });

    expect(result).toEqual([OTHER_PAYER_B]);
  });
});

describe("isTackPayerSelectionLocked", () => {
  it("2 & 3. true when a payer is locked - toggleTackPayerSelection must refuse to add or remove anyone", () => {
    expect(isTackPayerSelectionLocked(LOCKED_PAYER)).toBe(true);
  });

  it("4. false when there is no locked payer", () => {
    expect(isTackPayerSelectionLocked(null)).toBe(false);
    expect(isTackPayerSelectionLocked(undefined)).toBe(false);
  });
});

import { describe, it, expect } from "vitest";
import { LIFECYCLE_STATE } from "./payerAccountLifecycle.js";
import {
  RESULT_CATEGORY,
  PAYER_ACCOUNT_ITEM_LABEL,
  getLifecycleBandHeader,
  getLifecycleRowChip,
  getCancellationConfirmationText,
  getResultTypeCopy,
  DIRECT_CANCELLATION_COPY,
  UNKNOWN_RESULT_TYPE_COPY,
} from "./payerAccountCopy.js";

describe("getLifecycleBandHeader", () => {
  it("returns the SPEC-locked pending band header for both pending states", () => {
    expect(getLifecycleBandHeader(LIFECYCLE_STATE.PENDING_CHANGE)).toBe(
      "ממתין לאישור",
    );
    expect(
      getLifecycleBandHeader(LIFECYCLE_STATE.PENDING_CANCELLATION),
    ).toBe("ממתין לאישור");
  });

  it("returns the SPEC-locked cancelled band header", () => {
    expect(getLifecycleBandHeader(LIFECYCLE_STATE.CANCELLED)).toBe("מבוטל");
  });

  it("returns a non-empty header for the active band", () => {
    var header = getLifecycleBandHeader(LIFECYCLE_STATE.ACTIVE);
    expect(typeof header).toBe("string");
    expect(header.length).toBeGreaterThan(0);
  });

  it("returns null for an unrecognized lifecycle state", () => {
    expect(getLifecycleBandHeader("notARealState")).toBe(null);
    expect(getLifecycleBandHeader(undefined)).toBe(null);
  });
});

describe("getLifecycleRowChip", () => {
  it("gives pendingChange and pendingCancellation distinct chip text despite sharing one band", () => {
    var pendingChangeChip = getLifecycleRowChip(LIFECYCLE_STATE.PENDING_CHANGE);
    var pendingCancellationChip = getLifecycleRowChip(
      LIFECYCLE_STATE.PENDING_CANCELLATION,
    );

    expect(pendingChangeChip).not.toBe(pendingCancellationChip);
    expect(typeof pendingChangeChip).toBe("string");
    expect(typeof pendingCancellationChip).toBe("string");
  });

  it("returns the SPEC-locked cancelled chip text", () => {
    expect(getLifecycleRowChip(LIFECYCLE_STATE.CANCELLED)).toBe("מבוטל");
  });

  it("returns null for an unrecognized lifecycle state", () => {
    expect(getLifecycleRowChip("notARealState")).toBe(null);
  });
});

describe("getCancellationConfirmationText", () => {
  it("interpolates the item label without naming a specific routing outcome", () => {
    var text = getCancellationConfirmationText(
      PAYER_ACCOUNT_ITEM_LABEL.entry,
    );

    expect(text).toContain(PAYER_ACCOUNT_ITEM_LABEL.entry);
    expect(text).not.toContain("מזכירה");
    expect(text).not.toContain("ישירות");
  });

  it("produces distinct text per item type", () => {
    var entryText = getCancellationConfirmationText(
      PAYER_ACCOUNT_ITEM_LABEL.entry,
    );
    var stallText = getCancellationConfirmationText(
      PAYER_ACCOUNT_ITEM_LABEL.stall,
    );
    var paidTimeText = getCancellationConfirmationText(
      PAYER_ACCOUNT_ITEM_LABEL.paidTime,
    );

    expect(entryText).not.toBe(stallText);
    expect(entryText).not.toBe(paidTimeText);
    expect(stallText).not.toBe(paidTimeText);
  });
});

describe("getResultTypeCopy", () => {
  it("maps every verified Direct resultType to the directSuccess category", () => {
    expect(getResultTypeCopy("DirectCreated").category).toBe(
      RESULT_CATEGORY.DIRECT_SUCCESS,
    );
    expect(getResultTypeCopy("DirectUpdated").category).toBe(
      RESULT_CATEGORY.DIRECT_SUCCESS,
    );
    expect(getResultTypeCopy("DirectReplaced").category).toBe(
      RESULT_CATEGORY.DIRECT_SUCCESS,
    );
  });

  it("maps every verified Pending resultType to the secretaryPending category", () => {
    expect(getResultTypeCopy("PendingCreateApproval").category).toBe(
      RESULT_CATEGORY.SECRETARY_PENDING,
    );
    expect(getResultTypeCopy("PendingReplaceApproval").category).toBe(
      RESULT_CATEGORY.SECRETARY_PENDING,
    );
  });

  it("returns non-empty text for every verified resultType", () => {
    var verifiedResultTypes = [
      "DirectCreated",
      "PendingCreateApproval",
      "DirectUpdated",
      "DirectReplaced",
      "PendingReplaceApproval",
    ];

    verifiedResultTypes.forEach(function (resultType) {
      var copy = getResultTypeCopy(resultType);
      expect(typeof copy.text).toBe("string");
      expect(copy.text.length).toBeGreaterThan(0);
    });
  });

  it("falls back to the safe unknown copy for an unverified resultType", () => {
    expect(getResultTypeCopy("SomethingNeverSeenLive")).toEqual(
      UNKNOWN_RESULT_TYPE_COPY,
    );
  });

  it("falls back to the safe unknown copy for missing/invalid input", () => {
    expect(getResultTypeCopy(undefined)).toEqual(UNKNOWN_RESULT_TYPE_COPY);
    expect(getResultTypeCopy(null)).toEqual(UNKNOWN_RESULT_TYPE_COPY);
    expect(getResultTypeCopy("")).toEqual(UNKNOWN_RESULT_TYPE_COPY);
    expect(getResultTypeCopy(42)).toEqual(UNKNOWN_RESULT_TYPE_COPY);
  });

  it("the safe fallback never claims a specific routing outcome", () => {
    expect(UNKNOWN_RESULT_TYPE_COPY.category).toBe(null);
    expect(UNKNOWN_RESULT_TYPE_COPY.text).not.toContain("מזכירה");
    expect(UNKNOWN_RESULT_TYPE_COPY.text).not.toContain("בוצע");
  });
});

describe("DIRECT_CANCELLATION_COPY", () => {
  it("is always directSuccess, matching usp_admincancelentry's unconditional self-approve", () => {
    expect(DIRECT_CANCELLATION_COPY.category).toBe(
      RESULT_CATEGORY.DIRECT_SUCCESS,
    );
    expect(typeof DIRECT_CANCELLATION_COPY.text).toBe("string");
    expect(DIRECT_CANCELLATION_COPY.text.length).toBeGreaterThan(0);
  });
});

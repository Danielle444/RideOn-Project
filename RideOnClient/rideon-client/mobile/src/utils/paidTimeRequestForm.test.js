import { describe, it, expect } from "vitest";
import {
  validatePaidTimeForm,
  clearFieldError,
  formatDurationLabel,
  formatPriceLabel,
  buildSlotSummary,
  buildTypeSummary,
  buildPaidTimeReviewModel,
  buildPaidTimeRequestPayload,
  buildSuccessSnapshot,
  getFieldSection,
} from "./paidTimeRequestForm.js";

function fullValues(overrides) {
  var base = {
    requestedSlot: {
      paidTimeSlotInCompId: 77,
      slotDate: "2026-08-14",
      startTime: "09:00:00",
      endTime: "10:30:00",
      arenaName: "מגרש ראשי",
    },
    priceCatalog: {
      priceCatalogId: 12,
      productName: "פייד טיים ארוך",
      durationMinutes: 30,
      itemPrice: 250,
    },
    horse: { horseId: 5, horseName: "ברק", barnName: "אורווה א" },
    rider: { federationMemberId: 31, fullName: "דנה לוי" },
    coach: { federationMemberId: 44, fullName: "יואב כהן" },
    payer: { personId: 91, fullName: "רונית מזרחי" },
    notes: "  מבקשת סמוך לצהריים  ",
    user: { personId: 4 },
    activeRole: { ranchId: 2 },
    competitionName: "תחרות אוגוסט",
  };

  return Object.assign(base, overrides || {});
}

var formatters = {
  formatHorseLabel: function (item) {
    return item.horseName + " (" + item.barnName + ")";
  },
  formatMemberLabel: function (item) {
    return item.fullName;
  },
  formatPayerLabel: function (item) {
    return item.fullName;
  },
};

describe("validatePaidTimeForm", () => {
  it("returns every missing required field together, not just the first", () => {
    var result = validatePaidTimeForm({
      user: { personId: 4 },
      activeRole: { ranchId: 2 },
    });

    expect(Object.keys(result.fieldErrors).sort()).toEqual([
      "coach",
      "horse",
      "payer",
      "priceCatalog",
      "requestedSlot",
      "rider",
    ]);
    expect(result.isValid).toBe(false);
  });

  it("reports the first invalid field in screen order", () => {
    var values = fullValues();
    values.requestedSlot = null;
    values.payer = null;

    var result = validatePaidTimeForm(values);

    expect(result.firstInvalidFieldKey).toBe("requestedSlot");
    expect(result.firstInvalidSection).toBe("when");
  });

  it("falls through to the details section when only a details field is missing", () => {
    var values = fullValues();
    values.coach = null;

    var result = validatePaidTimeForm(values);

    expect(result.firstInvalidFieldKey).toBe("coach");
    expect(result.firstInvalidSection).toBe("details");
    expect(result.fieldErrors).toEqual({ coach: "יש לבחור מאמן" });
  });

  it("returns no field errors for a valid form", () => {
    var result = validatePaidTimeForm(fullValues());

    expect(result.fieldErrors).toEqual({});
    expect(result.firstInvalidFieldKey).toBeNull();
    expect(result.contextError).toBe("");
    expect(result.isValid).toBe(true);
  });

  it("treats a selection object with a missing id as unselected", () => {
    var values = fullValues();
    values.horse = { horseId: null, horseName: "ברק" };

    var result = validatePaidTimeForm(values);

    expect(result.fieldErrors.horse).toBe("יש לבחור סוס");
  });

  it("separates the logged-in-user and ranch problems from field errors", () => {
    var noUser = validatePaidTimeForm(fullValues({ user: null }));
    expect(noUser.fieldErrors).toEqual({});
    expect(noUser.contextError).toBe("לא נמצאו פרטי משתמש מחובר");
    expect(noUser.isValid).toBe(false);

    var noRanch = validatePaidTimeForm(fullValues({ activeRole: {} }));
    expect(noRanch.contextError).toBe("לא נמצאה חווה פעילה");
  });

  it("does not throw when called with nothing", () => {
    var result = validatePaidTimeForm();
    expect(result.isValid).toBe(false);
  });
});

describe("clearFieldError", () => {
  it("removes only the corrected field", () => {
    var errors = { horse: "יש לבחור סוס", payer: "יש לבחור משלם" };

    var next = clearFieldError(errors, "horse");

    expect(next).toEqual({ payer: "יש לבחור משלם" });
    expect(errors).toEqual({ horse: "יש לבחור סוס", payer: "יש לבחור משלם" });
  });

  it("clearing every field leaves an empty error map", () => {
    var errors = { horse: "יש לבחור סוס" };

    expect(clearFieldError(errors, "horse")).toEqual({});
  });

  it("returns the same reference when there is nothing to clear", () => {
    var errors = { horse: "יש לבחור סוס" };

    expect(clearFieldError(errors, "payer")).toBe(errors);
    expect(clearFieldError(errors, null)).toBe(errors);
  });
});

describe("getFieldSection", () => {
  it("maps fields to the section that renders them", () => {
    expect(getFieldSection("requestedSlot")).toBe("when");
    expect(getFieldSection("priceCatalog")).toBe("type");
    expect(getFieldSection("rider")).toBe("details");
    expect(getFieldSection("notes")).toBeNull();
  });
});

describe("formatDurationLabel", () => {
  it("formats a real duration", () => {
    expect(formatDurationLabel(30)).toBe("30 דק׳");
    expect(formatDurationLabel("45")).toBe("45 דק׳");
  });

  it("never renders null, undefined or an empty duration as text", () => {
    expect(formatDurationLabel(null)).toBe("");
    expect(formatDurationLabel(undefined)).toBe("");
    expect(formatDurationLabel("")).toBe("");
    expect(formatDurationLabel(0)).toBe("");
    expect(formatDurationLabel("לא ידוע")).toBe("");
  });
});

describe("formatPriceLabel", () => {
  it("formats a price and skips missing values", () => {
    expect(formatPriceLabel(250)).toBe("250 ₪");
    expect(formatPriceLabel(null)).toBe("");
    expect(formatPriceLabel(undefined)).toBe("");
  });
});

describe("buildSlotSummary", () => {
  it("uses only fields present on the selected slot", () => {
    var summary = buildSlotSummary(fullValues().requestedSlot);

    expect(summary.timeLabel).toBe("09:00 - 10:30");
    expect(summary.arenaName).toBe("מגרש ראשי");
    expect(Object.keys(summary).sort()).toEqual([
      "arenaName",
      "dateLabel",
      "timeLabel",
    ]);
  });

  it("degrades safely when the slot has no times or arena", () => {
    var summary = buildSlotSummary({ paidTimeSlotInCompId: 1 });

    expect(summary.timeLabel).toBe("");
    expect(summary.arenaName).toBe("");
    expect(summary.dateLabel).toBe("");
  });

  it("returns null with no slot selected", () => {
    expect(buildSlotSummary(null)).toBeNull();
  });
});

describe("buildTypeSummary", () => {
  it("handles a catalog item with no duration", () => {
    var summary = buildTypeSummary({
      priceCatalogId: 9,
      productName: "פייד טיים קצר",
      durationMinutes: null,
      itemPrice: 120,
    });

    expect(summary.productName).toBe("פייד טיים קצר");
    expect(summary.durationLabel).toBe("");
    expect(summary.priceLabel).toBe("120 ₪");
  });
});

describe("buildPaidTimeReviewModel", () => {
  it("reflects the values selected in the form", () => {
    var model = buildPaidTimeReviewModel(fullValues(), formatters);

    expect(model.competitionName).toBe("תחרות אוגוסט");
    expect(model.slot.timeLabel).toBe("09:00 - 10:30");
    expect(model.slot.arenaName).toBe("מגרש ראשי");
    expect(model.type.productName).toBe("פייד טיים ארוך");
    expect(model.type.durationLabel).toBe("30 דק׳");
    expect(model.type.priceLabel).toBe("250 ₪");
    expect(model.horseLabel).toBe("ברק (אורווה א)");
    expect(model.riderLabel).toBe("דנה לוי");
    expect(model.coachLabel).toBe("יואב כהן");
    expect(model.payerLabel).toBe("רונית מזרחי");
    expect(model.notes).toBe("מבקשת סמוך לצהריים");
  });

  it("keeps rider and coach apart when both come from the member formatter", () => {
    var values = fullValues();
    var model = buildPaidTimeReviewModel(values, formatters);

    expect(model.riderLabel).not.toBe(model.coachLabel);
  });

  it("renders an absent duration as empty rather than as text", () => {
    var values = fullValues();
    values.priceCatalog = {
      priceCatalogId: 9,
      productName: "פייד טיים קצר",
      durationMinutes: null,
      itemPrice: 120,
    };

    var model = buildPaidTimeReviewModel(values, formatters);

    expect(model.type.durationLabel).toBe("");
    expect(JSON.stringify(model)).not.toContain("null");
    expect(JSON.stringify(model)).not.toContain("undefined");
  });

  it("does not throw when nothing is selected yet", () => {
    var model = buildPaidTimeReviewModel({}, formatters);

    expect(model.slot).toBeNull();
    expect(model.type).toBeNull();
    expect(model.horseLabel).toBe("");
    expect(model.notes).toBe("");
  });
});

describe("buildPaidTimeRequestPayload", () => {
  // חוזה השרת - השדות והערכים חייבים להישאר בדיוק כפי שהיו לפני שלב B1.
  it("builds exactly the pre-existing create payload", () => {
    var payload = buildPaidTimeRequestPayload(fullValues());

    expect(payload).toEqual({
      orderedBySystemUserId: 4,
      ranchId: 2,
      horseId: 5,
      riderFederationMemberId: 31,
      coachFederationMemberId: 44,
      paidByPersonId: 91,
      priceCatalogId: 12,
      requestedCompSlotId: 77,
      notes: "מבקשת סמוך לצהריים",
    });
  });

  it("keeps the exact payload key set - no field added or dropped", () => {
    var payload = buildPaidTimeRequestPayload(fullValues());

    expect(Object.keys(payload).sort()).toEqual([
      "coachFederationMemberId",
      "horseId",
      "notes",
      "orderedBySystemUserId",
      "paidByPersonId",
      "priceCatalogId",
      "ranchId",
      "requestedCompSlotId",
      "riderFederationMemberId",
    ]);
  });

  it("sends null notes when the notes box is empty", () => {
    expect(buildPaidTimeRequestPayload(fullValues({ notes: "" })).notes).toBeNull();
  });
});

describe("buildSuccessSnapshot", () => {
  it("captures horse, slot and price for the success state", () => {
    var snapshot = buildSuccessSnapshot(fullValues(), formatters);

    expect(snapshot.horseLabel).toBe("ברק (אורווה א)");
    expect(snapshot.slot.timeLabel).toBe("09:00 - 10:30");
    expect(snapshot.priceLabel).toBe("250 ₪");
    expect(snapshot.typeName).toBe("פייד טיים ארוך");
  });

  it("survives a catalog item with no duration and no price", () => {
    var values = fullValues();
    values.priceCatalog = {
      priceCatalogId: 9,
      productName: "פייד טיים קצר",
      durationMinutes: null,
      itemPrice: null,
    };

    var snapshot = buildSuccessSnapshot(values, formatters);

    expect(snapshot.priceLabel).toBe("");
    expect(JSON.stringify(snapshot)).not.toContain("null");
  });
});

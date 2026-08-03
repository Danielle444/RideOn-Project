import { describe, it, expect } from "vitest";
import {
  getValue,
  sumField,
  buildProductBreakdown,
  buildDayRollup,
  groupDetailsByDay,
  filterItemsByDay,
  buildPaidTimeProductColumns,
  getProductRequestCountForDay,
  getCategoryCountLabel,
  getDetailRowCountField,
  computeDetailLevelTotals,
  computeEntriesLevelTotals,
} from "./competitionSummaryDayGrouping.utils.js";

function classRow(overrides) {
  return Object.assign(
    {
      classInCompId: 1,
      classDate: "2026-08-03",
      orderInDay: 1,
      className: "מקצה",
      entryCount: 1,
      fineCount: 0,
      paidAmount: 0,
      unpaidAmount: 0,
      expectedAmount: 0,
    },
    overrides,
  );
}

function paidTimeRow(overrides) {
  return Object.assign(
    {
      paidTimeSlotInCompId: 1,
      slotDate: "2026-08-03",
      startTime: "08:00",
      endTime: "08:20",
      arenaName: "מגרש 1",
      productId: 10,
      productName: "פייד־טיים 20 דק׳",
      durationMinutes: 20,
      requestCount: 1,
      paidAmount: 0,
      unpaidAmount: 0,
      expectedAmount: 0,
    },
    overrides,
  );
}

describe("getValue", () => {
  it("prefers the camelCase key when present", () => {
    expect(
      getValue(
        { classDate: "2026-08-03", ClassDate: "2026-08-04" },
        "classDate",
        "ClassDate",
        null,
      ),
    ).toBe("2026-08-03");
  });

  it("falls back to the PascalCase key when camelCase is missing", () => {
    expect(
      getValue({ ClassDate: "2026-08-04" }, "classDate", "ClassDate", null),
    ).toBe("2026-08-04");
  });

  it("falls back to the provided default when neither key is present", () => {
    expect(getValue({}, "classDate", "ClassDate", "none")).toBe("none");
  });
});

describe("groupDetailsByDay -- classes", () => {
  it("groups rows into separate dates", () => {
    var items = [
      classRow({ classDate: "2026-08-03" }),
      classRow({ classDate: "2026-08-03" }),
      classRow({ classDate: "2026-08-04" }),
    ];

    var groups = groupDetailsByDay("classes", items);

    expect(
      groups.map(function (g) {
        return g.dayKey;
      }),
    ).toEqual(["2026-08-03", "2026-08-04"]);
  });

  it("rolls up class count, entry count, fine count, paid, unpaid and expected", () => {
    var items = [
      classRow({
        classDate: "2026-08-03",
        entryCount: 5,
        fineCount: 1,
        paidAmount: 100,
        unpaidAmount: 20,
        expectedAmount: 120,
      }),
      classRow({
        classDate: "2026-08-03",
        entryCount: 3,
        fineCount: 0,
        paidAmount: 60,
        unpaidAmount: 0,
        expectedAmount: 60,
      }),
    ];

    var groups = groupDetailsByDay("classes", items);

    expect(groups).toEqual([
      {
        dayKey: "2026-08-03",
        classCount: 2,
        entryCount: 8,
        fineCount: 1,
        paidAmount: 160,
        unpaidAmount: 20,
        expectedAmount: 180,
      },
    ]);
  });

  it("does not retain the source rows on the rollup object", () => {
    var groups = groupDetailsByDay("classes", [classRow({})]);
    expect(groups[0].items).toBeUndefined();
  });
});

describe("groupDetailsByDay -- paid-time", () => {
  it("groups rows into separate dates", () => {
    var items = [
      paidTimeRow({ slotDate: "2026-08-03" }),
      paidTimeRow({ slotDate: "2026-08-04" }),
    ];

    var groups = groupDetailsByDay("paid-time", items);

    expect(
      groups.map(function (g) {
        return g.dayKey;
      }),
    ).toEqual(["2026-08-03", "2026-08-04"]);
  });

  it("rolls up request count, paid, unpaid and expected", () => {
    var items = [
      paidTimeRow({
        slotDate: "2026-08-03",
        requestCount: 4,
        paidAmount: 80,
        unpaidAmount: 0,
        expectedAmount: 80,
      }),
      paidTimeRow({
        slotDate: "2026-08-03",
        requestCount: 2,
        paidAmount: 0,
        unpaidAmount: 40,
        expectedAmount: 40,
      }),
    ];

    var groups = groupDetailsByDay("paid-time", items);

    expect(groups[0].requestCount).toBe(6);
    expect(groups[0].paidAmount).toBe(80);
    expect(groups[0].unpaidAmount).toBe(40);
    expect(groups[0].expectedAmount).toBe(120);
  });

  it("returns [] for types with no day tier", () => {
    expect(groupDetailsByDay("stalls", [{}])).toEqual([]);
    expect(groupDetailsByDay("shavings", [{}])).toEqual([]);
    expect(groupDetailsByDay("cash", [{}])).toEqual([]);
  });
});

describe("buildProductBreakdown / product identity", () => {
  it("distinguishes products by productId, not by durationMinutes", () => {
    // Same duration, different product -- must stay two separate entries. This is the guard
    // against the ruled-out "threshold durationMinutes" approach.
    var items = [
      paidTimeRow({
        productId: 10,
        productName: "מוצר א׳",
        durationMinutes: 20,
        requestCount: 1,
      }),
      paidTimeRow({
        productId: 11,
        productName: "מוצר ב׳",
        durationMinutes: 20,
        requestCount: 1,
      }),
    ];

    var breakdown = buildProductBreakdown(items);

    expect(
      breakdown.map(function (p) {
        return p.productId;
      }),
    ).toEqual([10, 11]);
  });

  it("sums the same product across several slots", () => {
    var items = [
      paidTimeRow({ productId: 10, requestCount: 2 }),
      paidTimeRow({ productId: 10, requestCount: 3 }),
      paidTimeRow({ productId: 10, requestCount: 1 }),
    ];

    var breakdown = buildProductBreakdown(items);

    expect(breakdown).toEqual([
      { productId: 10, productName: "פייד־טיים 20 דק׳", requestCount: 6 },
    ]);
  });

  it("uses the row's actual productName as the label, not a synthesized short/long string", () => {
    var breakdown = buildProductBreakdown([
      paidTimeRow({ productId: 10, productName: "פייד־טיים בוקר" }),
    ]);

    expect(breakdown[0].productName).toBe("פייד־טיים בוקר");
  });
});

describe("getProductRequestCountForDay", () => {
  it("returns 0 for a product that had no rows on that day", () => {
    var dayRollup = buildDayRollup("paid-time", "2026-08-03", [
      paidTimeRow({ productId: 10, requestCount: 5 }),
    ]);

    expect(getProductRequestCountForDay(dayRollup, 10)).toBe(5);
    expect(getProductRequestCountForDay(dayRollup, 999)).toBe(0);
  });
});

describe("buildPaidTimeProductColumns", () => {
  it("returns the distinct products across the whole category, sorted by productId", () => {
    var items = [
      paidTimeRow({ productId: 20, productName: "ב׳" }),
      paidTimeRow({ productId: 10, productName: "א׳" }),
      paidTimeRow({ productId: 10, productName: "א׳" }),
    ];

    var columns = buildPaidTimeProductColumns(items);

    expect(columns).toEqual([
      { productId: 10, productName: "א׳" },
      { productId: 20, productName: "ב׳" },
    ]);
  });

  it("detects more than two distinct products so the caller can flag it instead of guessing", () => {
    var items = [
      paidTimeRow({ productId: 10 }),
      paidTimeRow({ productId: 20 }),
      paidTimeRow({ productId: 30 }),
    ];

    expect(buildPaidTimeProductColumns(items).length).toBe(3);
  });

  it("does not synthesize a column for a product that never appears in the rows", () => {
    // Accepted limitation: there is no fixed per-competition product catalog to cross-join
    // against, so a configured-but-never-booked product simply has no column. This test locks
    // that behavior in rather than letting a future change silently invent a phantom column.
    var items = [paidTimeRow({ productId: 10, productName: "א׳" })];

    var columns = buildPaidTimeProductColumns(items);

    expect(columns).toEqual([{ productId: 10, productName: "א׳" }]);
    expect(
      columns.some(function (c) {
        return c.productId === 20;
      }),
    ).toBe(false);
  });
});

describe("filterItemsByDay", () => {
  it("returns only the original rows for the given day, unmodified", () => {
    var rowA = classRow({ classDate: "2026-08-03", className: "א׳" });
    var rowB = classRow({ classDate: "2026-08-04", className: "ב׳" });

    var filtered = filterItemsByDay("classes", [rowA, rowB], "2026-08-03");

    expect(filtered).toEqual([rowA]);
  });

  it("returns [] when no day is selected", () => {
    expect(filterItemsByDay("classes", [classRow({})], null)).toEqual([]);
  });
});

describe("camelCase / PascalCase tolerance -- grouping", () => {
  it("groups and rolls up correctly across a mix of camelCase and PascalCase rows", () => {
    // Mirrors the standing uncertainty about wire casing (dual-casing is kept defensively
    // elsewhere in this codebase) -- the grouping math must not silently drop a PascalCase row.
    var items = [
      {
        ClassDate: "2026-08-03",
        EntryCount: 2,
        FineCount: 0,
        PaidAmount: 40,
        UnpaidAmount: 0,
        ExpectedAmount: 40,
      },
      {
        classDate: "2026-08-03",
        entryCount: 3,
        fineCount: 1,
        paidAmount: 30,
        unpaidAmount: 10,
        expectedAmount: 40,
      },
    ];

    var groups = groupDetailsByDay("classes", items);

    expect(groups).toEqual([
      {
        dayKey: "2026-08-03",
        classCount: 2,
        entryCount: 5,
        fineCount: 1,
        paidAmount: 70,
        unpaidAmount: 10,
        expectedAmount: 80,
      },
    ]);
  });

  it("sumField tolerates a mix of camelCase and PascalCase amounts", () => {
    var items = [{ paidAmount: 10 }, { PaidAmount: 20 }, {}];
    expect(sumField(items, "paidAmount", "PaidAmount")).toBe(30);
  });
});

describe("getCategoryCountLabel / getDetailRowCountField", () => {
  it("maps each category to its natural-unit label", () => {
    expect(getCategoryCountLabel("classes")).toBe("כניסות");
    expect(getCategoryCountLabel("paid-time")).toBe("בקשות");
    expect(getCategoryCountLabel("stalls")).toBe("הזמנות");
    expect(getCategoryCountLabel("shavings")).toBe("הזמנות");
  });

  it("maps each category to its detail-row count field", () => {
    expect(getDetailRowCountField("classes")).toEqual(["entryCount", "EntryCount"]);
    expect(getDetailRowCountField("paid-time")).toEqual([
      "requestCount",
      "RequestCount",
    ]);
    expect(getDetailRowCountField("stalls")).toEqual(["bookingCount", "BookingCount"]);
    expect(getDetailRowCountField("shavings")).toEqual(["orderCount", "OrderCount"]);
  });
});

describe("computeDetailLevelTotals", () => {
  it("classes: count uses entryCount; paid/unpaid/expected are summed", () => {
    var items = [
      classRow({ entryCount: 5, paidAmount: 100, unpaidAmount: 20, expectedAmount: 120 }),
      classRow({ entryCount: 3, paidAmount: 60, unpaidAmount: 0, expectedAmount: 60 }),
    ];

    expect(computeDetailLevelTotals("classes", items)).toEqual({
      countLabel: "כניסות",
      countValue: 8,
      paidAmount: 160,
      unpaidAmount: 20,
      expectedAmount: 180,
    });
  });

  it("paid-time: count uses requestCount", () => {
    var items = [paidTimeRow({ requestCount: 4 }), paidTimeRow({ requestCount: 2 })];
    var totals = computeDetailLevelTotals("paid-time", items);

    expect(totals.countValue).toBe(6);
    expect(totals.countLabel).toBe("בקשות");
  });

  it("stalls: count uses bookingCount", () => {
    var items = [
      { bookingCount: 3, paidAmount: 0, unpaidAmount: 0, expectedAmount: 0 },
      { bookingCount: 2, paidAmount: 0, unpaidAmount: 0, expectedAmount: 0 },
    ];
    var totals = computeDetailLevelTotals("stalls", items);

    expect(totals.countValue).toBe(5);
    expect(totals.countLabel).toBe("הזמנות");
  });

  it("shavings: count uses orderCount", () => {
    var items = [
      { orderCount: 2, paidAmount: 0, unpaidAmount: 0, expectedAmount: 0 },
      { orderCount: 1, paidAmount: 0, unpaidAmount: 0, expectedAmount: 0 },
    ];
    var totals = computeDetailLevelTotals("shavings", items);

    expect(totals.countValue).toBe(3);
    expect(totals.countLabel).toBe("הזמנות");
  });

  it("tolerates a mix of camelCase and PascalCase rows", () => {
    var items = [
      { EntryCount: 4, PaidAmount: 40, UnpaidAmount: 0, ExpectedAmount: 40 },
      { entryCount: 2, paidAmount: 10, unpaidAmount: 10, expectedAmount: 20 },
    ];

    expect(computeDetailLevelTotals("classes", items)).toEqual({
      countLabel: "כניסות",
      countValue: 6,
      paidAmount: 50,
      unpaidAmount: 10,
      expectedAmount: 60,
    });
  });

  it("produces zero totals for an empty row set", () => {
    expect(computeDetailLevelTotals("classes", [])).toEqual({
      countLabel: "כניסות",
      countValue: 0,
      paidAmount: 0,
      unpaidAmount: 0,
      expectedAmount: 0,
    });
  });
});

describe("computeEntriesLevelTotals", () => {
  it("classes and paid-time read the amount/Amount field", () => {
    var items = [
      { amount: 50, isPaid: true },
      { Amount: 30, IsPaid: false },
    ];
    var totals = computeEntriesLevelTotals("classes", items);

    expect(totals.paidAmount).toBe(50);
    expect(totals.unpaidAmount).toBe(30);
    expect(totals.expectedAmount).toBe(80);
  });

  it("stalls and shavings read the expectedAmount/ExpectedAmount field", () => {
    var items = [
      { expectedAmount: 200, isPaid: true },
      { ExpectedAmount: 75, IsPaid: false },
    ];

    var stallsTotals = computeEntriesLevelTotals("stalls", items);
    var shavingsTotals = computeEntriesLevelTotals("shavings", items);

    expect(stallsTotals.paidAmount).toBe(200);
    expect(stallsTotals.unpaidAmount).toBe(75);
    expect(shavingsTotals).toEqual(stallsTotals);
  });

  it("isPaid=true contributes only to paid", () => {
    var totals = computeEntriesLevelTotals("classes", [{ amount: 40, isPaid: true }]);
    expect(totals.paidAmount).toBe(40);
    expect(totals.unpaidAmount).toBe(0);
  });

  it("isPaid=false contributes only to unpaid", () => {
    var totals = computeEntriesLevelTotals("classes", [{ amount: 40, isPaid: false }]);
    expect(totals.paidAmount).toBe(0);
    expect(totals.unpaidAmount).toBe(40);
  });

  it("expected always equals paid + unpaid", () => {
    var items = [
      { amount: 40, isPaid: true },
      { amount: 15, isPaid: false },
      { amount: 5, isPaid: true },
    ];
    var totals = computeEntriesLevelTotals("paid-time", items);

    expect(totals.expectedAmount).toBe(totals.paidAmount + totals.unpaidAmount);
    expect(totals.expectedAmount).toBe(60);
  });

  it("count equals the number of displayed entry records", () => {
    var items = [
      { amount: 1, isPaid: true },
      { amount: 2, isPaid: false },
      { amount: 3, isPaid: true },
    ];
    expect(computeEntriesLevelTotals("classes", items).countValue).toBe(3);
  });

  it("tolerates a mix of camelCase and PascalCase rows", () => {
    var items = [
      { Amount: 20, IsPaid: true },
      { amount: 10, isPaid: false },
    ];
    var totals = computeEntriesLevelTotals("paid-time", items);

    expect(totals.paidAmount).toBe(20);
    expect(totals.unpaidAmount).toBe(10);
  });

  it("produces zero totals for an empty row set", () => {
    expect(computeEntriesLevelTotals("classes", [])).toEqual({
      countLabel: "כניסות",
      countValue: 0,
      paidAmount: 0,
      unpaidAmount: 0,
      expectedAmount: 0,
    });
  });
});

import { describe, it, expect } from "vitest";
import { getPaidTimeIdentityLines } from "./PaidTimeBookingLabel.utils";

describe("getPaidTimeIdentityLines", function () {
  it("orders the lines horse -> rider - product -> coach, camelCase fields", function () {
    var lines = getPaidTimeIdentityLines({
      barnName: "ברק",
      horseName: "Blaze",
      riderName: "דנה",
      productName: "פייד־טיים ארוך",
      coachName: "רותם",
    });

    expect(lines).toEqual(["ברק", "דנה • פייד־טיים ארוך", "מאמן/ת: רותם"]);
  });

  it("falls back to PascalCase fields when camelCase is absent", function () {
    var lines = getPaidTimeIdentityLines({
      BarnName: "ברק",
      RiderName: "דנה",
      ProductName: "פייד־טיים ארוך",
      CoachName: "רותם",
    });

    expect(lines).toEqual(["ברק", "דנה • פייד־טיים ארוך", "מאמן/ת: רותם"]);
  });

  it("falls back from barnName to horseName (both casings)", function () {
    expect(
      getPaidTimeIdentityLines({ horseName: "Blaze", riderName: "דנה" })[0],
    ).toBe("Blaze");

    expect(
      getPaidTimeIdentityLines({ HorseName: "Blaze", riderName: "דנה" })[0],
    ).toBe("Blaze");
  });

  it("omits the product separator when productName is absent", function () {
    var lines = getPaidTimeIdentityLines({
      barnName: "ברק",
      riderName: "דנה",
    });

    expect(lines[1]).toBe("דנה ");
  });

  it("shows the missing-coach fallback when no coach is assigned", function () {
    var lines = getPaidTimeIdentityLines({
      barnName: "ברק",
      riderName: "דנה",
    });

    expect(lines[2]).toBe("מאמן/ת: לא צוין");
  });

  it("returns three empty lines for a missing item", function () {
    expect(getPaidTimeIdentityLines(null)).toEqual(["", "", ""]);
    expect(getPaidTimeIdentityLines(undefined)).toEqual(["", "", ""]);
  });
});

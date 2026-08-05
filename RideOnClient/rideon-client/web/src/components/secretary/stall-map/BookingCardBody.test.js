import { describe, it, expect } from "vitest";
import BookingCardBody, { getItemTitle } from "./BookingCardBody";

// BookingCardBody has no hooks (no useState/useEffect/useMemo) - it is a pure
// function of props, so it can be invoked directly (React elements are plain
// objects) without a DOM test environment or React Testing Library, neither of
// which this repo has. flatten() walks the returned element tree the same way
// React's own reconciler would read .props.children, collecting every string/
// number leaf so assertions can check what text actually renders.
function flatten(node, out) {
  if (node === null || node === undefined || typeof node === "boolean") {
    return;
  }

  if (Array.isArray(node)) {
    node.forEach(function (child) {
      flatten(child, out);
    });
    return;
  }

  if (typeof node === "string" || typeof node === "number") {
    out.push(String(node));
    return;
  }

  if (node && node.props) {
    flatten(node.props.children, out);
  }
}

function renderTextParts(item) {
  var out = [];
  flatten(BookingCardBody({ item: item }), out);
  return out;
}

describe("getItemTitle", function () {
  it("prefers barnName over horseName for a horse item", function () {
    expect(
      getItemTitle({ isForTack: false, barnName: "רפת א", horseName: "ברק" }),
    ).toBe("רפת א");
  });

  it("labels a tack item by its stallBookingId", function () {
    expect(getItemTitle({ isForTack: true, stallBookingId: 42 })).toBe(
      "תא ציוד #42",
    );
  });
});

describe("BookingCardBody — common content", function () {
  it("renders title, subtitle and product badge for a full horse item", function () {
    var parts = renderTextParts({
      stallBookingId: 1,
      isForTack: false,
      barnName: "רפת א",
      horseName: "ברק",
      productName: "תא רגיל",
    });

    expect(parts).toContain("רפת א");
    expect(parts).toContain("ברק");
    expect(parts).toContain("תא רגיל");
  });

  it("renders title and product badge for a tack item", function () {
    var parts = renderTextParts({
      stallBookingId: 2,
      isForTack: true,
      productName: "תא ציוד",
    });

    expect(parts).toContain("תא ציוד #2");
  });
});

describe("BookingCardBody — optional fields the grid's assignment shape does not carry", function () {
  it("omits date-range, stay-days and notes badges entirely when the item lacks them, with no undefined leaking into the output", function () {
    var parts = renderTextParts({
      stallBookingId: 3,
      isForTack: false,
      horseName: "ברק",
      productName: "תא רגיל",
      // no startDate / endDate / stayDays / notes - matches StallAssignmentDto
    });

    expect(parts.join(" ")).not.toContain("undefined");
    expect(parts.join(" ")).not.toContain("ימים");
  });

  it("renders the date-range and stay-days badges and the notes block when the item does carry them", function () {
    var parts = renderTextParts({
      stallBookingId: 4,
      isForTack: false,
      horseName: "ברק",
      productName: "תא רגיל",
      startDate: "2026-08-01",
      endDate: "2026-08-05",
      stayDays: 4,
      notes: "הערה חשובה",
    });

    // {item.stayDays} and the literal " ימים" text are separate JSX children -
    // join with no separator to reconstruct the badge's rendered text.
    expect(parts.join("")).toContain("4 ימים");
    expect(parts).toContain("הערה חשובה");
  });
});

describe("BookingCardBody — bookingRanchName", function () {
  it("renders the ranch line when bookingRanchName is supplied", function () {
    var parts = renderTextParts({
      stallBookingId: 5,
      isForTack: false,
      horseName: "ברק",
      productName: "תא רגיל",
      bookingRanchName: "רוח צפונית",
    });

    expect(parts).toContain("רוח צפונית");
  });

  it("adds exactly one extra text node for the ranch line, and omits it entirely when absent", function () {
    var withoutRanch = renderTextParts({
      stallBookingId: 6,
      isForTack: false,
      horseName: "ברק",
      productName: "תא רגיל",
    });

    var withRanch = renderTextParts({
      stallBookingId: 6,
      isForTack: false,
      horseName: "ברק",
      productName: "תא רגיל",
      bookingRanchName: "רוח צפונית",
    });

    expect(withRanch.length).toBe(withoutRanch.length + 1);
  });
});

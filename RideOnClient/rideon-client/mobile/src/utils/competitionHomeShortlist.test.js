import { describe, it, expect } from "vitest";
import {
  selectCompetitionsShortlist,
  HOME_TEASER_ALLOWED_STATUSES,
} from "../../../shared/auth/utils/competitions/competitionHomeShortlist";
import { MOBILE_COMPETITION_STATUS_ORDER } from "../../../shared/auth/utils/competitions/competitionStatusOrder";
import { selectHomeCompetitions } from "../screens/roles/payer/utils/selectPayerHomeCompetitions";

function makeCompetition(overrides) {
  return Object.assign(
    {
      competitionId: 1,
      competitionName: "Test",
      competitionStatus: "פעילה",
      competitionStartDate: "2026-08-10",
      competitionEndDate: "2026-08-11",
      hasParticipated: false,
    },
    overrides,
  );
}

function statusesOf(items) {
  return items.map(function (item) {
    return item.competitionStatus;
  });
}

describe("selectCompetitionsShortlist (Admin/Worker home eligibility)", function () {
  it("excludes draft, finished and cancelled even when fewer than the cap is otherwise available", function () {
    var items = [
      makeCompetition({ competitionId: 1, competitionStatus: "פעילה" }),
      makeCompetition({ competitionId: 2, competitionStatus: "הסתיימה" }),
      makeCompetition({ competitionId: 3, competitionStatus: "בוטלה" }),
      makeCompetition({ competitionId: 4, competitionStatus: "טיוטה" }),
    ];

    var result = selectCompetitionsShortlist(
      items,
      MOBILE_COMPETITION_STATUS_ORDER,
      3,
      HOME_TEASER_ALLOWED_STATUSES,
    );

    expect(result.map(function (item) { return item.competitionId; })).toEqual([1]);
  });

  it("keeps status order כעת -> פעילה -> עתידית and caps at 3", function () {
    var items = [
      makeCompetition({ competitionId: 1, competitionStatus: "עתידית", competitionStartDate: "2026-09-01" }),
      makeCompetition({ competitionId: 2, competitionStatus: "כעת", competitionStartDate: "2026-08-05" }),
      makeCompetition({ competitionId: 3, competitionStatus: "פעילה", competitionStartDate: "2026-08-06" }),
      makeCompetition({ competitionId: 4, competitionStatus: "עתידית", competitionStartDate: "2026-08-20" }),
      makeCompetition({ competitionId: 5, competitionStatus: "עתידית", competitionStartDate: "2026-08-15" }),
    ];

    var result = selectCompetitionsShortlist(
      items,
      MOBILE_COMPETITION_STATUS_ORDER,
      3,
      HOME_TEASER_ALLOWED_STATUSES,
    );

    expect(result).toHaveLength(3);
    expect(statusesOf(result)).toEqual(["כעת", "פעילה", "עתידית"]);
    expect(result[2].competitionId).toBe(5);
  });

  it("without an allowedStatuses argument keeps prior (unrestricted) behavior", function () {
    var items = [
      makeCompetition({ competitionId: 1, competitionStatus: "הסתיימה" }),
      makeCompetition({ competitionId: 2, competitionStatus: "טיוטה" }),
    ];

    var result = selectCompetitionsShortlist(items, MOBILE_COMPETITION_STATUS_ORDER, 3);

    expect(result.map(function (item) { return item.competitionId; })).toEqual([1]);
  });
});

describe("selectHomeCompetitions (Payer home eligibility, preserved)", function () {
  it("keeps an enrolled active/current/future competition regardless of date", function () {
    var items = [
      makeCompetition({ competitionId: 1, hasParticipated: true, competitionStatus: "פעילה" }),
      makeCompetition({ competitionId: 2, hasParticipated: true, competitionStatus: "כעת" }),
      makeCompetition({ competitionId: 3, hasParticipated: true, competitionStatus: "עתידית" }),
    ];

    var result = selectHomeCompetitions(items);

    expect(result.map(function (item) { return item.competitionId; }).sort()).toEqual([1, 2, 3]);
  });

  it("keeps an enrolled finished competition only within 7 days, drops it after", function () {
    var today = new Date();
    var sixDaysAgo = new Date(today.getTime() - 6 * 86400000).toISOString().slice(0, 10);
    var tenDaysAgo = new Date(today.getTime() - 10 * 86400000).toISOString().slice(0, 10);

    var items = [
      makeCompetition({
        competitionId: 1,
        hasParticipated: true,
        competitionStatus: "הסתיימה",
        competitionEndDate: sixDaysAgo,
      }),
      makeCompetition({
        competitionId: 2,
        hasParticipated: true,
        competitionStatus: "הסתיימה",
        competitionEndDate: tenDaysAgo,
      }),
    ];

    var result = selectHomeCompetitions(items);

    expect(result.map(function (item) { return item.competitionId; })).toEqual([1]);
  });

  it("never shows a cancelled competition, enrolled or not", function () {
    var items = [
      makeCompetition({ competitionId: 1, hasParticipated: true, competitionStatus: "בוטלה" }),
      makeCompetition({ competitionId: 2, hasParticipated: false, competitionStatus: "בוטלה" }),
    ];

    expect(selectHomeCompetitions(items)).toEqual([]);
  });

  it("never shows draft", function () {
    var items = [
      makeCompetition({ competitionId: 1, hasParticipated: true, competitionStatus: "טיוטה" }),
    ];

    expect(selectHomeCompetitions(items)).toEqual([]);
  });

  it("keeps a non-enrolled future competition only within 30 days", function () {
    var today = new Date();
    var in20Days = new Date(today.getTime() + 20 * 86400000).toISOString().slice(0, 10);
    var in40Days = new Date(today.getTime() + 40 * 86400000).toISOString().slice(0, 10);

    var items = [
      makeCompetition({
        competitionId: 1,
        hasParticipated: false,
        competitionStatus: "עתידית",
        competitionStartDate: in20Days,
      }),
      makeCompetition({
        competitionId: 2,
        hasParticipated: false,
        competitionStatus: "עתידית",
        competitionStartDate: in40Days,
      }),
    ];

    var result = selectHomeCompetitions(items);

    expect(result.map(function (item) { return item.competitionId; })).toEqual([1]);
  });

  it("sorts enrolled competitions first", function () {
    var items = [
      makeCompetition({ competitionId: 1, hasParticipated: false, competitionStatus: "עתידית", competitionStartDate: "2026-08-06" }),
      makeCompetition({ competitionId: 2, hasParticipated: true, competitionStatus: "עתידית", competitionStartDate: "2026-08-20" }),
    ];

    var result = selectHomeCompetitions(items);

    expect(result[0].competitionId).toBe(2);
  });
});

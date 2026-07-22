import { describe, it, expect } from "vitest";
import {
  RECOMMENDATION_JUDGES,
  RECOMMENDATION_SHIFTS,
  countDistinctJudges,
  getDayRecommendations,
} from "./dayRecommendations.utils.js";

function dayResult(tier, dayFinishTime) {
  return { tier: tier, dayFinishTime: dayFinishTime || "23:30" };
}

function classWithJudges(id, judgeIds) {
  return { classInCompId: id, judgeIds: judgeIds };
}

function keysOf(recommendations) {
  return recommendations.map(function (item) {
    return item.key;
  });
}

describe("countDistinctJudges", () => {
  it("counts each judge once across the day", () => {
    var classes = [
      classWithJudges(1, [7, 9]),
      classWithJudges(2, [7]),
      classWithJudges(3, [9]),
    ];

    expect(countDistinctJudges(classes)).toBe(2);
  });

  it("handles judgeless classes", () => {
    // A judge is not required to save a class, so this is normal data, not an edge case.
    expect(countDistinctJudges([classWithJudges(1, []), classWithJudges(2, null)])).toBe(0);
  });
});

describe("getDayRecommendations", () => {
  it("recommends nothing when the day does not finish late", () => {
    var classes = [classWithJudges(1, [7])];

    expect(getDayRecommendations(dayResult("none"), classes)).toEqual([]);
  });

  it("recommends nothing when there is no schedule for the day at all", () => {
    expect(getDayRecommendations(null, [classWithJudges(1, [7])])).toEqual([]);
  });

  it("recommends both a judge and a shift on a late day with one judge", () => {
    var classes = [classWithJudges(1, [7]), classWithJudges(2, [7])];
    var recommendations = getDayRecommendations(dayResult("yellow"), classes);

    expect(keysOf(recommendations)).toEqual([
      RECOMMENDATION_JUDGES,
      RECOMMENDATION_SHIFTS,
    ]);
    expect(recommendations[0].judgeCount).toBe(1);
  });

  it("fires from the yellow tier, not only from orange and red", () => {
    var classes = [classWithJudges(1, [7])];

    ["yellow", "orange", "red"].forEach(function (tier) {
      expect(getDayRecommendations(dayResult(tier), classes).length).toBe(2);
    });
  });

  it("still recommends a shift when judge cover already exists", () => {
    // Three judges: the relief problem is covered, but the day is still long for staff.
    var classes = [classWithJudges(1, [7, 8, 9])];
    var recommendations = getDayRecommendations(dayResult("red"), classes);

    expect(keysOf(recommendations)).toEqual([RECOMMENDATION_SHIFTS]);
  });

  it("does not recommend judge cover for a day with no judges rostered at all", () => {
    // Nothing to relieve, and the real problem is the empty roster, not a rotation.
    var classes = [classWithJudges(1, [])];
    var recommendations = getDayRecommendations(dayResult("red"), classes);

    expect(keysOf(recommendations)).toEqual([RECOMMENDATION_SHIFTS]);
  });

  it("carries the day's finish time onto every recommendation", () => {
    var classes = [classWithJudges(1, [7])];
    var recommendations = getDayRecommendations(dayResult("orange", "24:20"), classes);

    recommendations.forEach(function (item) {
      expect(item.dayFinishTime).toBe("24:20");
    });
  });
});

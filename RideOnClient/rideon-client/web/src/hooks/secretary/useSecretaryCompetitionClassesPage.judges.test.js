import { describe, it, expect } from "vitest";

// Unlike the other hook tests in this folder (useCompetitionPaidTimePage.*,
// useCompetitionDetailsStep.*), this one targets a plain, non-hook helper
// function exported alongside the hook. It calls no React hook (no useState/
// useEffect/useMemo), so importing and calling it directly needs no "react"
// mock and no source-level regex harness -- a normal unit test is the
// smallest fit.
import { deriveJudgeIdsFromClasses } from "./useSecretaryCompetitionClassesPage";

describe("deriveJudgeIdsFromClasses", function () {
  it("unions judge ids across several classes, first-seen order", function () {
    var classes = [
      { classInCompId: 1, judgeIds: [12] },
      { classInCompId: 2, judgeIds: [12, 19] },
    ];

    expect(deriveJudgeIdsFromClasses(classes)).toEqual([12, 19]);
  });

  it("treats numeric and string forms of the same id as one logical judge id", function () {
    var classes = [
      { classInCompId: 1, judgeIds: [12] },
      { classInCompId: 2, judgeIds: ["12", 19] },
    ];

    var result = deriveJudgeIdsFromClasses(classes);

    expect(result).toEqual([12, 19]);
    expect(result.length).toBe(2);
  });

  it("also reads PascalCase JudgeIds, matching this file's existing dual-casing convention", function () {
    var classes = [
      { classInCompId: 1, JudgeIds: [12, 19] },
      { classInCompId: 2, judgeIds: [19] },
    ];

    expect(deriveJudgeIdsFromClasses(classes)).toEqual([12, 19]);
  });

  it("tolerates missing, null, and empty judgeIds without throwing", function () {
    var classes = [
      { classInCompId: 1 },
      { classInCompId: 2, judgeIds: null },
      { classInCompId: 3, judgeIds: [] },
      { classInCompId: 4, judgeIds: [12] },
    ];

    expect(function () {
      deriveJudgeIdsFromClasses(classes);
    }).not.toThrow();

    expect(deriveJudgeIdsFromClasses(classes)).toEqual([12]);
  });

  it("drops null/undefined/empty entries inside a judgeIds array", function () {
    var classes = [{ classInCompId: 1, judgeIds: [12, null, undefined, "", 19] }];

    expect(deriveJudgeIdsFromClasses(classes)).toEqual([12, 19]);
  });

  it("returns an empty pool when no loaded class has any judge history", function () {
    var classes = [
      { classInCompId: 1, judgeIds: [] },
      { classInCompId: 2, judgeIds: [] },
    ];

    expect(deriveJudgeIdsFromClasses(classes)).toEqual([]);
  });

  it("returns an empty pool for an empty or non-array classes list", function () {
    expect(deriveJudgeIdsFromClasses([])).toEqual([]);
    expect(deriveJudgeIdsFromClasses(null)).toEqual([]);
    expect(deriveJudgeIdsFromClasses(undefined)).toEqual([]);
  });

  // Regression pin for the reported bug: ClassInCompId 1568 has only judge 12,
  // a sibling class has 12 and 19 -- the derived pool must offer both even
  // though the class being edited is only pre-selected on one of them. The
  // per-class selection itself is ClassInCompetitionModal's concern
  // (initialValue.judgeIds), not this function's -- this only proves the
  // available POOL is correct so that modal-side selection isn't starved.
  it("matches the verified competition 78 shape: pool is the union, not any single class's selection", function () {
    var classes = [
      { classInCompId: 1568, judgeIds: [12] },
      { classInCompId: 1569, judgeIds: [12, 19] },
      { classInCompId: 1570, judgeIds: [12, 19] },
    ];

    expect(deriveJudgeIdsFromClasses(classes)).toEqual([12, 19]);
  });
});

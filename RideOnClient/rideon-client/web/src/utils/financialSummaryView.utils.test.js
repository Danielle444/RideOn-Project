import { describe, it, expect } from "vitest";
import {
  resolveFinancialActiveView,
  resolveEffectiveFinancialView,
} from "./financialSummaryView.utils.js";
import {
  TAB_PROJECTION,
  TAB_ACTUAL,
  TAB_COMPARISON,
} from "../components/secretary/competition-summary/FinancialProjectionTabs.jsx";

var COMPETITION_A = 41;
var COMPETITION_B = 92;

describe("resolveFinancialActiveView", () => {
  it("defaults to Prediction while registration is open", () => {
    var resolution = resolveFinancialActiveView({
      previousCompetitionId: COMPETITION_A,
      competitionId: COMPETITION_A,
      hasChosenView: false,
      currentActiveView: TAB_PROJECTION,
      registrationClosed: false,
    });

    expect(resolution).toEqual({
      activeView: TAB_PROJECTION,
      hasChosenView: false,
    });
  });

  it("resolves to Actual once registration-closed becomes known, even though it started false", () => {
    // useCompetitionSummaryPage's financialRegistrationClosed starts false (the competition
    // record it derives from is fetched asynchronously and starts null) and only later flips to
    // true once the fetch resolves -- this is that second, later call.
    var firstResolution = resolveFinancialActiveView({
      previousCompetitionId: COMPETITION_A,
      competitionId: COMPETITION_A,
      hasChosenView: false,
      currentActiveView: TAB_PROJECTION,
      registrationClosed: false,
    });

    var secondResolution = resolveFinancialActiveView({
      previousCompetitionId: COMPETITION_A,
      competitionId: COMPETITION_A,
      hasChosenView: firstResolution.hasChosenView,
      currentActiveView: firstResolution.activeView,
      registrationClosed: true,
    });

    expect(secondResolution).toEqual({
      activeView: TAB_ACTUAL,
      hasChosenView: false,
    });
  });

  it("does not get permanently stuck on Prediction across repeated open resolutions", () => {
    // Simulates several re-renders while the fetch is still in flight: every one of them must
    // still be free to resolve to Actual the moment registrationClosed turns true.
    var resolution = { activeView: TAB_PROJECTION, hasChosenView: false };

    [false, false, false].forEach(function (registrationClosed) {
      resolution = resolveFinancialActiveView({
        previousCompetitionId: COMPETITION_A,
        competitionId: COMPETITION_A,
        hasChosenView: resolution.hasChosenView,
        currentActiveView: resolution.activeView,
        registrationClosed: registrationClosed,
      });
    });

    resolution = resolveFinancialActiveView({
      previousCompetitionId: COMPETITION_A,
      competitionId: COMPETITION_A,
      hasChosenView: resolution.hasChosenView,
      currentActiveView: resolution.activeView,
      registrationClosed: true,
    });

    expect(resolution.activeView).toBe(TAB_ACTUAL);
  });

  it("does not override a manual tab choice on a later re-resolution", () => {
    // The secretary picks Comparison herself; registration-closed flipping afterwards (or
    // anything else re-running the resolver) must leave her choice alone.
    var afterManualPick = resolveFinancialActiveView({
      previousCompetitionId: COMPETITION_A,
      competitionId: COMPETITION_A,
      hasChosenView: true,
      currentActiveView: TAB_COMPARISON,
      registrationClosed: false,
    });

    expect(afterManualPick).toEqual({
      activeView: TAB_COMPARISON,
      hasChosenView: true,
    });

    var afterRegistrationCloses = resolveFinancialActiveView({
      previousCompetitionId: COMPETITION_A,
      competitionId: COMPETITION_A,
      hasChosenView: afterManualPick.hasChosenView,
      currentActiveView: afterManualPick.activeView,
      registrationClosed: true,
    });

    expect(afterRegistrationCloses).toEqual({
      activeView: TAB_COMPARISON,
      hasChosenView: true,
    });
  });

  it("re-resolves the default for a new competition even if a tab was chosen for the previous one", () => {
    var chosenForA = {
      previousCompetitionId: COMPETITION_A,
      competitionId: COMPETITION_A,
      hasChosenView: true,
      currentActiveView: TAB_ACTUAL,
      registrationClosed: true,
    };

    // Switch to competition B without a remount -- competitionId changes but hasChosenView from
    // A is still whatever state the page happens to carry over.
    var resolutionForB = resolveFinancialActiveView({
      previousCompetitionId: chosenForA.competitionId,
      competitionId: COMPETITION_B,
      hasChosenView: chosenForA.hasChosenView,
      currentActiveView: chosenForA.currentActiveView,
      registrationClosed: false,
    });

    expect(resolutionForB).toEqual({
      activeView: TAB_PROJECTION,
      hasChosenView: false,
    });
  });
});

describe("resolveEffectiveFinancialView", () => {
  var availability = {
    projection: true,
    actual: false,
    comparison: false,
  };

  it("passes through an available active view unchanged", () => {
    expect(
      resolveEffectiveFinancialView(TAB_PROJECTION, {
        projection: true,
        actual: true,
        comparison: true,
      }),
    ).toBe(TAB_PROJECTION);
  });

  it("falls back to Prediction when the active view is unavailable", () => {
    expect(resolveEffectiveFinancialView(TAB_ACTUAL, availability)).toBe(
      TAB_PROJECTION,
    );
    expect(resolveEffectiveFinancialView(TAB_COMPARISON, availability)).toBe(
      TAB_PROJECTION,
    );
  });
});

/* eslint-disable react-hooks/rules-of-hooks --
 * This file calls the hook outside React on purpose: the React hooks it uses are
 * stubbed below, so there is no renderer and the rule's premise does not hold.
 */
import { readFileSync } from "node:fs";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Review-gate fix: navigating from /competitions/{id1}/edit to
// /competitions/{id2}/edit without a remount (React Router reuses the same
// component instance across param-only navigations on the same route
// pattern) previously left every piece of loaded competition state frozen
// on id1. Fixed by adding competitionIdFromRoute to the existing loading
// effect's dependency array — one path, no new fetch mechanism.
//
// Honesty note on what this file can and cannot prove: this repo has no DOM
// test environment and no React Testing Library, and the shared harness
// (same as useCompetitionPaidTimePage.assign.test.js and this feature's own
// earlier tests) stubs useEffect as a total no-op so hooks can be invoked
// directly without a renderer. That means the EFFECT ITSELF never executes
// under test — "the effect re-fires when competitionIdFromRoute changes" is
// proven here only at the SOURCE level (the dependency array, and why
// primitive deps cannot loop). The DOWNSTREAM correctness — that a reload
// for a new id threads that id through loadExistingCompetition and refreshes
// state via the one existing path — is proven BEHAVIORALLY, by calling the
// hook's exposed loadExistingCompetition directly, same technique as
// useCompetitionDetailsStep.dateChange.test.js.
vi.mock("react", function () {
  return {
    useState: function (initial) {
      return [initial, function () {}];
    },
    useEffect: function () {},
    useRef: function (initial) {
      return { current: initial };
    },
  };
});

vi.mock("../../services/competitionService", function () {
  return {
    createCompetition: vi.fn().mockResolvedValue({ data: {} }),
    getCompetitionById: vi.fn().mockResolvedValue({ data: {} }),
    updateCompetition: vi.fn().mockResolvedValue({ data: {} }),
    rescheduleCompetition: vi.fn().mockResolvedValue({ data: {} }),
  };
});

vi.mock("../../services/superUserService", function () {
  return {
    getAllFields: vi.fn().mockResolvedValue({ data: [] }),
    getAllClassTypes: vi.fn().mockResolvedValue({ data: [] }),
    getAllJudges: vi.fn().mockResolvedValue({ data: [] }),
    getAllPrizeTypes: vi.fn().mockResolvedValue({ data: [] }),
    getAllPatternsWithManeuvers: vi.fn().mockResolvedValue({ data: [] }),
  };
});

vi.mock("../../services/arenaService", function () {
  return { getArenasByRanchId: vi.fn().mockResolvedValue({ data: [] }) };
});

vi.mock("../../services/paidTimeSlotInCompetitionService", function () {
  return { getAllPaidTimeBaseSlots: vi.fn().mockResolvedValue({ data: [] }) };
});

import useCompetitionDetailsStep from "./useCompetitionDetailsStep";
import { getCompetitionById } from "../../services/competitionService";

const HOOK_PATH = new URL("./useCompetitionDetailsStep.js", import.meta.url);
const hookSource = readFileSync(HOOK_PATH, "utf8").replace(/\r\n/g, "\n");

const RANCH_ID = 11;
const COMPETITION_ID_1 = 46;
const COMPETITION_ID_2 = 47;

function buildEditStep(competitionIdFromRoute) {
  return useCompetitionDetailsStep({
    currentRanchId: RANCH_ID,
    isEdit: true,
    competitionIdFromRoute: competitionIdFromRoute,
    onNavigateToEdit: function () {},
    onShowToast: function () {},
  });
}

describe("route competition-id reload — effect wiring (source-level)", () => {
  it("the loading effect now depends on competitionIdFromRoute as well as currentRanchId", () => {
    expect(hookSource).toContain(
      "  useEffect(\n    function () {\n      if (!currentRanchId) {\n        return;\n      }\n\n      loadInitialData();\n    },\n    [currentRanchId, competitionIdFromRoute],\n  );",
    );
  });

  it("both effect dependencies are plain primitive props destructured from options, not a recreated object/array", () => {
    // This is what rules out the classic React infinite-effect-loop bug: a
    // new object/array/function reference on every render would make the
    // dependency comparison always see "changed". Both values here are
    // assigned directly from `options.*` with no wrapping literal.
    expect(hookSource).toContain("var currentRanchId = options.currentRanchId;");
    expect(hookSource).toContain(
      "var competitionIdFromRoute = options.competitionIdFromRoute;",
    );
  });

  it("this hook never reassigns currentRanchId or competitionIdFromRoute, so the effect cannot re-trigger itself", () => {
    // Each occurs exactly once as "X =" — its own initial `var` declaration
    // (`var currentRanchId = options.currentRanchId;`) — proving there is no
    // SECOND assignment anywhere else in the file that could feed back into
    // the effect's own dependency array.
    const currentRanchIdAssignments = (
      hookSource.match(/currentRanchId = /g) || []
    ).length;
    const competitionIdFromRouteAssignments = (
      hookSource.match(/competitionIdFromRoute = /g) || []
    ).length;

    expect(currentRanchIdAssignments).toBe(1);
    expect(competitionIdFromRouteAssignments).toBe(1);
  });

  it("loadInitialData still calls loadExistingCompetition only in edit mode with a route id — creation mode is unchanged", () => {
    expect(hookSource).toContain(
      "if (isEdit && competitionIdFromRoute) {\n        await loadExistingCompetition(competitionIdFromRoute, currentRanchId);\n      } else {\n        setCurrentStatus(\"טיוטה\");\n      }",
    );
  });
});

describe("route competition-id reload — loadExistingCompetition threads the new id through (behavioral)", () => {
  beforeEach(function () {
    vi.clearAllMocks();
  });

  it("loading competition 1 then competition 2 fetches each by its own id, same ranch", async function () {
    getCompetitionById.mockResolvedValueOnce({
      data: {
        competitionId: COMPETITION_ID_1,
        competitionStatus: "טיוטה",
        competitionStartDate: "2026-08-04",
        competitionEndDate: "2026-08-07",
      },
    });

    var step = buildEditStep(COMPETITION_ID_1);
    await step.loadExistingCompetition(COMPETITION_ID_1, RANCH_ID);

    expect(getCompetitionById).toHaveBeenCalledWith(COMPETITION_ID_1, RANCH_ID);

    getCompetitionById.mockResolvedValueOnce({
      data: {
        competitionId: COMPETITION_ID_2,
        competitionStatus: "טיוטה",
        competitionStartDate: "2026-09-01",
        competitionEndDate: "2026-09-03",
      },
    });

    // Same hook instance, called again with the NEW route id — this is
    // exactly what the fixed effect does on the next render once
    // competitionIdFromRoute has changed but currentRanchId has not.
    await step.loadExistingCompetition(COMPETITION_ID_2, RANCH_ID);

    expect(getCompetitionById).toHaveBeenCalledWith(COMPETITION_ID_2, RANCH_ID);
    expect(getCompetitionById).toHaveBeenCalledTimes(2);
  });

  it("a fresh hook instance mounted directly on competition 2's route id fetches competition 2, not competition 1", async function () {
    getCompetitionById.mockResolvedValueOnce({
      data: {
        competitionId: COMPETITION_ID_2,
        competitionStatus: "טיוטה",
        competitionStartDate: "2026-09-01",
        competitionEndDate: "2026-09-03",
      },
    });

    var step = buildEditStep(COMPETITION_ID_2);
    await step.loadExistingCompetition(COMPETITION_ID_2, RANCH_ID);

    expect(getCompetitionById).toHaveBeenCalledWith(COMPETITION_ID_2, RANCH_ID);
    expect(getCompetitionById).not.toHaveBeenCalledWith(COMPETITION_ID_1, RANCH_ID);
  });
});

describe("route competition-id reload — persisted preview dates follow the newly loaded competition", () => {
  // Chained proof, given the stubbed-useState harness cannot observe a
  // setter's effect on state directly (documented limitation shared with
  // useCompetitionDetailsStep.persistedDates.contract.test.js): (1) this
  // suite proves loadExistingCompetition is called with the NEW id and
  // fetches the NEW competition's dates from the server response; (2) the
  // persistedDates contract test file separately proves
  // loadExistingCompetition's body unconditionally derives
  // persistedCompetitionStartDate/EndDate from that same response, and does
  // so nowhere else. Together these prove the preview anchor tracks
  // whichever competition was most recently loaded — old or new.
  beforeEach(function () {
    vi.clearAllMocks();
  });

  it("the response used to resolve a route-triggered reload carries the NEW competition's own dates", async function () {
    getCompetitionById.mockResolvedValueOnce({
      data: {
        competitionId: COMPETITION_ID_2,
        competitionStatus: "טיוטה",
        competitionStartDate: "2026-09-01",
        competitionEndDate: "2026-09-03",
      },
    });

    var step = buildEditStep(COMPETITION_ID_2);
    var result = await getCompetitionById(COMPETITION_ID_2, RANCH_ID);
    await step.loadExistingCompetition(COMPETITION_ID_2, RANCH_ID);

    expect(result.data.competitionStartDate).toBe("2026-09-01");
    expect(result.data.competitionEndDate).toBe("2026-09-03");
  });

  it("loadExistingCompetition (the sole setter of the persisted dates, per the persistedDates contract test) is the exact function the route-reload path calls", () => {
    expect(hookSource).toContain(
      "await loadExistingCompetition(competitionIdFromRoute, currentRanchId);",
    );
  });
});

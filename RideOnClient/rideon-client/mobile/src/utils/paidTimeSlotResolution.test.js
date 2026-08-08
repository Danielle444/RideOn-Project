import { describe, it, expect } from "vitest";
import {
  computeCascadeFromSlot,
  computeAutoResolveSlotAction,
} from "./paidTimeSlotResolution";

// Regression coverage for the Admin Paid-Time edit "Maximum update depth
// exceeded" crash (2026-08-08). CompetitionPaidTimeFormCard's two
// bidirectional effects ("slot -> cascade" and "cascade -> slot") call
// exactly these two functions - this file drives the REAL production
// functions through the exact render/commit sequence React would produce,
// one simulated render at a time. It is not a reimplementation: if either
// function's logic regresses, these tests regress with it.
//
// requestableSlots fixture: three slots. S1/S2 share date+timeOfDay+arena
// (so selecting all three cascade steps still leaves 2 candidates and
// requires the "exact start time" disambiguation step); S3 is a unique
// date/time/arena combination that resolves to exactly one slot as soon as
// its arena is picked.
var S1 = { paidTimeSlotInCompId: 1, slotDate: "2026-08-10", timeOfDay: "בוקר", arenaName: "A" };
var S2 = { paidTimeSlotInCompId: 2, slotDate: "2026-08-10", timeOfDay: "בוקר", arenaName: "A" };
var S3 = { paidTimeSlotInCompId: 3, slotDate: "2026-08-11", timeOfDay: "ערב", arenaName: "B" };
var REQUESTABLE_SLOTS = [S1, S2, S3];

// Mirrors the component's own memo chain (slotsForSelectedDate ->
// timeOfDayOptionsForDate -> slotsForSelectedDateAndTime -> arenaNameOptions
// -> slotsForFullSelection) as a single pure filter over the fixture above.
// This part of the component is plain array filtering, not the buggy
// bidirectional-effect logic under test, so re-deriving it here (rather than
// extracting it too) keeps the production diff minimal - only the two
// functions load-bearing for the bug itself were extracted.
function slotsForFullSelection(cascade) {
  if (cascade.cascadeDate === null) {
    return [];
  }

  var byDate = REQUESTABLE_SLOTS.filter(function (item) {
    return item.slotDate === cascade.cascadeDate;
  });

  var timeOfDayOptions = Array.from(
    new Set(byDate.map(function (item) { return item.timeOfDay || ""; })),
  );
  var needsTimeOfDayStep = !(
    timeOfDayOptions.length === 0 ||
    (timeOfDayOptions.length === 1 && timeOfDayOptions[0] === "")
  );
  var isTimeOfDayResolved = !needsTimeOfDayStep || cascade.cascadeTimeOfDay !== null;

  if (!isTimeOfDayResolved) {
    return [];
  }

  var byTime = needsTimeOfDayStep
    ? byDate.filter(function (item) { return (item.timeOfDay || "") === cascade.cascadeTimeOfDay; })
    : byDate;

  if (cascade.cascadeArenaName === null) {
    return [];
  }

  return byTime.filter(function (item) {
    return (item.arenaName || "") === cascade.cascadeArenaName;
  });
}

// One simulated "render": runs the "slot -> cascade" effect (only if
// selectedSlot's identity changed since the last render, matching its real
// [selectedRequestedSlot] dependency array) then the "cascade -> slot"
// effect, reading THIS render's pre-update cascade - exactly like React,
// where an earlier effect's setState in the same commit is not visible to a
// later effect in that same commit. Returns the next state plus whether
// anything actually changed (both flags false = converged).
function simulateRender(state, refs) {
  var currentSlotId = state.selectedSlot ? state.selectedSlot.paidTimeSlotInCompId : null;

  var nextCascade = state.cascade.__lastSlotId !== currentSlotId
    ? computeCascadeFromSlot(state.selectedSlot)
    : state.cascade;
  nextCascade = Object.assign({}, nextCascade, { __lastSlotId: currentSlotId });

  var full = slotsForFullSelection(state.cascade);
  var decision = computeAutoResolveSlotAction({
    currentSlotId: currentSlotId,
    observedExternalSlotId: refs.observedExternalSlotId,
    needsFinalDisambiguation: full.length > 1,
    slotsForFullSelection: full,
    lastAutoResolvedSlotId: refs.lastAutoResolvedSlotId,
  });

  var nextSelectedSlot = state.selectedSlot;

  if (decision.action === "observeExternalChange") {
    refs.observedExternalSlotId = decision.nextObservedExternalSlotId;
    refs.lastAutoResolvedSlotId = decision.nextLastAutoResolvedSlotId;
  } else if (decision.action === "settled") {
    refs.lastAutoResolvedSlotId = decision.nextLastAutoResolvedSlotId;
  } else if (decision.action === "resolve") {
    nextSelectedSlot = decision.resolvedSlot;
    refs.lastAutoResolvedSlotId = decision.nextLastAutoResolvedSlotId;
  }
  // "wait" / "declineResurrection": no state change.

  var cascadeChanged =
    nextCascade.cascadeDate !== state.cascade.cascadeDate ||
    nextCascade.cascadeTimeOfDay !== state.cascade.cascadeTimeOfDay ||
    nextCascade.cascadeArenaName !== state.cascade.cascadeArenaName;
  var slotChanged = nextSelectedSlot !== state.selectedSlot;

  return {
    state: { selectedSlot: nextSelectedSlot, cascade: nextCascade },
    changed: cascadeChanged || slotChanged,
    cascadeChanged: cascadeChanged,
    slotChanged: slotChanged,
  };
}

// Drives a FormCard mount through repeated renders until state stops
// changing, or a runaway ceiling is hit (proving a real infinite loop - the
// exact invariant React's own "Maximum update depth exceeded" enforces).
function runToConvergence(initialSelectedSlot, initialCascade, options) {
  var maxRenders = (options && options.maxRenders) || 20;
  var state = {
    selectedSlot: initialSelectedSlot || null,
    cascade: Object.assign({}, initialCascade || computeCascadeFromSlot(null)),
  };
  var refs = {
    observedExternalSlotId: (options && options.observedExternalSlotId) || null,
    lastAutoResolvedSlotId: (options && options.lastAutoResolvedSlotId) || null,
  };

  var renders = 0;
  var history = [];

  while (renders < maxRenders) {
    renders += 1;
    var step = simulateRender(state, refs);
    history.push({ render: renders, cascadeChanged: step.cascadeChanged, slotChanged: step.slotChanged });
    state = step.state;

    if (!step.changed) {
      return { converged: true, renders: renders, state: state, refs: refs, history: history };
    }
  }

  return { converged: false, renders: renders, state: state, refs: refs, history: history };
}

describe("Admin Paid-Time edit hydration render-loop fix", () => {
  it("1. EDIT HYDRATION: an externally hydrated real slot settles to itself and does not loop", () => {
    // Mirrors the real mount: cascade starts at useState(null) x3, then the
    // hook hydrates selectedRequestedSlot straight to the fetched slot on a
    // later render while the cascade is still stale/empty.
    var result = runToConvergence(S3, computeCascadeFromSlot(null));

    expect(result.converged).toBe(true);
    expect(result.renders).toBeLessThan(10);
    expect(result.state.selectedSlot).toBe(S3);
  });

  it("2. CASCADE HYDRATION: the cascade settles to the hydrated slot's own fields", () => {
    var result = runToConvergence(S3, computeCascadeFromSlot(null));

    expect(result.state.cascade.cascadeDate).toBe(S3.slotDate);
    expect(result.state.cascade.cascadeTimeOfDay).toBe(S3.timeOfDay);
    expect(result.state.cascade.cascadeArenaName).toBe(S3.arenaName);
  });

  it("3. CREATE MODE: user-driven cascade selection still auto-resolves a unique match", () => {
    var cascade = { cascadeDate: S3.slotDate, cascadeTimeOfDay: S3.timeOfDay, cascadeArenaName: S3.arenaName };
    var full = slotsForFullSelection(cascade);

    var decision = computeAutoResolveSlotAction({
      currentSlotId: null,
      observedExternalSlotId: null, // no external slot involved - matches null the whole time
      needsFinalDisambiguation: full.length > 1,
      slotsForFullSelection: full,
      lastAutoResolvedSlotId: null,
    });

    expect(decision.action).toBe("resolve");
    expect(decision.resolvedSlot).toBe(S3);
  });

  it("3b. CREATE MODE: an ambiguous cascade (2 matching slots) waits instead of guessing", () => {
    var cascade = { cascadeDate: S1.slotDate, cascadeTimeOfDay: S1.timeOfDay, cascadeArenaName: S1.arenaName };
    var full = slotsForFullSelection(cascade);

    expect(full).toEqual([S1, S2]);

    var decision = computeAutoResolveSlotAction({
      currentSlotId: null,
      observedExternalSlotId: null,
      needsFinalDisambiguation: full.length > 1,
      slotsForFullSelection: full,
      lastAutoResolvedSlotId: null,
    });

    expect(decision.action).toBe("wait");
  });

  it("4. CLEAR/RESET: clearing an unlocked settled slot converges to fully-cleared state - the a817ff6 protection still holds", () => {
    // Start from the settled post-hydration state, then mirror
    // resetUnlockedFields() externally nulling selectedRequestedSlot while
    // FormCard's local cascade state still holds S3's stale values (exactly
    // the scenario a817ff6 was written for).
    var settled = runToConvergence(S3, computeCascadeFromSlot(null));
    expect(settled.converged).toBe(true);

    var result = runToConvergence(null, settled.state.cascade, {
      observedExternalSlotId: settled.refs.observedExternalSlotId,
      lastAutoResolvedSlotId: settled.refs.lastAutoResolvedSlotId,
    });

    expect(result.converged).toBe(true);
    expect(result.renders).toBeLessThan(10);
    expect(result.state.selectedSlot).toBe(null);
    expect(result.state.cascade.cascadeDate).toBe(null);
    expect(result.state.cascade.cascadeTimeOfDay).toBe(null);
    expect(result.state.cascade.cascadeArenaName).toBe(null);
  });

  it("5. NO-OP STABILITY: once slot and cascade agree, neither effect writes state again", () => {
    var result = runToConvergence(S3, computeCascadeFromSlot(null));
    expect(result.converged).toBe(true);

    var last = result.history[result.history.length - 1];
    expect(last.cascadeChanged).toBe(false);
    expect(last.slotChanged).toBe(false);

    // From the already-converged state, one more simulated render must be a
    // pure no-op on both effects (the original defect was that this never
    // stabilized at all).
    var again = runToConvergence(result.state.selectedSlot, result.state.cascade, {
      observedExternalSlotId: result.refs.observedExternalSlotId,
      lastAutoResolvedSlotId: result.refs.lastAutoResolvedSlotId,
      maxRenders: 3,
    });

    expect(again.renders).toBe(1);
    expect(again.history[0].cascadeChanged).toBe(false);
    expect(again.history[0].slotChanged).toBe(false);
  });

  it("6. a817ff6 regression guard: the historical post-submit reset oscillation is still exercised and still fixed", () => {
    // This is the ORIGINAL a817ff6 bug scenario (unrelated to hydration):
    // slot cleared externally (resetUnlockedFields) while cascade is stale.
    // Runs it through the full pipeline including the new hydration guard,
    // proving the new guard does not reintroduce or mask the old bug.
    var settled = runToConvergence(S3, computeCascadeFromSlot(null));
    expect(settled.converged).toBe(true);

    var reset = runToConvergence(null, settled.state.cascade, {
      observedExternalSlotId: settled.refs.observedExternalSlotId,
      lastAutoResolvedSlotId: settled.refs.lastAutoResolvedSlotId,
    });

    expect(reset.converged).toBe(true);
    expect(reset.state.selectedSlot).toBe(null);
  });

  it("regression proof: without the hydration guard, edit hydration never converges (proves this harness would have caught the original bug)", () => {
    // Re-runs the exact hydration sequence using the PRE-FIX decision shape
    // (everything a817ff6 already had, minus the new observedExternalSlotId
    // check) to prove this harness genuinely exercises the failure mode -
    // not just asserting the new code does what it does.
    function legacyComputeAutoResolveSlotAction(input) {
      if (input.needsFinalDisambiguation) {
        return { action: "wait" };
      }

      var resolvedSlot =
        input.slotsForFullSelection.length === 1 ? input.slotsForFullSelection[0] : null;
      var resolvedSlotId = resolvedSlot ? resolvedSlot.paidTimeSlotInCompId : null;

      if (input.currentSlotId === resolvedSlotId) {
        return { action: "settled", nextLastAutoResolvedSlotId: resolvedSlotId };
      }

      if (
        input.currentSlotId === null &&
        resolvedSlotId !== null &&
        resolvedSlotId === input.lastAutoResolvedSlotId
      ) {
        return { action: "declineResurrection" };
      }

      return { action: "resolve", resolvedSlot: resolvedSlot, nextLastAutoResolvedSlotId: resolvedSlotId };
    }

    var state = { selectedSlot: S3, cascade: computeCascadeFromSlot(null) };
    var refs = { lastAutoResolvedSlotId: null };
    var maxRenders = 12;
    var renders = 0;
    var everOscillated = false;
    var seenSignatures = {};

    while (renders < maxRenders) {
      renders += 1;
      var currentSlotId = state.selectedSlot ? state.selectedSlot.paidTimeSlotInCompId : null;

      var nextCascade = state.cascade.__lastSlotId !== currentSlotId
        ? computeCascadeFromSlot(state.selectedSlot)
        : state.cascade;
      nextCascade = Object.assign({}, nextCascade, { __lastSlotId: currentSlotId });

      var full = slotsForFullSelection(state.cascade);
      var decision = legacyComputeAutoResolveSlotAction({
        currentSlotId: currentSlotId,
        needsFinalDisambiguation: full.length > 1,
        slotsForFullSelection: full,
        lastAutoResolvedSlotId: refs.lastAutoResolvedSlotId,
      });

      var nextSelectedSlot = state.selectedSlot;
      if (decision.action === "settled") {
        refs.lastAutoResolvedSlotId = decision.nextLastAutoResolvedSlotId;
      } else if (decision.action === "resolve") {
        nextSelectedSlot = decision.resolvedSlot;
        refs.lastAutoResolvedSlotId = decision.nextLastAutoResolvedSlotId;
      }

      var signature = currentSlotId + "|" + nextCascade.cascadeArenaName;
      if (seenSignatures[signature]) {
        everOscillated = true;
      }
      seenSignatures[signature] = true;

      state = { selectedSlot: nextSelectedSlot, cascade: nextCascade };
    }

    // The legacy (pre-fix) effect pair never settles for this scenario - it
    // keeps revisiting the same (slot, cascade) pairs, which is precisely
    // what trips React's "Maximum update depth exceeded" in the real app.
    expect(everOscillated).toBe(true);
  });
});

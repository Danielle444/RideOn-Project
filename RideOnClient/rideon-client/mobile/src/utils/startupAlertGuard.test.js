import { describe, it, expect } from "vitest";
import { createStartupAlertGuard } from "./startupAlertGuard";

describe("createStartupAlertGuard", () => {
  it("the first shouldAlert call in a cycle returns true", () => {
    var guard = createStartupAlertGuard();
    expect(guard.shouldAlert()).toBe(true);
  });

  it("a second shouldAlert call in the same cycle returns false", () => {
    var guard = createStartupAlertGuard();
    guard.shouldAlert();
    expect(guard.shouldAlert()).toBe(false);
  });

  it("a third and later call also stays false without a reset", () => {
    var guard = createStartupAlertGuard();
    guard.shouldAlert();
    guard.shouldAlert();
    expect(guard.shouldAlert()).toBe(false);
  });

  it("reset() reopens the guard for a new cycle", () => {
    var guard = createStartupAlertGuard();
    guard.shouldAlert();
    guard.reset();
    expect(guard.shouldAlert()).toBe(true);
  });

  it("two synchronous, back-to-back calls with no reset between them - only the first wins", () => {
    // Models two catch blocks settling in the same microtask turn: since
    // shouldAlert() is a synchronous check-and-set, call order fully
    // determines the outcome even with no real async gap between them.
    var guard = createStartupAlertGuard();

    var first = guard.shouldAlert();
    var second = guard.shouldAlert();

    expect(first).toBe(true);
    expect(second).toBe(false);
  });

  it("independent guard instances do not share state", () => {
    var guardA = createStartupAlertGuard();
    var guardB = createStartupAlertGuard();

    guardA.shouldAlert();

    expect(guardB.shouldAlert()).toBe(true);
  });
});
